#!/usr/bin/env node
/**
 * ClickHouse Migration Script — Dadde's Fund
 *
 * Creates all required tables and materialized views.
 * Safe to run multiple times — every DDL uses IF NOT EXISTS (idempotent).
 *
 * Usage:
 *   npx dotenv -e .env -- npx tsx scripts/migrate-clickhouse.ts
 *   # or via npm script defined in package.json
 *
 * Environment variables required: see .env.example (CLICKHOUSE_*)
 */

import "dotenv/config";
import { createClient } from "@clickhouse/client";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HOST_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const DATABASE = process.env.CLICKHOUSE_DATABASE ?? "daddes_fund";
const USERNAME = process.env.CLICKHOUSE_USERNAME ?? "default";
const PASSWORD = process.env.CLICKHOUSE_PASSWORD ?? "";

// ---------------------------------------------------------------------------
// Client (connects to default DB first so we can CREATE the database)
// ---------------------------------------------------------------------------

const defaultClient = createClient({
  url: HOST_URL,
  database: "default",
  username: USERNAME,
  password: PASSWORD,
});

const client = createClient({
  url: HOST_URL,
  database: DATABASE,
  username: USERNAME,
  password: PASSWORD,
});

// ---------------------------------------------------------------------------
// DDL statements
// ---------------------------------------------------------------------------

const DDL: { name: string; sql: string }[] = [
  // 1. events_log ────────────────────────────────────────────────────────────
  {
    name: "events_log",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.events_log (
        id          UUID          DEFAULT generateUUIDv4(),
        event_type  LowCardinality(String),   -- API_CALL | ERROR | STATE_TRANSITION | PAYMENT | AI_INFERENCE
        service     LowCardinality(String),   -- contributions | claims | governance | ai | payments
        payload     String,                   -- JSON-encoded event data
        error       Nullable(String),
        created_at  DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, event_type, service)
      TTL created_at + INTERVAL 1 YEAR
      SETTINGS index_granularity = 8192;
    `,
  },

  // 2. transactions ──────────────────────────────────────────────────────────
  {
    name: "transactions",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.transactions (
        id                        UUID          DEFAULT generateUUIDv4(),
        type                      LowCardinality(String),  -- CONTRIBUTION | PAYOUT | ROUND_UP | SUBSCRIPTION
        amount                    Decimal(18, 4),
        currency                  LowCardinality(String)   DEFAULT 'USD',
        -- Hashed wallet IDs — never expose raw wallet addresses in this table
        sender_wallet_hash        String,
        recipient_wallet_hash     String,
        disaster_event_id         Nullable(UUID),
        open_payments_payment_id  Nullable(String),
        status                    LowCardinality(String),  -- PENDING | COMPLETED | FAILED | CANCELLED | INSUFFICIENT_FUNDS
        metadata                  String        DEFAULT '{}',  -- JSON
        created_at                DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, type, status)
      PARTITION BY toYYYYMM(created_at)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 3. ai_inferences ─────────────────────────────────────────────────────────
  {
    name: "ai_inferences",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.ai_inferences (
        id                  UUID          DEFAULT generateUUIDv4(),
        claim_id            UUID,
        agent_type          LowCardinality(String),  -- RECOMMENDER | CRITIC
        model               LowCardinality(String)   DEFAULT 'gemini-2.5-flash',
        -- Input stored as text; image URL is access-controlled (never in public queries)
        input_text          String,
        input_image_url     Nullable(String),
        -- Full raw API response — audit trail
        raw_response        String,
        -- Parsed structured output
        output_json         String        DEFAULT '{}',
        decision            LowCardinality(Nullable(String)),  -- RECOMMEND_APPROVE | RECOMMEND_DENY | RECOMMEND_ESCALATE | CONCUR | CHALLENGE
        confidence_score    Nullable(Float64),
        processing_time_ms  UInt32        DEFAULT 0,
        error               Nullable(String),
        created_at          DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, claim_id, agent_type)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 4. governance_votes ──────────────────────────────────────────────────────
  {
    name: "governance_votes",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.governance_votes (
        id              UUID          DEFAULT generateUUIDv4(),
        proposal_id     UUID,
        voter_id_hash   String,            -- hashed donor ID (privacy)
        vote            LowCardinality(String),  -- FOR | AGAINST
        created_at      DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (proposal_id, voter_id_hash, created_at)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 5. community_rules (ReplacingMergeTree — versioned, latest row wins) ────
  {
    name: "community_rules",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.community_rules (
        version                   UInt32,
        min_ai_confidence         Float64   DEFAULT 0.85,
        max_payout_per_recipient  Decimal(18, 4) DEFAULT 500,
        distribution_model        LowCardinality(String) DEFAULT 'severity_based',
        min_disaster_severity     UInt8     DEFAULT 3,
        reserve_percentage        Float64   DEFAULT 0.10,
        updated_by                String    DEFAULT 'system',
        updated_at                DateTime  DEFAULT now()
      )
      ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (version)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 6. fund_metrics (SummingMergeTree — pre-aggregated for the dashboard) ───
  {
    name: "fund_metrics",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.fund_metrics (
        date                Date,
        disaster_event_id   String    DEFAULT '',   -- empty = "all events"
        transaction_type    LowCardinality(String),
        total_amount        Decimal(18, 4),
        transaction_count   UInt64
      )
      ENGINE = SummingMergeTree((total_amount, transaction_count))
      ORDER BY (date, disaster_event_id, transaction_type)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 7. disaster_events ───────────────────────────────────────────────────────
  {
    name: "disaster_events",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.disaster_events (
        id           UUID          DEFAULT generateUUIDv4(),
        name         String,
        type         LowCardinality(String),  -- FLOOD | EARTHQUAKE | WILDFIRE | TYPHOON | OTHER
        severity     UInt8,                   -- 1 (minor) – 5 (catastrophic)
        region       LowCardinality(String),
        country      String,
        status       LowCardinality(String)   DEFAULT 'ACTIVE',  -- ACTIVE | RESOLVED | ARCHIVED
        description  String        DEFAULT '',
        source       LowCardinality(String)   DEFAULT 'MANUAL',  -- GDACS | USGS | RELIEFWEB | MANUAL
        started_at   DateTime      DEFAULT now(),
        resolved_at  Nullable(DateTime),
        created_at   DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, type, status)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 8. claims ─────────────────────────────────────────────────────────────────
  //    Stores disaster-relief claims submitted by receivers.
  //    Separate from transactions — a claim may or may not result in a payout.
  {
    name: "claims",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.claims (
        id                    UUID          DEFAULT generateUUIDv4(),
        claimant_id_hash      String,           -- hashed user ID (privacy)
        claimant_wallet_hash  String,           -- hashed wallet address
        disaster_event_id     UUID,
        description           String,
        image_url             Nullable(String), -- access-controlled, never on dashboard
        -- AI pipeline results
        ai_recommendation     LowCardinality(Nullable(String)),  -- RECOMMEND_APPROVE | RECOMMEND_DENY | RECOMMEND_ESCALATE
        ai_recommendation_confidence Nullable(Float64),
        ai_critic_validation  LowCardinality(Nullable(String)),  -- CONCUR | CHALLENGE
        ai_critic_confidence  Nullable(Float64),
        -- Workflow state
        status                LowCardinality(String) DEFAULT 'SUBMITTED',
                              -- SUBMITTED | AI_REVIEWING | PENDING_HUMAN_APPROVAL | NEEDS_REVIEW
                              -- | APPROVED | DENIED_BY_AI | DENIED_BY_HUMAN | ESCALATED
                              -- | AI_ERROR | AI_TIMEOUT | PAYMENT_FAILED | PAID
        reviewer_id_hash      Nullable(String),  -- hashed collector/admin ID
        reviewed_at           Nullable(DateTime),
        payout_amount         Nullable(Decimal(18, 4)),
        payout_transaction_id Nullable(UUID),    -- FK to transactions.id
        retry_count           UInt8         DEFAULT 0,
        metadata              String        DEFAULT '{}',
        created_at            DateTime      DEFAULT now(),
        updated_at            DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, disaster_event_id, status)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 9. governance_proposals ───────────────────────────────────────────────────
  //    Stores rule-change proposals that community members vote on.
  {
    name: "governance_proposals",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.governance_proposals (
        id              UUID          DEFAULT generateUUIDv4(),
        proposer_id_hash String,          -- hashed donor/user ID
        title           String,
        description     String        DEFAULT '',
        -- The specific rule change being proposed
        rule_field      LowCardinality(String),  -- min_ai_confidence | max_payout_per_recipient | distribution_model | min_disaster_severity | reserve_percentage
        proposed_value  String,       -- new value (stringified for flexibility)
        current_value   String,       -- snapshot of current value at proposal time
        -- Voting tallies (denormalized for fast dashboard queries)
        votes_for       UInt32        DEFAULT 0,
        votes_against   UInt32        DEFAULT 0,
        status          LowCardinality(String) DEFAULT 'ACTIVE',  -- ACTIVE | PASSED | REJECTED | EXPIRED
        expires_at      DateTime,
        resolved_at     Nullable(DateTime),
        created_at      DateTime      DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, status)
      SETTINGS index_granularity = 8192;
    `,
  },

  // 10. Materialized View: transactions → fund_metrics ──────────────────────
  //    Fires on every INSERT into transactions, pre-aggregating into fund_metrics.
  //    The SummingMergeTree engine then merges rows with the same key in the background.
  {
    name: "mv_transactions_to_fund_metrics",
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${DATABASE}.mv_transactions_to_fund_metrics
      TO ${DATABASE}.fund_metrics
      AS
        SELECT
          toDate(created_at)                                        AS date,
          ifNull(toString(disaster_event_id), '')                   AS disaster_event_id,
          type                                                      AS transaction_type,
          sum(amount)                                               AS total_amount,
          count()                                                   AS transaction_count
        FROM ${DATABASE}.transactions
        WHERE status = 'COMPLETED'
        GROUP BY date, disaster_event_id, transaction_type;
    `,
  },

  // 11. Materialized View: claims → claim_metrics ──────────────────────────
  //    Pre-aggregates claim statuses by disaster for the dashboard.
  {
    name: "claim_metrics",
    sql: `
      CREATE TABLE IF NOT EXISTS ${DATABASE}.claim_metrics (
        date                Date,
        disaster_event_id   String  DEFAULT '',
        status              LowCardinality(String),
        claim_count         UInt64
      )
      ENGINE = SummingMergeTree((claim_count))
      ORDER BY (date, disaster_event_id, status)
      SETTINGS index_granularity = 8192;
    `,
  },
  {
    name: "mv_claims_to_claim_metrics",
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${DATABASE}.mv_claims_to_claim_metrics
      TO ${DATABASE}.claim_metrics
      AS
        SELECT
          toDate(created_at)                                        AS date,
          toString(disaster_event_id)                               AS disaster_event_id,
          status                                                    AS status,
          count()                                                   AS claim_count
        FROM ${DATABASE}.claims
        GROUP BY date, disaster_event_id, status;
    `,
  },
];

// Default community rules seed -----------------------------------------------

const DEFAULT_RULES_SQL = `
  INSERT INTO ${DATABASE}.community_rules
    (version, min_ai_confidence, max_payout_per_recipient, distribution_model,
     min_disaster_severity, reserve_percentage, updated_by, updated_at)
  SELECT
    1, 0.85, 500, 'severity_based', 3, 0.10, 'system', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM ${DATABASE}.community_rules WHERE version = 1 LIMIT 1
  );
`;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  console.log(`\n🔌  Connecting to ClickHouse at ${HOST_URL} …`);

  // 1. Verify connectivity
  try {
    await defaultClient.ping();
    console.log("✅  Connected.");
  } catch (err) {
    console.error("❌  Cannot reach ClickHouse:", err);
    process.exit(1);
  }

  // 2. Ensure database exists
  console.log(`\n📦  Ensuring database "${DATABASE}" exists …`);
  await defaultClient.command({
    query: `CREATE DATABASE IF NOT EXISTS ${DATABASE};`,
  });
  console.log(`    ✅  Database ready.`);

  // 3. Run each DDL statement
  console.log("\n🛠   Running DDL migrations …\n");
  for (const { name, sql } of DDL) {
    process.stdout.write(`  → ${name.padEnd(38)} `);
    try {
      await client.command({ query: sql.trim() });
      console.log("✅");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`❌  ${message}`);
      process.exit(1);
    }
  }

  // 4. Seed default community rules (idempotent)
  console.log("\n🌱  Seeding default community rules …");
  try {
    await client.command({ query: DEFAULT_RULES_SQL.trim() });
    console.log("    ✅  Community rules seeded (or already exist).");
  } catch (err) {
    // Non-fatal — the table is already populated
    console.warn("    ⚠️  Could not seed community rules:", err);
  }

  // 5. Done
  console.log("\n🎉  Migration complete.\n");

  await defaultClient.close();
  await client.close();
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

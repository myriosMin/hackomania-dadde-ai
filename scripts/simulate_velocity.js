#!/usr/bin/env node
/**
 * Dadde's Fund — Velocity Simulation Script (Step 9 "Wow" Factor)
 * ================================================================
 *
 * Fires 5,000+ mock historical records into ClickHouse in ~30 seconds:
 *   - 3,000 transactions (contributions, payouts, round-ups, subscriptions)
 *   -   500 AI inferences (recommender + critic pairs)
 *   -   200 governance votes
 *   -    20 disaster events
 *   - 1,280 event log entries
 *
 * The dashboard should update in real-time as this runs, proving that
 * ClickHouse + SummingMergeTree + Materialized Views handle high write-throughput.
 *
 * Usage:
 *   node scripts/simulate_velocity.js                 # default 5000 total
 *   node scripts/simulate_velocity.js --count 10000   # custom count
 *   node scripts/simulate_velocity.js --burst          # all at once (stress test)
 *   node scripts/simulate_velocity.js --sse            # emit SSE progress to stdout
 */

require("dotenv").config();
const { createClient } = require("@clickhouse/client");
const crypto = require("crypto");

// ─── Config ──────────────────────────────────────────────────────────────────

const HOST_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const DATABASE = process.env.CLICKHOUSE_DATABASE ?? "daddes_fund";
const USERNAME = process.env.CLICKHOUSE_USERNAME ?? "default";
const PASSWORD = process.env.CLICKHOUSE_PASSWORD ?? "";

const ARGS = process.argv.slice(2);
const getFlag = (flag) => ARGS.includes(flag);
const getArg = (flag, def) => {
  const idx = ARGS.indexOf(flag);
  return idx >= 0 && ARGS[idx + 1] ? ARGS[idx + 1] : def;
};

const TOTAL_TARGET = parseInt(getArg("--count", "5000"));
const BURST_MODE = getFlag("--burst");
const SSE_MODE = getFlag("--sse");

// ─── ClickHouse Client ──────────────────────────────────────────────────────

const client = createClient({
  url: HOST_URL,
  database: DATABASE,
  username: USERNAME,
  password: PASSWORD,
});

// ─── Constants ───────────────────────────────────────────────────────────────

const DISASTER_TYPES = ["FLOOD", "EARTHQUAKE", "WILDFIRE", "TYPHOON", "OTHER"];
const REGIONS = ["Southeast Asia", "East Asia", "South Asia", "Oceania", "Global"];
const COUNTRIES = [
  "Singapore", "Malaysia", "Indonesia", "Philippines", "Thailand",
  "Vietnam", "Japan", "South Korea", "India", "Bangladesh",
  "Australia", "New Zealand", "Myanmar", "Cambodia", "Nepal",
];
const SOURCES = ["GDACS", "USGS", "RELIEFWEB", "MANUAL"];
const TX_TYPES = ["CONTRIBUTION", "PAYOUT", "ROUND_UP", "SUBSCRIPTION"];
const CLAIM_STATUSES = [
  "SUBMITTED", "AI_REVIEWING", "PENDING_HUMAN_APPROVAL", "NEEDS_REVIEW",
  "APPROVED", "DENIED_BY_AI", "DENIED_BY_HUMAN", "ESCALATED", "PAID",
];
const AI_DECISIONS_REC = ["RECOMMEND_APPROVE", "RECOMMEND_DENY", "RECOMMEND_ESCALATE"];
const AI_DECISIONS_CRITIC = ["CONCUR", "CHALLENGE"];
const EVENT_TYPES = ["API_CALL", "STATE_TRANSITION", "PAYMENT", "AI_INFERENCE"];
const SERVICES = ["contributions", "claims", "governance", "ai", "payments"];

const DISASTER_NAMES = [
  "Singapore Flash Floods 2026", "Jakarta Flooding 2026",
  "Mindanao Earthquake 2026", "Typhoon Haiyan III",
  "Bangkok Flooding 2026", "Nepal Earthquake Aftershock",
  "Australian Bushfires 2026", "Cyclone Mocha Aftermath",
  "Vietnam Monsoon Floods", "Bali Volcanic Eruption",
  "Myanmar Cyclone Nargis III", "Philippine Sea Typhoon",
  "South Korea Landslides 2026", "Japan Tsunami Warning 2026",
  "Malaysia East Coast Floods", "Cambodia Mekong Flooding",
  "India Kerala Floods 2026", "Bangladesh Cyclone Amphan III",
  "Thailand Chiang Mai Fires", "Indonesia Sulawesi Earthquake",
];

const CLAIM_DESCRIPTIONS = [
  "Flood water entered my house, about 2 feet deep. Furniture and appliances damaged.",
  "Earthquake caused cracks in walls and ceiling. Roof partially collapsed.",
  "Wildfire destroyed the shed and damaged the main house exterior.",
  "Typhoon blew off the roof and flooded the ground floor.",
  "Flash flood swept away our stored goods and damaged the kitchen.",
  "Strong winds broke windows and uprooted trees onto our car.",
  "Flooding contaminated our water supply. Need emergency water and sanitation.",
  "Earthquake aftershock worsened existing structural damage. Building condemned.",
  "Volcanic ash covered the crops. Roof sagging from the weight.",
  "Landslide blocked the road and damaged the foundation of our house.",
];

const AI_REASONINGS = [
  "Visible water damage above 1 foot matches the flood claim. Damage consistent with reported severity level.",
  "Structural cracks visible in submitted photo. Consistent with earthquake damage patterns.",
  "Burn marks and charred materials visible. Consistent with wildfire damage claim.",
  "Image shows roof damage and debris consistent with typhoon wind damage.",
  "No visible damage detected in the submitted image. Claim details do not match visual evidence.",
  "Moderate damage visible but below the severity threshold for the claimed disaster category.",
  "Evidence is ambiguous. Some damage visible but cannot confirm correlation with the reported disaster event.",
  "Significant structural damage confirmed. Multiple matched rules indicate high-severity case.",
];

const CRITIC_CRITIQUES = [
  "Recommendation is consistent with visible evidence. No bias detected.",
  "Reasoning is sound. Confidence level appropriately calibrated for the damage shown.",
  "Minor concern: the lighting in the image makes damage assessment less certain.",
  "Recommendation aligns with community rules. No logical inconsistencies found.",
  "Challenge: the image quality is poor and reasoning may overstate visible damage.",
  "Challenge: recommendation confidence seems too high given ambiguous visual evidence.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();
const sha256 = (val) => crypto.createHash("sha256").update(val).digest("hex").slice(0, 32);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weightedPick = (arr, weights) => {
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += weights[i];
    if (r <= sum) return arr[i];
  }
  return arr[arr.length - 1];
};

const randomFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(4);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function randomDate(daysBack = 180) {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function fmtDt(d) {
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function progressBar(current, total, width = 40) {
  const pct = Math.min(current / total, 1);
  const filled = Math.round(pct * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `[${bar}] ${(pct * 100).toFixed(0)}%`;
}

// ─── Generators ──────────────────────────────────────────────────────────────

function generateDisasterEvents(n = 20) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const started = randomDate(180);
    const isResolved = Math.random() < 0.3;
    rows.push({
      id: uuid(),
      name: DISASTER_NAMES[i % DISASTER_NAMES.length],
      type: pick(DISASTER_TYPES),
      severity: randomInt(1, 5),
      region: pick(REGIONS),
      country: pick(COUNTRIES),
      status: isResolved ? "RESOLVED" : "ACTIVE",
      description: `Disaster event: ${DISASTER_NAMES[i % DISASTER_NAMES.length]}. Impact across the region.`,
      source: pick(SOURCES),
      started_at: fmtDt(started),
      resolved_at: isResolved ? fmtDt(new Date(started.getTime() + randomInt(7, 60) * 86400000)) : null,
      created_at: fmtDt(started),
    });
  }
  return rows;
}

function generateTransactions(n, disasterIds) {
  const rows = [];
  const typeWeights = [0.55, 0.20, 0.15, 0.10];
  const statusWeights = {
    CONTRIBUTION: [0.90, 0.05, 0.03, 0.02],
    PAYOUT: [0.70, 0.15, 0.10, 0.05],
    ROUND_UP: [0.92, 0.03, 0.03, 0.02],
    SUBSCRIPTION: [0.88, 0.05, 0.04, 0.03],
  };
  const statuses = ["COMPLETED", "PENDING", "FAILED", "CANCELLED"];

  for (let i = 0; i < n; i++) {
    const txType = weightedPick(TX_TYPES, typeWeights);
    const created = randomDate(180);
    let amount;
    if (txType === "CONTRIBUTION") amount = randomFloat(1, 100);
    else if (txType === "ROUND_UP") amount = randomFloat(0.01, 2.00);
    else if (txType === "SUBSCRIPTION") amount = randomFloat(5, 50);
    else amount = randomFloat(50, 500);

    const disasterEventId = disasterIds.length && Math.random() < 0.7
      ? pick(disasterIds) : null;

    rows.push({
      id: uuid(),
      type: txType,
      amount: amount.toString(),
      currency: "USD",
      sender_wallet_hash: sha256(`donor_${randomInt(1, 500)}`),
      recipient_wallet_hash: txType === "PAYOUT"
        ? sha256(`recipient_${randomInt(1, 200)}`)
        : sha256("fund_wallet"),
      disaster_event_id: disasterEventId,
      open_payments_payment_id: `op_${uuid().slice(0, 12)}`,
      status: weightedPick(statuses, statusWeights[txType]),
      metadata: JSON.stringify({ source: "velocity_simulation", wave: "demo" }),
      created_at: fmtDt(created),
    });
  }
  return rows;
}

function generateClaims(n, disasterIds) {
  const rows = [];
  const statusWeights = [0.05, 0.03, 0.15, 0.07, 0.35, 0.10, 0.08, 0.07, 0.10];

  for (let i = 0; i < n; i++) {
    const created = randomDate(180);
    const status = weightedPick(CLAIM_STATUSES, statusWeights);
    const hasReview = ["APPROVED", "DENIED_BY_HUMAN", "PAID"].includes(status);
    const hasAi = status !== "SUBMITTED";
    const confidence = hasAi ? randomFloat(0.60, 0.99) : null;
    const disasterEventId = disasterIds.length ? pick(disasterIds) : uuid();

    rows.push({
      id: uuid(),
      claimant_id_hash: sha256(`claimant_${randomInt(1, 300)}`),
      claimant_wallet_hash: sha256(`wallet_${randomInt(1, 300)}`),
      disaster_event_id: disasterEventId,
      description: pick(CLAIM_DESCRIPTIONS),
      image_url: `https://storage.example.com/claims/${uuid().slice(0, 8)}.jpg`,
      ai_recommendation: hasAi ? weightedPick(AI_DECISIONS_REC, [0.60, 0.25, 0.15]) : null,
      ai_recommendation_confidence: confidence,
      ai_critic_validation: hasAi ? weightedPick(AI_DECISIONS_CRITIC, [0.80, 0.20]) : null,
      ai_critic_confidence: confidence ? +(confidence - randomFloat(0, 0.05)).toFixed(2) : null,
      status,
      reviewer_id_hash: hasReview ? sha256(`collector_${randomInt(1, 10)}`) : null,
      reviewed_at: hasReview ? fmtDt(new Date(created.getTime() + randomInt(1, 48) * 3600000)) : null,
      payout_amount: status === "PAID" ? randomFloat(50, 500).toString() : null,
      payout_transaction_id: status === "PAID" ? uuid() : null,
      retry_count: ["AI_ERROR", "AI_TIMEOUT"].includes(status) ? randomInt(1, 3) : 0,
      metadata: JSON.stringify({ source: "velocity_simulation" }),
      created_at: fmtDt(created),
      updated_at: fmtDt(new Date(created.getTime() + randomInt(0, 72) * 3600000)),
    });
  }
  return rows;
}

function generateAiInferences(claims) {
  const rows = [];
  for (const claim of claims) {
    if (claim.status === "SUBMITTED") continue;

    const created = new Date(claim.created_at.replace(" ", "T") + "Z");
    const recConf = claim.ai_recommendation_confidence || randomFloat(0.60, 0.99);
    const recDecision = claim.ai_recommendation || pick(AI_DECISIONS_REC);
    const criticVal = claim.ai_critic_validation || pick(AI_DECISIONS_CRITIC);
    const criticConf = claim.ai_critic_confidence || +(recConf - randomFloat(0, 0.05)).toFixed(2);

    const recOutput = {
      decision: recDecision,
      confidence_score: +recConf,
      reasoning: pick(AI_REASONINGS),
      matched_rules: ["flood_damage_visual_confirmation", "severity_threshold_met"].slice(0, randomInt(1, 2)),
      risk_flags: Math.random() < 0.2 ? ["low_image_quality"] : [],
    };

    // Recommender inference
    rows.push({
      id: uuid(),
      claim_id: claim.id,
      agent_type: "RECOMMENDER",
      model: "gemini-2.5-flash",
      input_text: claim.description,
      input_image_url: claim.image_url,
      raw_response: JSON.stringify({ candidates: [{ content: recOutput }] }),
      output_json: JSON.stringify(recOutput),
      decision: recDecision,
      confidence_score: +recConf,
      processing_time_ms: randomInt(800, 4500),
      error: null,
      created_at: fmtDt(new Date(created.getTime() + randomInt(1, 60) * 1000)),
    });

    const criticOutput = {
      validation: criticVal,
      issues_found: criticVal === "CHALLENGE" ? ["confidence_too_high"] : [],
      revised_confidence: +criticConf,
      critique: pick(CRITIC_CRITIQUES),
    };

    // Critic inference
    rows.push({
      id: uuid(),
      claim_id: claim.id,
      agent_type: "CRITIC",
      model: "gemini-2.5-flash",
      input_text: JSON.stringify(recOutput),
      input_image_url: claim.image_url,
      raw_response: JSON.stringify({ candidates: [{ content: criticOutput }] }),
      output_json: JSON.stringify(criticOutput),
      decision: criticVal,
      confidence_score: +criticConf,
      processing_time_ms: randomInt(600, 3500),
      error: null,
      created_at: fmtDt(new Date(created.getTime() + randomInt(61, 120) * 1000)),
    });
  }
  return rows;
}

function generateGovernanceVotes(n, proposalIds) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: uuid(),
      proposal_id: pick(proposalIds),
      voter_id_hash: sha256(`voter_${randomInt(1, 200)}`),
      vote: Math.random() < 0.65 ? "FOR" : "AGAINST",
      created_at: fmtDt(randomDate(90)),
    });
  }
  return rows;
}

function generateEventLog(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: uuid(),
      event_type: pick(EVENT_TYPES),
      service: pick(SERVICES),
      payload: JSON.stringify({
        action: pick(["create", "update", "verify", "evaluate", "approve", "reject", "payout"]),
        duration_ms: randomInt(50, 5000),
        source: "velocity_simulation",
      }),
      error: Math.random() < 0.03 ? "Timeout after 10s" : null,
      created_at: fmtDt(randomDate(180)),
    });
  }
  return rows;
}

// ─── Batch Insert ────────────────────────────────────────────────────────────

async function batchInsert(table, rows, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await client.insert({
      table,
      values: batch,
      format: "JSONEachRow",
    });
  }
}

// ─── SSE helpers ─────────────────────────────────────────────────────────────

function emitProgress(phase, current, total, extra = {}) {
  if (SSE_MODE) {
    const data = JSON.stringify({ phase, current, total, pct: Math.round((current / total) * 100), ...extra });
    process.stdout.write(`data: ${data}\n\n`);
  }
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║    🚀  Dadde's Fund — Velocity Simulation                  ║");
  console.log("║    Proving real-time ClickHouse analytics at scale          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`  Target:     ${TOTAL_TARGET.toLocaleString()} total records`);
  console.log(`  ClickHouse: ${HOST_URL}`);
  console.log(`  Database:   ${DATABASE}`);
  console.log(`  Mode:       ${BURST_MODE ? "BURST (all at once)" : "STREAMING (wave-by-wave)"}`);
  console.log();

  // Verify ClickHouse connectivity
  try {
    await client.ping();
    console.log("  ✅ ClickHouse connected\n");
  } catch (err) {
    console.error(`  ❌ Cannot reach ClickHouse at ${HOST_URL}: ${err.message}`);
    process.exit(1);
  }

  // Calculate distribution (60% tx, 10% claims → 10% ai_inferences from claims, 4% votes, 4% events, 20 disasters)
  const nDisasters = 20;
  const nTransactions = Math.floor(TOTAL_TARGET * 0.60);
  const nClaims = Math.floor(TOTAL_TARGET * 0.10);
  const nVotes = Math.floor(TOTAL_TARGET * 0.04);
  const nEvents = TOTAL_TARGET - nTransactions - nClaims - nVotes - nDisasters;

  console.log("  📊 Distribution:");
  console.log(`     Disaster events:   ${nDisasters}`);
  console.log(`     Transactions:      ${nTransactions.toLocaleString()}`);
  console.log(`     Claims:            ${nClaims.toLocaleString()}`);
  console.log(`     AI Inferences:     ~${(nClaims * 2).toLocaleString()} (2 per claim)`);
  console.log(`     Governance votes:  ${nVotes.toLocaleString()}`);
  console.log(`     Event log entries: ${nEvents.toLocaleString()}`);
  console.log();

  let totalInserted = 0;
  const totalRecords = nDisasters + nTransactions + nClaims + (nClaims * 2) + nVotes + nEvents;

  // Phase 1: Disaster Events
  console.log("  ⚡ Phase 1/6: Disaster events...");
  const disasters = generateDisasterEvents(nDisasters);
  const disasterIds = disasters.map((d) => d.id);
  await batchInsert("disaster_events", disasters);
  totalInserted += nDisasters;
  emitProgress("disasters", totalInserted, totalRecords, { table: "disaster_events", count: nDisasters });
  console.log(`     ✅ ${nDisasters} disasters inserted`);

  // Get existing proposal IDs for votes
  let proposalIds = [];
  try {
    const result = await client.query({
      query: "SELECT toString(id) AS id FROM governance_proposals LIMIT 50",
      format: "JSONEachRow",
    });
    proposalIds = (await result.json()).map((r) => r.id);
  } catch { /* ignore — queries might fail if table empty */ }
  if (!proposalIds.length) {
    proposalIds = Array.from({ length: 10 }, () => uuid());
  }

  if (BURST_MODE) {
    // ── Burst mode: generate all, insert all at once ──
    console.log("\n  ⚡ Generating all data (burst mode)...");

    const transactions = generateTransactions(nTransactions, disasterIds);
    const claims = generateClaims(nClaims, disasterIds);
    const aiInferences = generateAiInferences(claims);
    const votes = generateGovernanceVotes(nVotes, proposalIds);
    const events = generateEventLog(nEvents);

    console.log("  ⚡ Inserting all data...\n");

    await batchInsert("transactions", transactions);
    totalInserted += nTransactions;
    console.log(`     ✅ Transactions:    ${nTransactions.toLocaleString()}`);

    await batchInsert("claims", claims);
    totalInserted += nClaims;
    console.log(`     ✅ Claims:          ${nClaims.toLocaleString()}`);

    await batchInsert("ai_inferences", aiInferences);
    totalInserted += aiInferences.length;
    console.log(`     ✅ AI Inferences:   ${aiInferences.length.toLocaleString()}`);

    await batchInsert("governance_votes", votes);
    totalInserted += nVotes;
    console.log(`     ✅ Votes:           ${nVotes.toLocaleString()}`);

    await batchInsert("events_log", events);
    totalInserted += nEvents;
    console.log(`     ✅ Event log:       ${nEvents.toLocaleString()}`);

  } else {
    // ── Streaming mode: insert in waves (for real-time dashboard demo) ──
    const WAVES = 10;
    const txPerWave = Math.ceil(nTransactions / WAVES);
    const claimsPerWave = Math.ceil(nClaims / WAVES);
    const votesPerWave = Math.ceil(nVotes / WAVES);
    const eventsPerWave = Math.ceil(nEvents / WAVES);

    for (let wave = 0; wave < WAVES; wave++) {
      const waveStart = Date.now();
      console.log(`\n  🌊 Wave ${wave + 1}/${WAVES}`);

      // Transactions
      const waveTx = generateTransactions(
        Math.min(txPerWave, nTransactions - wave * txPerWave),
        disasterIds
      );
      if (waveTx.length) {
        await batchInsert("transactions", waveTx);
        totalInserted += waveTx.length;
      }

      // Claims + AI inferences
      const waveClaims = generateClaims(
        Math.min(claimsPerWave, nClaims - wave * claimsPerWave),
        disasterIds
      );
      if (waveClaims.length) {
        await batchInsert("claims", waveClaims);
        totalInserted += waveClaims.length;

        const waveAi = generateAiInferences(waveClaims);
        if (waveAi.length) {
          await batchInsert("ai_inferences", waveAi);
          totalInserted += waveAi.length;
        }
      }

      // Votes
      const waveVotes = generateGovernanceVotes(
        Math.min(votesPerWave, nVotes - wave * votesPerWave),
        proposalIds
      );
      if (waveVotes.length) {
        await batchInsert("governance_votes", waveVotes);
        totalInserted += waveVotes.length;
      }

      // Events
      const waveEvents = generateEventLog(
        Math.min(eventsPerWave, nEvents - wave * eventsPerWave)
      );
      if (waveEvents.length) {
        await batchInsert("events_log", waveEvents);
        totalInserted += waveEvents.length;
      }

      const waveTime = Date.now() - waveStart;
      const waveCount = waveTx.length + waveClaims.length + waveVotes.length + waveEvents.length;

      emitProgress("wave", wave + 1, WAVES, {
        waveCount,
        totalInserted,
        waveTimeMs: waveTime,
      });

      console.log(`     ${progressBar(wave + 1, WAVES)} — ${waveCount.toLocaleString()} records in ${waveTime}ms`);

      // Small delay between waves to let the dashboard catch up (3s per wave ≈ 30s total)
      if (wave < WAVES - 1) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const rps = Math.round(totalInserted / ((Date.now() - startTime) / 1000));

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  ✅  Simulation Complete                                    ║`);
  console.log(`║  📈  ${totalInserted.toLocaleString().padEnd(8)} records inserted                         ║`);
  console.log(`║  ⏱️   ${elapsed}s elapsed                                      ║`);
  console.log(`║  🔥  ${rps.toLocaleString().padEnd(6)} records/second                           ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  emitProgress("complete", totalInserted, totalInserted, { elapsedSec: +elapsed, rps });

  await client.close();
}

main().catch((err) => {
  console.error("\n❌ Simulation failed:", err.message || err);
  process.exit(1);
});

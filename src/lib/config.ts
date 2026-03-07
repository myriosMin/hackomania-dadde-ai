/**
 * Centralised environment-variable config for the Next.js app.
 *
 * Called once at module load time. If any required variable is missing the
 * process exits immediately with a clear error — no silent undefined access.
 *
 * Client-side vars must be prefixed NEXT_PUBLIC_ and are listed separately.
 */

interface ServerConfig {
  // Gemini AI
  GEMINI_API_KEY: string;

  // ClickHouse (Cloud or local)
  CLICKHOUSE_URL: string;        // Full URL: https://abc.clickhouse.cloud:8443 or http://localhost:8123
  CLICKHOUSE_DATABASE: string;
  CLICKHOUSE_USERNAME: string;
  CLICKHOUSE_PASSWORD: string;

  // Supabase (user data, auth)
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Open Payments — COLLECTOR (fund platform wallet)
  OPEN_PAYMENTS_WALLET_ADDRESS: string;
  OPEN_PAYMENTS_KEY_ID: string;
  OPEN_PAYMENTS_PRIVATE_KEY: string;

  // Open Payments — SENDER test wallet (demo donor)
  SENDER_WALLET_ADDRESS: string;
  SENDER_WALLET_KEY_ID: string;
  SENDER_WALLET_PRIVATE_KEY: string;

  // Open Payments — RECEIVER test wallet (demo aid recipient)
  RECEIVER_WALLET_ADDRESS: string;
  RECEIVER_WALLET_KEY_ID: string;
  RECEIVER_WALLET_PRIVATE_KEY: string;

  // LangFuse (optional)
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST: string;
}

const REQUIRED: (keyof ServerConfig)[] = [
  "GEMINI_API_KEY",
  "CLICKHOUSE_URL",
  "CLICKHOUSE_DATABASE",
  "CLICKHOUSE_USERNAME",
  "CLICKHOUSE_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  // NOTE: Open Payments keys (OPEN_PAYMENTS_WALLET_ADDRESS, OPEN_PAYMENTS_KEY_ID,
  // OPEN_PAYMENTS_PRIVATE_KEY) are intentionally NOT in this list — they are
  // validated at the route level at runtime so the dev server starts even
  // without a test wallet configured.  The /api/payments/* routes return 503 if
  // the keys are absent.  See https://wallet.interledger-test.dev to set up a
  // test wallet and generate keys.
];

function buildConfig(): ServerConfig {
  // Skip validation during `next build` static analysis passes where env vars
  // are not expected to be present.
  const isBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.CI === "true";

  if (!isBuild) {
    // Accept both GEMINI_API_KEY and GOOGLE_API_KEY (Google's convention)
    if (!process.env.GEMINI_API_KEY && process.env.GOOGLE_API_KEY) {
      process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
    }

    const missing = REQUIRED.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error(
        `\n❌  Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n` +
          `Copy .env.example to .env and fill in all values.\n`
      );
      // In Next.js server context throw instead of process.exit so the dev
      // server gives a useful error overlay rather than dying silently.
      throw new Error(`Missing env vars: ${missing.join(", ")}`);
    }
  }

  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",

    // ClickHouse — accepts full URL (e.g. https://abc.clickhouse.cloud:8443)
    CLICKHOUSE_URL: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE ?? "daddes_fund",
    CLICKHOUSE_USERNAME: process.env.CLICKHOUSE_USERNAME ?? "default",
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD ?? "",

    // Supabase
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

    OPEN_PAYMENTS_WALLET_ADDRESS:
      process.env.OPEN_PAYMENTS_WALLET_ADDRESS ?? "",
    OPEN_PAYMENTS_KEY_ID: process.env.OPEN_PAYMENTS_KEY_ID ?? "",
    OPEN_PAYMENTS_PRIVATE_KEY: process.env.OPEN_PAYMENTS_PRIVATE_KEY ?? "",

    SENDER_WALLET_ADDRESS: process.env.SENDER_WALLET_ADDRESS ?? "",
    SENDER_WALLET_KEY_ID: process.env.SENDER_WALLET_KEY_ID ?? "",
    SENDER_WALLET_PRIVATE_KEY: process.env.SENDER_WALLET_PRIVATE_KEY ?? "",

    RECEIVER_WALLET_ADDRESS: process.env.RECEIVER_WALLET_ADDRESS ?? "",
    RECEIVER_WALLET_KEY_ID: process.env.RECEIVER_WALLET_KEY_ID ?? "",
    RECEIVER_WALLET_PRIVATE_KEY: process.env.RECEIVER_WALLET_PRIVATE_KEY ?? "",

    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_HOST:
      process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
  };
}

/** Server-only config. Never import this in client components. */
export const config = buildConfig();

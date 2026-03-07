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

  // ClickHouse
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_PORT: number;
  CLICKHOUSE_DATABASE: string;
  CLICKHOUSE_USERNAME: string;
  CLICKHOUSE_PASSWORD: string;

  // Open Payments
  OPEN_PAYMENTS_WALLET_ADDRESS: string;
  OPEN_PAYMENTS_KEY_ID: string;
  OPEN_PAYMENTS_PRIVATE_KEY: string;

  // LangFuse (optional)
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST: string;
}

const REQUIRED: (keyof ServerConfig)[] = [
  "GEMINI_API_KEY",
  "CLICKHOUSE_HOST",
  "CLICKHOUSE_DATABASE",
  "CLICKHOUSE_USERNAME",
  "CLICKHOUSE_PASSWORD",
  "OPEN_PAYMENTS_WALLET_ADDRESS",
  "OPEN_PAYMENTS_KEY_ID",
  "OPEN_PAYMENTS_PRIVATE_KEY",
];

function buildConfig(): ServerConfig {
  // Skip validation during `next build` static analysis passes where env vars
  // are not expected to be present.
  const isBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.CI === "true";

  if (!isBuild) {
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
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",

    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST ?? "localhost",
    CLICKHOUSE_PORT: parseInt(process.env.CLICKHOUSE_PORT ?? "8123", 10),
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE ?? "daddes_fund",
    CLICKHOUSE_USERNAME: process.env.CLICKHOUSE_USERNAME ?? "default",
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD ?? "",

    OPEN_PAYMENTS_WALLET_ADDRESS:
      process.env.OPEN_PAYMENTS_WALLET_ADDRESS ?? "",
    OPEN_PAYMENTS_KEY_ID: process.env.OPEN_PAYMENTS_KEY_ID ?? "",
    OPEN_PAYMENTS_PRIVATE_KEY: process.env.OPEN_PAYMENTS_PRIVATE_KEY ?? "",

    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_HOST:
      process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
  };
}

/** Server-only config. Never import this in client components. */
export const config = buildConfig();

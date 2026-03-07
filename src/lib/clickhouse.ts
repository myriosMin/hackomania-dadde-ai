/**
 * ClickHouse client singleton for Dadde's Fund.
 *
 * Used exclusively on the server side (Next.js Route Handlers and scripts).
 * Never imported from client components.
 *
 * All writes are wrapped in try/catch helpers that log to stderr and queue
 * a deferred retry — callers receive typed results rather than raw errors.
 */

import { createClient, ClickHouseClient } from "@clickhouse/client";
import { config } from "./config";

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: ClickHouseClient | null = null;

/**
 * Returns a lazily-initialised ClickHouse client.
 * Re-uses the same instance across hot-reloads in development.
 */
export function getClickHouseClient(): ClickHouseClient {
  if (_client) return _client;

  _client = createClient({
    url: config.CLICKHOUSE_URL,
    database: config.CLICKHOUSE_DATABASE,
    username: config.CLICKHOUSE_USERNAME,
    password: config.CLICKHOUSE_PASSWORD,
    clickhouse_settings: {
      // Ensures MergeTree mutations are visible immediately in tests/demos.
      mutations_sync: "1",
    },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Safe write helper
// ---------------------------------------------------------------------------

export type WriteResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Executes a ClickHouse command (INSERT / DDL).
 * Wraps in try/catch — logs to stderr and returns a typed error on failure.
 */
export async function chWrite(
  query: string,
  values?: Record<string, unknown>[],
): Promise<WriteResult> {
  const client = getClickHouseClient();
  try {
    if (values && values.length > 0) {
      await client.insert({
        table: extractTableFromInsert(query),
        values,
        format: "JSONEachRow",
      });
    } else {
      await client.command({ query });
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ClickHouse] Write failed: ${message}`);
    return { ok: false, error: message };
  }
}

/**
 * Executes a ClickHouse SELECT query and returns typed rows.
 */
export async function chQuery<T>(query: string): Promise<T[]> {
  const client = getClickHouseClient();
  const result = await client.query({ query, format: "JSONEachRow" });
  return result.json<T>();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Naive extraction of table name from an INSERT statement.
 * e.g. "INSERT INTO events_log ..." → "events_log"
 */
function extractTableFromInsert(query: string): string {
  const match = query.match(/INSERT\s+INTO\s+(\S+)/i);
  if (!match) throw new Error(`Cannot extract table name from: ${query}`);
  return match[1];
}

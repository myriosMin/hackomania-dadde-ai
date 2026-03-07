import { NextResponse } from "next/server";

const VERSION = "0.1.0";
const START_TIME = Date.now();

/**
 * GET /api/health
 * Returns service status and version info.
 * Used by monitoring and to verify the Next.js server is live.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: VERSION,
    service: "daddes-fund",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
  });
}

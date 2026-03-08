/**
 * POST /api/payments/recommend-recipients
 *
 * AI-driven payout distribution recommendations.
 *
 * Queries Supabase for users with wallet addresses, then calls the agent's
 * /recommend-recipients endpoint to get an AI-recommended distribution plan
 * with justifications for each recipient.
 *
 * Request body:
 * {
 *   disasterEventId?: string,   // Optional: scope recommendations to a disaster
 * }
 *
 * Returns:
 * {
 *   recommendations: Array<{
 *     recipient_id: string,
 *     display_name: string,
 *     wallet_address: string,
 *     suggested_amount: number,
 *     justification: string,
 *     priority: "high" | "medium" | "low"
 *   }>,
 *   total_recommended: number,
 *   reasoning: string,
 *   fund_available: number,
 *   agent_text: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { chQuery } from "@/lib/clickhouse";

export const runtime = "nodejs";

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

interface FundBalance {
  available: number;
}

async function getFundBalance(): Promise<number> {
  try {
    const rows = await chQuery<FundBalance>(`
      SELECT
        (SUM(CASE WHEN type = 'CONTRIBUTION' AND status = 'COMPLETED' THEN amount ELSE 0 END) -
         SUM(CASE WHEN type = 'PAYOUT'       AND status = 'COMPLETED' THEN amount ELSE 0 END)
        ) AS available
      FROM transactions
    `);
    return rows[0]?.available ?? 0;
  } catch {
    return 0;
  }
}

export async function POST(req: NextRequest) {
  let body: { disasterEventId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  // 1. Fetch eligible recipients from Supabase (users with wallet addresses)
  const supabase = getSupabaseAdmin();
  const { data: recipients, error: recipientsError } = await supabase
    .from("profiles")
    .select("id, display_name, wallet_address, bio")
    .not("wallet_address", "is", null)
    .neq("wallet_address", "")
    .eq("role", "user");

  if (recipientsError) {
    return NextResponse.json(
      { error: "Failed to fetch recipients", detail: recipientsError.message },
      { status: 500 },
    );
  }

  if (!recipients || recipients.length === 0) {
    return NextResponse.json(
      { error: "No eligible recipients found with wallet addresses" },
      { status: 404 },
    );
  }

  // 2. Get fund balance
  const fundAvailable = await getFundBalance();

  // 3. Get disaster context if provided
  let disasterName = "";
  let disasterType = "";
  let disasterDescription = "";
  let disasterSeverity = 5;
  let region = "";

  if (body.disasterEventId) {
    try {
      const disasters = await chQuery<{
        name: string;
        type: string;
        description: string;
        severity: number;
        region: string;
        country: string;
      }>(
        `SELECT name, type, description, severity, region, country FROM disaster_events WHERE id = '${body.disasterEventId}' LIMIT 1`
      );
      if (disasters.length > 0) {
        const d = disasters[0];
        disasterName = d.name;
        disasterType = d.type;
        disasterDescription = d.description;
        disasterSeverity = d.severity;
        region = d.region || d.country;
      }
    } catch {
      // Non-blocking
    }
  }

  // 4. Call the agent's recommend-recipients endpoint
  try {
    const agentRes = await fetch(`${AGENT_URL}/recommend-recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disaster_event_id: body.disasterEventId ?? "",
        disaster_name: disasterName,
        disaster_type: disasterType,
        disaster_description: disasterDescription,
        disaster_severity: disasterSeverity,
        region: region,
        total_fund_available: fundAvailable,
        eligible_recipients: recipients.map((r) => ({
          id: r.id,
          display_name: r.display_name || "Anonymous",
          wallet_address: r.wallet_address,
          bio: r.bio || "",
        })),
      }),
    });

    if (!agentRes.ok) {
      const errText = await agentRes.text();
      throw new Error(`Agent returned ${agentRes.status}: ${errText}`);
    }

    const agentData = await agentRes.json();

    return NextResponse.json({
      recommendations: agentData.recommendations ?? [],
      total_recommended: agentData.total_recommended ?? 0,
      reasoning: agentData.reasoning ?? "",
      fund_available: fundAvailable,
      agent_text: agentData.agent_text ?? "",
    });
  } catch (err) {
    // Fallback: if agent is unavailable, do simple equal distribution
    const maxPerRecipient = 500;
    const reserve = fundAvailable * 0.1;
    const distributable = Math.max(fundAvailable - reserve, 0);
    const perPerson = Math.min(
      distributable / recipients.length,
      maxPerRecipient,
    );

    const fallbackRecs = recipients.map((r) => ({
      recipient_id: r.id,
      display_name: r.display_name || "Anonymous",
      wallet_address: r.wallet_address,
      suggested_amount: Math.round(perPerson * 100) / 100,
      justification: `Equal distribution for disaster relief. ${disasterName ? `Event: ${disasterName}.` : ""} Agent unavailable — using fallback distribution.`,
      priority: "medium" as const,
    }));

    return NextResponse.json({
      recommendations: fallbackRecs,
      total_recommended: Math.round(perPerson * recipients.length * 100) / 100,
      reasoning: `Fallback equal distribution (agent unavailable: ${err instanceof Error ? err.message : "unknown error"}). $${distributable.toFixed(2)} distributable after 10% reserve, split among ${recipients.length} recipients.`,
      fund_available: fundAvailable,
      agent_text: "",
    });
  }
}

/**
 * GET /api/payments/wallet-info
 *
 * Returns the fund (collector) wallet's public info — mainly its currency.
 * The frontend uses this to auto-fill assetCode/assetScale instead of
 * hardcoding USD (which would fail when wallets use EUR, etc).
 *
 * Query parameters:
 *   wallet — (optional) specific wallet URL to resolve (defaults to fund wallet)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCollectorClient } from "@/lib/open-payments";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletUrl =
    searchParams.get("wallet") ||
    process.env.OPEN_PAYMENTS_WALLET_ADDRESS;

  if (!walletUrl) {
    return NextResponse.json(
      { error: "No wallet address configured" },
      { status: 503 },
    );
  }

  try {
    const client = await getCollectorClient();
    const wallet = await client.walletAddress.get({ url: walletUrl });

    return NextResponse.json({
      id: wallet.id,
      publicName: wallet.publicName,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
      authServer: wallet.authServer,
      resourceServer: wallet.resourceServer,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WalletInfo] Error resolving wallet:", message);
    return NextResponse.json(
      { error: "Failed to resolve wallet address", detail: message },
      { status: 502 },
    );
  }
}

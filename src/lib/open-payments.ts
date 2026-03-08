/**
 * Open Payments SDK client + helper utilities for Dadde's Fund.
 *
 * Implements:
 *   - Authenticated / unauthenticated client factory
 *   - Incoming payment creation (contributions)
 *   - Grant request helpers
 *   - Outgoing payment creation (payouts)
 *   - Recurring grant creation (subscriptions)
 *   - Transaction logging to ClickHouse
 *
 * IMPORTANT: Server-side only. Never import from client components.
 *
 * Docs: https://openpayments.dev
 */

import {
  createAuthenticatedClient,
  isPendingGrant,
  isFinalizedGrantWithAccessToken,
  type AuthenticatedClient,
} from "@interledger/open-payments";
import { createHash, createPrivateKey } from "crypto";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { chWrite } from "./clickhouse";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContributeParams {
  /**
   * Donor's wallet address (ILP wallet URL, e.g. http://ilp.interledger-test.dev/test-min).
   * Optional — defaults to SENDER_WALLET_ADDRESS from env (test/demo mode).
   */
  senderWalletAddress?: string;
  /** Amount in base units of the currency */
  amount: string;
  /** ISO 4217 currency code, e.g. "USD" */
  assetCode: string;
  /** Asset scale — e.g. 2 means amount is in cents */
  assetScale: number;
  /** Full URL the IDP will redirect back to after consent.
   * Optional — omit it to skip IDP redirect (test/server-side flow). */
  redirectUrl?: string;
  /** Optional reference to a specific disaster event */
  disasterEventId?: string;
}

export interface PayoutParams {
  /** Claim ID from ClickHouse */
  claimId: string;
  /**
   * Receiver's wallet address.
   * Optional — defaults to RECEIVER_WALLET_ADDRESS from env (test/demo mode).
   */
  receiverWalletAddress?: string;
  /** Amount in base units */
  amount: string;
  assetCode: string;
  assetScale: number;
  /** Disaster event this payout relates to */
  disasterEventId?: string;
}

export interface SubscribeParams {
  /**
   * Donor's wallet address.
   * Optional — defaults to SENDER_WALLET_ADDRESS from env (test/demo mode).
   */
  senderWalletAddress?: string;
  /** Monthly pledge amount in base units */
  pledgeAmount: string;
  assetCode: string;
  assetScale: number;
  /** ISO 8601 repeating interval — e.g. R/2026-03-01T00:00:00Z/P1M */
  interval: string;
  redirectUrl: string;
}

export interface GrantRedirectResult {
  /** URL to redirect the user to for IDP consent */
  redirectUrl: string;
  /** State token to verify the callback */
  continueToken: string;
  continueUri: string;
}

export interface PayoutResult {
  paymentId: string;
  status: "COMPLETED" | "FAILED";
}

// ---------------------------------------------------------------------------
// Multi-wallet client factory
// ---------------------------------------------------------------------------

/** Cache of authenticated clients keyed by wallet address URL.
 *  Persisted on globalThis to survive Next.js dev hot-reloads. */
const _globalClients = globalThis as unknown as { __opClients?: Map<string, AuthenticatedClient> };
if (!_globalClients.__opClients) _globalClients.__opClients = new Map();
const _clients = _globalClients.__opClients;

/**
 * Resolve a private key from various formats:
 *   - PEM text (starts with -----BEGIN)
 *   - File path to a PEM file
 *   - Base64-encoded PKCS#8 DER (as exported by wallet.interledger-test.dev)
 *
 * Matches the tested implementation in examples/openpayments/src/client.ts.
 */
async function resolvePrivateKey(raw: string): Promise<string | ReturnType<typeof createPrivateKey>> {
  const trimmed = raw.trim();

  // PEM provided inline
  if (trimmed.startsWith("-----BEGIN")) {
    return trimmed;
  }

  // PEM provided as a file path
  if (existsSync(trimmed)) {
    const pem = await readFile(trimmed, "utf8");
    return pem.trim();
  }

  // Base64-encoded DER (PKCS#8) — common format from dev-wallet UIs.
  // Convert to a KeyObject so the SDK can sign requests.
  const candidate = trimmed.replace(/\s+/g, "");
  const looksBase64 = /^[A-Za-z0-9+/]+=*$/.test(candidate) && candidate.length % 4 === 0;
  if (looksBase64) {
    try {
      const der = Buffer.from(candidate, "base64");
      return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
    } catch {
      // Fall through to error below.
    }
  }

  throw new Error(
    "Invalid private key. Provide PEM text, a PEM file path, or a base64-encoded PKCS#8 DER key.",
  );
}

/**
 * Returns an authenticated Open Payments client for any wallet given its
 * credentials.  Clients are cached for the process lifetime.
 *
 * Accepts the private key as a raw PKCS#8 base64 DER string (as exported by
 * wallet.interledger-test.dev) or as a PEM-encoded string.
 */
export async function getClientForWallet(
  walletAddressUrl: string,
  keyId: string,
  privateKeyRaw: string,
): Promise<AuthenticatedClient> {
  const cached = _clients.get(walletAddressUrl);
  if (cached) return cached;

  const client = await createAuthenticatedClient({
    walletAddressUrl,
    privateKey: await resolvePrivateKey(privateKeyRaw),
    keyId,
  });

  _clients.set(walletAddressUrl, client);
  return client;
}

/**
 * Authenticated client for the fund's COLLECTOR wallet (platform-controlled).
 * Used for creating incoming payments on the fund and sending outgoing payouts.
 */
export async function getCollectorClient(): Promise<AuthenticatedClient> {
  const address = process.env.OPEN_PAYMENTS_WALLET_ADDRESS;
  const keyId   = process.env.OPEN_PAYMENTS_KEY_ID;
  const pk      = process.env.OPEN_PAYMENTS_PRIVATE_KEY;
  if (!address || !keyId || !pk) {
    throw new Error(
      "Missing Open Payments environment variables. Set OPEN_PAYMENTS_WALLET_ADDRESS, " +
        "OPEN_PAYMENTS_KEY_ID, and OPEN_PAYMENTS_PRIVATE_KEY in .env",
    );
  }
  return getClientForWallet(address, keyId, pk);
}

/**
 * Authenticated client for the test SENDER wallet (demo donor).
 * Falls back to COLLECTOR credentials if SENDER_WALLET_* is not set.
 */
export async function getSenderClient(
  overrideAddress?: string,
  overrideKeyId?: string,
  overridePrivateKey?: string,
): Promise<AuthenticatedClient> {
  const address = overrideAddress    ?? process.env.SENDER_WALLET_ADDRESS    ?? process.env.OPEN_PAYMENTS_WALLET_ADDRESS;
  const keyId   = overrideKeyId      ?? process.env.SENDER_WALLET_KEY_ID     ?? process.env.OPEN_PAYMENTS_KEY_ID;
  const pk      = overridePrivateKey ?? process.env.SENDER_WALLET_PRIVATE_KEY ?? process.env.OPEN_PAYMENTS_PRIVATE_KEY;
  if (!address || !keyId || !pk) {
    throw new Error("Missing SENDER_WALLET_* env vars (and no OPEN_PAYMENTS_* fallback found)");
  }
  return getClientForWallet(address, keyId, pk);
}

/**
 * Authenticated client for the test RECEIVER wallet (demo aid recipient).
 * Used to create an incoming payment on the receiver's side for payouts.
 */
export async function getReceiverClient(
  overrideAddress?: string,
  overrideKeyId?: string,
  overridePrivateKey?: string,
): Promise<AuthenticatedClient> {
  const address = overrideAddress    ?? process.env.RECEIVER_WALLET_ADDRESS;
  const keyId   = overrideKeyId      ?? process.env.RECEIVER_WALLET_KEY_ID;
  const pk      = overridePrivateKey ?? process.env.RECEIVER_WALLET_PRIVATE_KEY;
  if (!address || !keyId || !pk) {
    throw new Error("Missing RECEIVER_WALLET_* env vars");
  }
  return getClientForWallet(address, keyId, pk);
}

/** Backwards-compat alias — resolves to the COLLECTOR client. */
export const getAuthenticatedClient = getCollectorClient;

// ---------------------------------------------------------------------------
// Wallet hash utility (privacy)
// ---------------------------------------------------------------------------

/**
 * One-way SHA-256 hash of a wallet address.
 * Stored in ClickHouse instead of the raw address (recipient anonymisation).
 */
export function hashWalletAddress(walletAddress: string): string {
  return createHash("sha256").update(walletAddress).digest("hex");
}

// ---------------------------------------------------------------------------
// Pending grant store (server-side, in-memory)
// ---------------------------------------------------------------------------

/**
 * The Interledger test wallet always requires interactive grants for
 * outgoing-payment. After the user approves at the IDP, the IDP redirects
 * back to our callback URL with `interact_ref`. The callback needs the
 * continuation state (token, URI, incoming payment URL, etc.) which we
 * couldn't embed in the redirect URL (chicken-and-egg: the redirect URL
 * is part of the grant request, continuation data is in the response).
 *
 * Solution: pre-generate a unique state key, embed it in the redirect URL,
 * and after the grant response save all continuation data keyed by that ID.
 * The callback route retrieves the data using the state key.
 *
 * Entries expire after 15 minutes (cleanup on read).
 */
export interface PendingGrant {
  type: "CONTRIBUTION";
  continueToken: string;
  continueUri: string;
  incomingPaymentUrl: string;
  senderWalletAddress: string;
  amount: string;
  assetCode: string;
  assetScale: number;
  disasterEventId?: string;
  createdAt: number;
}

/**
 * Pending state for a payout that is waiting for the collector admin to
 * approve the interactive outgoing-payment grant at the IDP.
 */
export interface PendingPayout {
  type: "PAYOUT";
  continueToken: string;
  continueUri: string;
  quoteId: string;
  collectorResourceServer: string;
  collectorWalletId: string;
  receiverIncomingUrl: string;
  receiverIncomingAccessToken: string;
  claimId: string;
  disasterEventId?: string;
  collectorAddress: string;
  receiverAddress: string;
  debitAmount: { value: string; assetCode: string; assetScale: number };
  createdAt: number;
}

/**
 * Pending state for a subscription that is waiting for the donor to
 * approve the recurring outgoing-payment grant at the IDP.
 */
export interface PendingSubscription {
  type: "SUBSCRIPTION";
  continueToken: string;
  continueUri: string;
  incomingPaymentUrl: string;
  senderWalletAddress: string;
  pledgeAmount: string;
  assetCode: string;
  assetScale: number;
  interval: string;
  createdAt: number;
}

type PendingState = PendingGrant | PendingPayout | PendingSubscription;

/** Persisted on globalThis to survive Next.js dev hot-reloads. */
const _globalPending = globalThis as unknown as { __opPendingGrants?: Map<string, PendingState> };
if (!_globalPending.__opPendingGrants) _globalPending.__opPendingGrants = new Map();
const _pendingGrants = _globalPending.__opPendingGrants;
const PENDING_GRANT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function savePendingGrant(stateKey: string, data: PendingGrant): void {
  _pendingGrants.set(stateKey, data);
}

export function savePendingPayout(stateKey: string, data: PendingPayout): void {
  _pendingGrants.set(stateKey, data);
}

export function savePendingSubscription(stateKey: string, data: PendingSubscription): void {
  _pendingGrants.set(stateKey, data);
}

export function getPendingState(stateKey: string): PendingState | undefined {
  const data = _pendingGrants.get(stateKey);
  if (!data) return undefined;
  if (Date.now() - data.createdAt > PENDING_GRANT_TTL_MS) {
    _pendingGrants.delete(stateKey);
    return undefined;
  }
  return data;
}

/** @deprecated Use getPendingState — kept for backwards compat */
export function getPendingGrant(stateKey: string): PendingGrant | undefined {
  const s = getPendingState(stateKey);
  return s?.type === "CONTRIBUTION" ? s : undefined;
}

export function deletePendingGrant(stateKey: string): void {
  _pendingGrants.delete(stateKey);
}

// ---------------------------------------------------------------------------
// Active Subscription Store & Scheduler
// ---------------------------------------------------------------------------

/**
 * After IDP approval, the finalized grant token is saved here so that
 * a background scheduler can create subsequent payments automatically.
 */
export interface ActiveSubscription {
  id: string;
  senderWalletAddress: string;
  /** Finalized grant access token — allows creating outgoing payments. */
  grantAccessToken: string;
  /** Token management URL for rotation (optional). */
  grantManageUrl?: string;
  pledgeAmount: string;
  assetCode: string;
  assetScale: number;
  /** ISO 8601 repeating interval e.g. "R/2026-03-01T00:00:00Z/PT1M" */
  interval: string;
  /** Parsed interval in milliseconds. */
  intervalMs: number;
  lastPaymentAt: number;
  nextPaymentAt: number;
  createdAt: number;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
}

/** Persisted on globalThis to survive Next.js dev hot-reloads. */
const _globalSubs = globalThis as unknown as {
  __opActiveSubs?: Map<string, ActiveSubscription>;
  __opSchedulerTimer?: ReturnType<typeof setInterval> | null;
};
if (!_globalSubs.__opActiveSubs) _globalSubs.__opActiveSubs = new Map();
if (!_globalSubs.__opSchedulerTimer) _globalSubs.__opSchedulerTimer = null;
const _activeSubscriptions = _globalSubs.__opActiveSubs;
let _schedulerTimer = _globalSubs.__opSchedulerTimer;

/**
 * Parse an ISO 8601 duration string (e.g. "PT1M", "P1W", "P1M") to
 * milliseconds. Approximates months as 30 days and years as 365 days.
 */
function parseISO8601Duration(duration: string): number {
  const m = duration.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!m) throw new Error(`Cannot parse ISO 8601 duration: ${duration}`);

  const [, yy, mo, ww, dd, hh, mi, ss] = m.map((v) => parseInt(v) || 0);
  return (
    yy * 365 * 24 * 60 * 60 * 1000 +
    mo * 30 * 24 * 60 * 60 * 1000 +
    ww * 7 * 24 * 60 * 60 * 1000 +
    dd * 24 * 60 * 60 * 1000 +
    hh * 60 * 60 * 1000 +
    mi * 60 * 1000 +
    ss * 1000
  );
}

/**
 * Extract the duration segment from a repeating interval string.
 * "R/2026-03-01T00:00:00Z/PT1M" → "PT1M"
 */
function extractDuration(interval: string): string {
  const parts = interval.split("/");
  return parts[parts.length - 1];
}

export function saveActiveSubscription(sub: ActiveSubscription): void {
  _activeSubscriptions.set(sub.id, sub);
  console.log(
    `[Subscriptions] Active subscription saved: ${sub.id}, next payment at: ${new Date(sub.nextPaymentAt).toISOString()}`,
  );
  ensureSchedulerRunning();
}

export function getActiveSubscriptions(): ActiveSubscription[] {
  return Array.from(_activeSubscriptions.values()).filter((s) => s.status === "ACTIVE");
}

export function cancelActiveSubscription(id: string): boolean {
  const sub = _activeSubscriptions.get(id);
  if (!sub) return false;
  sub.status = "CANCELLED";
  _activeSubscriptions.set(id, sub);
  return true;
}

function ensureSchedulerRunning(): void {
  if (_schedulerTimer) return;
  console.log("[Subscriptions] Starting subscription scheduler (every 30s)");
  const timer = setInterval(async () => {
    try {
      await processSubscriptions();
    } catch (err) {
      console.error("[Subscriptions] Scheduler error:", err);
    }
  }, 30_000);
  _schedulerTimer = timer;
  _globalSubs.__opSchedulerTimer = timer;
}

/**
 * Process all active subscriptions that are due. Called automatically by the
 * scheduler and can also be triggered manually via the API route.
 */
export async function processSubscriptions(): Promise<{
  processed: number;
  errors: string[];
}> {
  const now = Date.now();
  const subs = getActiveSubscriptions();
  let processed = 0;
  const errors: string[] = [];

  for (const sub of subs) {
    if (now < sub.nextPaymentAt) continue; // not yet due

    // Claim this interval BEFORE executing so overlapping ticks skip it
    const dueAt = sub.nextPaymentAt;
    sub.nextPaymentAt = now + sub.intervalMs;
    _activeSubscriptions.set(sub.id, sub);

    try {
      console.log(
        `[Subscriptions] Processing ${sub.id}, was due at ${new Date(dueAt).toISOString()}`,
      );
      await executeSubscriptionPayment(sub);

      sub.lastPaymentAt = Date.now();
      _activeSubscriptions.set(sub.id, sub);

      processed++;
      console.log(
        `[Subscriptions] ${sub.id} paid. Next at: ${new Date(sub.nextPaymentAt).toISOString()}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Subscriptions] Failed ${sub.id}:`, err);
      errors.push(`${sub.id}: ${msg}`);
    }
  }

  if (processed > 0 || errors.length > 0) {
    console.log(`[Subscriptions] Processed ${processed}, errors: ${errors.length}`);
  }
  return { processed, errors };
}

/**
 * Execute a single recurring subscription payment using the stored grant token.
 * Creates a fresh incoming payment, quote, and outgoing payment for each cycle.
 */
async function executeSubscriptionPayment(sub: ActiveSubscription): Promise<void> {
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const senderClient = await getSenderClient(sub.senderWalletAddress).catch(() => getCollectorClient());
  const collectorClient = await getCollectorClient();

  const donorWallet = await senderClient.walletAddress.get({ url: sub.senderWalletAddress });
  const collectorWallet = await collectorClient.walletAddress.get({ url: collectorAddress });

  // 1. New incoming payment on the fund wallet
  const incomingGrant = await collectorClient.grant.request(
    { url: collectorWallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(incomingGrant)) {
    throw new Error("Collector incoming-payment grant must be non-interactive");
  }
  const incomingPayment = await collectorClient.incomingPayment.create(
    { url: collectorWallet.resourceServer, accessToken: incomingGrant.access_token.value },
    {
      walletAddress: collectorWallet.id,
      incomingAmount: {
        value: sub.pledgeAmount,
        assetCode: collectorWallet.assetCode,
        assetScale: collectorWallet.assetScale,
      },
      metadata: { source: "daddes_fund_subscription_recurring", subscriptionId: sub.id },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  );

  // 2. Quote
  const quoteGrant = await senderClient.grant.request(
    { url: donorWallet.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) {
    throw new Error("Quote grant must be non-interactive");
  }
  const quote = await senderClient.quote.create(
    { url: donorWallet.resourceServer, accessToken: quoteGrant.access_token.value },
    {
      walletAddress: donorWallet.id,
      receiver: incomingPayment.id,
      method: "ilp",
      debitAmount: {
        assetCode: donorWallet.assetCode,
        assetScale: donorWallet.assetScale,
        value: sub.pledgeAmount,
      },
    },
  );

  // 3. Outgoing payment using the stored recurring grant token
  const payment = await senderClient.outgoingPayment.create(
    { url: donorWallet.resourceServer, accessToken: sub.grantAccessToken },
    {
      walletAddress: donorWallet.id,
      quoteId: quote.id,
      metadata: { source: "daddes_fund_subscription_recurring", subscriptionId: sub.id, interval: sub.interval },
    },
  );

  // 4. Complete incoming payment
  if (!payment.failed) {
    try {
      await collectorClient.incomingPayment.complete({
        url: incomingPayment.id,
        accessToken: incomingGrant.access_token.value,
      });
    } catch (err) {
      console.error("[Subscriptions] Failed to complete incoming payment (non-fatal):", err);
    }
  }

  // 5. Log to ClickHouse
  const txResult = await chWrite("INSERT INTO transactions", [
    {
      type: "SUBSCRIPTION",
      amount: Number(sub.pledgeAmount) / Math.pow(10, sub.assetScale),
      currency: sub.assetCode,
      sender_wallet_hash: hashWalletAddress(sub.senderWalletAddress),
      recipient_wallet_hash: hashWalletAddress(collectorAddress),
      disaster_event_id: null,
      open_payments_payment_id: payment.id,
      status: payment.failed ? "FAILED" : "COMPLETED",
      metadata: JSON.stringify({ quote_id: quote.id, interval: sub.interval, recurring: true }),
    },
  ]);
  if (!txResult.ok) {
    console.error("[Subscriptions] ClickHouse log failed:", txResult.error);
  }

  await logEvent("PAYMENT", "payments", {
    action: "recurring_subscription_payment",
    payment_id: payment.id,
    subscription_id: sub.id,
    amount: sub.pledgeAmount,
    interval: sub.interval,
    status: payment.failed ? "FAILED" : "COMPLETED",
  });
}

// ---------------------------------------------------------------------------
// 3a. Contribution Flow (Inbound)
// ---------------------------------------------------------------------------

/**
 * Contribution flow — initiates or fully completes a donation.
 *
 * With test wallets (where we hold all private keys) the grant from the
 * sender's auth server comes back non-interactive, so the full payment
 * executes server-side and `{ completed: true, paymentId }` is returned.
 *
 * With production wallets the grant is interactive — we return the IDP
 * redirect URL and the caller must redirect the browser.  The callback
 * route (`/api/payments/callback`) then completes the flow via
 * `completeContribution()`.
 */
export async function initiateContribution(
  params: ContributeParams,
): Promise<
  | { completed: true; paymentId: string }
  | (GrantRedirectResult & { completed: false; incomingPaymentUrl: string })
> {
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  // Default sender to the test SENDER wallet when no address is provided
  const senderAddress = params.senderWalletAddress ?? process.env.SENDER_WALLET_ADDRESS ?? collectorAddress;

  const collectorClient = await getCollectorClient();
  // Use sender's own client (we have their private key for test wallets)
  const senderClient = await getSenderClient(senderAddress).catch(() => collectorClient);

  // 1. Resolve the collector (fund) wallet
  const collectorWallet = await collectorClient.walletAddress.get({ url: collectorAddress });

  // 3. Resolve the sender's wallet early — we need its currency info
  const senderWallet = await senderClient.walletAddress.get({ url: senderAddress });

  // Use the wallets' actual currencies — never trust client-provided values.
  // The incoming payment is on the collector wallet → use collector's currency.
  // The outgoing payment is from the sender wallet → use sender's currency.
  const collectorAssetCode = collectorWallet.assetCode;
  const collectorAssetScale = collectorWallet.assetScale;
  const senderAssetCode = senderWallet.assetCode;
  const senderAssetScale = senderWallet.assetScale;

  console.log(`[OpenPayments] Contribution: amount=${params.amount}, collector=${collectorAssetCode}/${collectorAssetScale}, sender=${senderAssetCode}/${senderAssetScale}`);

  // 2. Create an incoming payment on the fund's wallet
  const incomingGrant = await collectorClient.grant.request(
    { url: collectorWallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(incomingGrant)) {
    throw new Error("Collector incoming-payment grant must be non-interactive");
  }
  const incomingPayment = await collectorClient.incomingPayment.create(
    { url: collectorWallet.resourceServer, accessToken: incomingGrant.access_token.value },
    {
      walletAddress: collectorWallet.id,
      incomingAmount: { value: params.amount, assetCode: collectorAssetCode, assetScale: collectorAssetScale },
      metadata: { source: "daddes_fund_contribution", disasterEventId: params.disasterEventId ?? null },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  );

  // 4. Request an outgoing-payment grant from the sender's auth server.
  //    The Interledger test wallet auth server ALWAYS requires interactive
  //    grants for outgoing-payment — so we must always include `interact`.
  //    Pre-generate a state key and embed it in the callback URL so the
  //    callback route can retrieve continuation data from the store.
  const stateKey = generateNonce();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  // Build callback URL with parameters the callback route needs:
  const callbackUrl = new URL(`${baseUrl}/api/payments/callback`);
  callbackUrl.searchParams.set("state", stateKey);
  callbackUrl.searchParams.set("return_url", params.redirectUrl ?? "/");
  const redirectUrl = callbackUrl.toString();

  const grantRequest: Parameters<typeof senderClient.grant.request>[1] = {
    access_token: {
      access: [{
        type: "outgoing-payment",
        actions: ["create", "read"],
        identifier: senderWallet.id,
        limits: {
          debitAmount: { value: params.amount, assetCode: senderAssetCode, assetScale: senderAssetScale },
        },
      }],
    },
    interact: {
      start: ["redirect" as const],
      finish: {
        method: "redirect" as const,
        uri: redirectUrl,
        nonce: generateNonce(),
      },
    },
  };

  console.log("[OpenPayments] Requesting outgoing-payment grant with redirect:", redirectUrl);

  const outgoingGrant = await senderClient.grant.request(
    { url: senderWallet.authServer },
    grantRequest,
  );

  // The test wallet always returns a pending (interactive) grant
  if (!isPendingGrant(outgoingGrant)) {
    throw new Error("Expected interactive grant from auth server — got finalized. Check wallet config.");
  }

  // Save continuation state to the pending grants store
  savePendingGrant(stateKey, {
    type: "CONTRIBUTION",
    continueToken: outgoingGrant.continue.access_token.value,
    continueUri: outgoingGrant.continue.uri,
    incomingPaymentUrl: incomingPayment.id,
    senderWalletAddress: senderAddress,
    amount: params.amount,
    assetCode: senderAssetCode,
    assetScale: senderAssetScale,
    disasterEventId: params.disasterEventId,
    createdAt: Date.now(),
  });

  console.log(`[OpenPayments] Pending grant saved with state key: ${stateKey}`);

  return {
    completed: false,
    redirectUrl: outgoingGrant.interact.redirect,
    continueToken: outgoingGrant.continue.access_token.value,
    continueUri: outgoingGrant.continue.uri,
    incomingPaymentUrl: incomingPayment.id,
  };
}

/**
 * Step 4–6 of the contribution flow (called from the IDP callback route):
 *   4. Continue the grant with the IDP-returned interact_ref
 *   5. Execute the outgoing payment
 *   6. Log transaction to ClickHouse
 */
export async function completeContribution(params: {
  senderWalletAddress: string;
  continueToken: string;
  continueUri: string;
  interactRef: string;
  incomingPaymentUrl: string;
  amount: string;
  assetCode: string;
  assetScale: number;
  disasterEventId?: string;
}): Promise<{ paymentId: string }> {
  // Use the sender's own authenticated client to continue their grant
  const senderClient = await getSenderClient(params.senderWalletAddress);

  // 4. Continue the grant — exchange interact_ref for access token
  const finalizedGrant = await senderClient.grant.continue(
    {
      accessToken: params.continueToken,
      url: params.continueUri,
    },
    { interact_ref: params.interactRef },
  );

  if (!isFinalizedGrantWithAccessToken(finalizedGrant)) {
    throw new Error("Grant continuation did not return a finalized grant");
  }

  // 5. Create a quote for the outgoing payment (requires its own grant)
  const donorWallet = await senderClient.walletAddress.get({ url: params.senderWalletAddress });

  const quoteGrant = await senderClient.grant.request(
    { url: donorWallet.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) {
    throw new Error("Quote grant must be non-interactive");
  }

  const quote = await senderClient.quote.create(
    { url: donorWallet.resourceServer, accessToken: quoteGrant.access_token.value },
    {
      walletAddress: donorWallet.id,
      receiver: params.incomingPaymentUrl,
      method: "ilp",
      debitAmount: {
        assetCode: donorWallet.assetCode,
        assetScale: donorWallet.assetScale,
        value: params.amount,
      },
    },
  );

  // 6. Execute the outgoing payment
  const payment = await senderClient.outgoingPayment.create(
    { url: donorWallet.resourceServer, accessToken: finalizedGrant.access_token.value },
    {
      walletAddress: donorWallet.id,
      quoteId: quote.id,
      metadata: { source: "daddes_fund_contribution", disasterEventId: params.disasterEventId ?? null },
    },
  );

  // 6b. Complete (close) the incoming payment so the receiver wallet shows "completed"
  if (!payment.failed) {
    try {
      const collectorClient = await getCollectorClient();
      const collectorAddress2 = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
      const collectorWallet2 = await collectorClient.walletAddress.get({ url: collectorAddress2 });
      const incomingGrant = await collectorClient.grant.request(
        { url: collectorWallet2.authServer },
        { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
      );
      if (isFinalizedGrantWithAccessToken(incomingGrant)) {
        await collectorClient.incomingPayment.complete({
          url: params.incomingPaymentUrl,
          accessToken: incomingGrant.access_token.value,
        });
        console.log("[OpenPayments] Incoming payment completed (closed):", params.incomingPaymentUrl);
      }
    } catch (err) {
      console.error("[OpenPayments] Failed to complete incoming payment (non-fatal):", err);
    }
  }

  // 7. Log to ClickHouse
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const txResult = await chWrite("INSERT INTO transactions", [{
    type: "CONTRIBUTION",
    amount: Number(params.amount) / Math.pow(10, params.assetScale),
    currency: params.assetCode,
    sender_wallet_hash: hashWalletAddress(params.senderWalletAddress),
    recipient_wallet_hash: hashWalletAddress(collectorAddress),
    disaster_event_id: params.disasterEventId ?? null,
    open_payments_payment_id: payment.id,
    status: payment.failed ? "FAILED" : "COMPLETED",
    metadata: JSON.stringify({ quote_id: quote.id }),
  }]);

  if (!txResult.ok) {
    console.error("[OpenPayments] ClickHouse log failed:", txResult.error);
  }

  await logEvent("PAYMENT", "payments", {
    action: "complete_contribution",
    payment_id: payment.id,
    amount: params.amount,
    assetCode: params.assetCode,
    sender_wallet_hash: hashWalletAddress(params.senderWalletAddress),
    status: payment.failed ? "FAILED" : "COMPLETED",
  });

  return { paymentId: payment.id };
}

// ---------------------------------------------------------------------------
// 3b. Payout Flow (Outbound)
// ---------------------------------------------------------------------------

/**
 * Full outbound payout flow:
 *   1. Validate fund balance is sufficient
 *   2. Create a quote on the receiver's wallet
 *   3. Request a non-interactive grant from the fund's auth server
 *   4. Create the outgoing payment
 *   5. Log to ClickHouse with hashed recipient ID
 *
 * NOTE: Caller must have already obtained human-in-the-loop approval.
 */
export async function executePayout(params: PayoutParams): Promise<PayoutResult> {
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  // Default to the test RECEIVER wallet when no receiver address is provided
  const receiverAddress = params.receiverWalletAddress ?? process.env.RECEIVER_WALLET_ADDRESS ?? "";
  if (!receiverAddress) throw new Error("receiverWalletAddress is required (or set RECEIVER_WALLET_ADDRESS)");

  const collectorClient = await getCollectorClient();
  // Use receiver's own client to create their incoming payment (we hold their test key)
  const receiverClient = await getReceiverClient(receiverAddress).catch(() => collectorClient);

  // 1. Resolve both wallets — we need their actual currencies (may differ from params)
  const [receiverWallet, collectorWallet] = await Promise.all([
    receiverClient.walletAddress.get({ url: receiverAddress }).catch(e => { throw new Error(`Step1-resolveReceiverWallet: ${e?.message ?? e}`) }),
    collectorClient.walletAddress.get({ url: collectorAddress }).catch(e => { throw new Error(`Step1-resolveCollectorWallet: ${e?.message ?? e}`) }),
  ]);

  console.log(`[OpenPayments] Payout: receiver=${receiverWallet.assetCode}/${receiverWallet.assetScale}, collector=${collectorWallet.assetCode}/${collectorWallet.assetScale}`);

  // 2. Create incoming payment on receiver's wallet — use receiver's native currency
  const receiverIncomingGrant = await receiverClient.grant.request(
    { url: receiverWallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(receiverIncomingGrant)) {
    throw new Error("Receiver incoming-payment grant should be non-interactive");
  }
  const receiverIncoming = await receiverClient.incomingPayment.create(
    { url: receiverWallet.resourceServer, accessToken: receiverIncomingGrant.access_token.value },
    {
      walletAddress: receiverWallet.id,
      // Use receiver's actual currency — never trust the client-supplied assetCode
      incomingAmount: { value: params.amount, assetCode: receiverWallet.assetCode, assetScale: receiverWallet.assetScale },
      metadata: { claim_id: params.claimId, source: "daddes_fund_payout" },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  );

  // 3. Get a quote first so we know the exact debitAmount in the collector's currency.
  //    This is needed before requesting the outgoing-payment grant (grant limit must
  //    match the collector's currency, not the receiver's).
  const quoteGrant = await collectorClient.grant.request(
    { url: collectorWallet.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) {
    throw new Error("Quote grant must be non-interactive");
  }

  // receiveAmount → receiver gets exactly params.amount in their currency;
  // FX/routing fees are covered by the collector wallet.
  const quote = await collectorClient.quote.create(
    { url: collectorWallet.resourceServer, accessToken: quoteGrant.access_token.value },
    {
      walletAddress: collectorWallet.id,
      receiver: receiverIncoming.id,
      method: "ilp",
      receiveAmount: {
        assetCode: receiverWallet.assetCode,
        assetScale: receiverWallet.assetScale,
        value: params.amount,
      },
    },
  );

  console.log(`[OpenPayments] Quote: debit=${JSON.stringify(quote.debitAmount)}, receive=${JSON.stringify(quote.receiveAmount)}`);

  // 4. Request a non-interactive outgoing-payment grant using the quoted debitAmount
  //    (collector's currency). This must come after the quote so we know the exact amount.
  let fundOutgoingGrant;
  try {
    fundOutgoingGrant = await collectorClient.grant.request(
      { url: collectorWallet.authServer },
      {
        access_token: {
          access: [{
            type: "outgoing-payment",
            actions: ["create", "read"],
            identifier: collectorWallet.id,
            limits: {
              debitAmount: {
                value: quote.debitAmount.value,
                assetCode: quote.debitAmount.assetCode,
                assetScale: quote.debitAmount.assetScale,
              },
            },
          }],
        },
      },
    );
  } catch (e) {
    throw new Error(`Step4-outgoingGrant: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isFinalizedGrantWithAccessToken(fundOutgoingGrant)) {
    // Interactive grant — the test server required human approval even for the platform wallet.
    // Log the redirect URL for debugging then throw.
    const redirect = isPendingGrant(fundOutgoingGrant) ? fundOutgoingGrant.interact?.redirect : "n/a";
    console.error("[OpenPayments] Outgoing grant is interactive (unexpected):", redirect);
    throw new Error(`Collector outgoing-payment grant must be non-interactive for automated payout (got interactive, redirect=${redirect})`);
  }

  // 5. Execute outgoing payment from fund to receiver
  const payment = await collectorClient.outgoingPayment.create(
    { url: collectorWallet.resourceServer, accessToken: fundOutgoingGrant.access_token.value },
    {
      walletAddress: collectorWallet.id,
      quoteId: quote.id,
      metadata: { claim_id: params.claimId, source: "daddes_fund_payout" },
    },
  );

  // 6b. Complete (close) the incoming payment on receiver's wallet
  if (!payment.failed) {
    try {
      await receiverClient.incomingPayment.complete({
        url: receiverIncoming.id,
        accessToken: receiverIncomingGrant.access_token.value,
      });
      console.log("[OpenPayments] Receiver incoming payment completed (closed):", receiverIncoming.id);
    } catch (err) {
      console.error("[OpenPayments] Failed to complete receiver incoming payment (non-fatal):", err);
    }
  }

  const status: "COMPLETED" | "FAILED" = payment.failed ? "FAILED" : "COMPLETED";

  // 7. Log to ClickHouse — recipient stored as hash, never raw wallet address
  //    Log the actual debit amount in the collector's currency (from the quote)
  const txResult = await chWrite("INSERT INTO transactions", [{
    type: "PAYOUT",
    amount: Number(quote.debitAmount.value) / Math.pow(10, quote.debitAmount.assetScale),
    currency: quote.debitAmount.assetCode,
    sender_wallet_hash: hashWalletAddress(collectorAddress),
    recipient_wallet_hash: hashWalletAddress(receiverAddress),
    disaster_event_id: params.disasterEventId ?? null,
    open_payments_payment_id: payment.id,
    status,
    metadata: JSON.stringify({ claim_id: params.claimId, quote_id: quote.id }),
  }]);
  if (!txResult.ok) {
    console.error("[OpenPayments] ClickHouse payout log failed:", txResult.error);
  }

  await logEvent("PAYMENT", "payments", {
    action: "execute_payout",
    payment_id: payment.id,
    claim_id: params.claimId,
    amount: params.amount,
    status,
    recipient_wallet_hash: hashWalletAddress(receiverAddress),
  });

  return { paymentId: payment.id, status };
}

/**
 * Initiates a payout via an interactive outgoing-payment grant.
 *
 * The Interledger test wallet auth server always requires interactive grants
 * for outgoing-payment (even for the platform's own collector wallet). This
 * mirrors the contribution flow: we return an IDP redirect URL, the admin
 * approves at the IDP, then `completePayout` finalises the payment.
 *
 * Flow:
 *   1. Create incoming payment on receiver's wallet (receiver's native currency)
 *   2. Get a quote → determines the collector's debit amount (handles FX)
 *   3. Request interactive outgoing-payment grant → get IDP redirect URL
 *   4. Save pending payout state keyed by a unique state token
 *   5. Return redirect URL for the admin to approve
 *
 * Called from POST /api/payments/payout.
 */
export async function initiatePayout(
  params: PayoutParams & { redirectUrl: string },
): Promise<GrantRedirectResult> {
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const receiverAddress = params.receiverWalletAddress ?? process.env.RECEIVER_WALLET_ADDRESS ?? "";
  if (!receiverAddress) throw new Error("receiverWalletAddress is required (or set RECEIVER_WALLET_ADDRESS)");

  const collectorClient = await getCollectorClient();
  const receiverClient = await getReceiverClient(receiverAddress).catch(() => collectorClient);

  // 1. Resolve both wallets (actual currencies may differ)
  const [receiverWallet, collectorWallet] = await Promise.all([
    receiverClient.walletAddress.get({ url: receiverAddress }),
    collectorClient.walletAddress.get({ url: collectorAddress }),
  ]);
  console.log(`[OpenPayments] initiatePayout: receiver=${receiverWallet.assetCode}/${receiverWallet.assetScale}, collector=${collectorWallet.assetCode}/${collectorWallet.assetScale}`);

  // 2. Create incoming payment on receiver's wallet (receiver's native currency)
  const receiverIncomingGrant = await receiverClient.grant.request(
    { url: receiverWallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(receiverIncomingGrant)) {
    throw new Error("Receiver incoming-payment grant should be non-interactive");
  }
  const receiverIncoming = await receiverClient.incomingPayment.create(
    { url: receiverWallet.resourceServer, accessToken: receiverIncomingGrant.access_token.value },
    {
      walletAddress: receiverWallet.id,
      incomingAmount: { value: params.amount, assetCode: receiverWallet.assetCode, assetScale: receiverWallet.assetScale },
      metadata: { claim_id: params.claimId, source: "daddes_fund_payout" },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  );

  // 3. Get a quote first so we know the exact debitAmount (collector currency)
  const quoteGrant = await collectorClient.grant.request(
    { url: collectorWallet.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) {
    throw new Error("Quote grant must be non-interactive");
  }
  const quote = await collectorClient.quote.create(
    { url: collectorWallet.resourceServer, accessToken: quoteGrant.access_token.value },
    {
      walletAddress: collectorWallet.id,
      receiver: receiverIncoming.id,
      method: "ilp",
      receiveAmount: { assetCode: receiverWallet.assetCode, assetScale: receiverWallet.assetScale, value: params.amount },
    },
  );
  console.log(`[OpenPayments] initiatePayout quote: debit=${JSON.stringify(quote.debitAmount)}, receive=${JSON.stringify(quote.receiveAmount)}`);

  // 4. Request interactive outgoing-payment grant from the collector's auth server
  const stateKey = generateNonce();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL(`${baseUrl}/api/payments/callback`);
  callbackUrl.searchParams.set("state", stateKey);
  callbackUrl.searchParams.set("return_url", params.redirectUrl);

  const outgoingGrant = await collectorClient.grant.request(
    { url: collectorWallet.authServer },
    {
      access_token: {
        access: [{
          type: "outgoing-payment",
          actions: ["create", "read"],
          identifier: collectorWallet.id,
          limits: {
            debitAmount: {
              value: quote.debitAmount.value,
              assetCode: quote.debitAmount.assetCode,
              assetScale: quote.debitAmount.assetScale,
            },
          },
        }],
      },
      interact: {
        start: ["redirect" as const],
        finish: {
          method: "redirect" as const,
          uri: callbackUrl.toString(),
          nonce: generateNonce(),
        },
      },
    },
  );
  if (!isPendingGrant(outgoingGrant)) {
    throw new Error("Expected interactive payout grant from collector auth server — got finalized. Check wallet config.");
  }

  // 5. Save pending payout state
  savePendingPayout(stateKey, {
    type: "PAYOUT",
    continueToken: outgoingGrant.continue.access_token.value,
    continueUri: outgoingGrant.continue.uri,
    quoteId: quote.id,
    collectorResourceServer: collectorWallet.resourceServer,
    collectorWalletId: collectorWallet.id,
    receiverIncomingUrl: receiverIncoming.id,
    receiverIncomingAccessToken: receiverIncomingGrant.access_token.value,
    claimId: params.claimId,
    disasterEventId: params.disasterEventId,
    collectorAddress,
    receiverAddress,
    debitAmount: {
      value: quote.debitAmount.value,
      assetCode: quote.debitAmount.assetCode,
      assetScale: quote.debitAmount.assetScale,
    },
    createdAt: Date.now(),
  });

  console.log(`[OpenPayments] Payout pending grant saved with state key: ${stateKey}`);

  return {
    redirectUrl: outgoingGrant.interact.redirect,
    continueToken: outgoingGrant.continue.access_token.value,
    continueUri: outgoingGrant.continue.uri,
  };
}

/**
 * Completes a payout after the admin approves at the IDP.
 * Called from GET /api/payments/callback when the state type is "PAYOUT".
 */
export async function completePayout(params: {
  continueToken: string;
  continueUri: string;
  interactRef: string;
  quoteId: string;
  collectorResourceServer: string;
  collectorWalletId: string;
  receiverIncomingUrl: string;
  receiverIncomingAccessToken: string;
  claimId: string;
  disasterEventId?: string;
  collectorAddress: string;
  receiverAddress: string;
  debitAmount: { value: string; assetCode: string; assetScale: number };
}): Promise<PayoutResult> {
  const collectorClient = await getCollectorClient();

  // 1. Continue the grant — exchange interact_ref for access token
  const finalizedGrant = await collectorClient.grant.continue(
    { accessToken: params.continueToken, url: params.continueUri },
    { interact_ref: params.interactRef },
  );
  if (!isFinalizedGrantWithAccessToken(finalizedGrant)) {
    throw new Error("Payout grant continuation did not return a finalized grant");
  }

  // 2. Create the outgoing payment using the pre-computed quote
  const payment = await collectorClient.outgoingPayment.create(
    { url: params.collectorResourceServer, accessToken: finalizedGrant.access_token.value },
    {
      walletAddress: params.collectorWalletId,
      quoteId: params.quoteId,
      metadata: { claim_id: params.claimId, source: "daddes_fund_payout" },
    },
  );

  // 3. Complete (close) the incoming payment on the receiver's wallet
  if (!payment.failed) {
    try {
      const receiverClient = await getReceiverClient(params.receiverAddress).catch(() => collectorClient);
      await receiverClient.incomingPayment.complete({
        url: params.receiverIncomingUrl,
        accessToken: params.receiverIncomingAccessToken,
      });
      console.log("[OpenPayments] completePayout: receiver incoming payment closed:", params.receiverIncomingUrl);
    } catch (err) {
      console.error("[OpenPayments] Failed to complete receiver incoming payment (non-fatal):", err);
    }
  }

  const status: "COMPLETED" | "FAILED" = payment.failed ? "FAILED" : "COMPLETED";

  // 4. Log to ClickHouse
  const txResult = await chWrite("INSERT INTO transactions", [{
    type: "PAYOUT",
    amount: Number(params.debitAmount.value) / Math.pow(10, params.debitAmount.assetScale),
    currency: params.debitAmount.assetCode,
    sender_wallet_hash: hashWalletAddress(params.collectorAddress),
    recipient_wallet_hash: hashWalletAddress(params.receiverAddress),
    disaster_event_id: params.disasterEventId ?? null,
    open_payments_payment_id: payment.id,
    status,
    metadata: JSON.stringify({ claim_id: params.claimId, quote_id: params.quoteId }),
  }]);
  if (!txResult.ok) {
    console.error("[OpenPayments] ClickHouse payout log failed:", txResult.error);
  }

  await logEvent("PAYMENT", "payments", {
    action: "complete_payout",
    payment_id: payment.id,
    claim_id: params.claimId,
    amount: params.debitAmount.value,
    status,
    recipient_wallet_hash: hashWalletAddress(params.receiverAddress),
  });

  return { paymentId: payment.id, status };
}

// ---------------------------------------------------------------------------
// 3c. Subscription / Recurring Contributions
// ---------------------------------------------------------------------------

/**
 * Creates a recurring outgoing-payment grant (subscription pledge).
 * Returns a redirect URL for the donor to approve at their IDP.
 *
 * After approval the donor is redirected to redirectUrl and the recurring
 * payments will execute automatically on each interval.
 */
export async function initiateSubscription(params: SubscribeParams): Promise<GrantRedirectResult> {
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const senderAddress = params.senderWalletAddress ?? process.env.SENDER_WALLET_ADDRESS!;

  // Parallelize client creation — both hit JWKS / auth servers independently
  const [senderClient, collectorClient] = await Promise.all([
    getSenderClient(senderAddress).catch(() => getCollectorClient()),
    getCollectorClient(),
  ]);

  // Parallelize wallet resolution
  const [donorWallet, collectorWallet] = await Promise.all([
    senderClient.walletAddress.get({ url: senderAddress }),
    collectorClient.walletAddress.get({ url: collectorAddress }),
  ]);

  // 1. Create an incoming payment on the fund wallet for the first charge
  const incomingGrant = await collectorClient.grant.request(
    { url: collectorWallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(incomingGrant)) {
    throw new Error("Collector incoming-payment grant must be non-interactive");
  }
  const incomingPayment = await collectorClient.incomingPayment.create(
    { url: collectorWallet.resourceServer, accessToken: incomingGrant.access_token.value },
    {
      walletAddress: collectorWallet.id,
      incomingAmount: {
        value: params.pledgeAmount,
        assetCode: collectorWallet.assetCode,
        assetScale: collectorWallet.assetScale,
      },
      metadata: { source: "daddes_fund_subscription" },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  );

  // 2. Build callback URL
  const stateKey = generateNonce();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL(`${baseUrl}/api/payments/callback`);
  callbackUrl.searchParams.set("state", stateKey);
  callbackUrl.searchParams.set("return_url", params.redirectUrl);

  // 3. Request a recurring outgoing-payment grant
  const grant = await senderClient.grant.request(
    { url: donorWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["create", "read", "list"],
            identifier: senderAddress,
            limits: {
              debitAmount: {
                value: params.pledgeAmount,
                assetCode: donorWallet.assetCode,
                assetScale: donorWallet.assetScale,
              },
              interval: params.interval,
            },
          },
        ],
      },
      interact: {
        start: ["redirect"],
        finish: {
          method: "redirect",
          uri: callbackUrl.toString(),
          nonce: generateNonce(),
        },
      },
    },
  );

  if (!isPendingGrant(grant)) {
    throw new Error("Expected a pending interactive grant for subscription");
  }

  // 4. Save pending state so the callback can complete the first payment
  savePendingSubscription(stateKey, {
    type: "SUBSCRIPTION",
    continueToken: grant.continue.access_token.value,
    continueUri: grant.continue.uri,
    incomingPaymentUrl: incomingPayment.id,
    senderWalletAddress: senderAddress,
    pledgeAmount: params.pledgeAmount,
    assetCode: donorWallet.assetCode,
    assetScale: donorWallet.assetScale,
    interval: params.interval,
    createdAt: Date.now(),
  });

  console.log(`[OpenPayments] Subscription pending grant saved with state key: ${stateKey}`);

  // Fire-and-forget — don't delay the redirect after the grant is created
  logEvent("API_CALL", "payments", {
    action: "initiate_subscription",
    sender_wallet_hash: hashWalletAddress(senderAddress),
    pledge_amount: params.pledgeAmount,
    interval: params.interval,
  }).catch(console.error);

  return {
    redirectUrl: grant.interact.redirect,
    continueToken: grant.continue.access_token.value,
    continueUri: grant.continue.uri,
  };
}

/**
 * Complete a subscription after IDP approval (called from callback route).
 * Continues the grant, creates a quote, and executes the first outgoing payment.
 */
export async function completeSubscription(params: {
  senderWalletAddress: string;
  continueToken: string;
  continueUri: string;
  interactRef: string;
  incomingPaymentUrl: string;
  pledgeAmount: string;
  assetCode: string;
  assetScale: number;
  interval: string;
}): Promise<{ paymentId: string }> {
  console.log("[completeSubscription] Starting...");

  // Use the sender's own authenticated client — same as completeContribution
  const senderClient = await getSenderClient(params.senderWalletAddress);
  console.log("[completeSubscription] Got sender client");

  // 1. Continue the grant — exchange interact_ref for access token
  const finalizedGrant = await senderClient.grant.continue(
    {
      accessToken: params.continueToken,
      url: params.continueUri,
    },
    { interact_ref: params.interactRef },
  );
  console.log("[completeSubscription] Grant continued");

  if (!isFinalizedGrantWithAccessToken(finalizedGrant)) {
    throw new Error("Subscription grant continuation did not return a finalized grant");
  }

  // 2. Create a quote
  const donorWallet = await senderClient.walletAddress.get({ url: params.senderWalletAddress });
  console.log("[completeSubscription] Got donor wallet");

  const quoteGrant = await senderClient.grant.request(
    { url: donorWallet.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) {
    throw new Error("Quote grant must be non-interactive");
  }
  console.log("[completeSubscription] Got quote grant");

  const quote = await senderClient.quote.create(
    { url: donorWallet.resourceServer, accessToken: quoteGrant.access_token.value },
    {
      walletAddress: donorWallet.id,
      receiver: params.incomingPaymentUrl,
      method: "ilp",
      debitAmount: {
        assetCode: donorWallet.assetCode,
        assetScale: donorWallet.assetScale,
        value: params.pledgeAmount,
      },
    },
  );
  console.log("[completeSubscription] Quote created:", quote.id);

  // 3. Execute the outgoing payment
  const payment = await senderClient.outgoingPayment.create(
    { url: donorWallet.resourceServer, accessToken: finalizedGrant.access_token.value },
    {
      walletAddress: donorWallet.id,
      quoteId: quote.id,
      metadata: { source: "daddes_fund_subscription", interval: params.interval },
    },
  );
  console.log("[completeSubscription] Payment created:", payment.id, "failed:", payment.failed);

  // 3b. Complete (close) the incoming payment — fire and forget
  if (!payment.failed) {
    (async () => {
      try {
        const collectorClient = await getCollectorClient();
        const cAddr = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
        const cWallet = await collectorClient.walletAddress.get({ url: cAddr });
        const incomingGrant = await collectorClient.grant.request(
          { url: cWallet.authServer },
          { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
        );
        if (isFinalizedGrantWithAccessToken(incomingGrant)) {
          await collectorClient.incomingPayment.complete({
            url: params.incomingPaymentUrl,
            accessToken: incomingGrant.access_token.value,
          });
          console.log("[completeSubscription] Incoming payment completed");
        }
      } catch (err) {
        console.error("[completeSubscription] Failed to complete incoming payment (non-fatal):", err);
      }
    })();
  }

  // 4. Log to ClickHouse — fire and forget so we return the redirect fast
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  chWrite("INSERT INTO transactions", [{
    type: "SUBSCRIPTION",
    amount: Number(params.pledgeAmount) / Math.pow(10, params.assetScale),
    currency: params.assetCode,
    sender_wallet_hash: hashWalletAddress(params.senderWalletAddress),
    recipient_wallet_hash: hashWalletAddress(collectorAddress),
    disaster_event_id: null,
    open_payments_payment_id: payment.id,
    status: payment.failed ? "FAILED" : "COMPLETED",
    metadata: JSON.stringify({ quote_id: quote.id, interval: params.interval }),
  }]).catch((e) => console.error("[completeSubscription] ClickHouse log failed:", e));

  logEvent("PAYMENT", "payments", {
    action: "complete_subscription",
    payment_id: payment.id,
    amount: params.pledgeAmount,
    assetCode: params.assetCode,
    sender_wallet_hash: hashWalletAddress(params.senderWalletAddress),
    interval: params.interval,
    status: payment.failed ? "FAILED" : "COMPLETED",
  }).catch(console.error);

  // 5. Save active subscription so the scheduler can fire subsequent payments
  if (!payment.failed) {
    const durationStr = extractDuration(params.interval);
    const intervalMs = parseISO8601Duration(durationStr);
    const now = Date.now();
    const subscriptionId = `sub_${generateNonce()}`;

    saveActiveSubscription({
      id: subscriptionId,
      senderWalletAddress: params.senderWalletAddress,
      grantAccessToken: finalizedGrant.access_token.value,
      grantManageUrl: (finalizedGrant.access_token as Record<string,unknown>).manage as string | undefined,
      pledgeAmount: params.pledgeAmount,
      assetCode: params.assetCode,
      assetScale: params.assetScale,
      interval: params.interval,
      intervalMs,
      lastPaymentAt: now,
      nextPaymentAt: now + intervalMs,
      createdAt: now,
      status: "ACTIVE",
    });

    console.log(
      `[OpenPayments] Subscription ${subscriptionId} activated. Interval: ${durationStr} (${intervalMs}ms). Next payment at: ${new Date(now + intervalMs).toISOString()}`,
    );
  }

  return { paymentId: payment.id };
}

// ---------------------------------------------------------------------------
// 4. Payment Lifecycle Operations
// ---------------------------------------------------------------------------

/**
 * Get a specific outgoing payment by URL (step 09 equivalent).
 * Used to verify payout status after execution.
 */
export async function getOutgoingPayment(params: {
  url: string;
  accessToken: string;
}) {
  const client = await getCollectorClient();
  return client.outgoingPayment.get({
    url: params.url,
    accessToken: params.accessToken,
  });
}

/**
 * List outgoing payments on the fund wallet (step 10 equivalent).
 * Powers the transparency dashboard — shows all payouts issued.
 */
export async function listOutgoingPayments(params: {
  accessToken: string;
  first?: number;
  cursor?: string;
}) {
  const client = await getCollectorClient();
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const wallet = await client.walletAddress.get({ url: collectorAddress });

  return client.outgoingPayment.list(
    {
      url: wallet.resourceServer,
      walletAddress: wallet.id,
      accessToken: params.accessToken,
    },
    {
      "wallet-address": wallet.id,
      first: params.first ?? 20,
      ...(params.cursor ? { cursor: params.cursor } : {}),
    },
  );
}

/**
 * List incoming payments on the fund wallet (step 11 equivalent).
 * Contribution feed — lets the AI agent verify a donor's contribution history.
 */
export async function listIncomingPayments(params: {
  accessToken: string;
  first?: number;
  cursor?: string;
}) {
  const client = await getCollectorClient();
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const wallet = await client.walletAddress.get({ url: collectorAddress });

  return client.incomingPayment.list(
    {
      url: wallet.resourceServer,
      walletAddress: wallet.id,
      accessToken: params.accessToken,
    },
    {
      "wallet-address": wallet.id,
      first: params.first ?? 20,
      ...(params.cursor ? { cursor: params.cursor } : {}),
    },
  );
}

/**
 * Get a specific incoming payment by URL (step 12 equivalent).
 * Anti-fraud — verify a donation was actually received.
 */
export async function getIncomingPayment(params: {
  url: string;
  accessToken: string;
}) {
  const client = await getCollectorClient();
  return client.incomingPayment.get({
    url: params.url,
    accessToken: params.accessToken,
  });
}

/**
 * Complete (close) an incoming payment (step 13 equivalent).
 * Marks payment as complete so no further funds are accepted.
 * Use to close a donation round once the target is met.
 */
export async function completeIncomingPayment(params: {
  url: string;
  accessToken: string;
}) {
  const client = await getCollectorClient();
  return client.incomingPayment.complete({
    url: params.url,
    accessToken: params.accessToken,
  });
}

/**
 * Rotate an access token (step 15 equivalent).
 * Generates a new token value without invalidating the underlying grant.
 * Use for long-lived subscription tokens — rotate periodically for security.
 */
export async function rotateToken(params: {
  manageUrl: string;
  accessToken: string;
}) {
  const client = await getCollectorClient();
  return client.token.rotate({
    url: params.manageUrl,
    accessToken: params.accessToken,
  });
}

/**
 * Revoke an access token (step 16 equivalent).
 * Permanently invalidates a token. Use when a donor cancels their subscription
 * or after a one-off payout token has been used.
 */
export async function revokeToken(params: {
  manageUrl: string;
  accessToken: string;
}) {
  const client = await getCollectorClient();
  await client.token.revoke({
    url: params.manageUrl,
    accessToken: params.accessToken,
  });
}

/**
 * Cancel (revoke) a grant entirely (step 17 equivalent).
 * Cancels the grant so no future tokens can be issued.
 * Use when a donor cancels their recurring subscription pledge.
 */
export async function revokeGrant(params: {
  continueUri: string;
  continueAccessToken: string;
}) {
  const client = await getCollectorClient();
  await client.grant.cancel({
    url: params.continueUri,
    accessToken: params.continueAccessToken,
  });
}

/**
 * Request an incoming-payment grant on the fund wallet.
 * Returns an access token that can be used for list/get/complete operations
 * on the fund's incoming payments.
 */
export async function getIncomingPaymentGrant(): Promise<string> {
  const client = await getCollectorClient();
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const wallet = await client.walletAddress.get({ url: collectorAddress });

  const grant = await client.grant.request(
    { url: wallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error("Incoming-payment grant must be non-interactive");
  }
  return grant.access_token.value;
}

/**
 * Request an outgoing-payment grant on the fund wallet.
 * Returns an access token that can be used for list/get operations
 * on the fund's outgoing payments.
 */
export async function getOutgoingPaymentGrant(): Promise<string> {
  const client = await getCollectorClient();
  const collectorAddress = process.env.OPEN_PAYMENTS_WALLET_ADDRESS!;
  const wallet = await client.walletAddress.get({ url: collectorAddress });

  const grant = await client.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [{
          type: "outgoing-payment",
          actions: ["create", "read", "list"],
          identifier: wallet.id,
        }],
      },
    },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error("Outgoing-payment grant must be non-interactive");
  }
  return grant.access_token.value;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
}

async function logEvent(
  eventType: string,
  service: string,
  payload: Record<string, unknown>,
  error?: string,
): Promise<void> {
  await chWrite("INSERT INTO events_log", [
    {
      event_type: eventType,
      service,
      payload: JSON.stringify(payload),
      error: error ?? null,
    },
  ]);
}

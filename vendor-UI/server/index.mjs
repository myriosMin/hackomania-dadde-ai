import http from "node:http";
import { randomUUID } from "node:crypto";
import { createPrivateKey } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
} from "@interledger/open-payments";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });

const PORT = Number(process.env.VENDOR_UI_API_PORT || 8787);
const API_BASE_URL = process.env.VENDOR_UI_API_BASE_URL || `http://localhost:${PORT}`;
const DEFAULT_RETURN_URL = process.env.VENDOR_UI_RETURN_URL || "http://localhost:5173/order-complete";
const PENDING_GRANT_TTL_MS = 15 * 60 * 1000;

const pendingGrants = new Map();
const clientCache = new Map();

const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
};

const redirect = (res, url) => {
  res.writeHead(302, {
    Location: url,
    "Access-Control-Allow-Origin": "*",
  });
  res.end();
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return "";
};

const getRequiredEnv = (label, ...keys) => {
  const value = getEnv(...keys);
  if (!value) {
    throw new Error(`Missing required env var for ${label}: ${keys.join(" or ")}`);
  }
  return value;
};

const getWalletConfig = (prefix) => {
  if (prefix === "VENDOR") {
    return {
      walletAddressUrl: normalizeWalletAddress(
        getRequiredEnv("vendor wallet address", "VENDOR_WALLET_ADDRESS", "OPEN_PAYMENTS_WALLET_ADDRESS"),
      ),
      keyId: getRequiredEnv("vendor key id", "VENDOR_WALLET_KEY_ID"),
      privateKey: getRequiredEnv("vendor private key", "VENDOR_WALLET_PRIVATE_KEY"),
    };
  }
  if (prefix === "COMMUNITY") {
    return {
      walletAddressUrl: normalizeWalletAddress(
        getRequiredEnv("community wallet address", "COMMUNITY_WALLET_ADDRESS", "OPEN_PAYMENTS_WALLET_ADDRESS"),
      ),
      keyId: getRequiredEnv("community key id", "COMMUNITY_WALLET_KEY_ID"),
      privateKey: getRequiredEnv("community private key", "COMMUNITY_WALLET_PRIVATE_KEY"),
    };
  }
  return {
    walletAddressUrl: normalizeWalletAddress(
      getRequiredEnv(`${prefix.toLowerCase()} wallet address`, `${prefix}_WALLET_ADDRESS`),
    ),
    keyId: getRequiredEnv(`${prefix.toLowerCase()} key id`, `${prefix}_WALLET_KEY_ID`),
    privateKey: getRequiredEnv(`${prefix.toLowerCase()} private key`, `${prefix}_WALLET_PRIVATE_KEY`),
  };
};

const getClient = async (walletAddressUrl, keyId, privateKey) => {
  const cacheKey = `${walletAddressUrl}::${keyId}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = await createAuthenticatedClient({
    walletAddressUrl,
    keyId,
    privateKey: await resolvePrivateKey(privateKey),
  });
  clientCache.set(cacheKey, client);
  return client;
};

const resolvePrivateKey = async (raw) => {
  const trimmed = String(raw || "").trim();

  if (trimmed.startsWith("-----BEGIN")) {
    return trimmed;
  }

  if (existsSync(trimmed)) {
    const pem = await readFile(trimmed, "utf8");
    return pem.trim();
  }

  const candidate = trimmed.replace(/\s+/g, "");
  const looksBase64 = /^[A-Za-z0-9+/]+=*$/.test(candidate) && candidate.length % 4 === 0;
  if (looksBase64) {
    try {
      const decoded = Buffer.from(candidate, "base64");
      const decodedText = decoded.toString("utf8").trim();
      // Some wallet exports provide base64-encoded PEM text instead of raw DER.
      if (decodedText.startsWith("-----BEGIN")) {
        return decodedText;
      }
      return createPrivateKey({ key: decoded, format: "der", type: "pkcs8" });
    } catch {
      // fall through
    }
  }

  throw new Error("Invalid private key format. Use PEM text, PEM path, or base64 PKCS#8 DER.");
};

const cleanupPendingGrants = () => {
  const now = Date.now();
  for (const [state, value] of pendingGrants.entries()) {
    if (now - value.createdAt > PENDING_GRANT_TTL_MS) {
      pendingGrants.delete(state);
    }
  }
};

const getMostRecentPendingState = () => {
  cleanupPendingGrants();
  let newestState = null;
  let newestCreatedAt = -1;
  for (const [state, value] of pendingGrants.entries()) {
    if (value.createdAt > newestCreatedAt) {
      newestCreatedAt = value.createdAt;
      newestState = state;
    }
  }
  return newestState;
};

const toPositiveIntString = (value, fieldName) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${fieldName} must be a string or number`);
  }
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldName} must be an integer in base units`);
  }
  if (normalized === "0") {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  return normalized;
};

const toNonNegativeIntString = (value, fieldName) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${fieldName} must be a string or number`);
  }
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldName} must be an integer in base units`);
  }
  return normalized;
};

const normalizeWalletAddress = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("$")) return `https://${raw.slice(1)}`;
  return raw;
};

const initiateSplitContribution = async (payload) => {
  const vendorAmount = toPositiveIntString(payload.vendorAmount, "vendorAmount");
  const communityAmount = toNonNegativeIntString(payload.communityAmount ?? "0", "communityAmount");
  const hasCommunityLeg = BigInt(communityAmount) > 0n;
  const orderId = typeof payload.orderId === "string" && payload.orderId.trim() ? payload.orderId.trim() : "checkout-order";
  const customerWalletAddress = normalizeWalletAddress(payload.customerWalletAddress);
  if (!customerWalletAddress) {
    throw new Error("customerWalletAddress is required");
  }

  const senderCfg = getWalletConfig("SENDER");
  const vendorCfg = getWalletConfig("VENDOR");
  const communityCfg = getWalletConfig("COMMUNITY");

  const senderClient = await getClient(senderCfg.walletAddressUrl, senderCfg.keyId, senderCfg.privateKey);
  const vendorClient = await getClient(vendorCfg.walletAddressUrl, vendorCfg.keyId, vendorCfg.privateKey);
  const communityClient = await getClient(communityCfg.walletAddressUrl, communityCfg.keyId, communityCfg.privateKey);

  const senderWallet = await senderClient.walletAddress.get({ url: senderCfg.walletAddressUrl });
  if (customerWalletAddress !== senderWallet.id) {
    throw new Error("Entered wallet does not match configured SENDER_WALLET_ADDRESS");
  }
  const vendorWallet = await vendorClient.walletAddress.get({ url: vendorCfg.walletAddressUrl });
  const communityWallet = await communityClient.walletAddress.get({ url: communityCfg.walletAddressUrl });

  const vendorIncomingGrant = await vendorClient.grant.request(
    { url: vendorWallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(vendorIncomingGrant)) {
    throw new Error("Vendor incoming-payment grant must be non-interactive");
  }

  let communityIncomingGrant;
  if (hasCommunityLeg) {
    communityIncomingGrant = await communityClient.grant.request(
      { url: communityWallet.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "complete"] }] } },
    );
    if (!isFinalizedGrantWithAccessToken(communityIncomingGrant)) {
      throw new Error("Community incoming-payment grant must be non-interactive");
    }
  }

  const vendorIncomingPayment = await vendorClient.incomingPayment.create(
    { url: vendorWallet.resourceServer, accessToken: vendorIncomingGrant.access_token.value },
    {
      walletAddress: vendorWallet.id,
      incomingAmount: {
        value: vendorAmount,
        assetCode: vendorWallet.assetCode,
        assetScale: vendorWallet.assetScale,
      },
      metadata: { source: "vendor_checkout", recipient: "vendor", orderId },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  );

  let communityIncomingPayment = null;
  if (hasCommunityLeg && isFinalizedGrantWithAccessToken(communityIncomingGrant)) {
    communityIncomingPayment = await communityClient.incomingPayment.create(
      { url: communityWallet.resourceServer, accessToken: communityIncomingGrant.access_token.value },
      {
        walletAddress: communityWallet.id,
        incomingAmount: {
          value: communityAmount,
          assetCode: communityWallet.assetCode,
          assetScale: communityWallet.assetScale,
        },
        metadata: { source: "vendor_checkout", recipient: "community", orderId },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    );
  }

  const senderQuoteGrant = await senderClient.grant.request(
    { url: senderWallet.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(senderQuoteGrant)) {
    throw new Error("Sender quote grant must be non-interactive");
  }

  const vendorQuote = await senderClient.quote.create(
    { url: senderWallet.resourceServer, accessToken: senderQuoteGrant.access_token.value },
    {
      method: "ilp",
      walletAddress: senderWallet.id,
      receiver: vendorIncomingPayment.id,
    },
  );

  let communityQuote = null;
  if (communityIncomingPayment) {
    communityQuote = await senderClient.quote.create(
      { url: senderWallet.resourceServer, accessToken: senderQuoteGrant.access_token.value },
      {
        method: "ilp",
        walletAddress: senderWallet.id,
        receiver: communityIncomingPayment.id,
      },
    );
  }

  const combinedDebit = (
    BigInt(vendorQuote.debitAmount.value) + BigInt(communityQuote?.debitAmount.value ?? "0")
  ).toString();
  const state = randomUUID();
  const nonce = randomUUID();
  const returnUrl = typeof payload.redirectUrl === "string" && payload.redirectUrl.trim()
    ? payload.redirectUrl
    : DEFAULT_RETURN_URL;

  // Keep callback URI static (no dynamic query params). Some IdPs require exact
  // redirect URI matching against pre-registered callback URLs.
  const callback = new URL(`${API_BASE_URL}/api/payments/split/callback`);

  let outgoingGrant;
  try {
    outgoingGrant = await senderClient.grant.request(
      { url: senderWallet.authServer },
      {
        access_token: {
          access: [
            {
              identifier: senderWallet.id,
              type: "outgoing-payment",
              actions: ["create", "read"],
              limits: {
                debitAmount: {
                  assetCode: senderWallet.assetCode,
                  assetScale: senderWallet.assetScale,
                  value: combinedDebit,
                },
              },
            },
          ],
        },
        interact: {
          start: ["redirect"],
          finish: {
            method: "redirect",
            uri: callback.toString(),
            nonce,
          },
        },
      },
    );
  } catch (err) {
    const sdkErr = err;
    console.error("[vendor-ui-api] outgoing grant request failed", {
      senderWalletId: senderWallet.id,
      senderAuthServer: senderWallet.authServer,
      callback: callback.toString(),
      debitAmount: combinedDebit,
      error: err,
      errorDescription: sdkErr?.description,
      errorStatus: sdkErr?.status,
      errorCode: sdkErr?.code,
      errorDetails: sdkErr?.details,
      errorValidationErrors: sdkErr?.validationErrors,
      errorResponse: sdkErr?.response,
    });
    throw err;
  }

  if (!isPendingGrant(outgoingGrant)) {
    throw new Error("Expected an interactive sender outgoing-payment grant");
  }

  pendingGrants.set(state, {
    createdAt: Date.now(),
    returnUrl,
    continueUri: outgoingGrant.continue.uri,
    continueToken: outgoingGrant.continue.access_token.value,
    senderWalletAddress: senderWallet.id,
    senderResourceServer: senderWallet.resourceServer,
    vendorQuoteId: vendorQuote.id,
    communityQuoteId: communityQuote?.id ?? null,
    vendorIncomingPaymentId: vendorIncomingPayment.id,
    communityIncomingPaymentId: communityIncomingPayment?.id ?? null,
    vendorIncomingResourceServer: vendorWallet.resourceServer,
    vendorIncomingAccessToken: vendorIncomingGrant.access_token.value,
    communityIncomingResourceServer: communityIncomingPayment ? communityWallet.resourceServer : null,
    communityIncomingAccessToken:
      communityIncomingGrant && isFinalizedGrantWithAccessToken(communityIncomingGrant)
        ? communityIncomingGrant.access_token.value
        : null,
  });

  return { redirectUrl: outgoingGrant.interact.redirect };
};

const completeSplitContribution = async ({ state, interactRef }) => {
  cleanupPendingGrants();
  const pending = pendingGrants.get(state);
  if (!pending) {
    throw new Error("Grant state not found or expired");
  }

  const senderCfg = getWalletConfig("SENDER");
  const senderClient = await getClient(senderCfg.walletAddressUrl, senderCfg.keyId, senderCfg.privateKey);

  const finalized = await senderClient.grant.continue(
    { url: pending.continueUri, accessToken: pending.continueToken },
    { interact_ref: interactRef },
  );
  if (!isFinalizedGrantWithAccessToken(finalized)) {
    throw new Error("Grant continuation failed");
  }

  const vendorPayment = await senderClient.outgoingPayment.create(
    { url: pending.senderResourceServer, accessToken: finalized.access_token.value },
    { walletAddress: pending.senderWalletAddress, quoteId: pending.vendorQuoteId },
  );

  let communityPayment = null;
  if (pending.communityQuoteId) {
    communityPayment = await senderClient.outgoingPayment.create(
      { url: pending.senderResourceServer, accessToken: finalized.access_token.value },
      { walletAddress: pending.senderWalletAddress, quoteId: pending.communityQuoteId },
    );
  }

  if (!vendorPayment.failed) {
    try {
      const vendorCfg = getWalletConfig("VENDOR");
      const vendorClient = await getClient(vendorCfg.walletAddressUrl, vendorCfg.keyId, vendorCfg.privateKey);
      await vendorClient.incomingPayment.complete({
        url: pending.vendorIncomingPaymentId,
        accessToken: pending.vendorIncomingAccessToken,
      });
    } catch {
      // non-fatal
    }
  }

  if (communityPayment && !communityPayment.failed && pending.communityIncomingPaymentId && pending.communityIncomingAccessToken) {
    try {
      const communityCfg = getWalletConfig("COMMUNITY");
      const communityClient = await getClient(communityCfg.walletAddressUrl, communityCfg.keyId, communityCfg.privateKey);
      await communityClient.incomingPayment.complete({
        url: pending.communityIncomingPaymentId,
        accessToken: pending.communityIncomingAccessToken,
      });
    } catch {
      // non-fatal
    }
  }

  pendingGrants.delete(state);

  return {
    vendorPaymentId: vendorPayment.id,
    communityPaymentId: communityPayment?.id ?? null,
    hasFailure: Boolean(vendorPayment.failed || (communityPayment ? communityPayment.failed : false)),
  };
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `${API_BASE_URL}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && requestUrl.pathname === "/health") {
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/payments/split/contribute") {
      const body = await readJsonBody(req);
      const result = await initiateSplitContribution(body);
      json(res, 200, { completed: false, redirectUrl: result.redirectUrl });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/payments/split/callback") {
      const state = requestUrl.searchParams.get("state");
      const interactRef = requestUrl.searchParams.get("interact_ref");
      const idpError = requestUrl.searchParams.get("error");
      const fallbackState = getMostRecentPendingState();
      const resolvedState = state || fallbackState;
      const pending = resolvedState ? pendingGrants.get(resolvedState) : null;
      const returnUrlRaw = pending?.returnUrl || DEFAULT_RETURN_URL;
      const returnUrl = new URL(returnUrlRaw, DEFAULT_RETURN_URL);
      const checkoutUrl = new URL(returnUrl.toString());
      checkoutUrl.pathname = "/checkout";

      if (idpError === "access_denied" || (!interactRef && !idpError)) {
        if (resolvedState) pendingGrants.delete(resolvedState);
        checkoutUrl.searchParams.set("status", "cancelled");
        redirect(res, checkoutUrl.toString());
        return;
      }

      if (!resolvedState || !interactRef) {
        checkoutUrl.searchParams.set("status", "error");
        checkoutUrl.searchParams.set("message", "Missing state or interact_ref");
        redirect(res, checkoutUrl.toString());
        return;
      }

      const result = await completeSplitContribution({ state: resolvedState, interactRef });
      if (result.hasFailure) {
        checkoutUrl.searchParams.set("status", "error");
        checkoutUrl.searchParams.set("message", "One or more split payments failed.");
        checkoutUrl.searchParams.set("vendor_payment_id", result.vendorPaymentId);
        if (result.communityPaymentId) {
          checkoutUrl.searchParams.set("community_payment_id", result.communityPaymentId);
        }
        redirect(res, checkoutUrl.toString());
        return;
      }

      // Success path: skip verification page and land directly on order-complete.
      const successUrl = new URL(returnUrl.toString());
      successUrl.pathname = "/order-complete";
      successUrl.searchParams.set("vendor_payment_id", result.vendorPaymentId);
      if (result.communityPaymentId) {
        successUrl.searchParams.set("community_payment_id", result.communityPaymentId);
      }
      redirect(res, successUrl.toString());
      return;
    }

    json(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("[vendor-ui-api] error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    if (msg.includes("Missing required env var")) {
      json(res, 500, { error: "Payment service configuration error. Please contact support." });
      return;
    }
    json(res, 500, { error: msg });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[vendor-ui-api] listening on http://localhost:${PORT}`);
});

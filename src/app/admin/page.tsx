"use client";

import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  Shield,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  Wallet,
  Send,
  ArrowUp,
  ArrowDown,
  Lock,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface PayoutRequest {
  id: string;
  eventName: string;
  suggestedAmount: number;
  recipients: number;
  reason: string;
  severity: "high" | "medium" | "low";
  aiConfidence: number;
}

interface RecipientRecommendation {
  recipient_id: string;
  display_name: string;
  wallet_address: string;
  suggested_amount: number;
  justification: string;
  priority: "high" | "medium" | "low";
  selected: boolean;
  editedAmount: number;
}

interface VerificationRequest {
  id: string;
  disasterName: string;
  location: string;
}

export default function AdminDashboardPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<"all" | "payouts" | "verifications">("all");

  // Payout execution state
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutTarget, setPayoutTarget] = useState<PayoutRequest | null>(null);
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [walletAssetCode, setWalletAssetCode] = useState("USD");
  const [walletAssetScale, setWalletAssetScale] = useState(2);

  // AI-recommended recipients state
  const [recommendations, setRecommendations] = useState<RecipientRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsReasoning, setRecsReasoning] = useState("");
  const [fundAvailable, setFundAvailable] = useState(0);
  const [processingRecipientId, setProcessingRecipientId] = useState<string | null>(null);

  // Fetch fund wallet currency on mount
  useEffect(() => {
    fetch("/api/payments/wallet-info")
      .then((r) => r.json())
      .then((data) => {
        if (data.assetCode) setWalletAssetCode(data.assetCode);
        if (data.assetScale !== undefined) setWalletAssetScale(data.assetScale);
      })
      .catch(() => {/* keep defaults */ });
  }, []);

  // Handle IDP callback return for payouts
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "success") {
      const paymentId = searchParams.get("payment_id") ?? "";
      setPayoutSuccess(
        `Payout completed successfully!${paymentId ? ` Payment ID: ${paymentId}` : ""}`
      );
    } else if (status === "cancelled") {
      setPayoutError("Payout was cancelled at the IDP. You can try again.");
    } else if (status === "error") {
      const message = searchParams.get("message") ?? "Something went wrong";
      setPayoutError(message);
    }

    router.replace(window.location.pathname);
  }, [searchParams, router]);

  // ── Fetch live data from APIs ──────────────────────────────────────────────
  const [claims, setClaims] = useState<
    {
      id: string;
      disaster_event_id: string;
      description: string;
      ai_recommendation: string | null;
      ai_recommendation_confidence: number | null;
      status: string;
      payout_amount: number | null;
      metadata: Record<string, unknown>;
      disaster: { name: string; type: string; severity: number; region: string } | null;
      created_at: string;
    }[]
  >([]);
  const [fundMetrics, setFundMetrics] = useState<{
    fundBalance: number;
    totalContributions: number;
    totalPayouts: number;
  } | null>(null);
  const [disasterCount, setDisasterCount] = useState(0);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [governanceProposals, setGovernanceProposals] = useState<
    {
      id: string;
      title: string;
      description: string;
      status: string;
      votes_for: number;
      votes_against: number;
      created_at: string;
    }[]
  >([]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const fetchAdminData = async () => {
      setClaimsLoading(true);
      setClaimsError(null);
      try {
        const token = (await import("../../lib/supabase-browser"))
          .getSupabaseBrowser()
          .auth.getSession();
        const session = (await token).data.session;
        const headers: Record<string, string> = {};
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

        const [claimsRes, fundRes, disasterRes, govRes] = await Promise.all([
          fetch("/api/claims?status=PENDING_HUMAN_APPROVAL,NEEDS_REVIEW,ESCALATED,DENIED_BY_AI", { headers }),
          fetch("/api/transparency/fund-metrics"),
          fetch("/api/transparency/disasters"),
          fetch("/api/transparency/proposals"),
        ]);

        if (claimsRes.ok) {
          const data = await claimsRes.json();
          setClaims(data.claims ?? []);
        } else {
          setClaimsError("Failed to fetch claims");
        }

        if (fundRes.ok) {
          const data = await fundRes.json();
          setFundMetrics(data.summary ?? null);
        }

        if (disasterRes.ok) {
          const data = await disasterRes.json();
          setDisasterCount(data.disasters?.length ?? data.active_count ?? 0);
        }

        if (govRes.ok) {
          const data = await govRes.json();
          setGovernanceProposals(data.proposals ?? []);
        }
      } catch (err) {
        setClaimsError(err instanceof Error ? err.message : "Failed to load admin data");
      } finally {
        setClaimsLoading(false);
      }
    };

    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin]);

  // Auth guard: loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex min-h-[calc(100vh-260px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
        <Footer />
      </div>
    );
  }

  // Auth guard: not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex min-h-[calc(100vh-260px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <Lock className="mx-auto mb-4 h-8 w-8 text-gray-400" />
            <h1 className="mb-3 text-2xl font-bold text-gray-900">Login Required</h1>
            <p className="mb-6 text-gray-600">Sign in to access the admin dashboard.</p>
            <Link
              to="/login"
              className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Log In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Auth guard: not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex min-h-[calc(100vh-260px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <Shield className="mx-auto mb-4 h-8 w-8 text-red-400" />
            <h1 className="mb-3 text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="mb-6 text-gray-600">This page is restricted to administrators only.</p>
            <Link
              to="/"
              className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Computed metrics from live data
  const metrics = {
    fundBalance: fundMetrics?.fundBalance ?? 0,
    activeDisasters: disasterCount,
    pendingApprovals: claims.length,
  };

  // Split claims into payouts (approved by AI) and verifications (other review states)
  const payoutClaims = claims.filter(
    (c) => c.status === "PENDING_HUMAN_APPROVAL"
  );
  const verificationClaims = claims.filter(
    (c) => c.status !== "PENDING_HUMAN_APPROVAL"
  );

  const handleApprove = async (id: string, type: "payout" | "verification") => {
    if (type === "payout") {
      const claim = payoutClaims.find((c) => c.id === id);
      if (!claim) return;

      const request: PayoutRequest = {
        id: claim.id,
        eventName: claim.disaster?.name ?? "Unknown Disaster",
        suggestedAmount: claim.payout_amount ?? 0,
        recipients: 1,
        reason: claim.description,
        severity: (claim.disaster?.severity ?? 5) >= 7 ? "high" : (claim.disaster?.severity ?? 5) >= 4 ? "medium" : "low",
        aiConfidence: Math.round((claim.ai_recommendation_confidence ?? 0) * 100),
      };

      setPayoutTarget(request);
      setPayoutError(null);
      setPayoutSuccess(null);
      setRecommendations([]);
      setRecsReasoning("");
      setPayoutModalOpen(true);
      setIsLoadingRecs(true);

      // Fetch AI-recommended recipients from the agent
      try {
        const res = await fetch("/api/payments/recommend-recipients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disasterEventId: request.id }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to fetch recommendations");
        }

        setFundAvailable(data.fund_available ?? 0);
        setRecsReasoning(data.reasoning ?? "");
        setRecommendations(
          (data.recommendations ?? []).map((r: Omit<RecipientRecommendation, "selected" | "editedAmount">) => ({
            ...r,
            selected: true,
            editedAmount: r.suggested_amount,
          }))
        );
      } catch (err) {
        setPayoutError(
          `Failed to load recipient recommendations: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsLoadingRecs(false);
      }
    } else {
      console.log(`Approved ${type}:`, id);
    }
  };

  const handleExecuteSinglePayout = async (rec: RecipientRecommendation) => {
    if (!payoutTarget) return;

    setProcessingRecipientId(rec.recipient_id);
    setPayoutError(null);

    try {
      const baseAmount = String(
        Math.round(rec.editedAmount * Math.pow(10, walletAssetScale))
      );

      const res = await fetch("/api/payments/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: `${payoutTarget.id}-${rec.recipient_id}`,
          receiverWalletAddress: rec.wallet_address,
          amount: baseAmount,
          assetCode: walletAssetCode,
          assetScale: walletAssetScale,
          redirectUrl: window.location.pathname,
          disasterEventId: payoutTarget.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? data.errors?.join(", ") ?? "Payout initiation failed"
        );
      }

      if (data.redirectUrl) {
        // Interactive grant — redirect admin to IDP for consent
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setPayoutError(
        `Payout to ${rec.display_name} failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setProcessingRecipientId(null);
    }
  };

  const toggleRecipient = (recipientId: string) => {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.recipient_id === recipientId ? { ...r, selected: !r.selected } : r
      )
    );
  };

  const updateRecipientAmount = (recipientId: string, amount: number) => {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.recipient_id === recipientId ? { ...r, editedAmount: amount } : r
      )
    );
  };

  const selectedTotal = recommendations
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + r.editedAmount, 0);

  const handleReject = async (id: string, type: "payout" | "verification") => {
    try {
      const session = (
        await (await import("../../lib/supabase-browser")).getSupabaseBrowser().auth.getSession()
      ).data.session;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/claims/${id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "reject", comment: `Rejected by admin (${type})` }),
      });
      if (res.ok) {
        setClaims((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  const handleModify = (id: string) => {
    // Re-use the approve flow (which fetches AI recommendations)
    handleApprove(id, "payout");
  };

  const handleRequestInfo = (id: string) => {
    console.log("Request more info:", id);
  };

  const filteredPayouts = selectedTab === "verifications" ? [] : payoutClaims;
  const filteredVerifications = selectedTab === "payouts" ? [] : verificationClaims;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-teal-600 p-3">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Operations overview and approval queue</p>
          </div>
        </div>

        {/* Payout status banners */}
        {payoutError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Payout failed</p>
              <p className="text-sm text-red-600">{payoutError}</p>
            </div>
            <button onClick={() => setPayoutError(null)} className="text-red-400 hover:text-red-600" aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {payoutSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            <div className="flex-1">
              <p className="font-medium text-green-800">Payout successful!</p>
              <p className="text-sm text-green-600">{payoutSuccess}</p>
            </div>
            <button onClick={() => setPayoutSuccess(null)} className="text-green-400 hover:text-green-600" aria-label="Dismiss success">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-8">
            <p className="text-sm font-semibold text-gray-500">Fund Overview</p>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-center">
              <div
                className="mx-auto flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#0d9488 ${fundMetrics ? Math.min(((fundMetrics.totalPayouts / Math.max(fundMetrics.totalContributions, 1)) * 100) * 3.6, 360) : 0}deg, #e5e7eb 0deg)`,
                }}
              >
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-4xl font-bold text-gray-900">
                    {fundMetrics ? Math.round((fundMetrics.totalPayouts / Math.max(fundMetrics.totalContributions, 1)) * 100) : 0}%
                  </p>
                  <p className="text-xs font-medium text-gray-500">disbursed</p>
                </div>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900">Community Fund</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  Total Contributions: ${(fundMetrics?.totalContributions ?? 0).toLocaleString()}
                </p>
                <p className="mt-4 text-sm text-gray-600">
                  Disbursed <span className="font-semibold text-gray-900">${(fundMetrics?.totalPayouts ?? 0).toLocaleString()}</span>{" "}
                  of <span className="font-semibold text-gray-900">${(fundMetrics?.totalContributions ?? 0).toLocaleString()}</span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${fundMetrics ? Math.round((fundMetrics.totalPayouts / Math.max(fundMetrics.totalContributions, 1)) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <DollarSign className="h-4 w-4" />
                <p className="text-sm font-medium">Community Fund Balance</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">${metrics.fundBalance.toLocaleString()}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">Active Verified Disasters</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeDisasters}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Clock className="h-4 w-4" />
                <p className="text-sm font-medium">Pending Approvals</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.pendingApprovals}</p>
            </div>
          </aside>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Admin Inbox</h2>
              <p className="text-sm text-gray-600">Review requests and take action</p>
            </div>

            <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setSelectedTab("all")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition ${selectedTab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                  }`}
              >
                All ({payoutClaims.length + verificationClaims.length})
              </button>
              <button
                onClick={() => setSelectedTab("payouts")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition ${selectedTab === "payouts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                  }`}
              >
                Payouts ({payoutClaims.length})
              </button>
              <button
                onClick={() => setSelectedTab("verifications")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition ${selectedTab === "verifications" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                  }`}
              >
                Verifications ({verificationClaims.length})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {claimsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                <span className="ml-2 text-sm text-gray-500">Loading claims from ClickHouse…</span>
              </div>
            ) : claimsError ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-800">Data may be delayed</p>
                  <p className="text-sm text-amber-600">{claimsError}</p>
                </div>
              </div>
            ) : claims.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No pending claims in the queue.</p>
              </div>
            ) : (
              <>
                {filteredPayouts.map((claim) => {
                  const meta = claim.metadata as Record<string, unknown> ?? {};
                  const recommendation = (meta.recommendation as Record<string, unknown>) ?? {};
                  const verification = (meta.verification as Record<string, unknown>) ?? {};
                  return (
                    <article key={claim.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-600">AI-Approved Claim</p>
                          <h3 className="text-lg font-semibold text-gray-900">{claim.disaster?.name ?? "Unknown Disaster"}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            {claim.payout_amount != null && (
                              <span className="font-medium text-gray-900">${claim.payout_amount.toLocaleString()}</span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {claim.disaster?.region ?? "Unknown"}
                            </span>
                            <span>AI {Math.round((claim.ai_recommendation_confidence ?? 0) * 100)}%</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              claim.ai_recommendation === "RECOMMEND_APPROVE" ? "bg-green-100 text-green-700" :
                              claim.ai_recommendation === "RECOMMEND_DENY" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>{claim.ai_recommendation ?? claim.status}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{claim.description}</p>
                          {/* AI Reports */}
                          {(recommendation.reasoning || verification.confidence) && (
                            <div className="mt-3 space-y-2">
                              {verification.confidence !== undefined && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
                                  <p className="text-xs font-semibold text-blue-700">Disaster Verification</p>
                                  <p className="text-xs text-blue-600">
                                    Verified: {verification.disaster_verified ? "Yes" : "No"} | Confidence: {Math.round((verification.confidence as number ?? 0) * 100)}%
                                  </p>
                                </div>
                              )}
                              {recommendation.reasoning && (
                                <div className="rounded-lg border border-purple-200 bg-purple-50 p-2">
                                  <p className="text-xs font-semibold text-purple-700">AI Recommendation</p>
                                  <p className="text-xs text-purple-600 line-clamp-3">{String(recommendation.reasoning)}</p>
                                  {Array.isArray(recommendation.risk_flags) && (recommendation.risk_flags as string[]).length > 0 && (
                                    <p className="mt-1 text-xs text-red-600">Risk flags: {(recommendation.risk_flags as string[]).join(", ")}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleApprove(claim.id, "payout")}
                            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                          >
                            <CheckCircle className="mr-1 inline h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleModify(claim.id)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="mr-1 inline h-4 w-4" /> Modify
                          </button>
                          <button
                            onClick={() => handleReject(claim.id, "payout")}
                            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="mr-1 inline h-4 w-4" /> Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {filteredVerifications.map((claim) => {
                  const meta = claim.metadata as Record<string, unknown> ?? {};
                  const verification = (meta.verification as Record<string, unknown>) ?? {};
                  return (
                    <article key={claim.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">{claim.status.replace(/_/g, " ")}</p>
                          <h3 className="text-lg font-semibold text-gray-900">{claim.disaster?.name ?? "Unknown Disaster"}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {claim.disaster?.region ?? "Unknown"}
                            </span>
                            <span>AI {Math.round((claim.ai_recommendation_confidence ?? 0) * 100)}%</span>
                            <span className="text-xs text-gray-400">{new Date(claim.created_at).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{claim.description}</p>
                          {verification.confidence !== undefined && (
                            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                              <p className="text-xs font-semibold text-blue-700">Verification</p>
                              <p className="text-xs text-blue-600">
                                Verified: {verification.disaster_verified ? "Yes" : "No"} | Confidence: {Math.round((verification.confidence as number ?? 0) * 100)}%
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleApprove(claim.id, "verification")}
                            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                          >
                            <CheckCircle className="mr-1 inline h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleRequestInfo(claim.id)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <AlertCircle className="mr-1 inline h-4 w-4" /> Request Info
                          </button>
                          <button
                            onClick={() => handleReject(claim.id, "verification")}
                            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="mr-1 inline h-4 w-4" /> Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </>
            )}
          </div>
        </section>

        {/* Governance Proposals Section */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Governance Proposals</h2>
            <p className="text-sm text-gray-600">Community vote status and rule change requests</p>
          </div>
          {governanceProposals.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No active governance proposals.</p>
          ) : (
            <div className="space-y-3">
              {governanceProposals.map((proposal) => {
                const totalVotes = (proposal.votes_for ?? 0) + (proposal.votes_against ?? 0);
                const forPercentage = totalVotes > 0 ? Math.round(((proposal.votes_for ?? 0) / totalVotes) * 100) : 0;
                return (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{proposal.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          proposal.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                          proposal.status === "PASSED" ? "bg-teal-100 text-teal-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{proposal.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">{proposal.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span className="text-green-600">For: {proposal.votes_for ?? 0}</span>
                        <span className="text-red-600">Against: {proposal.votes_against ?? 0}</span>
                        <span>{forPercentage}% approval</span>
                      </div>
                      {totalVotes > 0 && (
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-red-200">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${forPercentage}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AI-Recommended Recipients Payout Modal */}
        {payoutModalOpen && payoutTarget && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
              <button
                onClick={() => { setPayoutModalOpen(false); setPayoutTarget(null); setRecommendations([]); }}
                className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-2 transition-all hover:bg-gray-200"
                aria-label="Close payout modal"
              >
                <X className="h-5 w-5 text-gray-900" />
              </button>

              <div className="border-b border-gray-200 px-8 pb-4 pt-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-teal-500 p-2">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">AI-Recommended Payouts</h2>
                    <p className="text-sm text-gray-600">{payoutTarget.eventName}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Fund Available</p>
                    <p className="text-lg font-bold text-gray-900">${fundAvailable.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Selected Total</p>
                    <p className="text-lg font-bold text-teal-600">${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Recipients</p>
                    <p className="text-lg font-bold text-gray-900">
                      {recommendations.filter((r) => r.selected).length} / {recommendations.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4">
                {isLoadingRecs ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-teal-500" />
                    <p className="text-sm font-medium text-gray-600">AI agent is analyzing recipients…</p>
                    <p className="mt-1 text-xs text-gray-400">Evaluating disaster context &amp; community rules</p>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Users className="mb-3 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">No eligible recipients found.</p>
                    <p className="mt-1 text-xs text-gray-400">Ensure users have registered wallet addresses.</p>
                  </div>
                ) : (
                  <>
                    {recsReasoning && (
                      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                          <Shield className="h-3.5 w-3.5" />
                          AI Distribution Rationale
                        </p>
                        <p className="text-xs leading-relaxed text-purple-600">{recsReasoning}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {recommendations.map((rec) => (
                        <div
                          key={rec.recipient_id}
                          className={`rounded-xl border-2 p-4 transition-all ${
                            rec.selected
                              ? "border-teal-300 bg-teal-50/50"
                              : "border-gray-200 bg-gray-50 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <label className="mt-1 flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={rec.selected}
                                onChange={() => toggleRecipient(rec.recipient_id)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                title={`Select ${rec.display_name} for payout`}
                              />
                            </label>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900">{rec.display_name}</p>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      rec.priority === "high"
                                        ? "bg-red-100 text-red-700"
                                        : rec.priority === "medium"
                                          ? "bg-orange-100 text-orange-700"
                                          : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {rec.priority}
                                  </span>
                                </div>

                                {/* Editable amount */}
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-500">{walletAssetCode}</span>
                                  <input
                                    type="number"
                                    value={rec.editedAmount}
                                    onChange={(e) =>
                                      updateRecipientAmount(rec.recipient_id, Number(e.target.value))
                                    }
                                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm font-semibold focus:border-teal-500 focus:outline-none"
                                    disabled={!rec.selected}
                                    title={`Payout amount for ${rec.display_name}`}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                                <Wallet className="h-3 w-3" />
                                {rec.wallet_address}
                              </p>

                              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                                {rec.justification}
                              </p>

                              {/* Individual payout button */}
                              {rec.selected && (
                                <button
                                  onClick={() => handleExecuteSinglePayout(rec)}
                                  disabled={processingRecipientId === rec.recipient_id || rec.editedAmount <= 0}
                                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {processingRecipientId === rec.recipient_id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Processing…
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-3 w-3" />
                                      Send {walletAssetCode} {rec.editedAmount.toLocaleString()} via IDP
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-8 py-4">
                {payoutError && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-600">{payoutError}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Each payout requires IDP consent. You will be redirected to authorize.
                  </p>
                  <button
                    onClick={() => { setPayoutModalOpen(false); setPayoutTarget(null); setRecommendations([]); }}
                    className="rounded-lg border-2 border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}


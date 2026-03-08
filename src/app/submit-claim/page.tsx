"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { useAuthFetch } from "../../lib/use-auth-fetch";
import {
  Camera,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  MapPin,
  Clock,
  X,
  AlertCircle,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

interface DisasterEvent {
  id: string;
  name: string;
  type: string;
  severity: number;
  region: string;
  country: string;
  status: string;
}

type ClaimStatus =
  | "DRAFT"
  | "SUBMITTING"
  | "SUBMITTED"
  | "AI_REVIEWING"
  | "PENDING_HUMAN_APPROVAL"
  | "NEEDS_REVIEW"
  | "ESCALATED"
  | "APPROVED"
  | "DENIED_BY_AI"
  | "DENIED_BY_HUMAN"
  | "ERROR";

const STATUS_STEPS: { key: ClaimStatus; label: string }[] = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "AI_REVIEWING", label: "AI Reviewing" },
  { key: "PENDING_HUMAN_APPROVAL", label: "Pending Approval" },
  { key: "APPROVED", label: "Approved" },
];

export default function SubmitClaimPage() {
  const { isAuthenticated, loading: authLoading, preferences } = useAuth();
  const authFetch = useAuthFetch();

  // Form state
  const [description, setDescription] = useState("");
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available disasters
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [disastersLoading, setDisastersLoading] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{
    claimId: string;
    status: ClaimStatus;
    verification: { disaster_verified: boolean; confidence: number };
    recommendation: {
      decision: string;
      confidence_score: number;
      reasoning: string;
      risk_flags: string[];
      suggested_payout: number;
    };
  } | null>(null);

  // Draft save
  const DRAFT_KEY = "dadde_claim_draft";

  // Load draft from localStorage
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.selectedDisaster) setSelectedDisaster(parsed.selectedDisaster);
        if (parsed.walletAddress) setWalletAddress(parsed.walletAddress);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save draft on changes
  useEffect(() => {
    if (claimResult) return; // Don't save once submitted
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ description, selectedDisaster, walletAddress })
      );
    } catch {
      // ignore quota errors
    }
  }, [description, selectedDisaster, walletAddress, claimResult]);

  // Fetch active disasters
  useEffect(() => {
    const fetchDisasters = async () => {
      setDisastersLoading(true);
      try {
        const res = await fetch("/api/transparency/disasters");
        if (res.ok) {
          const data = await res.json();
          setDisasters(
            (data.disasters ?? []).filter(
              (d: DisasterEvent) => d.status === "ACTIVE"
            )
          );
        }
      } catch {
        // non-blocking
      } finally {
        setDisastersLoading(false);
      }
    };
    fetchDisasters();
  }, []);

  // Pre-fill wallet from preferences
  useEffect(() => {
    if (preferences && !walletAddress) {
      // User may have a wallet set in their profile
    }
  }, [preferences, walletAddress]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Image must be smaller than 5MB. Please choose a smaller file.");
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select an image file (JPEG, PNG, etc.).");
      return;
    }

    setImageFile(file);
    setSubmitError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate
    const errors: string[] = [];
    if (!description.trim()) errors.push("Please describe your situation.");
    if (description.length > 2000) errors.push("Description must be 2000 characters or less.");
    if (!selectedDisaster) errors.push("Please select the related disaster event.");
    if (!walletAddress.trim()) errors.push("Please enter your wallet address for potential payout.");

    if (errors.length > 0) {
      setSubmitError(errors.join(" "));
      return;
    }

    setSubmitting(true);

    try {
      // For now, if an image is selected, we pass null for imageUrl
      // (image upload to Supabase Storage would be a future enhancement)
      const imageUrl = imagePreview ? `data:image/placeholder;claimImage=${imageFile?.name}` : undefined;

      const res = await authFetch("/api/claims/submit", {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
          disasterEventId: selectedDisaster,
          walletAddress: walletAddress.trim(),
          imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.errors?.join(", ") ?? data.error ?? "Failed to submit claim"
        );
      }

      setClaimResult({
        claimId: data.claimId,
        status: data.status as ClaimStatus,
        verification: data.verification,
        recommendation: data.recommendation,
      });

      // Clear draft on success
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit claim. Your draft has been saved — you can retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStep = (status: ClaimStatus): number => {
    const idx = STATUS_STEPS.findIndex((s) => s.key === status);
    if (status === "APPROVED" || status === "DENIED_BY_HUMAN") return STATUS_STEPS.length - 1;
    if (status === "DENIED_BY_AI") return 2;
    return idx >= 0 ? idx : 0;
  };

  const isDenied = claimResult?.status === "DENIED_BY_AI" || claimResult?.status === "DENIED_BY_HUMAN";

  // Auth guard
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex min-h-[calc(100vh-260px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <Lock className="mx-auto mb-4 h-8 w-8 text-gray-400" />
            <h1 className="mb-3 text-2xl font-bold text-gray-900">Login Required</h1>
            <p className="mb-6 text-gray-600">
              Sign in to submit an emergency relief claim.
            </p>
            <Link
              href="/login"
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

  // Post-submission result view
  if (claimResult) {
    const currentStep = getStatusStep(claimResult.status);

    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-2xl px-8 py-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* Status Header */}
            <div className="mb-8 text-center">
              {isDenied ? (
                <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-red-500" />
              ) : claimResult.status === "APPROVED" ? (
                <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
              ) : (
                <Clock className="mx-auto mb-3 h-12 w-12 text-teal-500" />
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                {isDenied
                  ? "Claim Not Approved"
                  : claimResult.status === "APPROVED"
                    ? "Claim Approved!"
                    : "Claim Under Review"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Claim ID: {claimResult.claimId.slice(0, 8)}…
              </p>
            </div>

            {/* Status Pipeline */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, idx) => (
                  <div key={step.key} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      {idx > 0 && (
                        <div
                          className={`h-0.5 flex-1 ${
                            idx <= currentStep ? "bg-teal-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          idx < currentStep
                            ? "bg-teal-500 text-white"
                            : idx === currentStep
                              ? isDenied
                                ? "bg-red-500 text-white"
                                : "bg-teal-500 text-white ring-4 ring-teal-200"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {idx < currentStep ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : isDenied && idx === currentStep ? (
                          <X className="h-4 w-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 ${
                            idx < currentStep ? "bg-teal-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-600">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verification Results */}
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="mb-1 text-sm font-semibold text-blue-700">Disaster Verification</p>
                <p className="text-sm text-blue-600">
                  Verified: {claimResult.verification.disaster_verified ? "Yes" : "No"} ·
                  Confidence: {Math.round(claimResult.verification.confidence * 100)}%
                </p>
              </div>

              <div className={`rounded-lg border p-4 ${
                isDenied ? "border-red-200 bg-red-50" : "border-purple-200 bg-purple-50"
              }`}>
                <p className={`mb-1 text-sm font-semibold ${isDenied ? "text-red-700" : "text-purple-700"}`}>
                  AI Recommendation
                </p>
                <p className={`text-sm ${isDenied ? "text-red-600" : "text-purple-600"}`}>
                  Decision: {claimResult.recommendation.decision?.replace(/_/g, " ")} ·
                  Confidence: {Math.round((claimResult.recommendation.confidence_score ?? 0) * 100)}%
                </p>
                {claimResult.recommendation.reasoning && (
                  <p className={`mt-2 text-xs ${isDenied ? "text-red-500" : "text-purple-500"}`}>
                    {claimResult.recommendation.reasoning}
                  </p>
                )}
                {claimResult.recommendation.risk_flags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {claimResult.recommendation.risk_flags.map((flag, i) => (
                      <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
                {claimResult.recommendation.suggested_payout > 0 && !isDenied && (
                  <p className="mt-2 text-sm font-medium text-teal-700">
                    Suggested payout: ${claimResult.recommendation.suggested_payout.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                Your claim details are private and only visible to you and administrators.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-2xl px-8 py-12">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-red-500 to-orange-600 p-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submit Emergency Claim</h1>
              <p className="text-gray-600">Request disaster relief assistance</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error banner */}
          {submitError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{submitError}</p>
                <p className="mt-1 text-xs text-red-500">Your draft has been saved locally. You can retry.</p>
              </div>
              <button type="button" onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Disaster Selection */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Related Disaster Event *
            </label>
            {disastersLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading active disasters…</span>
              </div>
            ) : disasters.length === 0 ? (
              <p className="text-sm text-gray-500">No active disasters found.</p>
            ) : (
              <div className="space-y-2">
                {disasters.map((d) => (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                      selectedDisaster === d.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="disaster"
                      value={d.id}
                      checked={selectedDisaster === d.id}
                      onChange={() => setSelectedDisaster(d.id)}
                      className="h-4 w-4 text-teal-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {d.region}, {d.country}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5">{d.type}</span>
                        <span>Severity: {d.severity}/10</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-blue-500" />
              Describe Your Situation *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how you were affected by this disaster and what help you need…"
              rows={5}
              maxLength={2000}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{description.length}/2000</p>
          </div>

          {/* Photo Upload */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Camera className="h-4 w-4 text-purple-500" />
              Photo Evidence (optional)
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Upload a photo of property damage or the disaster situation. Max 5MB.
            </p>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Claim evidence preview"
                  className="max-h-48 rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-sm text-gray-500 transition-all hover:border-teal-400 hover:text-teal-600"
              >
                <Upload className="h-5 w-5" />
                Tap to upload photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Wallet Address */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <DollarSign className="h-4 w-4 text-green-500" />
              Your Wallet Address *
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Open Payments wallet where the payout will be sent if approved.
            </p>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="https://ilp.interledger-test.dev/your-wallet"
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-600 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting & Running AI Review…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Submit Claim
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Your claim will be evaluated by our dual-AI verification pipeline and then reviewed by a human administrator.
            No claim details are ever publicly visible.
          </p>
        </form>
      </div>

      <Footer />
    </div>
  );
}

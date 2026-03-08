import { Link } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { Lock, TrendingUp, Calendar, DollarSign, Heart, MapPin, Download, Settings, CreditCard, ArrowUpRight, Loader2 } from "lucide-react";

const donationHistory = [
  {
    id: "1",
    campaignName: "Flood Relief in the Philippines",
    amount: 100,
    date: "2026-03-05",
  },
  {
    id: "2",
    campaignName: "Earthquake Response in Turkey",
    amount: 50,
    date: "2026-03-01",
  },
  {
    id: "3",
    campaignName: "Wildfire Recovery in California",
    amount: 75,
    date: "2026-02-28",
  },
  {
    id: "4",
    campaignName: "Typhoon Support in Southeast Asia",
    amount: 50,
    date: "2026-02-15",
  },
  {
    id: "5",
    campaignName: "Flood Relief in the Philippines",
    amount: 25,
    date: "2026-02-10",
  },
  {
    id: "6",
    campaignName: "Hurricane Relief - Caribbean",
    amount: 150,
    date: "2026-01-20",
  },
];

function calculateMonthlyTotal(items: typeof donationHistory) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return items
    .filter((item) => {
      const donationDate = new Date(item.date);
      return donationDate.getMonth() === month && donationDate.getFullYear() === year;
    })
    .reduce((sum, item) => sum + item.amount, 0);
}

// Active subscriptions are fetched from the API (no more mock data)
interface ActiveSub {
  id: string;
  senderWalletAddress: string;
  pledgeAmount: string;
  assetCode: string;
  assetScale: number;
  interval: string;
  intervalMs: number;
  lastPaymentAt: string | null;
  nextPaymentAt: string;
  createdAt: string;
  status: string;
}

function formatInterval(interval: string): string {
  const dur = interval.split("/").pop() ?? "";
  if (dur === "PT1M") return "Every 1 min";
  if (dur === "P1W") return "Weekly";
  if (dur === "P1M") return "Monthly";
  if (dur === "P3M") return "Quarterly";
  return dur;
}

export function MyGivingPage() {
  const { isAuthenticated, user } = useAuth();
  const [activeSubs, setActiveSubs] = useState<ActiveSub[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setActiveSubs(data.subscriptions ?? []);
      }
    } catch {
      // silent
    } finally {
      setSubsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchSubs();
  }, [isAuthenticated, fetchSubs]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this subscription? No further recurring payments will be made.")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/payments/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setActiveSubs((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Failed to cancel subscription. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex min-h-[calc(100vh-260px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="mb-3 text-3xl font-bold text-gray-900">Login Required</h1>
            <p className="mb-7 text-gray-600">Sign in to view your giving summary and contribution history.</p>
            <div className="flex justify-center gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border border-teal-600 px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const monthlyTotal = calculateMonthlyTotal(donationHistory);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-3xl px-8 py-12">
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Total Contributions This Month</p>
          <p className="mt-3 text-5xl font-bold text-teal-600">${monthlyTotal.toLocaleString()}</p>
          <p className="mt-2 text-sm text-gray-500">
            {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">Contribution History</h2>
          <div className="space-y-4">
            {donationHistory.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-gray-900">{donation.campaignName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(donation.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900">${donation.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open Payments Wallet Info */}
        <div className="mb-8 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Your Open Payments Wallet
              </h3>
              <div className="flex items-center gap-2">
                <code className="rounded bg-white px-3 py-1 text-sm text-teal-700">
                  {user?.walletAddress}
                </code>
                <button className="text-sm text-teal-600 hover:text-teal-700">
                  Copy
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                All recurring payments are processed through your Interledger wallet for maximum transparency
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-teal-600" />
          </div>
        </div>

        {/* Active Subscriptions (real data) */}
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Active Subscriptions</h2>
            <Link to="/" className="text-sm text-teal-600 hover:text-teal-700">
              Add new subscription →
            </Link>
          </div>
          {subsLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : activeSubs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No active subscriptions. Start one from a campaign page!
            </p>
          ) : (
            <div className="space-y-4">
              {activeSubs.map((sub) => {
                const displayAmount = (Number(sub.pledgeAmount) / Math.pow(10, sub.assetScale)).toFixed(2);
                return (
                  <div key={sub.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-1 font-medium text-gray-900">
                          {sub.assetCode} {displayAmount} — {formatInterval(sub.interval)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Next: {new Date(sub.nextPaymentAt).toLocaleString()}</span>
                          {sub.lastPaymentAt && (
                            <>
                              <span>•</span>
                              <span>Last: {new Date(sub.lastPaymentAt).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-xs text-gray-400">
                          {sub.id}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {sub.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleCancel(sub.id)}
                        disabled={cancellingId === sub.id}
                        className="rounded px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancellingId === sub.id ? "Cancelling…" : "Cancel Subscription"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>


        <section className="mb-8 rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">I Want to Pledge</h2>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            A pledge lets you commit a target amount each month, like $5. If your donations for the month are below
            that amount, the remaining balance is automatically deducted from your wallet at the end of the month.
          </p>
          <button
            type="button"
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Set Up Monthly Pledge
          </button>
        </section>
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">My Wallet Link</h2>
          <a
            href={user?.walletAddress ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
          >
            {user?.walletAddress ?? "No wallet linked"}
          </a>
        </section>
      </div>

      <Footer />
    </div>
  );
}




import { Link } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { Lock, TrendingUp, Calendar, DollarSign, Heart, MapPin, Download, Settings, CreditCard, ArrowUpRight, Loader2 } from "lucide-react";

// Dummy donation history data
const donationHistory = [
  {
    id: "1",
    campaignName: "Flood Relief in the Philippines",
    campaignImage: "https://images.unsplash.com/photo-1664868035693-7d3cba76826b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vZCUyMGRpc2FzdGVyJTIwcmVsaWVmfGVufDF8fHx8MTc3Mjg3NDIzN3ww&ixlib=rb-4.1.0&q=80&w=400",
    amount: 100,
    date: "2026-03-05",
    type: "One-time",
    status: "Completed"
  },
  {
    id: "2",
    campaignName: "Earthquake Response in Turkey",
    campaignImage: "https://images.unsplash.com/photo-1646227163793-7aae7155d5bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJ0aHF1YWtlJTIwZGVzdHJ1Y3Rpb24lMjBydWJibGV8ZW58MXx8fHwxNzcyODc0MjM4fDA&ixlib=rb-4.1.0&q=80&w=400",
    amount: 50,
    date: "2026-03-01",
    type: "Monthly Pledge",
    status: "Active"
  },
  {
    id: "3",
    campaignName: "Wildfire Recovery in California",
    campaignImage: "https://images.unsplash.com/photo-1767416129512-2012f3156f5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aWxkZmlyZSUyMHNtb2tlJTIwZGFtYWdlfGVufDF8fHx8MTc3Mjg3NDIzOXww&ixlib=rb-4.1.0&q=80&w=400",
    amount: 75,
    date: "2026-02-28",
    type: "One-time",
    status: "Completed"
  },
  {
    id: "4",
    campaignName: "Typhoon Support in Southeast Asia",
    campaignImage: "https://images.unsplash.com/photo-1768293528649-531aad843525?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0eXBob29uJTIwc3Rvcm0lMjBkYW1hZ2V8ZW58MXx8fHwxNzcyODc0MjM5fDA&ixlib=rb-4.1.0&q=80&w=400",
    amount: 50,
    date: "2026-02-15",
    type: "Monthly Pledge",
    status: "Active"
  },
  {
    id: "5",
    campaignName: "Flood Relief in the Philippines",
    campaignImage: "https://images.unsplash.com/photo-1664868035693-7d3cba76826b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vZCUyMGRpc2FzdGVyJTIwcmVsaWVmfGVufDF8fHx8MTc3Mjg3NDIzN3ww&ixlib=rb-4.1.0&q=80&w=400",
    amount: 25,
    date: "2026-02-10",
    type: "One-time",
    status: "Completed"
  },
  {
    id: "6",
    campaignName: "Hurricane Relief - Caribbean",
    campaignImage: "https://images.unsplash.com/photo-1768293528649-531aad843525?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0eXBob29uJTIwc3Rvcm0lMjBkYW1hZ2V8ZW58MXx8fHwxNzcyODc0MjM5fDA&ixlib=rb-4.1.0&q=80&w=400",
    amount: 150,
    date: "2026-01-20",
    type: "One-time",
    status: "Completed"
  }
];

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
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
        <Navigation />
        
        <div className="flex min-h-[calc(100vh-300px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <Lock className="h-12 w-12 text-gray-400" />
            </div>
            
            <h1 className="mb-4 text-4xl font-bold text-gray-900">
              Login Required
            </h1>
            <p className="mb-8 text-lg text-gray-600">
              Access your personalized giving dashboard, track your donations, and manage monthly pledges by logging in or creating an account.
            </p>
            
            <div className="flex justify-center gap-4">
              <Link
                to="/login"
                className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border-2 border-teal-500 bg-white px-8 py-3 font-medium text-teal-600 transition-colors hover:bg-teal-50"
              >
                Sign Up
              </Link>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
                  <DollarSign className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Track Donations
                </h3>
                <p className="text-sm text-gray-600">
                  See your complete donation history and total impact
                </p>
              </div>
              
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
                  <Calendar className="h-6 w-6 text-cyan-600" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Monthly Pledges
                </h3>
                <p className="text-sm text-gray-600">
                  Set up recurring donations to support ongoing relief
                </p>
              </div>
              
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Campaign Updates
                </h3>
                <p className="text-sm text-gray-600">
                  Get notified about campaigns you've supported
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }
  
  // If logged in, show the actual dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="px-8 py-12">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-gray-600">
                Track your impact and manage your contributions
              </p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export Data
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="mb-8 grid grid-cols-4 gap-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month</span>
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">$250</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3" />
                +$50 from last month
              </div>
            </div>
            
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Given</span>
                <DollarSign className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">$450</div>
              <div className="mt-1 text-xs text-gray-500">Since Jan 15, 2026</div>
            </div>
            
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">Campaigns</span>
                <Heart className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">5</div>
              <div className="mt-1 text-xs text-gray-500">Supported</div>
            </div>
            
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Pledge</span>
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">$100</div>
              <button className="mt-2 text-xs text-teal-600 hover:text-teal-700">
                Manage pledge →
              </button>
            </div>
          </div>

          {/* User Info Card */}
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
          
          <div className="grid grid-cols-3 gap-8">
            {/* Left Column - Donation History */}
            <div className="col-span-2 space-y-6">
              {/* Active Subscriptions (real data) */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Active Subscriptions
                  </h2>
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
                              <div className="mt-1 text-xs text-gray-400 font-mono">
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
              </div>

              {/* Donation History */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-gray-900">
                  Donation History
                </h2>
                
                <div className="space-y-4">
                  {donationHistory.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center gap-4">
                        <div 
                          className="h-16 w-16 rounded-lg bg-cover bg-center" 
                          style={{ backgroundImage: `url(${donation.campaignImage})` }}
                        />
                        <div>
                          <div className="mb-1 font-medium text-gray-900">{donation.campaignName}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{new Date(donation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>•</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              donation.type === 'Monthly Pledge' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {donation.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">${donation.amount.toFixed(2)}</div>
                        <div className={`text-xs ${
                          donation.status === 'Active' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {donation.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Impact Summary & Quick Actions */}
            <div className="space-y-6">
              {/* Impact Summary */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Your Impact
                </h3>
                
                <div className="space-y-4">
                  <div className="rounded-lg bg-teal-50 p-4">
                    <div className="mb-1 text-sm text-gray-700">People Helped</div>
                    <div className="text-2xl font-bold text-teal-600">~2,340</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Based on your contributions
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-cyan-50 p-4">
                    <div className="mb-1 text-sm text-gray-700">Regions Supported</div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="rounded bg-cyan-600 px-2 py-1 text-white">Philippines</span>
                      <span className="rounded bg-cyan-600 px-2 py-1 text-white">Turkey</span>
                      <span className="rounded bg-cyan-600 px-2 py-1 text-white">California</span>
                      <span className="rounded bg-cyan-600 px-2 py-1 text-white">SE Asia</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="mb-1 text-sm text-gray-700">Impact Score</div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-200">
                        <div className="h-full w-4/5 bg-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-blue-600">80%</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Top 20% of contributors
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Quick Actions
                </h3>
                
                <div className="space-y-3">
                  <Link 
                    to="/"
                    className="flex items-center justify-between rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 p-4 text-white transition-all hover:from-teal-600 hover:to-cyan-700"
                  >
                    <span className="font-medium">Make a Donation</span>
                    <ArrowUpRight className="h-5 w-5" />
                  </Link>
                  
                  <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-gray-700 transition-colors hover:bg-gray-50">
                    <span className="font-medium">Browse Campaigns</span>
                    <MapPin className="h-5 w-5" />
                  </button>
                  
                  <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-gray-700 transition-colors hover:bg-gray-50">
                    <span className="font-medium">Tax Receipt</span>
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Achievements */}
              <div className="rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  🏆 Achievements
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🌟</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">First Donation</div>
                      <div className="text-xs text-gray-600">Jan 20, 2026</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💚</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Monthly Supporter</div>
                      <div className="text-xs text-gray-600">2 active pledges</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🌍</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Global Helper</div>
                      <div className="text-xs text-gray-600">Supported 4 regions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

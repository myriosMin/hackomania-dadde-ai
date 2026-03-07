import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
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
} from "lucide-react";
import { useState } from "react";

interface PayoutRequest {
  id: string;
  eventName: string;
  suggestedAmount: number;
  recipients: number;
  reason: string;
  severity: "high" | "medium" | "low";
  aiConfidence: number;
}

interface VerificationRequest {
  id: string;
  disasterName: string;
  location: string;
  reportedBy: string;
  aiConfidence: number;
  sourcesFound: number;
  description: string;
  submittedAt: string;
}

interface CampaignProgress {
  id: string;
  name: string;
  location: string;
  progress: number;
  raised: number;
  target: number;
}

export function AdminDashboardPage() {
  const [selectedTab, setSelectedTab] = useState<"all" | "payouts" | "verifications">("all");

  const metrics = {
    fundBalance: 540000,
    activeDisasters: 7,
    pendingApprovals: 5,
  };

  const campaignProgress: CampaignProgress[] = [
    {
      id: "1",
      name: "Turkey Earthquake Recovery",
      location: "Southeastern Turkey",
      progress: 92,
      raised: 250000,
      target: 270000,
    },
    {
      id: "2",
      name: "Philippines Flood Relief",
      location: "Manila, Philippines",
      progress: 75,
      raised: 120000,
      target: 160000,
    },
    {
      id: "3",
      name: "Bangladesh Cyclone Relief",
      location: "Cox's Bazar, Bangladesh",
      progress: 85,
      raised: 150000,
      target: 176000,
    },
  ];

  const payoutRequests: PayoutRequest[] = [
    {
      id: "1",
      eventName: "Philippines Flood Relief",
      suggestedAmount: 40000,
      recipients: 3,
      reason:
        "Severe flooding affecting 80,000 residents. Immediate need for emergency shelter, clean water, and medical supplies.",
      severity: "high",
      aiConfidence: 92,
    },
    {
      id: "2",
      eventName: "Turkey Earthquake Recovery",
      suggestedAmount: 75000,
      recipients: 5,
      reason:
        "7.8 magnitude earthquake caused widespread destruction. 120,000 people displaced, urgent need for temporary housing.",
      severity: "high",
      aiConfidence: 95,
    },
  ];

  const verificationRequests: VerificationRequest[] = [
    {
      id: "1",
      disasterName: "Jakarta Flooding",
      location: "Jakarta, Indonesia",
      reportedBy: "Local Relief NGO Indonesia",
      aiConfidence: 85,
      sourcesFound: 4,
      description:
        "Heavy monsoon rains causing severe flooding in multiple districts. Over 15,000 families evacuated.",
      submittedAt: "2 hours ago",
    },
    {
      id: "2",
      disasterName: "California Wildfires",
      location: "Northern California, USA",
      reportedBy: "Fire Relief Foundation",
      aiConfidence: 78,
      sourcesFound: 6,
      description:
        "Fast-moving wildfires threatening residential areas. 5,000+ acres burned, evacuation orders issued.",
      submittedAt: "5 hours ago",
    },
    {
      id: "3",
      disasterName: "Bangladesh Cyclone",
      location: "Cox's Bazar, Bangladesh",
      reportedBy: "Bangladesh Red Crescent",
      aiConfidence: 91,
      sourcesFound: 8,
      description:
        "Category 3 cyclone making landfall. Coastal communities at severe risk, 200,000+ people in evacuation zones.",
      submittedAt: "1 hour ago",
    },
  ];

  const handleApprove = (id: string, type: "payout" | "verification") => {
    console.log(`Approved ${type}:`, id);
  };

  const handleReject = (id: string, type: "payout" | "verification") => {
    console.log(`Rejected ${type}:`, id);
  };

  const handleModify = (id: string) => {
    console.log("Modify payout:", id);
  };

  const handleRequestInfo = (id: string) => {
    console.log("Request more info:", id);
  };

  const filteredPayouts = selectedTab === "verifications" ? [] : payoutRequests;
  const filteredVerifications = selectedTab === "payouts" ? [] : verificationRequests;

  const mostCompletedCampaign = campaignProgress.reduce((best, campaign) => {
    if (campaign.progress > best.progress) return campaign;
    return best;
  }, campaignProgress[0]);

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

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-8">
            <p className="text-sm font-semibold text-gray-500">Most Completed Campaign</p>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-center">
              <div
                className="mx-auto flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#0d9488 ${mostCompletedCampaign.progress * 3.6}deg, #e5e7eb 0deg)`,
                }}
              >
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-4xl font-bold text-gray-900">{mostCompletedCampaign.progress}%</p>
                  <p className="text-xs font-medium text-gray-500">completion</p>
                </div>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900">{mostCompletedCampaign.name}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {mostCompletedCampaign.location}
                </p>
                <p className="mt-4 text-sm text-gray-600">
                  Raised <span className="font-semibold text-gray-900">${mostCompletedCampaign.raised.toLocaleString()}</span>{" "}
                  of <span className="font-semibold text-gray-900">${mostCompletedCampaign.target.toLocaleString()}</span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${mostCompletedCampaign.progress}%` }}
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
                className={`rounded-md px-4 py-2 text-xs font-medium transition ${
                  selectedTab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                }`}
              >
                All ({payoutRequests.length + verificationRequests.length})
              </button>
              <button
                onClick={() => setSelectedTab("payouts")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition ${
                  selectedTab === "payouts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                }`}
              >
                Payouts ({payoutRequests.length})
              </button>
              <button
                onClick={() => setSelectedTab("verifications")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition ${
                  selectedTab === "verifications" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                }`}
              >
                Verifications ({verificationRequests.length})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredPayouts.map((request) => (
              <article key={request.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Payout Request</p>
                    <h3 className="text-lg font-semibold text-gray-900">{request.eventName}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">${request.suggestedAmount.toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {request.recipients} recipients
                      </span>
                      <span>AI {request.aiConfidence}%</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{request.reason}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleApprove(request.id, "payout")}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      <CheckCircle className="mr-1 inline h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleModify(request.id)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="mr-1 inline h-4 w-4" /> Modify
                    </button>
                    <button
                      onClick={() => handleReject(request.id, "payout")}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="mr-1 inline h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {filteredVerifications.map((request) => (
              <article key={request.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Verification Request</p>
                    <h3 className="text-lg font-semibold text-gray-900">{request.disasterName}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {request.location}
                      </span>
                      <span>AI {request.aiConfidence}%</span>
                      <span>{request.sourcesFound} sources</span>
                      <span>{request.submittedAt}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{request.description}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleApprove(request.id, "verification")}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      <CheckCircle className="mr-1 inline h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleRequestInfo(request.id)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <AlertCircle className="mr-1 inline h-4 w-4" /> Request Info
                    </button>
                    <button
                      onClick={() => handleReject(request.id, "verification")}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="mr-1 inline h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}


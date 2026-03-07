import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  MapPin,
  Users,
  TrendingUp,
  Activity,
  ArrowDown,
  ArrowUp,
  Shield,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
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

interface Transaction {
  id: string;
  type: "donation" | "roundup" | "subscription" | "payout";
  amount: number;
  description: string;
  timestamp: string;
}

export function AdminDashboardPage() {
  const [selectedTab, setSelectedTab] = useState<"all" | "payouts" | "verifications">("all");
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const [focusedCardType, setFocusedCardType] = useState<"payout" | "verification" | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  // Mock data for key metrics
  const metrics = {
    fundBalance: 540000,
    activeDisasters: 7,
    pendingApprovals: 5,
  };

  // Mock payout requests
  const payoutRequests: PayoutRequest[] = [
    {
      id: "1",
      eventName: "Philippines Flood Relief",
      suggestedAmount: 40000,
      recipients: 3,
      reason: "Severe flooding affecting 80,000 residents. Immediate need for emergency shelter, clean water, and medical supplies.",
      severity: "high",
      aiConfidence: 92,
    },
    {
      id: "2",
      eventName: "Turkey Earthquake Recovery",
      suggestedAmount: 75000,
      recipients: 5,
      reason: "7.8 magnitude earthquake caused widespread destruction. 120,000 people displaced, urgent need for temporary housing.",
      severity: "high",
      aiConfidence: 95,
    },
  ];

  // Mock verification requests
  const verificationRequests: VerificationRequest[] = [
    {
      id: "1",
      disasterName: "Jakarta Flooding",
      location: "Jakarta, Indonesia",
      reportedBy: "Local Relief NGO Indonesia",
      aiConfidence: 85,
      sourcesFound: 4,
      description: "Heavy monsoon rains causing severe flooding in multiple districts. Over 15,000 families evacuated.",
      submittedAt: "2 hours ago",
    },
    {
      id: "2",
      disasterName: "California Wildfires",
      location: "Northern California, USA",
      reportedBy: "Fire Relief Foundation",
      aiConfidence: 78,
      sourcesFound: 6,
      description: "Fast-moving wildfires threatening residential areas. 5,000+ acres burned, evacuation orders issued.",
      submittedAt: "5 hours ago",
    },
    {
      id: "3",
      disasterName: "Bangladesh Cyclone",
      location: "Cox's Bazar, Bangladesh",
      reportedBy: "Bangladesh Red Crescent",
      aiConfidence: 91,
      sourcesFound: 8,
      description: "Category 3 cyclone making landfall. Coastal communities at severe risk, 200,000+ people in evacuation zones.",
      submittedAt: "1 hour ago",
    },
  ];

  // Mock live transactions
  const [liveTransactions] = useState<Transaction[]>([
    {
      id: "1",
      type: "donation",
      amount: 100,
      description: "Philippines Flood Relief",
      timestamp: "2 min ago",
    },
    {
      id: "2",
      type: "roundup",
      amount: 0.35,
      description: "Kopi Corner purchase",
      timestamp: "3 min ago",
    },
    {
      id: "3",
      type: "subscription",
      amount: 25,
      description: "Monthly pledge — User #4921",
      timestamp: "5 min ago",
    },
    {
      id: "4",
      type: "donation",
      amount: 250,
      description: "Turkey Earthquake Recovery",
      timestamp: "7 min ago",
    },
    {
      id: "5",
      type: "payout",
      amount: 20000,
      description: "Local Flood Relief NGO",
      timestamp: "12 min ago",
    },
    {
      id: "6",
      type: "roundup",
      amount: 0.78,
      description: "Coffee Shop purchase",
      timestamp: "15 min ago",
    },
    {
      id: "7",
      type: "donation",
      amount: 50,
      description: "Collective Disaster Fund",
      timestamp: "18 min ago",
    },
  ]);

  const handleApprove = (id: string, type: "payout" | "verification") => {
    console.log(`Approved ${type}:`, id);
    // Handle approval logic
  };

  const handleReject = (id: string, type: "payout" | "verification") => {
    console.log(`Rejected ${type}:`, id);
    // Handle rejection logic
  };

  const handleModify = (id: string) => {
    console.log(`Modify payout:`, id);
    // Handle modify logic
  };

  const handleRequestInfo = (id: string) => {
    console.log(`Request more info:`, id);
    // Handle request more info logic
  };

  const filteredPayouts = selectedTab === "verifications" ? [] : payoutRequests;
  const filteredVerifications = selectedTab === "payouts" ? [] : verificationRequests;

  // Combine all cards for gallery navigation
  const allCards = [
    ...filteredPayouts.map((p, i) => ({ type: "payout" as const, data: p, originalIndex: i })),
    ...filteredVerifications.map((v, i) => ({ type: "verification" as const, data: v, originalIndex: i })),
  ];

  const handleCardClick = (index: number, type: "payout" | "verification") => {
    setFocusedCardIndex(index);
    setFocusedCardType(type);
  };

  const handleCloseFocus = () => {
    setFocusedCardIndex(null);
    setFocusedCardType(null);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (focusedCardIndex === null) return;
    
    if (direction === "prev" && focusedCardIndex > 0) {
      const prevCard = allCards[focusedCardIndex - 1];
      setFocusedCardIndex(focusedCardIndex - 1);
      setFocusedCardType(prevCard.type);
      setSlideDirection("left");
    } else if (direction === "next" && focusedCardIndex < allCards.length - 1) {
      const nextCard = allCards[focusedCardIndex + 1];
      setFocusedCardIndex(focusedCardIndex + 1);
      setFocusedCardType(nextCard.type);
      setSlideDirection("right");
    }
  };

  const focusedCard = focusedCardIndex !== null ? allCards[focusedCardIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      <div className="mx-auto max-w-7xl px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 p-3">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Control center for DADDE Fund operations</p>
            </div>
          </div>
        </div>

        {/* TOP SECTION - Key Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Fund Balance */}
          <div className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-teal-500 p-2">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-teal-600">
                <TrendingUp className="h-3 w-3" />
                +12.5%
              </div>
            </div>
            <h3 className="mb-1 text-sm font-medium text-gray-600">Community Fund Balance</h3>
            <p className="text-3xl font-bold text-gray-900">
              ${metrics.fundBalance.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-gray-500">Total available for disaster payouts</p>
          </div>

          {/* Active Disasters */}
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-orange-500 p-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                <Activity className="h-3 w-3" />
                Active
              </div>
            </div>
            <h3 className="mb-1 text-sm font-medium text-gray-600">Active Verified Disasters</h3>
            <p className="text-3xl font-bold text-gray-900">{metrics.activeDisasters}</p>
            <p className="mt-2 text-xs text-gray-500">Currently receiving donations</p>
          </div>

          {/* Pending Approvals */}
          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-purple-500 p-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-purple-600">
                <AlertCircle className="h-3 w-3" />
                Action needed
              </div>
            </div>
            <h3 className="mb-1 text-sm font-medium text-gray-600">Pending Approvals</h3>
            <p className="text-3xl font-bold text-gray-900">{metrics.pendingApprovals}</p>
            <p className="mt-2 text-xs text-gray-500">Payouts & disaster verifications</p>
          </div>
        </div>

        {/* MIDDLE SECTION - Admin Inbox */}
        <div className="mb-8 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Admin Inbox</h2>
              <p className="text-sm text-gray-600">Review and approve pending actions</p>
            </div>
            
            {/* Tab Filter */}
            <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setSelectedTab("all")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
                  selectedTab === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({payoutRequests.length + verificationRequests.length})
              </button>
              <button
                onClick={() => setSelectedTab("payouts")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
                  selectedTab === "payouts"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Payouts ({payoutRequests.length})
              </button>
              <button
                onClick={() => setSelectedTab("verifications")}
                className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
                  selectedTab === "verifications"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Verifications ({verificationRequests.length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Payout Requests */}
            {filteredPayouts.map((request, index) => {
              const globalIndex = index;
              return (
                <div
                  key={request.id}
                  onClick={() => handleCardClick(globalIndex, "payout")}
                  className="cursor-pointer rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-5 transition-all hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          PAYOUT REQUEST
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            request.severity === "high"
                              ? "bg-red-100 text-red-700"
                              : request.severity === "medium"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {request.severity.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-900">{request.eventName}</h3>
                      <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1 font-bold text-teal-600">
                          <DollarSign className="h-4 w-4" />
                          ${request.suggestedAmount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {request.recipients} recipients
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Click to review and take action</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Verification Requests */}
            {filteredVerifications.map((request, index) => {
              const globalIndex = filteredPayouts.length + index;
              return (
                <div
                  key={request.id}
                  onClick={() => handleCardClick(globalIndex, "verification")}
                  className="cursor-pointer rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5 transition-all hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                          VERIFICATION REQUEST
                        </span>
                        <span className="text-xs text-gray-500">{request.submittedAt}</span>
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-900">{request.disasterName}</h3>
                      <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {request.location}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-blue-600">
                          <Shield className="h-4 w-4" />
                          AI: {request.aiConfidence}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Click to review and take action</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination Dots */}
          {allCards.length > 0 && (
            <div className="mt-6 flex justify-center gap-2">
              {allCards.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const card = allCards[index];
                    handleCardClick(index, card.type);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    focusedCardIndex === index
                      ? "w-8 bg-teal-500"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Expanded Card Modal */}
        {focusedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8">
            <div className="relative w-full max-w-4xl">
              {/* Navigation Arrows - Outside the card */}
              {focusedCardIndex !== null && focusedCardIndex > 0 && (
                <button
                  onClick={() => handleNavigate("prev")}
                  className="absolute -left-16 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all hover:bg-gray-100 hover:scale-110"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-900" />
                </button>
              )}
              {focusedCardIndex !== null && focusedCardIndex < allCards.length - 1 && (
                <button
                  onClick={() => handleNavigate("next")}
                  className="absolute -right-16 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all hover:bg-gray-100 hover:scale-110"
                >
                  <ChevronRight className="h-6 w-6 text-gray-900" />
                </button>
              )}

              {/* Card Content */}
              <div className="relative max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
                {/* Close Button */}
                <button
                  onClick={handleCloseFocus}
                  className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 transition-all hover:bg-gray-200"
                >
                  <X className="h-5 w-5 text-gray-900" />
                </button>

                {/* Payout Request Expanded */}
                {focusedCard.type === "payout" && (
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
                        PAYOUT REQUEST
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          (focusedCard.data as PayoutRequest).severity === "high"
                            ? "bg-red-100 text-red-700"
                            : (focusedCard.data as PayoutRequest).severity === "medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {(focusedCard.data as PayoutRequest).severity.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    
                    <h2 className="mb-6 text-3xl font-bold text-gray-900">
                      {(focusedCard.data as PayoutRequest).eventName}
                    </h2>
                    
                    <div className="mb-6 grid grid-cols-3 gap-4">
                      <div className="rounded-xl bg-teal-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">Suggested Amount</p>
                        <p className="text-2xl font-bold text-teal-600">
                          ${(focusedCard.data as PayoutRequest).suggestedAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-blue-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">Recipients</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(focusedCard.data as PayoutRequest).recipients} verified orgs
                        </p>
                      </div>
                      <div className="rounded-xl bg-purple-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">AI Confidence</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {(focusedCard.data as PayoutRequest).aiConfidence}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-6 rounded-xl bg-gray-50 p-4">
                      <h3 className="mb-2 font-semibold text-gray-900">AI Reasoning</h3>
                      <p className="text-gray-700">{(focusedCard.data as PayoutRequest).reason}</p>
                    </div>
                    
                    <div className="mb-4 rounded-xl bg-amber-50 p-4">
                      <h3 className="mb-2 font-semibold text-gray-900">Distribution Details</h3>
                      <p className="text-sm text-gray-700">
                        Funds will be distributed to {(focusedCard.data as PayoutRequest).recipients} verified organizations through Open Payments protocol within 48-72 hours of approval. All recipients have been validated by our AI verification system.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleApprove((focusedCard.data as PayoutRequest).id, "payout");
                          handleCloseFocus();
                        }}
                        className="flex-1 rounded-lg bg-teal-500 py-3 font-medium text-white transition-all hover:bg-teal-600"
                      >
                        <CheckCircle className="mr-2 inline h-5 w-5" />
                        Approve Payout
                      </button>
                      <button
                        onClick={() => {
                          handleModify((focusedCard.data as PayoutRequest).id);
                          handleCloseFocus();
                        }}
                        className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:border-gray-400"
                      >
                        <Edit className="mr-2 inline h-5 w-5" />
                        Modify
                      </button>
                      <button
                        onClick={() => {
                          handleReject((focusedCard.data as PayoutRequest).id, "payout");
                          handleCloseFocus();
                        }}
                        className="rounded-lg border-2 border-red-300 bg-white px-6 py-3 font-medium text-red-600 transition-all hover:border-red-400 hover:bg-red-50"
                      >
                        <XCircle className="mr-2 inline h-5 w-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Verification Request Expanded */}
                {focusedCard.type === "verification" && (
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-bold text-white">
                        VERIFICATION REQUEST
                      </span>
                      <span className="text-sm text-gray-500">
                        Submitted {(focusedCard.data as VerificationRequest).submittedAt}
                      </span>
                    </div>
                    
                    <h2 className="mb-6 text-3xl font-bold text-gray-900">
                      {(focusedCard.data as VerificationRequest).disasterName}
                    </h2>
                    
                    <div className="mb-6 grid grid-cols-3 gap-4">
                      <div className="rounded-xl bg-blue-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">Location</p>
                        <p className="text-lg font-bold text-blue-600">
                          {(focusedCard.data as VerificationRequest).location}
                        </p>
                      </div>
                      <div className="rounded-xl bg-purple-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">AI Confidence</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {(focusedCard.data as VerificationRequest).aiConfidence}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">Sources Found</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {(focusedCard.data as VerificationRequest).sourcesFound} articles
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-6 rounded-xl bg-gray-50 p-4">
                      <h3 className="mb-2 font-semibold text-gray-900">Description</h3>
                      <p className="text-gray-700">{(focusedCard.data as VerificationRequest).description}</p>
                    </div>
                    
                    <div className="mb-6 rounded-xl bg-cyan-50 p-4">
                      <h3 className="mb-2 font-semibold text-gray-900">Submitted By</h3>
                      <p className="text-gray-700">{(focusedCard.data as VerificationRequest).reportedBy}</p>
                    </div>
                    
                    <div className="mb-4 rounded-xl bg-green-50 p-4">
                      <h3 className="mb-2 font-semibold text-gray-900">What happens after approval?</h3>
                      <p className="text-sm text-gray-700">
                        This disaster will be added to the active campaigns on the donation platform. The AI will monitor the situation and propose payout recommendations based on severity and need.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleApprove((focusedCard.data as VerificationRequest).id, "verification");
                          handleCloseFocus();
                        }}
                        className="flex-1 rounded-lg bg-teal-500 py-3 font-medium text-white transition-all hover:bg-teal-600"
                      >
                        <CheckCircle className="mr-2 inline h-5 w-5" />
                        Approve & Publish
                      </button>
                      <button
                        onClick={() => {
                          handleRequestInfo((focusedCard.data as VerificationRequest).id);
                          handleCloseFocus();
                        }}
                        className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:border-gray-400"
                      >
                        <AlertCircle className="mr-2 inline h-5 w-5" />
                        Request Info
                      </button>
                      <button
                        onClick={() => {
                          handleReject((focusedCard.data as VerificationRequest).id, "verification");
                          handleCloseFocus();
                        }}
                        className="rounded-lg border-2 border-red-300 bg-white px-6 py-3 font-medium text-red-600 transition-all hover:border-red-400 hover:bg-red-50"
                      >
                        <XCircle className="mr-2 inline h-5 w-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Dots indicator inside modal */}
              <div className="mt-4 flex justify-center gap-2">
                {allCards.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      focusedCardIndex === index
                        ? "w-8 bg-white"
                        : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION - Live Activity Feed */}
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Live Activity Feed</h2>
              <p className="text-sm text-gray-600">Real-time donations and transactions</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500"></div>
              Live
            </div>
          </div>

          <div className="space-y-3">
            {liveTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-teal-300 hover:bg-teal-50/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      transaction.type === "donation"
                        ? "bg-teal-100"
                        : transaction.type === "roundup"
                        ? "bg-cyan-100"
                        : transaction.type === "subscription"
                        ? "bg-blue-100"
                        : "bg-purple-100"
                    }`}
                  >
                    {transaction.type === "payout" ? (
                      <ArrowUp className="h-4 w-4 text-purple-600" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-teal-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.type === "donation" && "Direct Donation"}
                      {transaction.type === "roundup" && "Round-up"}
                      {transaction.type === "subscription" && "Monthly Pledge"}
                      {transaction.type === "payout" && "Payout Transfer"}
                    </p>
                    <p className="text-xs text-gray-600">{transaction.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      transaction.type === "payout" ? "text-purple-600" : "text-teal-600"
                    }`}
                  >
                    {transaction.type === "payout" ? "-" : "+"}$
                    {transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
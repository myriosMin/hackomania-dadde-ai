"use client";

import { useState, useEffect, useCallback } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import {
  DollarSign,
  Users,
  ArrowDownRight,
  ArrowUpRight,
  Shield,
  Scale,
  Vote,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  TrendingUp,
  Globe,
  Loader2,
  RefreshCw,
  ChevronRight,
  Bot,
  Gavel,
  Landmark,
  FileText,
  Layers,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Timer,
  Zap,
  CircleDot,
  Info,
  Sparkles,
  Database,
  ExternalLink,
  Cpu,
  Gauge,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FundMetrics {
  summary: {
    fundBalance: number;
    totalContributions: number;
    totalPayouts: number;
    contributionCount: number;
    payoutCount: number;
    uniqueDonors: number;
    conversionRate: string;
  };
  dailyVolume: { date: string; type: string; amount: number; count: number }[];
  breakdown: { type: string; amount: number; count: number }[];
}

interface AiDecisions {
  recommendations: { decision: string; count: number; avgConfidence: number }[];
  critiques: { decision: string; count: number; avgConfidence: number }[];
  processingStats: { agentType: string; total: number; avgTimeMs: number; errorCount: number }[];
  claimStatuses: { status: string; count: number }[];
}

interface CommunityRules {
  current: {
    version: number;
    minAiConfidence: number;
    maxPayoutPerRecipient: number;
    distributionModel: string;
    minDisasterSeverity: number;
    reservePercentage: number;
    updatedBy: string;
    updatedAt: string;
  } | null;
  history: {
    version: number;
    minAiConfidence: number;
    maxPayoutPerRecipient: number;
    distributionModel: string;
    minDisasterSeverity: number;
    reservePercentage: number;
    updatedBy: string;
    updatedAt: string;
  }[];
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  ruleField: string;
  proposedValue: string;
  currentValue: string;
  votesFor: number;
  votesAgainst: number;
  status: string;
  expiresAt: string;
  resolvedAt: string;
  createdAt: string;
}

interface GovernanceData {
  proposals: Proposal[];
  stats: {
    totalVotes: number;
    uniqueVoters: number;
    activeProposals: number;
    passedProposals: number;
    rejectedProposals: number;
  };
}

interface DisasterData {
  disasters: {
    id: string;
    name: string;
    type: string;
    severity: number;
    region: string;
    country: string;
    status: string;
    description: string;
    source: string;
    startedAt: string;
    resolvedAt: string;
    createdAt: string;
    funding: { contributed: number; payedOut: number; txCount: number };
    claims: Record<string, number>;
  }[];
  typeDistribution: { type: string; count: number }[];
  regionDistribution: { region: string; count: number }[];
  totals: { active: number; resolved: number; total: number };
}

interface ActivityData {
  transactions: {
    type: string;
    amount: number;
    currency: string;
    status: string;
    disasterName: string | null;
    createdAt: string;
  }[];
  events: {
    type: string;
    service: string;
    createdAt: string;
  }[];
}

interface LangfuseTrace {
  id: string;
  name: string;
  input: string;
  output: string;
  metadata: Record<string, any>;
  tags: string[];
  timestamp: string;
  latency: number;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  level: string;
  status: string;
}

interface LangfuseGeneration {
  id: string;
  traceId: string;
  name: string;
  model: string;
  input: string;
  output: string;
  startTime: string;
  latency: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  level: string;
}

interface LangfuseData {
  traces: LangfuseTrace[];
  generations: LangfuseGeneration[];
  stats: {
    totalTraces: number;
    pipelineRuns: number;
    avgLatencyMs: number;
    totalTokens: number;
    totalCost: number;
    errorCount: number;
    agentBreakdown: { agent: string; count: number }[];
    modelUsage: { model: string; count: number }[];
    langfuseUrl: string;
  } | null;
}

interface SimulationStats {
  tableCounts: Record<string, number>;
  totalRecords: number;
  velocity: {
    transactionsLast60s: number;
    eventsLast60s: number;
  };
  fundBalance: number;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DECISION_COLORS: Record<string, string> = {
  RECOMMEND_APPROVE: "#10B981",
  RECOMMEND_DENY: "#EF4444",
  RECOMMEND_ESCALATE: "#F59E0B",
  CONCUR: "#10B981",
  CHALLENGE: "#F59E0B",
};

const DISASTER_TYPE_COLORS: Record<string, string> = {
  FLOOD: "#0EA5E9",
  EARTHQUAKE: "#F59E0B",
  WILDFIRE: "#EF4444",
  TYPHOON: "#8B5CF6",
  OTHER: "#6B7280",
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "#10B981",
  PAID: "#10B981",
  PENDING_HUMAN_APPROVAL: "#F59E0B",
  NEEDS_REVIEW: "#F59E0B",
  ESCALATED: "#F97316",
  SUBMITTED: "#3B82F6",
  AI_REVIEWING: "#6366F1",
  DENIED_BY_AI: "#EF4444",
  DENIED_BY_HUMAN: "#EF4444",
  AI_ERROR: "#DC2626",
  AI_TIMEOUT: "#DC2626",
  PAYMENT_FAILED: "#DC2626",
};

const TABS = [
  { id: "overview", label: "Fund Overview", icon: Landmark },
  { id: "ai", label: "AI Transparency", icon: Bot },
  { id: "langfuse", label: "AI Observability", icon: Sparkles },
  { id: "governance", label: "Governance & Rules", icon: Gavel },
  { id: "disasters", label: "Disaster Allocation", icon: Globe },
  { id: "activity", label: "Live Activity", icon: Activity },
  { id: "simulation", label: "Live Metrics", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ruleFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    min_ai_confidence: "Min AI Confidence",
    max_payout_per_recipient: "Max Payout / Recipient",
    distribution_model: "Distribution Model",
    min_disaster_severity: "Min Disaster Severity",
    reserve_percentage: "Reserve Percentage",
  };
  return labels[field] || field;
}

function severityLabel(severity: number): string {
  const labels = ["", "Minor", "Moderate", "Significant", "Severe", "Catastrophic"];
  return labels[severity] || `Level ${severity}`;
}

function severityColor(severity: number): string {
  const colors = ["", "#22C55E", "#84CC16", "#EAB308", "#F97316", "#EF4444"];
  return colors[severity] || "#6B7280";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommunityDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Data states
  const [fundMetrics, setFundMetrics] = useState<FundMetrics | null>(null);
  const [aiDecisions, setAiDecisions] = useState<AiDecisions | null>(null);
  const [rules, setRules] = useState<CommunityRules | null>(null);
  const [governance, setGovernance] = useState<GovernanceData | null>(null);
  const [disasterData, setDisasterData] = useState<DisasterData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [langfuseData, setLangfuseData] = useState<LangfuseData | null>(null);
  const [simulationStats, setSimulationStats] = useState<SimulationStats | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundRes, aiRes, rulesRes, govRes, disRes, actRes, lfRes, simRes] = await Promise.allSettled([
        fetch("/api/transparency/fund-metrics"),
        fetch("/api/transparency/ai-decisions"),
        fetch("/api/transparency/rules"),
        fetch("/api/transparency/proposals"),
        fetch("/api/transparency/disasters"),
        fetch("/api/transparency/activity"),
        fetch("/api/transparency/langfuse"),
        fetch("/api/transparency/simulation-stats"),
      ]);

      const parse = async (res: PromiseSettledResult<Response>) => {
        if (res.status === "fulfilled" && res.value.ok) return res.value.json();
        return null;
      };

      setFundMetrics(await parse(fundRes));
      setAiDecisions(await parse(aiRes));
      setRules(await parse(rulesRes));
      setGovernance(await parse(govRes));
      setDisasterData(await parse(disRes));
      setActivityData(await parse(actRes));
      setLangfuseData(await parse(lfRes));
      setSimulationStats(await parse(simRes));
      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to load dashboard data. Some data may be stale.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ─── Helpers ──────────────────────────────────────────────────────

  const hasData =
    fundMetrics || aiDecisions || rules || governance || disasterData || activityData || langfuseData || simulationStats;

  // Prepare chart data for daily volume
  const dailyChartData = (() => {
    if (!fundMetrics?.dailyVolume.length) return [];
    const byDate: Record<string, { date: string; contributions: number; payouts: number }> = {};
    for (const row of fundMetrics.dailyVolume) {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date, contributions: 0, payouts: 0 };
      if (row.type === "CONTRIBUTION" || row.type === "ROUND_UP" || row.type === "SUBSCRIPTION") {
        byDate[row.date].contributions += row.amount;
      } else if (row.type === "PAYOUT") {
        byDate[row.date].payouts += row.amount;
      }
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <Navigation />

      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl bg-linear-to-br from-teal-500 to-cyan-600 p-3">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Community Dashboard</h1>
                <p className="text-gray-500">
                  Full transparency into fund collection, payouts, AI decisions, and governance
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && !hasData && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-teal-500" />
            <p className="text-gray-500">Loading transparency data from ClickHouse...</p>
          </div>
        )}

        {/* Tab Content */}
        {(!loading || hasData) && (
          <>
            {activeTab === "overview" && (
              <FundOverviewTab fundMetrics={fundMetrics} dailyChartData={dailyChartData} />
            )}
            {activeTab === "ai" && <AiTransparencyTab aiDecisions={aiDecisions} />}
            {activeTab === "langfuse" && <LangfuseObservabilityTab langfuseData={langfuseData} />}
            {activeTab === "governance" && (
              <GovernanceTab rules={rules} governance={governance} />
            )}
            {activeTab === "disasters" && <DisasterTab disasterData={disasterData} />}
            {activeTab === "activity" && <ActivityTab activityData={activityData} />}
            {activeTab === "simulation" && <SimulationTab simulationStats={simulationStats} onRefresh={fetchAll} />}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Fund Overview
// ═══════════════════════════════════════════════════════════════════════════════

function FundOverviewTab({
  fundMetrics,
  dailyChartData,
}: {
  fundMetrics: FundMetrics | null;
  dailyChartData: { date: string; contributions: number; payouts: number }[];
}) {
  const s = fundMetrics?.summary;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          label="Fund Balance"
          value={formatCurrency(s?.fundBalance ?? 0)}
          sub="Available for payouts"
        />
        <KpiCard
          icon={<ArrowDownRight className="h-5 w-5" />}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="Total Contributions"
          value={formatCurrency(s?.totalContributions ?? 0)}
          sub={`${formatNumber(s?.contributionCount ?? 0)} transactions`}
        />
        <KpiCard
          icon={<ArrowUpRight className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Payouts"
          value={formatCurrency(s?.totalPayouts ?? 0)}
          sub={`${formatNumber(s?.payoutCount ?? 0)} disbursements`}
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Unique Donors"
          value={formatNumber(s?.uniqueDonors ?? 0)}
          sub="Privacy-preserved count"
        />
      </div>

      {/* Fund Flow Pipeline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Layers className="h-5 w-5 text-teal-600" />
          Fund Flow Pipeline
        </h3>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
          <FlowStep
            label="Donations Received"
            value={formatCurrency(s?.totalContributions ?? 0)}
            note={`${formatNumber(s?.contributionCount ?? 0)} donors`}
            color="border-green-200 bg-green-50"
          />
          <ChevronRight className="h-5 w-5 text-gray-300" />
          <FlowStep
            label="Reserve Held"
            value={formatCurrency((s?.fundBalance ?? 0))}
            note="Available balance"
            color="border-teal-200 bg-teal-50"
          />
          <ChevronRight className="h-5 w-5 text-gray-300" />
          <FlowStep
            label="Payouts Disbursed"
            value={formatCurrency(s?.totalPayouts ?? 0)}
            note={`${s?.conversionRate ?? "0"}% conversion`}
            color="border-blue-200 bg-blue-50"
          />
        </div>
      </div>

      {/* Contribution Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* Breakdown by Type */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Contribution Breakdown
          </h3>
          {fundMetrics?.breakdown && fundMetrics.breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fundMetrics.breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.replace("_", " ")}
                />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Amount"]}
                  labelFormatter={(l: string) => l.replace("_", " ")}
                />
                <Bar dataKey="amount" fill="#14B8A6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No transaction data yet" />
          )}
        </div>

        {/* Contribution Velocity (30-day trend) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            Contribution Velocity (30 days)
          </h3>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="contributions"
                  stroke="#10B981"
                  fill="url(#contribGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="payouts"
                  stroke="#3B82F6"
                  fill="url(#payoutGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No daily volume data yet" />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — AI Transparency
// ═══════════════════════════════════════════════════════════════════════════════

function AiTransparencyTab({ aiDecisions }: { aiDecisions: AiDecisions | null }) {
  const recData = aiDecisions?.recommendations ?? [];
  const criData = aiDecisions?.critiques ?? [];
  const stats = aiDecisions?.processingStats ?? [];
  const claimStatuses = aiDecisions?.claimStatuses ?? [];

  const totalRec = recData.reduce((sum, r) => sum + r.count, 0);
  const totalCrit = criData.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      {/* AI Pipeline Explanation */}
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50 to-purple-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-indigo-100 p-2.5">
            <Bot className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">How AI Decisions Work</h3>
            <p className="mt-1 text-sm text-gray-600">
              Every claim goes through a dual-AI verification pipeline. First, a{" "}
              <strong>Recommendation Agent</strong> evaluates the claim against community-defined rules.
              Then, a <strong>Critic Agent</strong> independently reviews the recommendation for errors,
              bias, or hallucinations. Both decisions are logged immutably to ClickHouse. The AI{" "}
              <strong>never</strong> makes the final call — a human Collector must approve every payout.
            </p>
          </div>
        </div>
      </div>

      {/* Processing Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.agentType}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className={`rounded-lg p-2 ${
                  s.agentType === "RECOMMENDER"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {s.agentType === "RECOMMENDER" ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <Scale className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {s.agentType === "RECOMMENDER" ? "Recommendation Agent" : "Critic Agent"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500">Processed</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(s.total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Time</p>
                <p className="text-lg font-bold text-gray-900">{s.avgTimeMs}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Errors</p>
                <p className={`text-lg font-bold ${s.errorCount > 0 ? "text-red-500" : "text-gray-900"}`}>
                  {s.errorCount}
                </p>
              </div>
            </div>
          </div>
        ))}
        {stats.length === 0 && (
          <>
            <StatPlaceholder label="Recommendation Agent" />
            <StatPlaceholder label="Critic Agent" />
          </>
        )}
        <KpiCard
          icon={<Zap className="h-5 w-5" />}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-600"
          label="Total AI Evaluations"
          value={formatNumber(totalRec + totalCrit)}
          sub="Both agents combined"
        />
        <KpiCard
          icon={<Timer className="h-5 w-5" />}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="Avg Confidence"
          value={
            recData.length > 0
              ? `${(
                  recData.reduce((s, r) => s + r.avgConfidence * r.count, 0) / totalRec
                ).toFixed(2)}`
              : "N/A"
          }
          sub="Recommendation agent"
        />
      </div>

      {/* Decision Distribution Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recommender Decisions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Shield className="h-5 w-5 text-emerald-600" />
            Recommendation Agent Decisions
          </h3>
          {recData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={recData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="count"
                    nameKey="decision"
                    paddingAngle={3}
                  >
                    {recData.map((entry) => (
                      <Cell
                        key={entry.decision}
                        fill={DECISION_COLORS[entry.decision] || "#6B7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / totalRec) * 100).toFixed(1)}%)`,
                      name.replace(/_/g, " "),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {recData.map((r) => (
                  <div key={r.decision} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: DECISION_COLORS[r.decision] || "#6B7280" }}
                      />
                      <span className="text-gray-700">{r.decision.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{r.count}</span>
                      <span className="text-xs text-gray-500">
                        conf: {r.avgConfidence.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No AI recommendations yet" />
          )}
        </div>

        {/* Critic Decisions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Scale className="h-5 w-5 text-amber-600" />
            Critic Agent Validations
          </h3>
          {criData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={criData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="count"
                    nameKey="decision"
                    paddingAngle={3}
                  >
                    {criData.map((entry) => (
                      <Cell
                        key={entry.decision}
                        fill={DECISION_COLORS[entry.decision] || "#6B7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / totalCrit) * 100).toFixed(1)}%)`,
                      name.replace(/_/g, " "),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {criData.map((c) => (
                  <div key={c.decision} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: DECISION_COLORS[c.decision] || "#6B7280" }}
                      />
                      <span className="text-gray-700">{c.decision.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{c.count}</span>
                      <span className="text-xs text-gray-500">
                        conf: {c.avgConfidence.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No critic validations yet" />
          )}
        </div>
      </div>

      {/* Claim Status Overview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="h-5 w-5 text-teal-600" />
          Claim Pipeline Status (Aggregated)
        </h3>
        {claimStatuses.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {claimStatuses.map((cs) => (
              <div
                key={cs.status}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[cs.status] || "#6B7280" }}
                />
                <div>
                  <p className="text-xs text-gray-500">{cs.status.replace(/_/g, " ")}</p>
                  <p className="text-lg font-bold text-gray-900">{cs.count}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No claim data yet" />
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          Individual claim details are never shown publicly. Only aggregate counts are displayed.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Governance & Rules
// ═══════════════════════════════════════════════════════════════════════════════

function GovernanceTab({
  rules,
  governance,
}: {
  rules: CommunityRules | null;
  governance: GovernanceData | null;
}) {
  const currentRules = rules?.current;
  const proposals = governance?.proposals ?? [];
  const stats = governance?.stats;

  return (
    <div className="space-y-6">
      {/* Current Rules */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Gavel className="h-5 w-5 text-teal-600" />
            Active Community Rules
          </h3>
          {currentRules && (
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Version {currentRules.version}
            </span>
          )}
        </div>

        {currentRules ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <RuleCard
              label="Min AI Confidence"
              value={`${(currentRules.minAiConfidence * 100).toFixed(0)}%`}
              description="Minimum confidence score from AI agent to proceed to human review"
              icon={<Bot className="h-4 w-4" />}
            />
            <RuleCard
              label="Max Payout / Recipient"
              value={formatCurrency(currentRules.maxPayoutPerRecipient)}
              description="Maximum amount that can be disbursed to a single recipient"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <RuleCard
              label="Distribution Model"
              value={currentRules.distributionModel.replace(/_/g, " ")}
              description="How payouts are calculated across eligible recipients"
              icon={<Scale className="h-4 w-4" />}
            />
            <RuleCard
              label="Min Disaster Severity"
              value={`Level ${currentRules.minDisasterSeverity} (${severityLabel(currentRules.minDisasterSeverity)})`}
              description="Minimum severity threshold to activate fund for a disaster"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <RuleCard
              label="Reserve Percentage"
              value={`${(currentRules.reservePercentage * 100).toFixed(0)}%`}
              description="Percentage of fund balance kept in reserve at all times"
              icon={<Shield className="h-4 w-4" />}
            />
            <RuleCard
              label="Last Updated"
              value={new Date(currentRules.updatedAt).toLocaleDateString()}
              description={`By ${currentRules.updatedBy}`}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
        ) : (
          <EmptyState message="No community rules configured yet" />
        )}

        <p className="mt-5 flex items-center gap-2 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          These rules are set by community vote. The AI uses them as guidelines but never modifies
          them.
        </p>
      </div>

      {/* Rule History */}
      {rules?.history && rules.history.length > 1 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Clock className="h-5 w-5 text-teal-600" />
            Rule Version History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">Version</th>
                  <th className="pb-3 text-left font-medium text-gray-500">AI Confidence</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Max Payout</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Distribution</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Severity</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Reserve</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rules.history.map((r) => (
                  <tr key={r.version} className="border-b border-gray-50">
                    <td className="py-2.5 font-semibold text-teal-600">v{r.version}</td>
                    <td className="py-2.5">{(r.minAiConfidence * 100).toFixed(0)}%</td>
                    <td className="py-2.5">{formatCurrency(r.maxPayoutPerRecipient)}</td>
                    <td className="py-2.5">{r.distributionModel.replace(/_/g, " ")}</td>
                    <td className="py-2.5">Level {r.minDisasterSeverity}</td>
                    <td className="py-2.5">{(r.reservePercentage * 100).toFixed(0)}%</td>
                    <td className="py-2.5 text-gray-500">
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Governance Stats */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={<Vote className="h-5 w-5" />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Total Votes Cast"
          value={formatNumber(stats?.totalVotes ?? 0)}
          sub={`${formatNumber(stats?.uniqueVoters ?? 0)} unique voters`}
        />
        <KpiCard
          icon={<CircleDot className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Active Proposals"
          value={(stats?.activeProposals ?? 0).toString()}
          sub="Open for voting"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="Passed Proposals"
          value={(stats?.passedProposals ?? 0).toString()}
          sub="Community approved"
        />
        <KpiCard
          icon={<XCircle className="h-5 w-5" />}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          label="Rejected Proposals"
          value={(stats?.rejectedProposals ?? 0).toString()}
          sub="Community rejected"
        />
      </div>

      {/* Proposals List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="h-5 w-5 text-teal-600" />
          Governance Proposals
        </h3>
        {proposals.length > 0 ? (
          <div className="space-y-4">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        ) : (
          <EmptyState message="No governance proposals yet. Community members can propose rule changes." />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Disaster Allocation
// ═══════════════════════════════════════════════════════════════════════════════

function DisasterTab({ disasterData }: { disasterData: DisasterData | null }) {
  const disasters = disasterData?.disasters ?? [];
  const typeDistribution = disasterData?.typeDistribution ?? [];
  const regionDistribution = disasterData?.regionDistribution ?? [];
  const totals = disasterData?.totals ?? { active: 0, resolved: 0, total: 0 };

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          label="Active Disasters"
          value={totals.active.toString()}
          sub="Currently receiving funds"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="Resolved"
          value={totals.resolved.toString()}
          sub="Response completed"
        />
        <KpiCard
          icon={<Globe className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Tracked"
          value={totals.total.toString()}
          sub="All disaster events"
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Type Distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            By Disaster Type
          </h3>
          {typeDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="type"
                    paddingAngle={3}
                  >
                    {typeDistribution.map((entry) => (
                      <Cell
                        key={entry.type}
                        fill={DISASTER_TYPE_COLORS[entry.type] || "#6B7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {typeDistribution.map((t) => (
                  <div key={t.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: DISASTER_TYPE_COLORS[t.type] || "#6B7280" }}
                      />
                      <span className="text-gray-700">{t.type}</span>
                    </div>
                    <span className="font-medium text-gray-900">{t.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No disaster type data yet" />
          )}
        </div>

        {/* Region Distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Globe className="h-5 w-5 text-teal-600" />
            By Region
          </h3>
          {regionDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={regionDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="region" type="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0EA5E9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No region data yet" />
          )}
        </div>
      </div>

      {/* Disaster Cards */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Layers className="h-5 w-5 text-teal-600" />
          Disaster Fund Allocation
        </h3>
        {disasters.length > 0 ? (
          <div className="space-y-3">
            {disasters.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-teal-200 hover:bg-teal-50/30"
              >
                {/* Status Badge */}
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    d.status === "ACTIVE"
                      ? "bg-red-100 text-red-600"
                      : d.status === "RESOLVED"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {d.status === "ACTIVE" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{d.name}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        d.status === "ACTIVE"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {d.status}
                    </span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {d.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {d.region} · {d.country} · Severity{" "}
                    <span style={{ color: severityColor(d.severity) }} className="font-semibold">
                      {d.severity}/5
                    </span>{" "}
                    · Source: {d.source}
                  </p>
                </div>

                {/* Funding */}
                <div className="grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="text-[10px] uppercase text-gray-400">Contributed</p>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(d.funding.contributed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400">Paid Out</p>
                    <p className="text-sm font-semibold text-blue-600">
                      {formatCurrency(d.funding.payedOut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400">Transactions</p>
                    <p className="text-sm font-semibold text-gray-900">{d.funding.txCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No disaster events tracked yet" />
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          Payouts show only aggregate totals. Individual recipient information is never displayed.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Live Activity
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityTab({ activityData }: { activityData: ActivityData | null }) {
  const transactions = activityData?.transactions ?? [];
  const events = activityData?.events ?? [];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-2xl border border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 p-5">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-5 w-5 text-teal-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Live Transaction Feed</h3>
            <p className="mt-1 text-sm text-gray-600">
              All completed transactions are logged immutably to ClickHouse. Wallet addresses are
              hashed — no personal information is stored or displayed. This feed refreshes
              automatically every 30 seconds.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Recent Transactions */}
        <div className="col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <DollarSign className="h-5 w-5 text-teal-600" />
            Recent Transactions
          </h3>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <div
                  key={`tx-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-50 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      tx.type === "CONTRIBUTION" || tx.type === "SUBSCRIPTION" || tx.type === "ROUND_UP"
                        ? "bg-green-100 text-green-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {tx.type === "PAYOUT" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {tx.type.replace(/_/g, " ")}
                      </span>
                      {tx.disasterName && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {tx.disasterName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                  </div>

                  {/* Amount */}
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "PAYOUT" ? "text-blue-600" : "text-green-600"
                    }`}
                  >
                    {tx.type === "PAYOUT" ? "-" : "+"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No completed transactions yet" />
          )}
        </div>

        {/* System Events */}
        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Zap className="h-5 w-5 text-teal-600" />
            System Events
          </h3>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((evt, i) => (
                <div
                  key={`evt-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-50 px-3 py-2.5"
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      evt.type === "PAYMENT"
                        ? "bg-green-500"
                        : evt.type === "AI_INFERENCE"
                          ? "bg-purple-500"
                          : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">
                      {evt.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-gray-400">{evt.service}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{timeAgo(evt.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No system events logged yet" />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared Sub-Components
// ═══════════════════════════════════════════════════════════════════════════════

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className={`rounded-lg p-2 ${iconBg} ${iconColor}`}>{icon}</div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function FlowStep({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-600">{note}</p>
    </div>
  );
}

function RuleCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-teal-600">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-1.5 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  const totalVotes = p.votesFor + p.votesAgainst;
  const forPercent = totalVotes > 0 ? (p.votesFor / totalVotes) * 100 : 0;

  const statusColor =
    p.status === "ACTIVE"
      ? "bg-amber-100 text-amber-700"
      : p.status === "PASSED"
        ? "bg-green-100 text-green-700"
        : p.status === "REJECTED"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-teal-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{p.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}>
              {p.status}
            </span>
          </div>
          {p.description && (
            <p className="mt-1 text-sm text-gray-600">{p.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>
              Rule: <strong>{ruleFieldLabel(p.ruleField)}</strong>
            </span>
            <span>
              Current: <strong>{p.currentValue}</strong>
            </span>
            <span>
              Proposed: <strong className="text-teal-600">{p.proposedValue}</strong>
            </span>
            <span>Expires: {new Date(p.expiresAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Vote Bar */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-green-600">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="font-medium">{p.votesFor} For</span>
          </div>
          <span className="text-xs text-gray-400">{totalVotes} total votes</span>
          <div className="flex items-center gap-1.5 text-red-500">
            <span className="font-medium">{p.votesAgainst} Against</span>
            <ThumbsDown className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
          {totalVotes > 0 && (
            <>
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${forPercent}%` }}
              />
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${100 - forPercent}%` }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-gray-100 p-3">
        <Layers className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      <p className="mt-1 text-xs text-gray-400">Data will appear when transactions are processed</p>
    </div>
  );
}

function StatPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-lg text-gray-300">No data yet</p>
    </div>
  );
}

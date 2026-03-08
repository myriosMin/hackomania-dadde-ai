"use client";

import { useState, useEffect } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { TrustSection } from "../components/trust-section";
import {
  Globe,
  TrendingUp,
  Users,
  MapPin,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Calendar,
  Heart,
  DollarSign,
  Loader2,
  AlertCircle,
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
} from "recharts";

const PIE_COLORS = ["#0891B2", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#EC4899", "#6366F1"];

interface DisasterItem {
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
  resolvedAt: string | null;
  createdAt: string;
  funding: { contributed: number; payedOut: number; txCount: number };
  claims: Record<string, number>;
}

interface RegionDist { region: string; count: number }
interface TypeDist { type: string; count: number }

export default function CommunityImpactPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  // Live data state
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [regionDistribution, setRegionDistribution] = useState<RegionDist[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<TypeDist[]>([]);
  const [fundMetrics, setFundMetrics] = useState<{
    fundBalance: number;
    totalContributions: number;
    totalPayouts: number;
    uniqueDonors: number;
    payoutCount: number;
  } | null>(null);

  // UI state
  const [focusedEventIndex, setFocusedEventIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setStale(false);

      try {
        const [disasterRes, fundRes] = await Promise.all([
          fetch("/api/transparency/disasters"),
          fetch("/api/transparency/fund-metrics"),
        ]);

        if (disasterRes.ok) {
          const data = await disasterRes.json();
          setDisasters(data.disasters ?? []);
          setRegionDistribution(data.regionDistribution ?? []);
          setTypeDistribution(data.typeDistribution ?? []);
        } else {
          const data = await disasterRes.json().catch(() => ({}));
          if (data.cached) setStale(true);
          setError("Failed to load disaster data");
        }

        if (fundRes.ok) {
          const data = await fundRes.json();
          setFundMetrics(data.summary ?? null);
        } else {
          const data = await fundRes.json().catch(() => ({}));
          if (data.cached) setStale(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const activeDisasters = disasters.filter((d) => d.status === "ACTIVE");
  const resolvedDisasters = disasters.filter((d) => d.status === "RESOLVED");

  const regionChartData = regionDistribution.map((r) => ({
    name: r.region || "Other",
    value: r.count,
  }));

  const typeChartData = typeDistribution.map((t, i) => ({
    id: `disaster-${i}`,
    name: t.type || "Other",
    value: t.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const handleEventClick = (index: number) => {
    setFocusedEventIndex(index);
  };

  const handleCloseEvent = () => {
    setFocusedEventIndex(null);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (focusedEventIndex === null) return;
    let newIndex = focusedEventIndex;
    if (direction === "prev" && focusedEventIndex > 0) {
      newIndex = focusedEventIndex - 1;
    } else if (direction === "next" && focusedEventIndex < resolvedDisasters.length - 1) {
      newIndex = focusedEventIndex + 1;
    }
    setFocusedEventIndex(newIndex);
    if (newIndex < carouselIndex) {
      setCarouselIndex(newIndex);
    } else if (newIndex >= carouselIndex + 3) {
      setCarouselIndex(newIndex - 2);
    }
  };

  const handleCarouselNavigate = (direction: "prev" | "next") => {
    if (direction === "prev" && carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
    } else if (direction === "next" && carouselIndex < resolvedDisasters.length - 3) {
      setCarouselIndex(carouselIndex + 1);
    }
  };

  const focusedEvent = focusedEventIndex !== null ? resolvedDisasters[focusedEventIndex] : null;
  const visibleEvents = resolvedDisasters.slice(carouselIndex, carouselIndex + 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      <div className="mx-auto max-w-7xl px-8 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 p-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community Impact Dashboard</h1>
              <p className="text-gray-600">
                Transparency, collective action, and real-world impact — powered by ClickHouse
              </p>
            </div>
          </div>
        </div>

        {/* Stale data banner */}
        {stale && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-700">Data may be delayed. Showing cached results.</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-teal-500" />
            <p className="text-sm text-gray-500">Loading impact data from ClickHouse…</p>
          </div>
        ) : error && disasters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="mb-4 h-10 w-10 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <p className="mt-1 text-xs text-gray-400">Please check that ClickHouse is running.</p>
          </div>
        ) : (
          <>
            {/* Impact Summary Cards */}
            {fundMetrics && (
              <div className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4">
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm text-center">
                  <DollarSign className="mx-auto mb-2 h-6 w-6 text-teal-600" />
                  <p className="text-2xl font-bold text-gray-900">${fundMetrics.totalPayouts.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Total Distributed</p>
                </div>
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm text-center">
                  <Users className="mx-auto mb-2 h-6 w-6 text-purple-600" />
                  <p className="text-2xl font-bold text-gray-900">{fundMetrics.uniqueDonors.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Unique Donors</p>
                </div>
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm text-center">
                  <Globe className="mx-auto mb-2 h-6 w-6 text-cyan-600" />
                  <p className="text-2xl font-bold text-gray-900">{disasters.length}</p>
                  <p className="text-sm text-gray-500">Disasters Supported</p>
                </div>
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm text-center">
                  <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-600" />
                  <p className="text-2xl font-bold text-gray-900">{fundMetrics.payoutCount}</p>
                  <p className="text-sm text-gray-500">Payouts Completed</p>
                </div>
              </div>
            )}

            {/* SECTION 1 - Distribution Charts */}
            <div className="mb-12">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Disaster Distribution</h2>
                <p className="text-gray-600">
                  Regional and type-based breakdown of supported disasters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Regional Distribution */}
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-3">
                    <Globe className="h-6 w-6 text-teal-600" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Regional Distribution</h3>
                      <p className="text-sm text-gray-500">Disasters by region</p>
                    </div>
                  </div>
                  {regionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={regionChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#00D6A3" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-sm text-gray-400">No region data available</p>
                  )}
                </div>

                {/* Disaster Type Distribution */}
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-3">
                    <Heart className="h-6 w-6 text-teal-600" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Disaster Types</h3>
                      <p className="text-sm text-gray-500">Distribution by category</p>
                    </div>
                  </div>
                  {typeChartData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={typeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {typeChartData.map((entry) => (
                              <Cell key={`pie-cell-${entry.id}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {typeChartData.map((item) => (
                          <div key={`legend-${item.name}`} className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-gray-700">{item.name} ({item.value})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="py-12 text-center text-sm text-gray-400">No type data available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-12">
              <TrustSection />
            </div>

            {/* SECTION 2 - Active Disasters */}
            <div className="mb-12">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Active Disasters</h2>
                <p className="text-gray-600">
                  Ongoing campaigns receiving community contributions
                </p>
              </div>

              {activeDisasters.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-300 py-12 text-center">
                  <CheckCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No active disasters at this time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {activeDisasters.map((disaster) => {
                    const target = Math.max(disaster.funding.contributed, 1);
                    const progress = Math.min(Math.round((disaster.funding.payedOut / target) * 100), 100);
                    return (
                      <div
                        key={disaster.id}
                        className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm transition-all hover:border-teal-200 hover:shadow-lg"
                      >
                        <div className="relative h-16 overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-600">
                          <div className="absolute right-3 top-3">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-teal-700">
                              {disaster.type}
                            </span>
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="mb-2 text-xl font-bold text-gray-900">{disaster.name}</h3>
                          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            {disaster.region}, {disaster.country}
                          </div>
                          <p className="mb-4 text-xs text-gray-500 line-clamp-2">{disaster.description}</p>

                          <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Contributed</p>
                              <p className="text-lg font-bold text-teal-600">
                                ${disaster.funding.contributed.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Transactions</p>
                              <p className="text-lg font-bold text-gray-900">
                                {disaster.funding.txCount.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-gray-600">Disbursement</span>
                              <span className="font-medium text-gray-900">{progress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 3 - Resolved / Completed Events */}
            {resolvedDisasters.length > 0 && (
              <div className="mb-12">
                <div className="mb-6">
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">Completed Disaster Responses</h2>
                  <p className="text-gray-600">
                    Past disasters fully resolved by our community
                  </p>
                </div>

                <div className="relative px-12">
                  <div className="grid grid-cols-3 gap-6 transition-all duration-500">
                    {visibleEvents.map((event, index) => {
                      const isFocused = focusedEventIndex === index + carouselIndex;
                      return (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(index + carouselIndex)}
                          className={`cursor-pointer overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 ${
                            isFocused
                              ? "scale-105 border-teal-500 shadow-2xl ring-4 ring-teal-200 z-10"
                              : "border-gray-200 shadow-sm hover:border-teal-200 hover:shadow-lg"
                          }`}
                        >
                          <div className="relative h-24 overflow-hidden bg-gradient-to-r from-gray-700 to-gray-800">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <div className="absolute right-3 top-3">
                              <CheckCircle className="h-6 w-6 text-teal-400 drop-shadow-lg" />
                            </div>
                          </div>

                          <div className="p-5">
                            <h3 className="mb-2 text-lg font-bold text-gray-900">{event.name}</h3>
                            <div className="mb-4 flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {event.region}, {event.country}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Distributed:</span>
                                <span className="font-bold text-teal-600">
                                  ${event.funding.payedOut.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Transactions:</span>
                                <span className="font-bold text-gray-900">
                                  {event.funding.txCount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {carouselIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCarouselNavigate("prev");
                      }}
                      className="absolute -left-6 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-4 shadow-xl transition-all hover:scale-110 hover:bg-teal-50"
                    >
                      <ChevronLeft className="h-7 w-7 text-gray-900" />
                    </button>
                  )}
                  {carouselIndex < resolvedDisasters.length - 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCarouselNavigate("next");
                      }}
                      className="absolute -right-6 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-4 shadow-xl transition-all hover:scale-110 hover:bg-teal-50"
                    >
                      <ChevronRight className="h-7 w-7 text-gray-900" />
                    </button>
                  )}
                </div>

                {focusedEventIndex !== null && (
                  <div className="mt-6 flex justify-center gap-2">
                    {resolvedDisasters.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleEventClick(index)}
                        className={`h-2 rounded-full transition-all ${
                          focusedEventIndex === index
                            ? "w-8 bg-teal-500"
                            : "w-2 bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Event Focus Modal */}
      {focusedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
          onClick={handleCloseEvent}
        >
          <div className="relative w-full max-w-5xl">
            {focusedEventIndex !== null && focusedEventIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("prev");
                }}
                className="absolute -left-16 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
              >
                <ChevronLeft className="h-6 w-6 text-gray-900" />
              </button>
            )}
            {focusedEventIndex !== null && focusedEventIndex < resolvedDisasters.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("next");
                }}
                className="absolute -right-16 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
              >
                <ChevronRight className="h-6 w-6 text-gray-900" />
              </button>
            )}

            <button
              onClick={handleCloseEvent}
              className="absolute -right-4 -top-4 z-20 rounded-full bg-white p-2 shadow-xl transition-all hover:scale-110 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-900" />
            </button>

            <div
              className="rounded-2xl border-2 border-teal-500 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-48 overflow-hidden rounded-t-2xl bg-gradient-to-r from-gray-700 to-gray-900">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute right-6 top-6">
                  <CheckCircle className="h-8 w-8 text-teal-400 drop-shadow-lg" />
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="mb-2 text-3xl font-bold text-white drop-shadow-lg">
                    {focusedEvent.name}
                  </h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-4 w-4" />
                    <span className="text-lg">{focusedEvent.region}, {focusedEvent.country}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-5 grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-teal-50 p-3 text-center">
                    <DollarSign className="mx-auto mb-1 h-5 w-5 text-teal-600" />
                    <p className="mb-1 text-xs text-gray-600">Total Distributed</p>
                    <p className="text-lg font-bold text-teal-600">
                      ${focusedEvent.funding.payedOut.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3 text-center">
                    <DollarSign className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                    <p className="mb-1 text-xs text-gray-600">Contributed</p>
                    <p className="text-lg font-bold text-purple-600">
                      ${focusedEvent.funding.contributed.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <Building2 className="mx-auto mb-1 h-5 w-5 text-amber-600" />
                    <p className="mb-1 text-xs text-gray-600">Transactions</p>
                    <p className="text-lg font-bold text-amber-600">
                      {focusedEvent.funding.txCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-cyan-50 p-3 text-center">
                    <Calendar className="mx-auto mb-1 h-5 w-5 text-cyan-600" />
                    <p className="mb-1 text-xs text-gray-600">Severity</p>
                    <p className="text-sm font-bold text-cyan-600">{focusedEvent.severity}/10</p>
                  </div>
                </div>

                <div className="mb-5 rounded-xl bg-gray-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                    <Globe className="h-4 w-4 text-teal-600" />
                    About this Disaster
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-700">{focusedEvent.description}</p>
                </div>

                {Object.keys(focusedEvent.claims).length > 0 && (
                  <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
                      <Users className="h-4 w-4 text-teal-600" />
                      Claims Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(focusedEvent.claims).map(([status, count]) => (
                        <div
                          key={status}
                          className="flex items-center gap-2 rounded-lg bg-white p-2.5 shadow-sm"
                        >
                          <CheckCircle className="h-4 w-4 flex-shrink-0 text-teal-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {status.replace(/_/g, " ")}: {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-2">
              {resolvedDisasters.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    focusedEventIndex === index
                      ? "w-8 bg-teal-400"
                      : "w-2 bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}



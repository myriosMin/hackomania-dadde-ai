"use client";

import { useState, useEffect } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import {
  Trophy,
  Users,
  DollarSign,
  Loader2,
  AlertCircle,
  Medal,
  Star,
} from "lucide-react";

interface LeaderboardEntry {
  displayName: string;
  avatarUrl: string | null;
  totalContributed: number;
  transactionCount: number;
  joinedAt: string;
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard ?? []);
        } else {
          setError("Failed to load leaderboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60_000);
    return () => clearInterval(interval);
  }, []);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Medal className="h-6 w-6 text-amber-600" />;
    return <Star className="h-5 w-5 text-gray-300" />;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "border-yellow-300 bg-yellow-50";
    if (index === 1) return "border-gray-300 bg-gray-50";
    if (index === 2) return "border-amber-300 bg-amber-50";
    return "border-gray-200 bg-white";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      <div className="mx-auto max-w-3xl px-8 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Donor Leaderboard</h1>
          <p className="mt-2 text-gray-600">
            Our most generous community members — opt-in only
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Recipients are never shown. Only donors who opt into the leaderboard in Settings appear here.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-teal-500" />
            <p className="text-sm text-gray-500">Loading leaderboard…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="mb-4 h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No donors on the leaderboard yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Donors can opt in via Settings → Profile → Show on Leaderboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={`${entry.displayName}-${index}`}
                className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all hover:shadow-md ${getRankBg(index)}`}
              >
                {/* Rank */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                  {index < 3 ? (
                    getRankIcon(index)
                  ) : (
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-lg font-bold text-white">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    entry.displayName?.charAt(0)?.toUpperCase() ?? "?"
                  )}
                </div>

                {/* Name */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{entry.displayName}</p>
                  <p className="text-xs text-gray-500">
                    {entry.transactionCount} contribution{entry.transactionCount !== 1 ? "s" : ""} · Member since{" "}
                    {new Date(entry.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-1 text-right">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  <span className="text-xl font-bold text-teal-600">
                    {entry.totalContributed.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

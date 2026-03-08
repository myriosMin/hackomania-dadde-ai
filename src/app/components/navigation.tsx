"use client";

import { Lock, User, Settings, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/auth-context";

export function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isAdmin, loading } = useAuth();

  return (
    <nav className="border-b bg-white px-8 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="DADDE's FUND Logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-semibold text-gray-900">DADDE's FUND</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={`pb-1 text-sm font-medium ${pathname === "/"
                ? "border-b-2 border-teal-500 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Main Page
            </Link>
            <Link
              href="/impact"
              className={`pb-1 text-sm font-medium ${pathname === "/impact"
                ? "border-b-2 border-teal-500 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Community Impact
            </Link>
            <Link
              href="/community"
              className={`pb-1 text-sm font-medium ${pathname === "/community"
                ? "border-b-2 border-teal-500 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Transparency
            </Link>
            <Link
              href="/leaderboard"
              className={`pb-1 text-sm font-medium ${pathname === "/leaderboard"
                ? "border-b-2 border-teal-500 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Leaderboard
            </Link>
            {isAuthenticated ? (
              <Link
                href="/submit-claim"
                className={`pb-1 text-sm font-medium ${pathname === "/submit-claim"
                  ? "border-b-2 border-teal-500 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Submit Claim
              </Link>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Submit Claim</span>
              </div>
            )}
            {isAuthenticated ? (
              <Link
                href="/my-giving"
                className={`pb-1 text-sm font-medium ${pathname === "/my-giving"
                  ? "border-b-2 border-teal-500 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                My Giving
              </Link>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">My Giving</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  Login required
                </span>
              </div>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1 pb-1 text-sm font-medium ${pathname === "/admin"
                  ? "border-b-2 border-purple-500 text-purple-700"
                  : "text-purple-600 hover:text-purple-700"
                  }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100" />
          ) : isAuthenticated ? (
            <>
              <Link
                href="/my-giving"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                {user?.displayName || "Profile"}
              </Link>
              <Link
                href="/settings"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === "/settings"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
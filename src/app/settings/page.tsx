"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { useAuthFetch } from "../../lib/use-auth-fetch";
import {
  User,
  Shield,
  Bell,
  Globe,
  DollarSign,
  Save,
  Loader2,
  Lock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { PreferencesUpdate, ProfileUpdate } from "../../lib/types/user";

type Tab = "profile" | "preferences" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const { user, preferences, isAuthenticated, loading, updateProfile, updatePreferences, refreshProfile } = useAuth();
  const authFetch = useAuthFetch();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(false);

  // Notification settings
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(false);

  // Preferences form state
  const [disasterTypes, setDisasterTypes] = useState<string[]>(["ALL"]);
  const [geoRegions, setGeoRegions] = useState<string[]>(["GLOBAL"]);
  const [roundupLimit, setRoundupLimit] = useState("1.00");
  const [dailyCap, setDailyCap] = useState("10.00");
  const [weeklyCap, setWeeklyCap] = useState("50.00");
  const [monthlyCap, setMonthlyCap] = useState("200.00");
  const [subscriptionAmount, setSubscriptionAmount] = useState("0");
  const [subscriptionInterval, setSubscriptionInterval] = useState("P1M");
  const [autoRoute, setAutoRoute] = useState(false);

  // Populate form from context
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setWalletAddress(user.walletAddress ?? "");
      setPhone(user.phone ?? "");
      setBio(user.bio ?? "");
      setIsLeaderboardVisible(user.isLeaderboardVisible);
      setNotificationEmail(user.notificationEmail);
      setNotificationPush(user.notificationPush);
    }
  }, [user]);

  useEffect(() => {
    if (preferences) {
      setDisasterTypes(preferences.disaster_types ?? ["ALL"]);
      setGeoRegions(preferences.geographic_regions ?? ["GLOBAL"]);
      setRoundupLimit(String(preferences.roundup_limit_per_tx ?? "1.00"));
      setDailyCap(String(preferences.daily_micro_cap ?? "10.00"));
      setWeeklyCap(String(preferences.weekly_micro_cap ?? "50.00"));
      setMonthlyCap(String(preferences.monthly_micro_cap ?? "200.00"));
      setSubscriptionAmount(String(preferences.subscription_amount ?? "0"));
      setSubscriptionInterval(preferences.subscription_interval ?? "P1M");
      setAutoRoute(preferences.auto_route_to_active_disaster ?? false);
    }
  }, [preferences]);

  if (loading) {
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
            <p className="mb-6 text-gray-600">Sign in to access your settings.</p>
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Log In
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const showSaveMessage = (type: "success" | "error", text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const updates: ProfileUpdate = {
      display_name: displayName,
      wallet_address: walletAddress || undefined,
      phone: phone || undefined,
      bio,
      is_leaderboard_visible: isLeaderboardVisible,
    };

    const { error } = await updateProfile(updates);
    setSaving(false);

    if (error) {
      showSaveMessage("error", error);
    } else {
      showSaveMessage("success", "Profile saved successfully!");
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    const updates: ProfileUpdate = {
      notification_email: notificationEmail,
      notification_push: notificationPush,
    };
    const { error } = await updateProfile(updates);
    setSaving(false);
    if (error) {
      showSaveMessage("error", error);
    } else {
      showSaveMessage("success", "Notification settings saved!");
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    const updates: PreferencesUpdate = {
      disaster_types: disasterTypes.length > 0 ? disasterTypes : ["ALL"],
      geographic_regions: geoRegions.length > 0 ? geoRegions : ["GLOBAL"],
      roundup_limit_per_tx: parseFloat(roundupLimit) || 1.0,
      daily_micro_cap: parseFloat(dailyCap) || 10.0,
      weekly_micro_cap: parseFloat(weeklyCap) || 50.0,
      monthly_micro_cap: parseFloat(monthlyCap) || 200.0,
      subscription_amount: parseFloat(subscriptionAmount) || 0,
      subscription_interval: subscriptionInterval,
      auto_route_to_active_disaster: autoRoute,
    };
    const { error } = await updatePreferences(updates);
    setSaving(false);
    if (error) {
      showSaveMessage("error", error);
    } else {
      showSaveMessage("success", "Donation preferences saved!");
    }
  };

  const disasterTypeOptions = [
    { value: "ALL", label: "All Disasters" },
    { value: "FLOOD", label: "Floods" },
    { value: "EARTHQUAKE", label: "Earthquakes" },
    { value: "WILDFIRE", label: "Wildfires" },
    { value: "TYPHOON", label: "Typhoons" },
    { value: "DROUGHT", label: "Droughts" },
    { value: "TSUNAMI", label: "Tsunamis" },
  ];

  const regionOptions = [
    { value: "GLOBAL", label: "Global" },
    { value: "ASIA_PACIFIC", label: "Asia Pacific" },
    { value: "AMERICAS", label: "Americas" },
    { value: "EUROPE", label: "Europe" },
    { value: "MIDDLE_EAST", label: "Middle East" },
    { value: "AFRICA", label: "Africa" },
  ];

  const toggleArrayItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      // Remove "ALL"/"GLOBAL" if selecting specific ones
      const filtered = arr.filter((i) => i !== "ALL" && i !== "GLOBAL");
      setter([...filtered, item]);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "preferences", label: "Donation Preferences", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-4xl px-8 py-12">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

        {/* Save message */}
        {saveMessage && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-lg border p-3 text-sm ${
              saveMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {saveMessage.text}
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar tabs */}
          <div className="w-56 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Role badge */}
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Your Role</p>
              <span
                className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  user?.role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {user?.role === "admin" ? "Admin" : "User"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* ── Profile Tab ──────────────────────────────── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                  <p className="mt-1 text-sm text-gray-500">Manage your personal details</p>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email ?? ""}
                      disabled
                      className="w-full rounded-lg border-2 border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">Email is managed by Supabase Auth</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-teal-600" />
                        Open Payments Wallet Address
                      </div>
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="$wallet.example.com/alice"
                      className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8901"
                      className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Tell us a bit about yourself..."
                      className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="leaderboard"
                      checked={isLeaderboardVisible}
                      onChange={(e) => setIsLeaderboardVisible(e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="leaderboard" className="text-sm text-gray-700">
                      Show my name on the donor leaderboard
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Profile
                </button>
              </div>
            )}

            {/* ── Preferences Tab ──────────────────────────── */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Donation Preferences</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure where and how your donations are allocated
                  </p>
                </div>

                {/* Disaster Types */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Preferred Disaster Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {disasterTypeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleArrayItem(disasterTypes, opt.value, setDisasterTypes)}
                        className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                          disasterTypes.includes(opt.value)
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-teal-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Geographic Regions */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Preferred Geographic Regions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {regionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleArrayItem(geoRegions, opt.value, setGeoRegions)}
                        className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                          geoRegions.includes(opt.value)
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-teal-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spending Limits */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Spending Limits
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Round-up Limit / Tx ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={roundupLimit}
                        onChange={(e) => setRoundupLimit(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Daily Cap ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dailyCap}
                        onChange={(e) => setDailyCap(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Weekly Cap ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={weeklyCap}
                        onChange={(e) => setWeeklyCap(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Monthly Cap ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={monthlyCap}
                        onChange={(e) => setMonthlyCap(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Subscription */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Monthly Pledge</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Amount ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={subscriptionAmount}
                        onChange={(e) => setSubscriptionAmount(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Interval</label>
                      <select
                        value={subscriptionInterval}
                        onChange={(e) => setSubscriptionInterval(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      >
                        <option value="P1W">Weekly</option>
                        <option value="P1M">Monthly</option>
                        <option value="P3M">Quarterly</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Auto-route */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoRoute"
                    checked={autoRoute}
                    onChange={(e) => setAutoRoute(e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="autoRoute" className="text-sm text-gray-700">
                    Automatically route donations to active disasters
                  </label>
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Preferences
                </button>
              </div>
            )}

            {/* ── Notifications Tab ────────────────────────── */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                  <p className="mt-1 text-sm text-gray-500">Manage how you receive updates</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive updates about campaigns and payouts via email</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationEmail(!notificationEmail)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                        notificationEmail ? "bg-teal-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          notificationEmail ? "translate-x-5.5" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-500">Get real-time alerts for urgent disaster events</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationPush(!notificationPush)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                        notificationPush ? "bg-teal-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          notificationPush ? "translate-x-5.5" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Notifications
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

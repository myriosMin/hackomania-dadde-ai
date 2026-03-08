"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { Mail, Lock, User, Shield, Globe, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Step 1 fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  // Step 2 fields
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDisasterTypes, setSelectedDisasterTypes] = useState<string[]>([]);
  const [wantsMonthlyPledge, setWantsMonthlyPledge] = useState<boolean>(false);
  const [monthlyAmount, setMonthlyAmount] = useState<string>("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated && !signupSuccess) {
    router.push("/my-giving");
    return null;
  }

  const regions = [
    { value: "ASIA_PACIFIC", label: "Asia Pacific" },
    { value: "AMERICAS", label: "Americas" },
    { value: "EUROPE", label: "Europe" },
    { value: "MIDDLE_EAST", label: "Middle East" },
    { value: "AFRICA", label: "Africa" },
  ];

  const disasterTypes = [
    { value: "FLOOD", label: "Floods" },
    { value: "EARTHQUAKE", label: "Earthquakes" },
    { value: "WILDFIRE", label: "Wildfires" },
    { value: "TYPHOON", label: "Typhoons/Hurricanes" },
    { value: "DROUGHT", label: "Droughts" },
    { value: "TSUNAMI", label: "Tsunamis" },
  ];

  const toggleRegion = (value: string) => {
    setSelectedRegions(prev =>
      prev.includes(value)
        ? prev.filter(r => r !== value)
        : [...prev, value]
    );
  };

  const toggleDisasterType = (value: string) => {
    setSelectedDisasterTypes(prev =>
      prev.includes(value)
        ? prev.filter(d => d !== value)
        : [...prev, value]
    );
  };

  const handleNextStep = () => {
    setError(null);
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);

    // Sign up with Supabase Auth — the trigger creates profile + default preferences
    const { error: authError } = await signup(email, password, {
      display_name: displayName,
      wallet_address: walletAddress || undefined,
    });

    if (authError) {
      setIsSubmitting(false);
      setError(authError.message);
      return;
    }

    // After signup + auto-login, update preferences if the user selected any
    // We need a small delay for the auth context to pick up the new session
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const prefsUpdate: Record<string, unknown> = {};
      if (selectedDisasterTypes.length > 0) {
        prefsUpdate.disaster_types = selectedDisasterTypes;
      }
      if (selectedRegions.length > 0) {
        prefsUpdate.geographic_regions = selectedRegions;
      }
      if (wantsMonthlyPledge && monthlyAmount) {
        prefsUpdate.subscription_amount = parseFloat(monthlyAmount);
      }

      // Update preferences via our API if any were selected
      if (Object.keys(prefsUpdate).length > 0) {
        // Get the fresh session token from the stored session
        const { getSupabaseBrowser } = await import("../../lib/supabase-browser");
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          await fetch("/api/user/preferences", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(prefsUpdate),
          });
        }
      }
    } catch {
      // Preferences update is non-critical — user can configure later
      console.warn("Failed to save initial preferences, user can configure in settings.");
    }

    setIsSubmitting(false);
    setSignupSuccess(true);
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
        <Navigation />
        <div className="flex min-h-[calc(100vh-300px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Welcome to DADDE Fund!
            </h1>
            <p className="mb-6 text-gray-600">
              Your account has been created successfully. Check your email to confirm your account, then start making an impact.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/my-giving"
                className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-all hover:bg-gray-50"
              >
                Explore Campaigns
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <Navigation />
      
      <div className="flex min-h-[calc(100vh-300px)] items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600">
              <span className="text-3xl">💚</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Join DADDE Fund
            </h1>
            <p className="text-gray-600">
              Create an account to unlock monthly pledges and track your impact
            </p>
          </div>
          
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            {/* Progress Indicator */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-teal-500' : 'bg-gray-300'}`} />
              <div className={`h-2 w-20 rounded-full ${step === 1 ? 'bg-teal-500' : 'bg-gray-300'}`} />
              <div className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-teal-500' : 'bg-gray-300'}`} />
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {step === 1 && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Must be at least 6 characters
                    </p>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Open Payments Wallet (Optional)
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="$wallet.example.com/alice"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      You can add this later in settings
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
                  >
                    Next
                  </button>
                </>
              )}
              
              {step === 2 && (
                <>
                  {/* Donation Preferences */}
                  <div className="rounded-lg border-2 border-teal-200 bg-teal-50/50 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Globe className="h-4 w-4 text-teal-600" />
                      Donation Preferences
                    </h3>
                    <p className="mb-4 text-xs text-gray-600">
                      Select your preferred regions and disaster types to personalize your giving experience
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-700">
                          Preferred Regions (Select multiple)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {regions.map((region) => (
                            <button
                              key={region.value}
                              type="button"
                              onClick={() => toggleRegion(region.value)}
                              className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                                selectedRegions.includes(region.value)
                                  ? "border-teal-500 bg-teal-500 text-white"
                                  : "border-gray-300 bg-white text-gray-700 hover:border-teal-300"
                              }`}
                            >
                              {region.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-700">
                          Preferred Disaster Types (Select multiple)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {disasterTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => toggleDisasterType(type.value)}
                              className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                                selectedDisasterTypes.includes(type.value)
                                  ? "border-teal-500 bg-teal-500 text-white"
                                  : "border-gray-300 bg-white text-gray-700 hover:border-teal-300"
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Monthly Pledge */}
                  <div className="rounded-lg border-2 border-cyan-200 bg-cyan-50/50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">
                      💙 Monthly Giving Pledge
                    </h3>
                    <p className="mb-4 text-xs text-gray-600">
                      Make a bigger impact with automated monthly donations to the collective disaster fund
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-700">
                          Would you like to set up a monthly pledge?
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setWantsMonthlyPledge(true);
                            }}
                            className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                              wantsMonthlyPledge
                                ? "border-cyan-500 bg-cyan-500 text-white"
                                : "border-gray-300 bg-white text-gray-700 hover:border-cyan-300"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWantsMonthlyPledge(false);
                              setMonthlyAmount("");
                            }}
                            className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                              !wantsMonthlyPledge
                                ? "border-cyan-500 bg-cyan-500 text-white"
                                : "border-gray-300 bg-white text-gray-700 hover:border-cyan-300"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                      
                      {wantsMonthlyPledge && (
                        <div>
                          <label className="mb-2 block text-xs font-medium text-gray-700">
                            Monthly Pledge Amount ($)
                          </label>
                          <input
                            type="number"
                            placeholder="25"
                            value={monthlyAmount}
                            onChange={(e) => setMonthlyAmount(e.target.value)}
                            className="w-full rounded-lg border-2 border-gray-200 bg-white py-2 px-3 text-sm focus:border-cyan-500 focus:outline-none"
                            min="1"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            You can change or cancel this anytime from your dashboard
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <span className="text-gray-600">
                      I agree to the{" "}
                      <a href="#" className="text-teal-600 hover:text-teal-700">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-teal-600 hover:text-teal-700">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setError(null); }}
                      disabled={isSubmitting}
                      className="rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Account…
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="//login" className="font-medium text-teal-600 hover:text-teal-700">
                Log in
              </Link>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-teal-900">
                What you'll get:
              </h4>
              <ul className="space-y-1 text-xs text-teal-700">
                <li>✓ Set up monthly pledges to support ongoing relief efforts</li>
                <li>✓ Track your donation history and impact</li>
                <li>✓ Access your personalized giving dashboard</li>
                <li>✓ Receive updates on campaigns you support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
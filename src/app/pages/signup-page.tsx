import { Link } from "react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { Mail, Lock, User, Shield, Globe, AlertTriangle } from "lucide-react";
import { useState } from "react";

export function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDisasterTypes, setSelectedDisasterTypes] = useState<string[]>([]);
  const [wantsMonthlyPledge, setWantsMonthlyPledge] = useState<boolean>(false);
  const [monthlyAmount, setMonthlyAmount] = useState<string>("");

  const regions = [
    { value: "asia-pacific", label: "Asia Pacific" },
    { value: "americas", label: "Americas" },
    { value: "europe", label: "Europe" },
    { value: "middle-east", label: "Middle East" },
    { value: "africa", label: "Africa" },
  ];

  const disasterTypes = [
    { value: "flood", label: "Floods" },
    { value: "earthquake", label: "Earthquakes" },
    { value: "wildfire", label: "Wildfires" },
    { value: "typhoon", label: "Typhoons/Hurricanes" },
    { value: "drought", label: "Droughts" },
    { value: "tsunami", label: "Tsunamis" },
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
            
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
                        className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
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
                        className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      You can add this later in settings
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setStep(2)}
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
                    <input type="checkbox" className="mt-0.5 rounded border-gray-300" />
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
                      onClick={() => setStep(1)}
                      className="rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition-all hover:border-gray-400"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
                    >
                      Create Account
                    </button>
                  </div>
                </>
              )}
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
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
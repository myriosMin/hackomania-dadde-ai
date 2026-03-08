import { Link, useNavigate } from "react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { Mail, Lock, Shield, Loader2 } from "lucide-react";
import { useState } from "react";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/my-giving");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    const { error: authError } = await login(email, password);
    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
    } else {
      navigate("/my-giving");
    }
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
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Log in to access your giving dashboard
            </p>
          </div>
          
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
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
                    disabled={isSubmitting}
                    className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none disabled:opacity-50"
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
                    disabled={isSubmitting}
                    className="w-full rounded-lg border-2 border-gray-200 py-3 pl-10 pr-4 focus:border-teal-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-teal-600 hover:text-teal-700">
                  Forgot password?
                </a>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-teal-600 hover:text-teal-700">
                Sign up
              </Link>
            </div>
          </div>
          
          <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 shrink-0 text-teal-600" />
              <div>
                <h4 className="mb-1 text-sm font-medium text-teal-900">
                  Unlock Premium Features
                </h4>
                <p className="text-xs text-teal-700">
                  Log in to access monthly pledges, donation tracking, and your personalized giving dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
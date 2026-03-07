import { Link } from "react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { Home, AlertCircle } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <Navigation />
      
      <div className="flex min-h-[calc(100vh-300px)] items-center justify-center px-8 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <AlertCircle className="h-12 w-12 text-gray-400" />
          </div>
          
          <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Page Not Found</h2>
          <p className="mb-8 text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

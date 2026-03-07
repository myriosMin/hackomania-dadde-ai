import { Lock, User, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../context/auth-context";

export function Navigation() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  
  return (
    <nav className="border-b bg-white px-8 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
              <span className="text-xl">💚</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">DADDE Fund</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className={`pb-1 text-sm font-medium ${
                location.pathname === "/" 
                  ? "border-b-2 border-teal-500 text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Main Page
            </Link>
            <Link 
              to="/impact" 
              className={`pb-1 text-sm font-medium ${
                location.pathname === "/impact" 
                  ? "border-b-2 border-teal-500 text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Community Impact
            </Link>
            {isAuthenticated ? (
              <Link 
                to="/my-giving" 
                className={`pb-1 text-sm font-medium ${
                  location.pathname === "/my-giving" 
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
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link 
                to="/my-giving"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                {user?.name}
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
                to="/login"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
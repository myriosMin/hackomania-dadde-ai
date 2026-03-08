import { Link } from "react-router";
import { XCircle, Home } from "lucide-react";

export function OrderCancelled() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Message */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Order Cancelled</h1>
          <p className="text-gray-600 mb-8">
            Your payment has been declined and the order has been cancelled. No charges have been made.
          </p>

          {/* Button */}
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Go Back to Home Page
          </Link>

          {/* Additional Info */}
          <p className="text-sm text-gray-500 mt-6">
            If this was a mistake, you can return to the shop and try again.
          </p>
        </div>
      </div>
    </div>
  );
}

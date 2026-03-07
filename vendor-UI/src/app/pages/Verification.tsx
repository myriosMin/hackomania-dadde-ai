import { useSearchParams, useNavigate } from "react-router";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export function Verification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const productId = searchParams.get("productId");
  const amount = searchParams.get("amount");
  const roundUp = searchParams.get("roundUp") === "true";
  const walletAddress = searchParams.get("walletAddress");

  const handleApprove = () => {
    navigate(`/order-complete?productId=${productId}&amount=${amount}&roundUp=${roundUp}`);
  };

  const handleDecline = () => {
    navigate("/order-cancelled");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Placeholder Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Placeholder Verification Page</h3>
              <p className="text-sm text-yellow-800">
                This is a demonstration page. In production, this would connect to the actual Open Payments verification system.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Verify Payment</h1>
            <p className="text-gray-600">Please review and confirm your payment details</p>
          </div>

          {/* Payment Details */}
          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">${amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium text-gray-900">Open Payments</span>
                </div>
                {roundUp && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disaster Relief Donation:</span>
                    <span className="font-medium text-blue-600">Enabled</span>
                  </div>
                )}
                <div className="flex justify-between items-start pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Wallet:</span>
                  <span className="font-medium text-gray-900 text-right break-all max-w-[200px] text-xs">
                    {walletAddress || "Not provided"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Approve Payment
            </button>
            <button
              onClick={handleDecline}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Decline Payment
            </button>
          </div>

          {/* Security Notice */}
          <p className="text-xs text-gray-500 text-center mt-6">
            Your payment information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Wallet, Building2, CircleDollarSign, Shield, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { products } from "./Storefront";

type PaymentMethod = "card" | "paypal" | "bank" | "open-payments";

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get("productId");
  const product = products.find(p => p.id === Number(productId));

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [roundUpEnabled, setRoundUpEnabled] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No product selected</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Return to shop
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = product.price;
  const shipping = 4.99;
  const roundUpAmount = roundUpEnabled ? parseFloat((Math.ceil((subtotal + shipping) * 10) / 10 - (subtotal + shipping)).toFixed(2)) : 0;
  const total = subtotal + shipping + roundUpAmount;

  const handleConfirmPayment = () => {
    if (selectedPayment === "open-payments") {
      // Redirect to verification page with order details
      navigate(`/verification?productId=${productId}&roundUp=${roundUpEnabled}&amount=${total.toFixed(2)}&walletAddress=${walletAddress}`);
    } else {
      // Handle other payment methods (could add similar flows)
      alert("Payment processing for " + selectedPayment);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between py-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Shop</span>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">ShopHub</h1>
            <div className="w-24" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </header>

      {/* Checkout Progress */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-sm font-medium text-gray-900">Cart</span>
            </div>
            <div className="w-12 h-px bg-gray-900" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-sm font-medium text-gray-900">Payment</span>
            </div>
            <div className="w-12 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-sm text-gray-600">Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Payment Methods */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
              <p className="text-sm text-gray-600 mt-1">Partnered with Open Payments</p>
            </div>
            
            <div className="space-y-3">
              {/* Open Payments - Featured */}
              <button
                onClick={() => setSelectedPayment("open-payments")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedPayment === "open-payments"
                    ? "border-blue-600 bg-blue-50"
                    : "border-blue-200 bg-blue-50/30 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Open Payments</span>
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        New
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">Support disaster relief with your purchase</p>
                  </div>
                </div>
              </button>

              {/* Open Payments Expanded Section */}
              {selectedPayment === "open-payments" && (
                <div className="border-2 border-blue-600 rounded-lg p-5 bg-white">
                  {/* Trust Badge */}
                  <div className="flex items-start gap-3 mb-4">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Round Up for Disaster Relief</h3>
                      <p className="text-sm text-gray-700 mb-3">
                        Round up your purchase to the nearest tenth cent and automatically contribute the difference to disaster response, powered and managed by DADDE AI.
                      </p>
                    </div>
                  </div>

                  {/* Example Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Your total:</span>
                        <span className="font-medium">${(subtotal + shipping).toFixed(2)}</span>
                      </div>
                      {roundUpEnabled && (
                        <>
                          <div className="flex justify-between text-blue-600">
                            <span>Round up to:</span>
                            <span className="font-medium">${(Math.ceil((subtotal + shipping) * 10) / 10).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-blue-600 font-medium">
                            <span>Your contribution:</span>
                            <span>${roundUpAmount.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={roundUpEnabled}
                        onChange={(e) => setRoundUpEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Enable round-up donation
                    </span>
                  </label>

                  {/* Wallet Address Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter your Open Payments wallet address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm"
                    />
                  </div>

                  {/* Learn More Link */}
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span>Learn more about DADDE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Trust Text */}
                  <p className="text-xs text-gray-500 mt-4">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Secure, transparent, and 100% of your contribution goes to verified disaster relief efforts
                  </p>
                </div>
              )}

              {/* Credit/Debit Card */}
              <button
                onClick={() => setSelectedPayment("card")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedPayment === "card"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-700" />
                  <span className="font-medium text-gray-900">Credit / Debit Card</span>
                </div>
              </button>

              {/* PayPal */}
              <button
                onClick={() => setSelectedPayment("paypal")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedPayment === "paypal"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-gray-700" />
                  <span className="font-medium text-gray-900">PayPal</span>
                </div>
              </button>

              {/* Bank Transfer */}
              <button
                onClick={() => setSelectedPayment("bank")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedPayment === "bank"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-700" />
                  <span className="font-medium text-gray-900">Bank Transfer</span>
                </div>
              </button>
            </div>

            {/* Confirm Payment Button */}
            <button
              disabled={!selectedPayment}
              onClick={handleConfirmPayment}
              className="w-full mt-6 bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {selectedPayment ? "Confirm Payment" : "Select Payment Method"}
            </button>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              {/* Product Card */}
              <div className="flex gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Qty: 1</span>
                    <span className="font-medium text-gray-900">${product.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                {roundUpEnabled && (
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Round-up donation</span>
                    <span>+${roundUpAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-semibold text-gray-900">
                      ${(roundUpEnabled ? total : total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>Secure checkout powered by industry standards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
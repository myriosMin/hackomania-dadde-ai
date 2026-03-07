import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { campaigns } from "../components/disaster-campaigns";
import { CreditCard, Smartphone, Wallet, Check, ArrowLeft, Shield } from "lucide-react";

const paymentMethods = [
  { id: "openpayments", name: "Open Payments", icon: "🌐", highlighted: true, label: "Default" },
  { id: "card", name: "Debit/Credit Card", icon: "💳" },
  { id: "paynow", name: "PayNow", icon: "📱" },
];

export function PaymentPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>("openpayments");
  
  // Handle collective fund - no specific campaign
  const isCollectiveFund = campaignId === "collective";
  const campaign = isCollectiveFund ? null : campaigns.find((c) => c.id === campaignId);
  
  if (!isCollectiveFund && !campaign) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Campaign not found</h2>
            <Link 
              to="/" 
              className="text-teal-600 hover:text-teal-700"
            >
              Return to homepage
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const suggestedAmounts = [25, 50, 100, 250];

  const handleComplete = () => {
    if (selectedAmount || customAmount) {
      const fundName = isCollectiveFund ? "DADDE Collective Disaster Fund" : campaign!.name;
      // Simulate payment processing
      alert(`Thank you for your donation of $${selectedAmount || customAmount} to ${fundName}!`);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="px-8 py-12">
        <div className="mx-auto max-w-5xl">
          <Link 
            to="/" 
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>
          
          <div className="grid grid-cols-3 gap-8">
            {/* Left side - Payment form */}
            <div className="col-span-2 space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  Complete Your Donation
                </h2>
                
                {/* Amount Selection */}
                <div className="mb-6">
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Select Amount
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {suggestedAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount("");
                        }}
                        className={`rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                          selectedAmount === amount
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <input
                      type="number"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 transition-all ${
                          selectedPaymentMethod === method.id
                            ? "border-teal-500 bg-teal-50"
                            : method.highlighted
                            ? "border-teal-200 bg-teal-50/30 hover:border-teal-300"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{method.icon}</span>
                          <span className={`font-medium ${
                            selectedPaymentMethod === method.id || method.highlighted
                              ? "text-teal-900"
                              : "text-gray-900"
                          }`}>
                            {method.name}
                          </span>
                          {method.highlighted && (
                            <span className="rounded bg-teal-600 px-2 py-0.5 text-xs text-white">
                              Default
                            </span>
                          )}
                        </div>
                        {selectedPaymentMethod === method.id && (
                          <Check className="h-5 w-5 text-teal-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Details (shown for card payments) */}
                {selectedPaymentMethod && ["card"].includes(selectedPaymentMethod) && (
                  <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          CVV
                        </label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Open Payments Details */}
                {selectedPaymentMethod === "openpayments" && (
                  <div className="mt-6 space-y-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-teal-600" />
                      <div className="flex-1">
                        <h4 className="mb-1 font-medium text-teal-900">
                          Connect Your Open Payments Wallet
                        </h4>
                        <p className="text-sm text-teal-700">
                          Secure, transparent payments powered by Interledger Protocol
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-teal-900">
                        Wallet Address
                      </label>
                      <input
                        type="text"
                        placeholder="$wallet.example.com/alice"
                        className="w-full rounded-lg border border-teal-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Donation Button */}
              <button
                onClick={handleComplete}
                disabled={!selectedPaymentMethod || (!selectedAmount && !customAmount)}
                className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 text-lg font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Complete Donation
              </button>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span>Secured by Interledger Protocol</span>
              </div>
            </div>

            {/* Right side - Campaign summary */}
            <div className="col-span-1">
              <div className="sticky top-6 rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Donation Summary
                </h3>
                
                <div className="mb-4 overflow-hidden rounded-lg">
                  {campaign && (
                    <img 
                      src={campaign.imageUrl} 
                      alt={campaign.name}
                      className="h-32 w-full object-cover"
                    />
                  )}
                </div>
                
                <h4 className="mb-2 font-medium text-gray-900">
                  {isCollectiveFund ? "DADDE Collective Disaster Fund" : campaign!.name}
                </h4>
                <p className="mb-4 text-sm text-gray-600">
                  {isCollectiveFund ? "Support multiple disaster relief efforts" : campaign!.description}
                </p>
                
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  {campaign && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Location</span>
                        <span className="font-medium text-gray-900">{campaign.location}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Category</span>
                        <span className="font-medium text-gray-900">{campaign.category}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Urgency</span>
                        <span className="font-medium text-red-600">{campaign.urgency}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-4 rounded-lg bg-teal-50 p-4">
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-gray-700">Your donation</span>
                    <span className="font-bold text-teal-600">
                      ${selectedAmount || customAmount || "0"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    One-time payment • Guest user
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
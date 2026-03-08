import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { campaigns } from "../components/disaster-campaigns";
import { CreditCard, Smartphone, Wallet, Check, ArrowLeft, Shield, Loader2, AlertCircle, CheckCircle2, RefreshCw, Zap } from "lucide-react";

const paymentMethods = [
  { id: "openpayments", name: "Open Payments", icon: "🌐", highlighted: true, label: "Default" },
  { id: "card", name: "Debit/Credit Card", icon: "💳" },
  { id: "paynow", name: "PayNow", icon: "📱" },
];

const recurringIntervals = [
  { id: "1min", label: "Every 1 Min", interval: "R/{START}/PT1M" },
  { id: "weekly", label: "Weekly", interval: "R/{START}/P1W" },
  { id: "monthly", label: "Monthly", interval: "R/{START}/P1M" },
  { id: "quarterly", label: "Quarterly", interval: "R/{START}/P3M" },
];

export function PaymentPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>("openpayments");
  const [walletAddress, setWalletAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [walletAssetCode, setWalletAssetCode] = useState("USD");
  const [walletAssetScale, setWalletAssetScale] = useState(2);
  const [donationType, setDonationType] = useState<"one-time" | "recurring">("one-time");
  const [selectedInterval, setSelectedInterval] = useState("monthly");

  // Handle return from IDP callback (reads ?status=success|error|cancelled)
  // Also handles subscription IDP return (interact_ref param)
  useEffect(() => {
    const status = searchParams.get("status");
    const interactRef = searchParams.get("interact_ref");
    const idpError = searchParams.get("error");

    if (!status && !interactRef && !idpError) return;

    if (status === "success") {
      const paymentId = searchParams.get("payment_id") ?? "";
      setPaymentSuccess(
        `Donation completed successfully!${paymentId ? ` Payment ID: ${paymentId}` : ""}`
      );
    } else if (status === "cancelled" || idpError === "access_denied") {
      setPaymentError("Payment was cancelled. You can try again when you're ready.");
    } else if (status === "error") {
      const message = searchParams.get("message") ?? "Something went wrong";
      setPaymentError(message);
    } else if (interactRef) {
      // Subscription IDP return — the recurring grant was approved
      setPaymentSuccess(
        "Recurring subscription activated! Your wallet will be charged automatically on each interval."
      );
    }

    // Clean the query params from the URL so a refresh doesn't re-trigger
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch the fund wallet's actual currency on mount
  useEffect(() => {
    fetch("/api/payments/wallet-info")
      .then((r) => r.json())
      .then((data) => {
        if (data.assetCode) setWalletAssetCode(data.assetCode);
        if (data.assetScale !== undefined) setWalletAssetScale(data.assetScale);
      })
      .catch(() => {/* keep defaults */});
  }, []);
  
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

  const handleComplete = async () => {
    const donationAmount = selectedAmount ?? Number(customAmount);
    if (!donationAmount || donationAmount <= 0) return;

    setPaymentError(null);
    setPaymentSuccess(null);

    if (selectedPaymentMethod === "openpayments") {
      setIsProcessing(true);
      try {
        // Convert display amount to base units using the wallet's actual asset scale
        const baseAmount = String(Math.round(donationAmount * Math.pow(10, walletAssetScale)));

        if (donationType === "recurring") {
          // ── Recurring / Subscription flow ──
          const intervalTemplate = recurringIntervals.find((i) => i.id === selectedInterval);
          const now = new Date();
          const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
          const interval = (intervalTemplate?.interval ?? "R/{START}/P1M").replace("{START}", start);

          const res = await fetch("/api/payments/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              senderWalletAddress: walletAddress || undefined,
              pledgeAmount: baseAmount,
              assetCode: walletAssetCode,
              assetScale: walletAssetScale,
              interval,
              redirectUrl: window.location.origin + window.location.pathname,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error ?? data.errors?.join(", ") ?? "Subscription failed");
          }

          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
          }
        } else {
          // ── One-time donation flow ──
        const res = await fetch("/api/payments/contribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderWalletAddress: walletAddress || undefined,
            amount: baseAmount,
            assetCode: walletAssetCode,
            assetScale: walletAssetScale,
            // The redirectUrl is used by the backend as the return_url for
            // the callback route (where to send the user after IDP consent).
            // The actual callback URL is built server-side.
            redirectUrl: window.location.pathname,
            disasterEventId: campaign?.id ?? undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? data.errors?.join(", ") ?? "Payment failed");
        }

        if (data.completed) {
          // Non-interactive grant — payment done server-side
          setPaymentSuccess(
            `Payment completed! ID: ${data.paymentId}. ${walletAssetCode} ${donationAmount} donated successfully.`
          );
          setTimeout(() => navigate("/"), 3000);
        } else if (data.redirectUrl) {
          // Interactive grant — redirect to IDP for consent.
          // All continuation state is stored server-side (pending grants store).
          // The callback route will complete the payment after IDP approval.
          window.location.href = data.redirectUrl;
        }
        } // end of one-time else block
      } catch (err) {
        setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Non-Open-Payments methods — placeholder
      const fundName = isCollectiveFund ? "DADDE Collective Disaster Fund" : campaign!.name;
      alert(`Thank you for your donation of $${donationAmount} to ${fundName}! (Demo — ${selectedPaymentMethod} not yet integrated)`);
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

                {/* Donation Type Toggle */}
                <div className="mb-6">
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Donation Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDonationType("one-time")}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                        donationType === "one-time"
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Zap className="h-4 w-4" />
                      One-Time
                    </button>
                    <button
                      onClick={() => setDonationType("recurring")}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                        donationType === "recurring"
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Recurring
                    </button>
                  </div>
                </div>

                {/* Recurring Interval Selection */}
                {donationType === "recurring" && (
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Frequency
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {recurringIntervals.map((interval) => (
                        <button
                          key={interval.id}
                          onClick={() => setSelectedInterval(interval.id)}
                          className={`rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                            selectedInterval === interval.id
                              ? "border-purple-500 bg-purple-50 text-purple-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {interval.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Your wallet will be charged this amount every {selectedInterval} via Open Payments recurring grant.
                    </p>
                  </div>
                )}
                
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
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="http://ilp.interledger-test.dev/your-wallet"
                        className="w-full rounded-lg border border-teal-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-teal-600">
                        Leave empty to use the demo test wallet
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment status messages */}
              {paymentError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">Payment failed</p>
                    <p className="text-sm text-red-600">{paymentError}</p>
                  </div>
                </div>
              )}
              {paymentSuccess && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">Donation successful!</p>
                    <p className="text-sm text-green-600">{paymentSuccess}</p>
                  </div>
                </div>
              )}

              {/* Complete Donation Button */}
              <button
                onClick={handleComplete}
                disabled={isProcessing || !selectedPaymentMethod || (!selectedAmount && !customAmount)}
                className={`w-full rounded-lg px-6 py-4 text-lg font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  donationType === "recurring"
                    ? "bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                    : "bg-linear-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {donationType === "recurring" ? "Setting up subscription…" : "Processing payment…"}
                  </span>
                ) : donationType === "recurring" ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Start {selectedInterval.charAt(0).toUpperCase() + selectedInterval.slice(1)} Subscription
                  </span>
                ) : (
                  "Complete Donation"
                )}
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
                
                <div className={`mt-4 rounded-lg p-4 ${donationType === "recurring" ? "bg-purple-50" : "bg-teal-50"}`}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-gray-700">Your donation</span>
                    <span className={`font-bold ${donationType === "recurring" ? "text-purple-600" : "text-teal-600"}`}>
                      {walletAssetCode} {selectedAmount || customAmount || "0"}
                      {donationType === "recurring" && `/${selectedInterval.replace("ly", "")}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {donationType === "recurring"
                      ? `${selectedInterval.charAt(0).toUpperCase() + selectedInterval.slice(1)} subscription • Open Payments`
                      : "One-time payment • Guest user"}
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
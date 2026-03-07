import { useSearchParams, Link } from "react-router";
import { CheckCircle, Package, Truck, Calendar } from "lucide-react";
import { products } from "./Storefront";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function OrderComplete() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId");
  const amount = searchParams.get("amount");
  const roundUp = searchParams.get("roundUp") === "true";
  
  const product = products.find(p => p.id === Number(productId));
  
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Order not found</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Return to shop
          </Link>
        </div>
      </div>
    );
  }

  const orderId = `ORD-${Date.now().toString().slice(-8)}`;
  const orderDate = new Date().toLocaleDateString("en-US", { 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  });
  
  const subtotal = product.price;
  const shipping = 4.99;
  const roundUpAmount = roundUp ? parseFloat((Math.ceil((subtotal + shipping) * 10) / 10 - (subtotal + shipping)).toFixed(2)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-center py-4">
            <h1 className="text-2xl font-semibold text-gray-900">ShopHub</h1>
          </div>
        </div>
      </header>

      {/* Success Message */}
      <div className="bg-green-50 border-b border-green-200">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Purchase Complete!</h2>
              <p className="text-gray-700">Thank you for your order. Your item will be shipped in 1-2 business days.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Order Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="font-medium text-gray-900">{orderId}</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Date</p>
              <p className="font-medium text-gray-900">{orderDate}</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
            <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Delivery</p>
              <p className="font-medium text-gray-900">1-2 days</p>
            </div>
          </div>
        </div>

        {/* Order Receipt */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Receipt</h3>
          </div>

          {/* Product Details */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{product.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantity: 1</span>
                  <span className="font-medium text-gray-900">${product.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              {roundUp && roundUpAmount > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Disaster Relief Donation (Round-up)</span>
                  <span>+${roundUpAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Paid</span>
                  <span className="text-2xl font-semibold text-gray-900">${amount}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-gray-900">Open Payments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thank You Message */}
        {roundUp && roundUpAmount > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Thank you for your contribution!</h4>
                <p className="text-sm text-gray-700">
                  Your ${roundUpAmount.toFixed(2)} round-up donation will help support disaster relief efforts 
                  through DADDE AI. 100% of your contribution goes directly to verified relief organizations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link
            to="/"
            className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium text-center"
          >
            Continue Shopping
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 border-2 border-gray-300 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Print Receipt
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
      </div>
    </div>
  );
}

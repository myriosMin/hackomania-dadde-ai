import { Shield, TrendingUp, Users, DollarSign } from "lucide-react";

export function TrustSection() {
  return (
    <section className="bg-gray-50 px-8 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Built on Transparency & Trust
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Every donation is tracked with complete transparency. We ensure responsible fund 
            distribution and provide real-time visibility into how your contributions make an impact.
          </p>
        </div>
        
        <div className="grid grid-cols-4 gap-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
              <DollarSign className="h-6 w-6 text-teal-600" />
            </div>
            <div className="mb-1 text-3xl font-bold text-gray-900">$8.2M</div>
            <div className="text-sm text-gray-600">Total Funds Distributed</div>
          </div>
          
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
              <TrendingUp className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="mb-1 text-3xl font-bold text-gray-900">147</div>
            <div className="text-sm text-gray-600">Active Campaigns</div>
          </div>
          
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mb-1 text-3xl font-bold text-gray-900">45,203</div>
            <div className="text-sm text-gray-600">Global Contributors</div>
          </div>
          
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div className="mb-1 text-3xl font-bold text-gray-900">100%</div>
            <div className="text-sm text-gray-600">Verified Recipients</div>
          </div>
        </div>
        
        <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-900">
                Powered by Interledger Protocol
              </h3>
              <p className="text-sm text-gray-700">
                We use Interledger and Open Payments to ensure secure, transparent transactions. 
                Every donation is tracked on-chain, and all fund distributions follow strict 
                verification and payout rules to protect both donors and recipients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
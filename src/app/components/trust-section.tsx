import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Globe2,
  Shield,
  Wallet,
} from "lucide-react";

const FUND_FLOW = [
  { step: "Donations Received", value: "$8.9M", note: "Gross inbound" },
  { step: "Compliance Cleared", value: "$8.5M", note: "KYC + AML checks" },
  { step: "Payouts Sent", value: "$8.2M", note: "To verified recipients" },
];

const DISTRIBUTION = [
  { label: "Emergency Food", percent: 34, amount: "$2.79M", color: "bg-teal-500" },
  { label: "Medical Support", percent: 27, amount: "$2.21M", color: "bg-cyan-500" },
  { label: "Shelter & Housing", percent: 23, amount: "$1.89M", color: "bg-blue-500" },
  { label: "Logistics", percent: 10, amount: "$0.82M", color: "bg-indigo-500" },
  { label: "Admin", percent: 6, amount: "$0.49M", color: "bg-slate-400" },
] as const;

const VERIFICATION = [
  { label: "Approved", value: 100, color: "#14b8a6" },
  { label: "Flagged", value: 0, color: "#f97316" },
] as const;

export function TrustSection() {
  return (
    <section className="bg-slate-50 px-8 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900">Transparency, Visualized</h2>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">
            A clear snapshot of how donations move through verification and into real-world relief.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
            <h3 className="mb-5 text-lg font-semibold text-slate-900">Funding Flow</h3>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              {FUND_FLOW.map((item, index) => (
                <div key={item.step} className="contents">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.step}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.note}</p>
                  </div>
                  {index < FUND_FLOW.length - 1 && (
                    <div className="hidden items-center justify-center md:flex">
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Net conversion from received to paid-out funds: <span className="font-semibold text-slate-800">92.1%</span>
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
            <h3 className="mb-5 text-lg font-semibold text-slate-900">Verification Funnel</h3>
            <div className="flex items-center gap-5">
              <div className="relative flex h-30 w-30 items-center justify-center rounded-full bg-[conic-gradient(#14b8a6_0deg_360deg,#e2e8f0_360deg_360deg)]">
                <div className="h-20 w-20 rounded-full bg-white" />
                <div className="absolute text-center">
                  <p className="text-2xl font-bold text-slate-900">100%</p>
                  <p className="text-xs text-slate-500">approved</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {VERIFICATION.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium">{item.label}</span>
                    <span className="text-slate-500">{item.value}%</span>
                  </div>
                ))}
                <p className="pt-2 text-xs text-slate-500">Updated every 24h via policy + identity checks</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-12">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Where Funds Go</h3>
            <div className="space-y-3">
              {DISTRIBUTION.map((row) => (
                <div key={row.label} className="grid items-center gap-3 md:grid-cols-[170px_1fr_80px_70px]">
                  <div className="text-sm font-medium text-slate-700">{row.label}</div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.percent}%` }} />
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-900">{row.percent}%</div>
                  <div className="text-right text-sm text-slate-600">{row.amount}</div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Clock3 className="h-4 w-4 text-teal-600" />
            Avg settlement time: <span className="font-semibold">4m 12s</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Globe2 className="h-4 w-4 text-blue-600" />
            Countries reached: <span className="font-semibold">62</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Shield className="h-4 w-4 text-emerald-600" />
            SLA compliance: <span className="font-semibold">98.7%</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Wallet className="h-4 w-4 text-cyan-600" />
            Live campaigns: <span className="font-semibold">147</span>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <BadgeCheck className="h-3.5 w-3.5" />
          Powered by Interledger rails with continuous verification
        </div>
      </div>
    </section>
  );
}

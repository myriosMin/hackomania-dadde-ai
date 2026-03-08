import { ArrowRight, BadgeCheck, HandHeart, SearchCheck, Wallet } from "lucide-react";

const STEPS = [
  {
    title: "Choose a cause",
    description: "Browse active disasters by urgency, location, and funding progress.",
    icon: SearchCheck,
  },
  {
    title: "Donate securely",
    description: "Contribute through Open Payments rails with transparent transaction tracking.",
    icon: Wallet,
  },
  {
    title: "Track impact",
    description: "See distributions, recipient verification, and real-world outcomes in one place.",
    icon: HandHeart,
  },
] as const;

export function LearnHowItWorks() {
  return (
    <section id="learn-how-it-works" className="bg-white px-8 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Learn How It Works</h2>
          <p className="mt-3 max-w-3xl text-lg text-gray-600">
            A simple flow from donation to verified impact, designed for speed, trust, and visibility.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100">
                    <Icon className="h-5 w-5 text-teal-700" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{step.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-white p-2">
                <BadgeCheck className="h-5 w-5 text-teal-700" />
              </div>
              <p className="text-sm text-gray-700">
                Every payout goes only to verified recipients and is auditable through our impact dashboard.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 self-start rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 md:self-auto">
              See Community Impact
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

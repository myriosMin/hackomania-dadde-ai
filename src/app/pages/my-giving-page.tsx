import { Link } from "react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { Lock } from "lucide-react";

const donationHistory = [
  {
    id: "1",
    campaignName: "Flood Relief in the Philippines",
    amount: 100,
    date: "2026-03-05",
  },
  {
    id: "2",
    campaignName: "Earthquake Response in Turkey",
    amount: 50,
    date: "2026-03-01",
  },
  {
    id: "3",
    campaignName: "Wildfire Recovery in California",
    amount: 75,
    date: "2026-02-28",
  },
  {
    id: "4",
    campaignName: "Typhoon Support in Southeast Asia",
    amount: 50,
    date: "2026-02-15",
  },
  {
    id: "5",
    campaignName: "Flood Relief in the Philippines",
    amount: 25,
    date: "2026-02-10",
  },
  {
    id: "6",
    campaignName: "Hurricane Relief - Caribbean",
    amount: 150,
    date: "2026-01-20",
  },
];

function calculateMonthlyTotal(items: typeof donationHistory) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return items
    .filter((item) => {
      const donationDate = new Date(item.date);
      return donationDate.getMonth() === month && donationDate.getFullYear() === year;
    })
    .reduce((sum, item) => sum + item.amount, 0);
}

export function MyGivingPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex min-h-[calc(100vh-260px)] items-center justify-center px-8 py-12">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="mb-3 text-3xl font-bold text-gray-900">Login Required</h1>
            <p className="mb-7 text-gray-600">Sign in to view your giving summary and contribution history.</p>
            <div className="flex justify-center gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border border-teal-600 px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const monthlyTotal = calculateMonthlyTotal(donationHistory);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-3xl px-8 py-12">
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Total Contributions This Month</p>
          <p className="mt-3 text-5xl font-bold text-teal-600">${monthlyTotal.toLocaleString()}</p>
          <p className="mt-2 text-sm text-gray-500">
            {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">Contribution History</h2>
          <div className="space-y-4">
            {donationHistory.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-gray-900">{donation.campaignName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(donation.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900">${donation.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>


        <section className="mb-8 rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">I Want to Pledge</h2>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            A pledge lets you commit a target amount each month, like $5. If your donations for the month are below
            that amount, the remaining balance is automatically deducted from your wallet at the end of the month.
          </p>
          <button
            type="button"
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Set Up Monthly Pledge
          </button>
        </section>
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">My Wallet Link</h2>
          <a
            href={user?.walletAddress ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
          >
            {user?.walletAddress ?? "No wallet linked"}
          </a>
        </section>
      </div>

      <Footer />
    </div>
  );
}




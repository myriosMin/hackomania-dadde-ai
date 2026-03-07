import { Navigation } from "../components/navigation";
import { Hero } from "../components/hero";
import { LearnHowItWorks } from "../components/learn-how-it-works";
import { DisasterCampaigns } from "../components/disaster-campaigns";
import { Footer } from "../components/footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <LearnHowItWorks />
      <DisasterCampaigns />
      <Footer />
    </div>
  );
}

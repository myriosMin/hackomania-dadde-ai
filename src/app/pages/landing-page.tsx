import { Navigation } from "../components/navigation";
import { Hero } from "../components/hero";
import { DisasterCampaigns } from "../components/disaster-campaigns";
import { TrustSection } from "../components/trust-section";
import { Footer } from "../components/footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <DisasterCampaigns />
      <TrustSection />
      <Footer />
    </div>
  );
}

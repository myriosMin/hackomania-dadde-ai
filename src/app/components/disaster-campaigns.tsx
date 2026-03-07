import { useState } from "react";
import { MapPin, Users, AlertCircle, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Campaign {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  urgency: "Critical" | "High" | "Moderate";
  affectedPopulation: string;
  fundingProgress: number;
  imageUrl: string;
}

export const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Flood Relief in the Philippines",
    description: "Immediate relief for communities affected by severe flooding. Providing shelter, food, and medical supplies.",
    location: "Manila, Philippines",
    category: "Flood",
    urgency: "Critical",
    affectedPopulation: "50,000+",
    fundingProgress: 67,
    imageUrl: "https://images.unsplash.com/photo-1664868035693-7d3cba76826b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vZCUyMGRpc2FzdGVyJTIwcmVsaWVmfGVufDF8fHx8MTc3Mjg3NDIzN3ww&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "2",
    name: "Earthquake Response in Turkey",
    description: "Emergency support for earthquake survivors. Rebuilding homes and infrastructure for displaced families.",
    location: "Southeastern Turkey",
    category: "Earthquake",
    urgency: "High",
    affectedPopulation: "120,000+",
    fundingProgress: 45,
    imageUrl: "https://images.unsplash.com/photo-1646227163793-7aae7155d5bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJ0aHF1YWtlJTIwZGVzdHJ1Y3Rpb24lMjBydWJibGV8ZW58MXx8fHwxNzcyODc0MjM4fDA&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "3",
    name: "Wildfire Recovery in California",
    description: "Supporting communities recovering from devastating wildfires. Helping families rebuild and restore their lives.",
    location: "Northern California, USA",
    category: "Wildfire",
    urgency: "Moderate",
    affectedPopulation: "15,000+",
    fundingProgress: 82,
    imageUrl: "https://images.unsplash.com/photo-1767416129512-2012f3156f5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aWxkZmlyZSUyMHNtb2tlJTIwZGFtYWdlfGVufDF8fHx8MTc3Mjg3NDIzOXww&ixlib=rb-4.1.0&q=80&w=1080"
  },
  {
    id: "4",
    name: "Typhoon Support in Southeast Asia",
    description: "Urgent assistance for typhoon-affected communities. Providing clean water, food supplies, and medical care.",
    location: "Vietnam & Cambodia",
    category: "Typhoon",
    urgency: "Critical",
    affectedPopulation: "85,000+",
    fundingProgress: 34,
    imageUrl: "https://images.unsplash.com/photo-1768293528649-531aad843525?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0eXBob29uJTIwc3Rvcm0lMjBkYW1hZ2V8ZW58MXx8fHwxNzcyODc0MjM5fDA&ixlib=rb-4.1.0&q=80&w=1080"
  }
];

function CampaignCard({ 
  campaign,
  onFocus 
}: { 
  campaign: Campaign;
  onFocus: (campaign: Campaign) => void;
}) {
  const urgencyColors = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Moderate: "bg-yellow-100 text-yellow-700"
  };

  return (
    <div 
      onClick={() => onFocus(campaign)}
      className="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:border-teal-200"
    >
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback 
          src={campaign.imageUrl}
          alt={campaign.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute right-3 top-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${urgencyColors[campaign.urgency]}`}>
            {campaign.urgency}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
            {campaign.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {campaign.location}
          </span>
        </div>
        
        <h3 className="mb-2 text-xl font-semibold text-gray-900">
          {campaign.name}
        </h3>
        
        <p className="mb-4 text-sm text-gray-600">
          {campaign.description}
        </p>
        
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{campaign.affectedPopulation} affected</span>
        </div>
        
        <p className="mt-3 text-center text-xs text-gray-500">
          Click to learn more
        </p>
      </div>
    </div>
  );
}

export function DisasterCampaigns() {
  const [focusedCampaign, setFocusedCampaign] = useState<Campaign | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  
  const handleFocus = (campaign: Campaign) => {
    const index = campaigns.findIndex(c => c.id === campaign.id);
    setFocusedIndex(index);
    setFocusedCampaign(campaign);
    setSlideDirection(null);
  };
  
  const handleCloseFocus = () => {
    setFocusedCampaign(null);
    setFocusedIndex(null);
    setSlideDirection(null);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (focusedIndex === null) return;
    
    if (direction === "prev" && focusedIndex > 0) {
      setSlideDirection("right");
      setTimeout(() => {
        setFocusedIndex(focusedIndex - 1);
        setFocusedCampaign(campaigns[focusedIndex - 1]);
      }, 150);
    } else if (direction === "next" && focusedIndex < campaigns.length - 1) {
      setSlideDirection("left");
      setTimeout(() => {
        setFocusedIndex(focusedIndex + 1);
        setFocusedCampaign(campaigns[focusedIndex + 1]);
      }, 150);
    }
  };

  return (
    <>
      <section className="bg-white px-8 py-16" id="campaigns-section">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-teal-600" />
            <h2 className="text-3xl font-bold text-gray-900">
              Urgent & Recommended Relief Campaigns
            </h2>
          </div>
          <p className="mb-12 text-gray-600">
            These campaigns are prioritized by urgency, relevance, and impact. Your support makes an immediate difference.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onFocus={handleFocus}
              />
            ))}
          </div>
          
          {/* Pagination Dots */}
          {focusedIndex !== null && (
            <div className="mt-8 flex justify-center gap-2">
              {campaigns.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleFocus(campaigns[index])}
                  className={`h-2 rounded-full transition-all ${
                    focusedIndex === index
                      ? "w-8 bg-teal-500"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Stage Focus Modal */}
      {focusedCampaign && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
          onClick={handleCloseFocus}
        >
          <div className="relative w-full max-w-4xl">
            {/* Navigation Arrows - Outside the card */}
            {focusedIndex !== null && focusedIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("prev");
                }}
                className="absolute -left-16 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-xl transition-all hover:scale-110"
              >
                <ChevronLeft className="h-6 w-6 text-gray-900" />
              </button>
            )}
            {focusedIndex !== null && focusedIndex < campaigns.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("next");
                }}
                className="absolute -right-16 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-xl transition-all hover:scale-110"
              >
                <ChevronRight className="h-6 w-6 text-gray-900" />
              </button>
            )}

            {/* Modal Card */}
            <div 
              className="relative w-full rounded-2xl bg-white shadow-2xl overflow-hidden animate-[scale-up_0.3s_ease-out]"
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: 'scale-up 0.3s ease-out'
              }}
            >
              <button
                onClick={handleCloseFocus}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 transition-colors hover:bg-white hover:text-gray-900"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="relative h-96 overflow-hidden">
                <ImageWithFallback 
                  src={focusedCampaign.imageUrl}
                  alt={focusedCampaign.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="mb-4 flex items-center gap-3">
                    <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      focusedCampaign.urgency === 'Critical' ? 'bg-red-100 text-red-700' :
                      focusedCampaign.urgency === 'High' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {focusedCampaign.urgency} Urgency
                    </span>
                    <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-gray-700">
                      {focusedCampaign.category}
                    </span>
                  </div>
                  <h2 className="mb-2 text-4xl font-bold text-white">
                    {focusedCampaign.name}
                  </h2>
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-5 w-5" />
                    <span className="text-lg">{focusedCampaign.location}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="mb-3 text-xl font-semibold text-gray-900">About This Campaign</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {focusedCampaign.description}
                  </p>
                </div>
                
                <div className="mb-6 grid grid-cols-3 gap-6">
                  <div className="rounded-lg bg-teal-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">Impact Details</h4>
                    <p className="text-sm text-gray-600">
                      Essential relief including emergency shelter, clean water, medical supplies, and food provisions.
                    </p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">Distribution Timeline</h4>
                    <p className="text-sm text-gray-600">
                      Funds distributed within 48-72 hours to verified local organizations on the ground.
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">Verification Status</h4>
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-teal-600" />
                      <span className="text-sm font-medium text-teal-600">Verified by DADDE Fund</span>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">{focusedCampaign.affectedPopulation} people affected</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Dots Indicator - Below the card */}
            <div className="mt-6 flex justify-center gap-2">
              {campaigns.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocus(campaigns[index]);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    focusedIndex === index
                      ? "w-8 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
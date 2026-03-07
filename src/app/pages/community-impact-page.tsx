import { useState } from "react";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import {
  Globe,
  TrendingUp,
  Users,
  MapPin,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Calendar,
  Heart,
  DollarSign,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mock data for charts
const regionData = [
  { id: "region-1", name: "Southeast Asia", value: 3400 },
  { id: "region-2", name: "South Asia", value: 2800 },
  { id: "region-3", name: "Africa", value: 2100 },
  { id: "region-4", name: "Latin America", value: 1600 },
  { id: "region-5", name: "Global", value: 1200 },
];

const disasterTypeData = [
  { id: "disaster-1", name: "Floods", value: 4200, color: "#0891B2" },
  { id: "disaster-2", name: "Earthquakes", value: 3100, color: "#F59E0B" },
  { id: "disaster-3", name: "Wildfires", value: 2400, color: "#EF4444" },
  { id: "disaster-4", name: "Typhoons", value: 2900, color: "#8B5CF6" },
  { id: "disaster-5", name: "Hurricanes", value: 1800, color: "#10B981" },
];

interface ActiveDisaster {
  id: string;
  name: string;
  location: string;
  type: string;
  amountRaised: number;
  donorCount: number;
  progress: number;
  imageUrl: string;
}

interface CompletedEvent {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  totalDistributed: number;
  peopleHelped: number;
  organizations: string[];
  timeline: string;
  summary: string;
}

const activeDisasters: ActiveDisaster[] = [
  {
    id: "1",
    name: "Philippines Flood Relief",
    location: "Manila, Philippines",
    type: "Flood",
    amountRaised: 120000,
    donorCount: 3400,
    progress: 75,
    imageUrl: "https://images.unsplash.com/photo-1664868035693-7d3cba76826b?w=400",
  },
  {
    id: "2",
    name: "Turkey Earthquake Response",
    location: "Southeastern Turkey",
    type: "Earthquake",
    amountRaised: 250000,
    donorCount: 6200,
    progress: 92,
    imageUrl: "https://images.unsplash.com/photo-1646227163793-7aae7155d5bd?w=400",
  },
  {
    id: "3",
    name: "California Wildfire Support",
    location: "Northern California",
    type: "Wildfire",
    amountRaised: 85000,
    donorCount: 2100,
    progress: 68,
    imageUrl: "https://images.unsplash.com/photo-1767416129512-2012f3156f5b?w=400",
  },
  {
    id: "4",
    name: "Bangladesh Cyclone Relief",
    location: "Cox's Bazar, Bangladesh",
    type: "Cyclone",
    amountRaised: 150000,
    donorCount: 4800,
    progress: 85,
    imageUrl: "https://images.unsplash.com/photo-1768293528649-531aad843525?w=400",
  },
];

const completedEvents: CompletedEvent[] = [
  {
    id: "1",
    name: "Turkey-Syria Earthquake 2023",
    location: "Turkey & Syria",
    imageUrl: "https://images.unsplash.com/photo-1646227163793-7aae7155d5bd?w=600",
    totalDistributed: 850000,
    peopleHelped: 125000,
    organizations: [
      "Turkish Red Crescent",
      "Syria Relief Network",
      "Médecins Sans Frontières",
      "Direct Relief International",
    ],
    timeline: "Feb 2023 - Aug 2023",
    summary: "Devastating 7.8 magnitude earthquake struck southern Turkey and northern Syria. Funds were distributed to verified local organizations providing emergency shelter, medical care, and long-term reconstruction support.",
  },
  {
    id: "2",
    name: "Pakistan Floods 2022",
    location: "Pakistan",
    imageUrl: "https://images.unsplash.com/photo-1664868035693-7d3cba76826b?w=600",
    totalDistributed: 620000,
    peopleHelped: 95000,
    organizations: [
      "Al-Khidmat Foundation",
      "Edhi Foundation",
      "Pakistan Red Crescent",
      "Islamic Relief",
    ],
    timeline: "Aug 2022 - Mar 2023",
    summary: "Historic flooding affected 33 million people. Community funds provided clean water systems, temporary shelters, food supplies, and medical assistance through trusted local partners.",
  },
  {
    id: "3",
    name: "Hurricane Ian Relief",
    location: "Florida, USA",
    imageUrl: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600",
    totalDistributed: 420000,
    peopleHelped: 42000,
    organizations: [
      "American Red Cross",
      "Team Rubicon",
      "Direct Relief",
      "Heart of Florida United Way",
    ],
    timeline: "Sep 2022 - Jan 2023",
    summary: "Category 4 hurricane caused catastrophic damage. Funds supported immediate emergency response, home repairs, and helping families rebuild their lives.",
  },
  {
    id: "4",
    name: "Morocco Earthquake 2023",
    location: "Morocco",
    imageUrl: "https://images.unsplash.com/photo-1591213273485-4e08c32d9522?w=600",
    totalDistributed: 380000,
    peopleHelped: 58000,
    organizations: [
      "Moroccan Red Crescent",
      "Association Marocaine de Solidarité",
      "INSAF Morocco",
      "International Medical Corps",
    ],
    timeline: "Sep 2023 - Feb 2024",
    summary: "6.8 magnitude earthquake in High Atlas Mountains. Community contributions helped provide emergency tents, medical services, food distribution, and reconstruction materials.",
  },
  {
    id: "5",
    name: "Maui Wildfires 2023",
    location: "Hawaii, USA",
    imageUrl: "https://images.unsplash.com/photo-1767416129512-2012f3156f5b?w=600",
    totalDistributed: 540000,
    peopleHelped: 28000,
    organizations: [
      "Maui Food Bank",
      "Hawaii Community Foundation",
      "Maui Strong Fund",
      "Council for Native Hawaiian Advancement",
    ],
    timeline: "Aug 2023 - Dec 2023",
    summary: "Devastating wildfires destroyed Lahaina. Funds provided housing assistance, food security, mental health support, and helped local families rebuild homes and businesses.",
  },
];

export function CommunityImpactPage() {
  const [focusedEventIndex, setFocusedEventIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const handleEventClick = (index: number) => {
    setFocusedEventIndex(index);
  };

  const handleCloseEvent = () => {
    setFocusedEventIndex(null);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (focusedEventIndex === null) return;

    let newIndex = focusedEventIndex;
    if (direction === "prev" && focusedEventIndex > 0) {
      newIndex = focusedEventIndex - 1;
    } else if (direction === "next" && focusedEventIndex < completedEvents.length - 1) {
      newIndex = focusedEventIndex + 1;
    }
    
    setFocusedEventIndex(newIndex);
    
    // Auto-scroll carousel to show the focused event
    if (newIndex < carouselIndex) {
      setCarouselIndex(newIndex);
    } else if (newIndex >= carouselIndex + 3) {
      setCarouselIndex(newIndex - 2);
    }
  };

  const handleCarouselNavigate = (direction: "prev" | "next") => {
    if (direction === "prev" && carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
    } else if (direction === "next" && carouselIndex < completedEvents.length - 3) {
      setCarouselIndex(carouselIndex + 1);
    }
  };

  const focusedEvent = focusedEventIndex !== null ? completedEvents[focusedEventIndex] : null;
  const visibleEvents = completedEvents.slice(carouselIndex, carouselIndex + 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      <div className="mx-auto max-w-7xl px-8 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 p-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community Impact Dashboard</h1>
              <p className="text-gray-600">
                Transparency, collective action, and real-world impact
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1 - Community Preferences */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Community Preferences</h2>
            <p className="text-gray-600">
              What our donor community cares about most, based on signup preferences
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Preferred Regions */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <Globe className="h-6 w-6 text-teal-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Preferred Regions</h3>
                  <p className="text-sm text-gray-500">Most selected by donors</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00D6A3" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Preferred Disaster Types */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <Heart className="h-6 w-6 text-teal-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Preferred Disaster Types</h3>
                  <p className="text-sm text-gray-500">Community priorities</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={disasterTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {disasterTypeData.map((entry) => (
                      <Cell key={`pie-cell-${entry.id}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Custom Legend */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {disasterTypeData.map((item) => (
                  <div key={`legend-${item.name}`} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-700">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 - Recent Disasters Supported */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Recent Disasters Supported</h2>
            <p className="text-gray-600">
              Active campaigns currently receiving community donations
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {activeDisasters.map((disaster) => (
              <div
                key={disaster.id}
                className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm transition-all hover:border-teal-200 hover:shadow-lg"
              >
                <div className="relative h-40 overflow-hidden">
                  <ImageWithFallback
                    src={disaster.imageUrl}
                    alt={disaster.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute right-3 top-3">
                    <span className="rounded-full bg-teal-500 px-3 py-1 text-xs font-medium text-white">
                      {disaster.type}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{disaster.name}</h3>
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {disaster.location}
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Amount Raised</p>
                      <p className="text-lg font-bold text-teal-600">
                        ${disaster.amountRaised.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Donors</p>
                      <p className="text-lg font-bold text-gray-900">
                        {disaster.donorCount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{disaster.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                        style={{ width: `${disaster.progress}%` }}
                      />
                    </div>
                  </div>

                  <button className="w-full rounded-lg border-2 border-teal-500 bg-white py-2 text-sm font-medium text-teal-600 transition-all hover:bg-teal-50">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3 - Completed Events Carousel */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Completed Disaster Responses</h2>
            <p className="text-gray-600">
              Past disasters fully funded and completed by our community
            </p>
          </div>

          {/* Carousel */}
          <div className="relative px-12">
            <div className="grid grid-cols-3 gap-6 transition-all duration-500">
              {visibleEvents.map((event, index) => {
                const isFocused = focusedEventIndex === index + carouselIndex;
                
                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(index + carouselIndex)}
                    className={`cursor-pointer overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 ${
                      isFocused
                        ? "scale-105 border-teal-500 shadow-2xl ring-4 ring-teal-200 z-10"
                        : "border-gray-200 shadow-sm hover:border-teal-200 hover:shadow-lg"
                    }`}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <ImageWithFallback
                        src={event.imageUrl}
                        alt={event.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute right-3 top-3">
                        <CheckCircle className="h-6 w-6 text-teal-400 drop-shadow-lg" />
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="mb-2 text-lg font-bold text-gray-900">
                        {event.name}
                      </h3>
                      <div className="mb-4 flex items-center gap-1 text-xs text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Distributed:</span>
                          <span className="font-bold text-teal-600">
                            ${event.totalDistributed.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">People helped:</span>
                          <span className="font-bold text-gray-900">
                            {event.peopleHelped.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel Navigation Arrows */}
            {carouselIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCarouselNavigate("prev");
                }}
                className="absolute -left-6 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-4 shadow-xl transition-all hover:scale-110 hover:bg-teal-50"
              >
                <ChevronLeft className="h-7 w-7 text-gray-900" />
              </button>
            )}
            {carouselIndex < completedEvents.length - 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCarouselNavigate("next");
                }}
                className="absolute -right-6 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-4 shadow-xl transition-all hover:scale-110 hover:bg-teal-50"
              >
                <ChevronRight className="h-7 w-7 text-gray-900" />
              </button>
            )}
          </div>

          {/* Dots Indicator */}
          {focusedEventIndex !== null && (
            <div className="mt-6 flex justify-center gap-2">
              {completedEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleEventClick(index)}
                  className={`h-2 rounded-full transition-all ${
                    focusedEventIndex === index
                      ? "w-8 bg-teal-500"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stage Focus Modal */}
      {focusedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
          onClick={handleCloseEvent}
        >
          <div className="relative w-full max-w-5xl">
            {/* Navigation Arrows - Outside the card */}
            {focusedEventIndex !== null && focusedEventIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("prev");
                }}
                className="absolute -left-16 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
              >
                <ChevronLeft className="h-6 w-6 text-gray-900" />
              </button>
            )}
            {focusedEventIndex !== null && focusedEventIndex < completedEvents.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("next");
                }}
                className="absolute -right-16 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
              >
                <ChevronRight className="h-6 w-6 text-gray-900" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={handleCloseEvent}
              className="absolute -right-4 -top-4 z-20 rounded-full bg-white p-2 shadow-xl transition-all hover:scale-110 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-900" />
            </button>

            {/* Modal Content */}
            <div 
              className="rounded-2xl border-2 border-teal-500 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Section */}
              <div className="relative h-64 overflow-hidden rounded-t-2xl">
                <ImageWithFallback
                  src={focusedEvent.imageUrl}
                  alt={focusedEvent.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute right-6 top-6">
                  <CheckCircle className="h-8 w-8 text-teal-400 drop-shadow-lg" />
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="mb-2 text-3xl font-bold text-white drop-shadow-lg">
                    {focusedEvent.name}
                  </h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-4 w-4" />
                    <span className="text-lg">{focusedEvent.location}</span>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
                {/* Key Metrics */}
                <div className="mb-5 grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-teal-50 p-3 text-center">
                    <DollarSign className="mx-auto mb-1 h-5 w-5 text-teal-600" />
                    <p className="mb-1 text-xs text-gray-600">Total Distributed</p>
                    <p className="text-lg font-bold text-teal-600">
                      ${focusedEvent.totalDistributed.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3 text-center">
                    <Users className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                    <p className="mb-1 text-xs text-gray-600">People Helped</p>
                    <p className="text-lg font-bold text-purple-600">
                      {focusedEvent.peopleHelped.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <Building2 className="mx-auto mb-1 h-5 w-5 text-amber-600" />
                    <p className="mb-1 text-xs text-gray-600">Organizations</p>
                    <p className="text-lg font-bold text-amber-600">
                      {focusedEvent.organizations.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-cyan-50 p-3 text-center">
                    <Calendar className="mx-auto mb-1 h-5 w-5 text-cyan-600" />
                    <p className="mb-1 text-xs text-gray-600">Timeline</p>
                    <p className="text-sm font-bold text-cyan-600">{focusedEvent.timeline}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-5 rounded-xl bg-gray-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                    <Globe className="h-4 w-4 text-teal-600" />
                    Impact Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-700">{focusedEvent.summary}</p>
                </div>

                {/* Organizations Funded */}
                <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    Organizations Funded
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {focusedEvent.organizations.map((org, orgIndex) => (
                      <div
                        key={orgIndex}
                        className="flex items-center gap-2 rounded-lg bg-white p-2.5 shadow-sm"
                      >
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-teal-600" />
                        <span className="text-sm font-medium text-gray-900">{org}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dots Navigation */}
            <div className="mt-6 flex justify-center gap-2">
              {completedEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    focusedEventIndex === index
                      ? "w-8 bg-teal-400"
                      : "w-2 bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
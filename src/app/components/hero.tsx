"use client";

import { ArrowRight, Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";

type GlobeMaterial = {
  color: { set: (value: string) => void };
  emissive: { set: (value: string) => void };
  emissiveIntensity: number;
  shininess: number;
};

type GlobeControls = {
  autoRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  rotateSpeed: number;
  minDistance: number;
  maxDistance: number;
  addEventListener: (type: "change", callback: () => void) => void;
  removeEventListener: (type: "change", callback: () => void) => void;
};

type GlobePointOfView = {
  lat: number;
  lng: number;
  altitude: number;
};

type GlobeInstance = {
  globeMaterial: () => GlobeMaterial | null;
  controls: () => GlobeControls;
  pointOfView: (point?: GlobePointOfView, transitionMs?: number) => GlobePointOfView;
};

type CountryFeature = {
  properties?: Record<string, unknown>;
  geometry?: unknown;
};

type WorldGeoJson = {
  features?: CountryFeature[];
};

type DisasterCampaign = {
  disasterName: string;
  country: string;
  location: string;
  disasterType: string;
  amountRaised: string;
  donors: string;
  progress: number;
  lat: number;
  lng: number;
};

const GLOBE_SIZE = 480;

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const DISASTER_CAMPAIGNS: DisasterCampaign[] = [
  {
    disasterName: "Mindanao Flood Recovery",
    country: "Philippines",
    location: "Mindanao, Philippines",
    disasterType: "Flood",
    amountRaised: "$184,200",
    donors: "2,914",
    progress: 0.72,
    lat: 7.1907,
    lng: 125.4553,
  },
  {
    disasterName: "Noto Earthquake Relief",
    country: "Japan",
    location: "Ishikawa, Japan",
    disasterType: "Earthquake",
    amountRaised: "$262,400",
    donors: "3,801",
    progress: 0.81,
    lat: 37.5,
    lng: 137.3,
  },
  {
    disasterName: "Sulawesi Quake Support",
    country: "Indonesia",
    location: "Central Sulawesi, Indonesia",
    disasterType: "Earthquake",
    amountRaised: "$129,100",
    donors: "1,987",
    progress: 0.56,
    lat: -1.4303,
    lng: 121.4456,
  },
  {
    disasterName: "Anatolia Reconstruction",
    country: "Turkey",
    location: "Gaziantep, Turkey",
    disasterType: "Earthquake",
    amountRaised: "$341,900",
    donors: "4,622",
    progress: 0.87,
    lat: 37.0662,
    lng: 37.3833,
  },
];

const COUNTRY_ALIASES: Record<string, string[]> = {
  turkey: ["turkiye", "republicofturkiye"],
  philippines: ["republicofthephilippines"],
};

const Globe = dynamic(() => import("react-globe.gl").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-[480px] items-center justify-center rounded-full border border-teal-200 bg-white/60 text-sm text-gray-500">
      Loading globe...
    </div>
  ),
});

function normalizeCountryName(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function getCountryName(feature: CountryFeature) {
  const props = feature.properties ?? {};
  const options = [
    props.name,
    props.NAME,
    props.NAME_EN,
    props.ADMIN,
    props.NAME_LONG,
    props.sovereignt,
  ];

  const match = options.find((entry): entry is string => typeof entry === "string" && entry.length > 0);
  return match ?? "";
}

function angularDistance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function findNearestDisaster(lat: number, lng: number) {
  let nearest = DISASTER_CAMPAIGNS[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  DISASTER_CAMPAIGNS.forEach((campaign) => {
    const distance = angularDistance(lat, lng, campaign.lat, campaign.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = campaign;
    }
  });

  return nearest;
}

export function Hero() {
  const navigate = useNavigate();
  const globeRef = useRef<GlobeInstance | null>(null);
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const [countryFeatures, setCountryFeatures] = useState<CountryFeature[]>([]);
  const [activeDisaster, setActiveDisaster] = useState<DisasterCampaign>(DISASTER_CAMPAIGNS[0]);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(WORLD_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch country polygons: ${response.status}`);
        }
        return response.json() as Promise<WorldGeoJson>;
      })
      .then((data) => {
        if (cancelled) return;
        const features = Array.isArray(data.features) ? data.features : [];
        setCountryFeatures(features);
      })
      .catch(() => {
        if (cancelled) return;
        setCountryFeatures([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!globeReady || !globeRef.current) return;

    const controls = globeRef.current.controls();
    const initialAltitude = globeRef.current.pointOfView().altitude;

    controls.autoRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.6;
    controls.minDistance = initialAltitude;
    controls.maxDistance = initialAltitude;

    const sceneContainer = globeContainerRef.current?.querySelector(".scene-container") as HTMLElement | null;
    const htmlLayer = sceneContainer?.lastElementChild as HTMLElement | null;
    if (sceneContainer) {
      sceneContainer.style.overflow = "visible";
    }
    if (htmlLayer) {
      htmlLayer.style.overflow = "visible";
    }
    const material = globeRef.current.globeMaterial();
    if (material) {
      material.color.set("#67e8f9");
      material.emissive.set("#0891b2");
      material.emissiveIntensity = 0.22;
      material.shininess = 0.25;
    }

    const updateNearest = () => {
      const pov = globeRef.current?.pointOfView();
      if (!pov) return;

      if (Math.abs(pov.altitude - initialAltitude) > 0.0001) {
        globeRef.current?.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: initialAltitude }, 0);
      }

      const nearest = findNearestDisaster(pov.lat, pov.lng);
      setActiveDisaster((current) => {
        if (current.disasterName === nearest.disasterName) return current;
        return nearest;
      });
    };

    updateNearest();
    controls.addEventListener("change", updateNearest);

    return () => {
      controls.removeEventListener("change", updateNearest);
    };
  }, [globeReady]);

  const highlightedCountry = useMemo(
    () => normalizeCountryName(activeDisaster.country),
    [activeDisaster.country],
  );

  const highlightedCountryAliases = useMemo(() => {
    const aliases = COUNTRY_ALIASES[highlightedCountry] ?? [];
    return new Set([highlightedCountry, ...aliases]);
  }, [highlightedCountry]);

  const hexPolygonColor = (feature: CountryFeature) => {
    const countryName = normalizeCountryName(getCountryName(feature));
    if (!countryName) return "rgba(34, 211, 238, 0.36)";
    if (highlightedCountryAliases.has(countryName)) return "rgba(251, 146, 60, 0.95)";
    return "rgba(20, 184, 166, 0.58)";
  };

  const handleDonateClick = () => {
    // Go directly to payment page - collective disaster fund
    navigate("/payment/collective");
  };

  const handleLearnHowItWorksClick = () => {
    const section = document.getElementById("learn-how-it-works");
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="bg-gradient-to-b from-teal-50 to-white px-8 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-16">
        {/* Left side - Content */}
        <div>
          <h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900">
            Help communities respond to disasters faster
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Give quickly, support trusted relief campaigns, and track impact transparently.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleDonateClick}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-3 font-medium text-white transition-all hover:from-teal-600 hover:to-cyan-700"
            >
              Donate Now
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={handleLearnHowItWorksClick}
              className="flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Info className="h-5 w-5" />
              Learn How It Works
            </button>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-500"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-500"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-500"
              />
            </svg>
            <span>
              Powered by <span className="font-semibold text-teal-600">Interledger</span>
            </span>
          </div>
        </div>

        {/* Right side - Interactive Globe */}
        <div className="relative flex items-center justify-center">
          <div className="relative h-[560px] w-[560px]">
            <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2">
              <div className="relative h-full w-full">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-500/20 blur-3xl" />

                <div ref={globeContainerRef} className="relative z-10 h-full w-full">
                  <Globe
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ref={globeRef as any}
                    width={GLOBE_SIZE}
                    height={GLOBE_SIZE}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                    waitForGlobeReady={false}
                    showAtmosphere
                    atmosphereColor="#67e8f9"
                    atmosphereAltitude={0.11}
                    hexPolygonsData={countryFeatures}
                    hexPolygonResolution={3}
                    hexPolygonMargin={0.35}
                    hexPolygonUseDots
                    hexPolygonColor={hexPolygonColor}
                    pointsData={[activeDisaster]}
                    pointLat="lat"
                    pointLng="lng"
                    pointColor={() => "#fb923c"}
                    pointAltitude={0.02}
                    pointRadius={0.45}
                    htmlElementsData={[activeDisaster]}
                    htmlLat="lat"
                    htmlLng="lng"
                    htmlElement={(item: object) => {
                      const disaster = item as DisasterCampaign;
                      const card = document.createElement("div");
                      const progress = Math.round(disaster.progress * 100);

                      card.style.pointerEvents = "none";
                      card.style.transform = "translate(-50%, -108%)";

                      card.innerHTML = `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                          <div style="width:2px;height:18px;background:#06b6d4;opacity:0.8;"></div>
                          <div style="min-width:240px;max-width:260px;border:1px solid #99f6e4;border-radius:12px;background:rgba(255,255,255,0.96);padding:10px 12px;box-shadow:0 12px 24px rgba(0,0,0,0.12);font-family:ui-sans-serif,system-ui,sans-serif;color:#0f172a;">
                            <div style="font-size:13px;font-weight:700;color:#0f766e;margin-bottom:8px;">${disaster.disasterName}</div>
                            <div style="font-size:11px;line-height:1.45;color:#334155;">Location: ${disaster.location}</div>
                            <div style="font-size:11px;line-height:1.45;color:#334155;">Disaster type: ${disaster.disasterType}</div>
                            <div style="font-size:11px;line-height:1.45;color:#334155;">Amount raised: ${disaster.amountRaised}</div>
                            <div style="font-size:11px;line-height:1.45;color:#334155;">Number of donors: ${disaster.donors}</div>
                            <div style="margin-top:8px;">
                              <div style="height:6px;width:100%;overflow:hidden;border-radius:999px;background:#ccfbf1;">
                                <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#14b8a6,#06b6d4);"></div>
                              </div>
                              <div style="margin-top:4px;font-size:10px;color:#0f766e;">${progress}% funded</div>
                            </div>
                          </div>
                        </div>
                      `;

                      return card;
                    }}
                    onGlobeReady={() => {
                      setGlobeReady(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


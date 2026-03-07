 "use client";

import { ArrowRight, Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useNavigate } from "react-router";
import { useEffect, useRef } from "react";

type GlobeMaterial = {
  color: { set: (value: string) => void };
  emissive: { set: (value: string) => void };
  emissiveIntensity: number;
  shininess: number;
};

type GlobeInstance = {
  globeMaterial: () => GlobeMaterial | null;
};

const Globe = dynamic(() => import("react-globe.gl").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-[320px] items-center justify-center rounded-full border border-teal-200 bg-white/60 text-sm text-gray-500">
      Loading globe...
    </div>
  ),
});

export function Hero() {
  const navigate = useNavigate();
  const globeRef = useRef<GlobeInstance | null>(null);

  useEffect(() => {
    // Fallback styling so the globe remains visible even if texture URL fails.
    if (!globeRef.current) return;
    const material = globeRef.current.globeMaterial();
    if (!material) return;
    material.color.set("#0f172a");
    material.emissive.set("#0ea5e9");
    material.emissiveIntensity = 0.2;
    material.shininess = 0.9;
  }, []);

  const handleDonateClick = () => {
    // Go directly to payment page - collective disaster fund
    navigate('/payment/collective');
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
            <button className="flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <Info className="h-5 w-5" />
              Learn How It Works
            </button>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500"/>
            </svg>
            <span>Powered by <span className="font-semibold text-teal-600">Interledger</span></span>
          </div>
        </div>
        
        {/* Right side - 3D Globe with Metrics */}
        <div className="relative flex items-center justify-center">
          {/* Globe Container */}
          <div className="relative h-[1500px] w-[1500px]">
            {/* Globe */}
            <div className="absolute left-1/2 top-1/2 h-[960px] w-[960px] -translate-x-1/2 -translate-y-1/2">
              {/* Globe sphere with gradient and glow */}
              <div className="relative h-full w-full">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-500/20 blur-3xl" />

                {/* Main globe (clouds variant) */}
                <div className="relative z-10 h-full w-full">
                  <Globe
                    ref={globeRef}
                    width={960}
                    height={960}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
                    waitForGlobeReady={false}
                    showAtmosphere
                    atmosphereColor="#22d3ee"
                    atmosphereAltitude={0.16}
                    enablePointerInteraction={false}
                    autoRotate
                    autoRotateSpeed={0.45}
                  />
                </div>
              </div>
            </div>
            
            {/* Floating Metric Callouts */}
            
            {/* Top Left - Active Campaigns */}
            <div className="absolute left-0 top-12">
              <div className="group relative">
                {/* Pointer line */}
                <svg className="absolute left-full top-1/2 h-[300px] w-[420px]" style={{ transform: 'translateY(-12%)' }}>
                  <line x1="0" y1="20" x2="340" y2="238" stroke="#0891b2" strokeWidth="2.5" opacity="0.65" strokeDasharray="4,4" strokeLinecap="round" />
                </svg>

                {/* Metric card */}
                <div className="rounded-xl border border-teal-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl">
                  <div className="text-xs font-medium text-gray-600">Active Campaigns</div>
                  <div className="text-2xl font-bold text-teal-600">24</div>
                </div>
              </div>
            </div>
            
            {/* Top Right - Available Funds */}
            <div className="absolute right-0 top-20">
              <div className="group relative">
                {/* Pointer line */}
                <svg className="absolute right-full top-1/2 h-[300px] w-[420px]" style={{ transform: 'translateY(-12%)' }}>
                  <line x1="420" y1="20" x2="80" y2="238" stroke="#0891b2" strokeWidth="2.5" opacity="0.65" strokeDasharray="4,4" strokeLinecap="round" />
                </svg>

                {/* Metric card */}
                <div className="rounded-xl border border-cyan-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl">
                  <div className="text-xs font-medium text-gray-600">Funds Available</div>
                  <div className="text-2xl font-bold text-cyan-600">$2.4M</div>
                </div>
              </div>
            </div>
            
            {/* Bottom Left - Contributors */}
            <div className="absolute bottom-20 left-4">
              <div className="group relative">
                {/* Pointer line */}
                <svg className="absolute left-full top-1/2 h-[320px] w-[420px]" style={{ transform: 'translateY(-82%)' }}>
                  <line x1="0" y1="286" x2="330" y2="76" stroke="#0891b2" strokeWidth="2.5" opacity="0.65" strokeDasharray="4,4" strokeLinecap="round" />
                </svg>

                {/* Metric card */}
                <div className="rounded-xl border border-blue-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl">
                  <div className="text-xs font-medium text-gray-600">Contributors</div>
                  <div className="text-2xl font-bold text-blue-600">12.8K</div>
                </div>
              </div>
            </div>
            
            {/* Bottom Right - Verified Recipients */}
            <div className="absolute bottom-12 right-8">
              <div className="group relative">
                {/* Pointer line */}
                <svg className="absolute right-full top-1/2 h-[320px] w-[420px]" style={{ transform: 'translateY(-82%)' }}>
                  <line x1="420" y1="286" x2="90" y2="76" stroke="#0891b2" strokeWidth="2.5" opacity="0.65" strokeDasharray="4,4" strokeLinecap="round" />
                </svg>

                {/* Metric card */}
                <div className="rounded-xl border border-orange-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl">
                  <div className="text-xs font-medium text-gray-600">Verified Recipients</div>
                  <div className="text-2xl font-bold text-orange-600">147</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

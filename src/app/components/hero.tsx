import { ArrowRight, Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useNavigate } from "react-router";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export function Hero() {
  const navigate = useNavigate();

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
          <div className="relative h-[500px] w-[500px]">
            {/* Globe */}
            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2">
              {/* Globe sphere with gradient and glow */}
              <div className="relative h-full w-full">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-500/20 blur-3xl" />

                {/* Main globe (clouds variant) */}
                <div className="relative z-10 h-full w-full">
                  <Globe
                    width={320}
                    height={320}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="https://unpkg.com/three-globe/example/img/earth-clouds.png"
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
                <svg className="absolute left-full top-1/2 h-24 w-24" style={{ transform: 'translateY(-50%)' }}>
                  <line x1="0" y1="12" x2="90" y2="48" stroke="#0891b2" strokeWidth="1" opacity="0.4" strokeDasharray="2,2" />
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
                <svg className="absolute right-full top-1/2 h-24 w-24" style={{ transform: 'translateY(-50%)' }}>
                  <line x1="96" y1="12" x2="6" y2="48" stroke="#0891b2" strokeWidth="1" opacity="0.4" strokeDasharray="2,2" />
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
                <svg className="absolute left-full top-1/2 h-24 w-24" style={{ transform: 'translateY(-50%)' }}>
                  <line x1="0" y1="12" x2="85" y2="-36" stroke="#0891b2" strokeWidth="1" opacity="0.4" strokeDasharray="2,2" />
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
                <svg className="absolute right-full top-1/2 h-24 w-24" style={{ transform: 'translateY(-50%)' }}>
                  <line x1="96" y1="12" x2="10" y2="-30" stroke="#0891b2" strokeWidth="1" opacity="0.4" strokeDasharray="2,2" />
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

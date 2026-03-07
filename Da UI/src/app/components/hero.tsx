import { ArrowRight, Info } from "lucide-react";
import { useNavigate } from "react-router";

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
                
                {/* Main globe */}
                <svg className="h-full w-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    {/* Globe gradient */}
                    <radialGradient id="globeGradient" cx="35%" cy="35%">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#0891b2" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#0e7490" stopOpacity="0.7" />
                    </radialGradient>
                    
                    {/* Continent pattern */}
                    <pattern id="continents" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
                      <circle cx="200" cy="200" r="180" fill="url(#globeGradient)" />
                    </pattern>
                  </defs>
                  
                  {/* Globe base */}
                  <circle cx="200" cy="200" r="180" fill="url(#globeGradient)" opacity="0.9" />
                  
                  {/* Latitude lines */}
                  <ellipse cx="200" cy="200" rx="180" ry="180" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                  <ellipse cx="200" cy="200" rx="180" ry="120" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                  <ellipse cx="200" cy="200" rx="180" ry="60" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                  
                  {/* Longitude lines */}
                  <ellipse cx="200" cy="200" rx="60" ry="180" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                  <ellipse cx="200" cy="200" rx="120" ry="180" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                  <line x1="200" y1="20" x2="200" y2="380" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                  
                  {/* Continent shapes (simplified) */}
                  {/* Asia */}
                  <path d="M 280 140 Q 300 160 290 190 Q 280 210 270 200 Q 250 180 260 160 Q 270 145 280 140 Z" 
                        fill="#0891b2" opacity="0.6" />
                  
                  {/* Africa */}
                  <path d="M 220 180 Q 230 200 225 230 Q 220 250 210 240 Q 200 220 205 200 Q 210 185 220 180 Z" 
                        fill="#0891b2" opacity="0.6" />
                  
                  {/* North America */}
                  <path d="M 120 120 Q 140 130 135 160 Q 130 180 115 175 Q 100 160 105 140 Q 110 125 120 120 Z" 
                        fill="#0891b2" opacity="0.6" />
                  
                  {/* South America */}
                  <path d="M 140 220 Q 150 240 145 270 Q 140 285 130 275 Q 125 255 130 235 Q 135 222 140 220 Z" 
                        fill="#0891b2" opacity="0.6" />
                  
                  {/* Active hotspots (pulsing dots) */}
                  <circle cx="290" cy="170" r="4" fill="#f97316" opacity="0.8">
                    <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="220" cy="210" r="4" fill="#f97316" opacity="0.8">
                    <animate attributeName="r" values="4;6;4" dur="2s" begin="0.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="130" cy="150" r="4" fill="#f97316" opacity="0.8">
                    <animate attributeName="r" values="4;6;4" dur="2s" begin="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="1s" repeatCount="indefinite" />
                  </circle>
                  
                  {/* Highlight ring */}
                  <circle cx="200" cy="200" r="180" fill="none" stroke="url(#globeGradient)" strokeWidth="2" opacity="0.4" />
                </svg>
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
import Image from "next/image";
export function Footer() {
  const footerSections = [
    {
      title: "Platform",
      links: ["About", "How It Works", "Transparency", "FAQ"]
    },
    {
      title: "Support",
      links: ["Contact", "Help Center", "Community", "Blog"]
    },
    {
      title: "Legal",
      links: ["Terms of Service", "Privacy Policy", "Cookie Policy"]
    },
    {
      title: "Technology",
      links: ["Interledger Protocol", "Open Payments", "API Documentation", "Security"]
    }
  ];

  return (
    <footer className="border-t bg-gray-900 px-8 py-12 text-gray-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Image src="/logo.svg" width={40} height={40} alt="DADDE Fund Logo" className="h-10 w-10 object-contain" />
              <span className="text-xl font-semibold text-white">DADDE's FUND</span>
            </div>
            <p className="text-sm">
              Empowering communities through transparent disaster relief
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400" />
              </svg>
              <span className="text-gray-400">Powered by <span className="text-teal-400">Interledger</span></span>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 font-semibold text-white">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex items-center justify-between text-sm">
            <p>© 2026 DADDE's FUND. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-white">Twitter</a>
              <a href="#" className="transition-colors hover:text-white">LinkedIn</a>
              <a href="#" className="transition-colors hover:text-white">GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
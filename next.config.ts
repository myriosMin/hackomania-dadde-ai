import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@copilotkit/runtime",
    "@interledger/open-payments",
  ],
};

export default nextConfig;

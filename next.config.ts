import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static image imports
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Turbopack config
  turbopack: {},
};

export default nextConfig;

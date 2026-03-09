import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return `movielist-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;

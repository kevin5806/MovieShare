import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

function getOptionalRemotePattern(
  urlValue: string | undefined,
): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number] | null {
  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const protocol = url.protocol === "http:" ? "http" : url.protocol === "https:" ? "https" : null;

    if (!protocol) {
      return null;
    }

    return {
      protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: `${normalizedPath || ""}/**`,
    };
  } catch {
    return null;
  }
}

const storageRemotePattern = getOptionalRemotePattern(process.env.STORAGE_PUBLIC_BASE_URL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  generateBuildId: async () => {
    return `movieshare-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      ...(storageRemotePattern ? [storageRemotePattern] : []),
    ],
  },
};

export default nextConfig;

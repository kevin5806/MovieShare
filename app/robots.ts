import type { MetadataRoute } from "next";

import { buildAbsoluteUrl, siteConfig } from "@/server/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/invites/",
          "/lists",
          "/login",
          "/notifications",
          "/profile",
          "/register",
          "/watch",
        ],
      },
    ],
    host: siteConfig.url,
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
  };
}

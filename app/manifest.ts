import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "movieshare",
    short_name: "mosh",
    description: "Self-hosted collaborative movie lists for friends.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1f2937",
    categories: ["entertainment", "social"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

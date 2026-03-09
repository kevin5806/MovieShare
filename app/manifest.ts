import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MovieList",
    short_name: "MovieList",
    description: "Self-hosted collaborative movie lists for friends.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1f2937",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}

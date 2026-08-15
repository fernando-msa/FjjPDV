import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FjjPDV",
    short_name: "FjjPDV",
    description: "PDV offline-first com checkout, estoque e caixa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1b1712",
    theme_color: "#1b1712",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
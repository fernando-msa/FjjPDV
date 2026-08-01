import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FjjPDV",
    short_name: "FjjPDV",
    description: "PDV offline-first com checkout, estoque e caixa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#08101f",
    theme_color: "#08101f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
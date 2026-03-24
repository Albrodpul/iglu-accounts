import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Iglú Management",
    short_name: "Iglú",
    description: "Gestión de gastos y finanzas personales o compartidas",
    start_url: "/",
    display: "standalone",
    background_color: "#163a5f",
    theme_color: "#1e5a8a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Iglu Management",
    short_name: "Iglu",
    description: "Gestion de gastos y finanzas personales o compartidas",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f6fb",
    theme_color: "#2d7eb5",
    lang: "es",
    shortcuts: [
      {
        name: "Nuevo movimiento",
        short_name: "Añadir",
        description: "Registrar un gasto o ingreso",
        url: "/dashboard?add=1",
        icons: [
          {
            src: "/pwa-shortcut-add.svg",
            sizes: "96x96",
            type: "image/svg+xml",
          },
        ],
      },
    ],
    icons: [
      {
        src: "/pwa-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

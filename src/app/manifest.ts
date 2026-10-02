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
    // The launch screen is drawn by the OS from this colour + the icon + the
    // name. Brand blue (same as the status bar) instead of the light page
    // colour: it looks intentional and doesn't flash white in dark mode.
    background_color: "#2d7eb5",
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
      // PNGs (see scripts/generate-icons.mjs): launch screens and launchers
      // are built from raster icons; SVG ones are not honoured everywhere.
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

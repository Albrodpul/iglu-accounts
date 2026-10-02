// Renders the PNG app icons from the SVG artwork, using the locally installed
// Chrome (same setup as the e2e tests). Run after changing the icon:
//   node scripts/generate-icons.mjs
//
// PNGs exist because SVG icons are not honoured everywhere: Android builds the
// launch (splash) screen and notifications from raster icons, and iOS ignores
// SVG home-screen icons altogether.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BRAND = "#2d7eb5";
const artwork = readFileSync("public/pwa-icon-512.svg", "utf8");
// The igloo drawing alone, without the rounded tile behind it.
const igloo = artwork.slice(artwork.indexOf("<g "), artwork.indexOf("</svg>"));

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">${body}</svg>`;

/** Full-bleed square: the OS applies its own mask (circle, squircle...). */
const fullBleed = svg(`<rect width="512" height="512" fill="${BRAND}"/>${igloo}`);
const fullBleedTile = svg(
  `<rect width="512" height="512" fill="${BRAND}"/><rect x="52" y="52" width="408" height="408" rx="90" fill="#7ec8f0" fill-opacity="0.28"/>${igloo}`,
);

const targets = [
  { file: "public/pwa-icon-192.png", size: 192, source: artwork, transparent: true },
  { file: "public/pwa-icon-512.png", size: 512, source: artwork, transparent: true },
  { file: "public/pwa-icon-maskable-512.png", size: 512, source: fullBleed, transparent: false },
  // iOS home-screen icon: no transparency (it would turn black), iOS rounds the corners.
  { file: "src/app/apple-icon.png", size: 180, source: fullBleedTile, transparent: false },
];

const browser = await chromium.launch({ channel: "chrome" });
for (const { file, size, source, transparent } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
  console.log("wrote", file);
}
await browser.close();

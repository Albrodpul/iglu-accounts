import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel preview deployments inject the feedback toolbar from vercel.live.
const isPreview = process.env.VERCEL_ENV === "preview";

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const vercelLive = isPreview ? ["https://vercel.live"] : [];

// No nonces: inline scripts stay allowed so pages can keep being statically
// optimised. All third-party calls (Supabase, prices, push) run on the server.
const contentSecurityPolicy = [
  "default-src 'self'",
  ["script-src 'self' 'unsafe-inline'", isDev && "'unsafe-eval'", ...vercelLive].filter(Boolean).join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  ["connect-src 'self'", supabaseOrigin, isDev && "ws: wss:", ...vercelLive].filter(Boolean).join(" "),
  isPreview ? "frame-src https://vercel.live" : "frame-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only on Vercel (always HTTPS): a local `next start` over LAN http must keep working.
  process.env.VERCEL && "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // WebAuthn (passkeys) keeps its default same-origin permission.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
  experimental: {
    staleTimes: {
      // How long a prefetched loading skeleton stays usable. With the 5-minute
      // default, coming back to the PWA after a while left every tab without
      // its skeleton: the first tap then showed nothing until the server
      // answered. Skeletons hold no data, so they can be kept all day; page
      // data itself is still fetched fresh on every navigation (`dynamic: 0`).
      static: 60 * 60 * 24,
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

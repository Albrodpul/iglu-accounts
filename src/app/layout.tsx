import type { Metadata, Viewport } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iglú Management",
  description: "Gestión de gastos y finanzas personales o compartidas",
  applicationName: "Iglu Management",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Iglu",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d7eb5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables must live on <html>: globals.css applies `font-sans` there,
    // and a variable declared lower (on <body>) is invisible to it — the page
    // silently fell back to the browser's default serif.
    <html lang="es" suppressHydrationWarning className={`${nunito.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("iglu-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="antialiased"
      >
        <ServiceWorkerRegister />
        {children}
        {/* Bottom offset clears the mobile nav plus the raised "+" button, for
            toasts that opt into bottom placement (the thumb-reachable undo). */}
        <Toaster
          position="top-center"
          closeButton
          offset={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
          mobileOffset={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
          // Sonner ships its own font, colours and radius; map them to the app
          // theme tokens (these follow light/dark automatically).
          style={
            {
              fontFamily: "var(--font-sans)",
              "--normal-bg": "var(--card)",
              "--normal-border": "var(--border)",
              "--normal-text": "var(--foreground)",
              "--border-radius": "14px",
            } as React.CSSProperties
          }
          toastOptions={{
            classNames: {
              toast: "shadow-lg",
              description: "!text-muted-foreground",
              success: "!border-income/40 [&_[data-icon]]:text-income",
              error: "!border-expense/40 [&_[data-icon]]:text-expense",
              warning: "!border-debt/40 [&_[data-icon]]:text-debt",
              actionButton: "!rounded-lg !bg-primary !font-semibold !text-primary-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}

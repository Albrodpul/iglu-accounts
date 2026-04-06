import type { Metadata, Viewport } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PwaSplash } from "@/components/layout/pwa-splash";
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
    <html lang="es">
      <body
        className={`${nunito.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <PwaSplash />
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

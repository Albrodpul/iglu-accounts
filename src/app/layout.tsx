import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
        {/* Splash screen — HTML puro con estilos inline para renderizar antes de que cargue CSS/JS */}
        <div
          id="splash"
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.25rem",
            background: "linear-gradient(145deg, #163a5f 0%, #1e5a8a 70%, #2d7eb5 100%)",
            transition: "opacity 0.4s ease-out",
          }}
        >
          {/* Logo iglú inline para que no dependa de una petición de red */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="none"
            width={72}
            height={72}
            style={{ opacity: 0.95 }}
          >
            <ellipse cx="32" cy="52" rx="30" ry="6" fill="#e0effb" />
            <path d="M6 52c0-16 11.5-30 26-30s26 14 26 30" fill="#f0f7fd" stroke="#7ec8f0" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 44h48" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M12 36h40" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M20 28h24" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M20 44v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M32 44v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M44 44v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M16 36v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M26 36v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M38 36v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M48 36v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M24 28v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M32 28v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M40 28v8" stroke="#c0ddf0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M26 52v-9a6 6 0 0 1 12 0v9" fill="#2d7eb5" stroke="#1e5a8a" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="32" cy="21.5" rx="5" ry="2.5" fill="white" />
            <circle cx="12" cy="14" r="1.5" fill="#c0ddf0" opacity="0.7" />
            <circle cx="50" cy="10" r="1.2" fill="#c0ddf0" opacity="0.6" />
            <circle cx="54" cy="22" r="1" fill="#c0ddf0" opacity="0.5" />
            <circle cx="8" cy="26" r="1" fill="#c0ddf0" opacity="0.5" />
          </svg>
          <span style={{ color: "white", fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", opacity: 0.9 }}>
            Iglú Management
          </span>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isPWA = window.matchMedia('(display-mode: standalone)').matches
                  || window.navigator.standalone === true;
                var el = document.getElementById('splash');
                if (!el) return;
                if (isPWA) { el.remove(); return; }
                var done = false;
                function hide() {
                  if (done) return;
                  done = true;
                  el.style.opacity = '0';
                  el.style.pointerEvents = 'none';
                  setTimeout(function() { el.remove(); }, 420);
                }
                window.addEventListener('load', function() { setTimeout(hide, 200); });
                setTimeout(hide, 4000);
              })();
            `,
          }}
        />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";

import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import OneSignalSetup from "@/components/PWA/OneSignalSetup";
import PWAInstallPrompt from "@/components/PWA/PWAInstallPrompt";
import AccessTracker from "@/components/AccessTracker";
import CookieNotice from "@/components/CookieNotice";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://www.socialjuridico.com.br"),

  title: {
    default: "Social Jurídico",
    template: "%s | Social Jurídico",
  },

  description:
    "Publique seu caso gratuitamente e encontre advogados cadastrados de forma simples, digital e segura.",

  applicationName: "Social Jurídico",

  openGraph: {
    title: "Social Jurídico",
    description:
      "Publique seu caso gratuitamente e encontre advogados cadastrados.",
    url: "/",
    siteName: "Social Jurídico",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "Social Jurídico",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Social Jurídico",
    description:
      "Publique seu caso gratuitamente e encontre advogados cadastrados.",
    images: ["/image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  manifest: "/manifest.json",

  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },

  verification: {
    google: "Y2-JflZUZY1EhRahBox6UlsanmZnHHA7o3HpVVx2Ma4",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#D4AF37",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AccessTracker />

        <OneSignalSetup />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#121212",
              color: "#ffffff",
              border: "1px solid rgba(212, 175, 55, 0.2)",
              borderRadius: "12px",
            },
          }}
        />

        <main>{children}</main>

        <Footer />
        <CookieNotice />
        <PWAInstallPrompt />
        <ScrollToTop />
       
      </body>
    </html>
  );
}

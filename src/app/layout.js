import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SocialJurídico",
  description: "A sua plataforma jurídica de confiança.",
  openGraph: {
    title: "SocialJurídico",
    description: "A sua plataforma jurídica de confiança.",
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "SocialJurídico",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SocialJurídico",
    description: "A sua plataforma jurídica de confiança.",
    images: ["/image.png"],
  },
};

import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from 'react-hot-toast';
import OneSignalSetup from "@/components/PWA/OneSignalSetup";
import PWAInstallPrompt from "@/components/PWA/PWAInstallPrompt";
import AccessTracker from "@/components/AccessTracker";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4AF37" />
        <meta name="google-site-verification" content="Y2-JflZUZY1EhRahBox6UlsanmZnHHA7o3HpVVx2Ma4" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AccessTracker />
        <OneSignalSetup />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#121212',
            color: '#fff',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          },
        }} />
        <main>
          {children}
        </main>
        <PWAInstallPrompt />
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}

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
};

import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from 'react-hot-toast';
import OneSignalSetup from "@/components/PWA/OneSignalSetup";
import PWAInstallPrompt from "@/components/PWA/PWAInstallPrompt";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4AF37" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
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

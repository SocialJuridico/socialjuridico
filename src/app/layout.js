import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";

import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AccessTracker from "@/components/AccessTracker";
import CookieNotice from "@/components/CookieNotice";
import GlobalJsonLd from "@/components/SEO/GlobalJsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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
  metadataBase: new URL(SITE_URL),

  title: {
    default:
      "Social Jurídico | Conectando Pessoas e Advogados",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "Publique seu caso gratuitamente, converse com advogados cadastrados e conheça ferramentas criadas para apoiar clientes e profissionais jurídicos.",

  applicationName: SITE_NAME,

  authors: [
    {
      name: SITE_NAME,
      url: SITE_URL,
    },
  ],

  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Tecnologia jurídica",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    title: "Social Jurídico",
    description:
      "Uma plataforma para aproximar pessoas e advogados e organizar atendimentos, oportunidades e ferramentas jurídicas.",
    url: "/",
    siteName: SITE_NAME,
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Social Jurídico — conectando pessoas e advogados",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Social Jurídico",
    description:
      "Uma plataforma para aproximar pessoas e advogados.",
    images: ["/opengraph-image.png"],
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
    apple: "/favicon.ico",
  },

  verification: {
    google:
      "Y2-JflZUZY1EhRahBox6UlsanmZnHHA7o3HpVVx2Ma4",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#D4AF37",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GlobalJsonLd />
        <AccessTracker />

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
        <ScrollToTop />
      </body>
    </html>
  );
}

export const metadata = {
  title: "Autorização segura",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function OAuthLayout({ children }) {
  return children;
}

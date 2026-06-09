import { privateRobots } from "@/lib/seo";

export const metadata = {
  title: "Acesso do anunciante",
  robots: privateRobots,
};

export default function LoginAnuncianteLayout({ children }) {
  return children;
}

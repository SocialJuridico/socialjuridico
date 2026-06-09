import { privateRobots } from "@/lib/seo";

export const metadata = {
  title: "Acessar conta",
  description: "Acesse sua conta no Social Jurídico.",
  robots: privateRobots,
};

export default function LoginLayout({ children }) {
  return children;
}
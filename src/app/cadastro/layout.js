import { privateRobots } from "@/lib/seo";

export const metadata = {
  title: "Criar conta",
  description: "Crie sua conta no Social Jurídico.",
  robots: privateRobots,
};

export default function CadastroLayout({ children }) {
  return children;
}
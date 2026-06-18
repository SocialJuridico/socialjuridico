import { privateRobots } from "@/lib/seo";

export const metadata = {
  title: "Entrar na sua conta de assinatura",
  description: "Acesse o Social Jurídico Assinatura.",
  robots: privateRobots,
};

export default function SignatureLoginLayout({ children }) {
  return children;
}


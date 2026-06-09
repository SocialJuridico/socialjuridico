import { privateRobots } from "@/lib/seo";

export const metadata = {
  title: "Notificação extrajudicial",
  robots: privateRobots,
};

export default function NotificacaoLayout({ children }) {
  return children;
}

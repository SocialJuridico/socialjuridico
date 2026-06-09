import { noIndexFollowRobots } from "@/lib/seo";

export const metadata = {
  robots: noIndexFollowRobots,
};

export default function AdvogadosLegacyLayout({ children }) {
  return children;
}

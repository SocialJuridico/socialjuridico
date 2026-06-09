import { noIndexFollowRobots } from "@/lib/seo";

export const metadata = {
  robots: noIndexFollowRobots,
};

export default function ClientesLegacyLayout({ children }) {
  return children;
}

import { privateRobots } from "@/lib/seo";

export const metadata = {
  robots: privateRobots,
};

export default function AdminLayout({ children }) {
  return children;
}

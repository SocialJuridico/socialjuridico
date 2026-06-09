import { privateRobots } from "@/lib/seo";

export const metadata = {
  robots: privateRobots,
};

export default function ChatLayout({ children }) {
  return children;
}

import { Suspense } from "react";

import ChatPageClient from "./ChatPageClient";

export const metadata = {
  title: "Conversa Jurídica | Social Jurídico",
  description:
    "Conversa segura entre cliente e advogado no ecossistema Social Jurídico.",
};

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageClient />
    </Suspense>
  );
}

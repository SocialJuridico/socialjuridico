"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AccessTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Ignorar requisições internas, APIs e arquivos estáticos
    const isIgnored = 
      pathname.startsWith("/api") || 
      pathname.includes(".") || 
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/manifest");

    if (isIgnored) return;

    const trackAccess = async () => {
      try {
        await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: pathname }),
        });
      } catch (error) {
        // Falhas silenciosas de rede para não impactar o usuário
        console.warn("Rastreamento de acesso falhou temporariamente:", error);
      }
    };

    // Pequeno delay para garantir que o carregamento da página já iniciou e evitar concorrência
    const timer = setTimeout(trackAccess, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

import styles from "./Artigo.module.css";

/**
 * Botão de compartilhamento da matéria.
 * Chama /api/news/[slug]/share para gerar um link curto rastreável e usa a
 * Web Share API quando disponível (mobile), com fallback para copiar o link.
 */
export default function ShareButton({ slug, title }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error

  async function handleShare() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/news/${slug}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "web" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Falha ao gerar link");
      }

      const { shareUrl, description } = json.data;

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: title || json.data.title,
          text: description,
          url: shareUrl,
        });
        setStatus("done");
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("done");
      } else {
        window.prompt("Copie o link para compartilhar:", shareUrl);
        setStatus("done");
      }
    } catch (error) {
      // AbortError = usuário fechou a folha de compartilhamento; não é erro.
      if (error?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      console.error("[ShareButton]", error.message);
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={styles.shareButton}
      disabled={status === "loading"}
      aria-label="Compartilhar matéria"
    >
      {status === "done" ? <Check size={16} /> : <Share2 size={16} />}
      {status === "loading"
        ? "Gerando..."
        : status === "done"
          ? "Link copiado!"
          : status === "error"
            ? "Tente novamente"
            : "Compartilhar"}
    </button>
  );
}
"use client";

import { LoaderCircle, MessageSquare, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { formatDate } from "../config";
import styles from "../AnunciantesAdmin.module.css";

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

export default function AdvertiserSupportModal({ advertiser, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!advertiser?.id) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/anunciante/suporte/${advertiser.id}`,
        { cache: "no-store" },
      );
      const payload = await readJson(response);
      setMessages(payload.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar o suporte.",
      );
    } finally {
      setLoading(false);
    }
  }, [advertiser?.id]);

  useEffect(() => {
    if (!open || !advertiser) return undefined;

    setMessages([]);
    setContent("");
    loadMessages();

    const interval = window.setInterval(loadMessages, 30000);
    return () => window.clearInterval(interval);
  }, [advertiser, loadMessages, open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !sending) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, sending]);

  if (!open || !advertiser) return null;

  async function sendMessage(event) {
    event.preventDefault();
    const normalized = content.trim();

    if (!normalized) return;

    setSending(true);
    try {
      const response = await fetch(
        `/api/admin/anunciante/suporte/${advertiser.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: normalized }),
        },
      );
      const payload = await readJson(response);

      setMessages((current) => [...current, payload.data]);
      setContent("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar mensagem.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <section
        className={styles.supportModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
      >
        <header className={styles.modalHeader}>
          <div className={styles.supportIdentity}>
            <span className={styles.companyAvatar}>
              {advertiser.companyName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <span className={styles.modalEyebrow}>Suporte ao parceiro</span>
              <h2 id="support-modal-title">{advertiser.companyName}</h2>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={sending}
            aria-label="Fechar suporte"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.supportMessages} aria-live="polite">
          {loading && !messages.length ? (
            <div className={styles.supportLoading}>
              <LoaderCircle
                size={22}
                className={styles.spinning}
                aria-hidden="true"
              />
              Carregando histórico
            </div>
          ) : messages.length ? (
            messages.map((message) => {
              const senderType = message.senderType || message.sender_type;
              const createdAt = message.createdAt || message.created_at;
              const admin = senderType === "ADMIN";

              return (
                <article
                  key={message.id}
                  className={admin ? styles.adminMessage : styles.partnerMessage}
                >
                  <p>{message.content}</p>
                  <time dateTime={createdAt || undefined}>
                    {formatDate(createdAt)}
                  </time>
                </article>
              );
            })
          ) : (
            <div className={styles.emptySupport}>
              <MessageSquare size={28} aria-hidden="true" />
              <strong>Nenhuma mensagem</strong>
              <span>Inicie o atendimento abaixo.</span>
            </div>
          )}
        </div>

        <form className={styles.supportComposer} onSubmit={sendMessage}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Escreva uma orientação para o anunciante"
          />
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={sending || !content.trim()}
          >
            {sending ? (
              <LoaderCircle
                size={16}
                className={styles.spinning}
                aria-hidden="true"
              />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
            Enviar
          </button>
        </form>
      </section>
    </div>
  );
}

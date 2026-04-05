"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AdminChat.module.css";

export default function AdminChatPage() {
  const { partnerId } = useParams();
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [newMessage, setNewMessage] = useState("");

  const backHref = useMemo(() => {
    if (partner?.role === "ADMIN") return "/dashboard/advogado";
    return "/dashboard/admin/mensagens";
  }, [partner?.role]);

  const loadChat = useCallback(async () => {
    if (!partnerId) return;

    try {
      const res = await fetch(`/api/admin-chat?partnerId=${partnerId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Falha ao carregar chat");
      }

      setPartner(data.data?.partner || null);
      setMessages(data.data?.messages || []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao carregar chat");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    setLoading(true);
    loadChat();

    pollRef.current = setInterval(loadChat, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadChat]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prevMsgCount, setPrevMsgCount] = useState(0);

  useEffect(() => {
    const container = document.querySelector(`.${styles.messagesBox}`);
    if (!container || messages.length === 0) return;

    if (isInitialLoad) {
      container.scrollTop = container.scrollHeight;
      setIsInitialLoad(false);
      setPrevMsgCount(messages.length);
      return;
    }

    // Only scroll if message count increased and user is near bottom
    if (messages.length > prevMsgCount) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
      if (isAtBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      }
      setPrevMsgCount(messages.length);
    }
  }, [messages, isInitialLoad, prevMsgCount]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);

    try {
      const res = await fetch("/api/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, content }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Falha ao enviar mensagem");
      }

      setNewMessage("");
      await loadChat();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando chat...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={backHref} className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1>
          <MessageSquare size={18} /> Chat com {partner?.name || "participante"}
        </h1>
      </header>

      <section className={styles.messagesBox}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            Ainda não há mensagens nesta conversa.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.messageRow} ${msg.isOwn ? styles.own : styles.other}`}
            >
              <div className={styles.messageBubble}>
                <p>{msg.content}</p>
                <span>
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleString("pt-BR")
                    : ""}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </section>

      <form className={styles.form} onSubmit={handleSend}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          rows={2}
          placeholder="Digite sua mensagem..."
        />
        <button type="submit" disabled={sending || !newMessage.trim()}>
          <Send size={16} /> {sending ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}

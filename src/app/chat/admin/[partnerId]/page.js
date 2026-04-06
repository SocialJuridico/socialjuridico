"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, MessageSquare, Trash2 } from "lucide-react";
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
  const [msgToDelete, setMsgToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const executeDelete = async () => {
    if (!msgToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/notificacoes?id=${msgToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Mensagem excluída!");
        setMessages(prev => prev.filter(m => m.id !== msgToDelete));
        setShowDeleteModal(false);
        setMsgToDelete(null);
      } else {
        toast.error(data.message || "Erro ao excluir.");
      }
    } catch (err) {
      console.error("Erro deletar msg:", err);
      toast.error("Falha na conexão ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando chat...</div>;
  }

  if (!partner) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
           <Link href="/dashboard/admin/mensagens" className={styles.backLink}>
             <ArrowLeft size={16} /> Voltar
           </Link>
           <h1>Chat Indisponível</h1>
        </header>
        <div className={styles.empty} style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
           <MessageSquare size={48} style={{ opacity: 0.1 }} />
           <p><strong>Participante não encontrado</strong></p>
           <p>Este usuário pode ter sido excluído da plataforma.</p>
           <Link href="/dashboard/admin/notificacoes" className={styles.backLink} style={{ margin: '0 auto' }}>
              Voltar para notificações
           </Link>
        </div>
      </div>
    );
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
                {msg.isOwn && (
                  <button 
                    className={styles.deletePoint}
                    onClick={() => { setMsgToDelete(msg.id); setShowDeleteModal(true); }}
                    title="Excluir mensagem"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
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

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3>Excluir Mensagem?</h3>
            <p>Deseja realmente apagar esta mensagem do histórico?</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowDeleteModal(false)} className={styles.cancelBtn}>Cancelar</button>
              <button onClick={executeDelete} disabled={isDeleting} className={styles.deleteBtn}>
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

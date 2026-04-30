"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Scale,
  Loader2,
  MessageSquare,
  Video,
} from "lucide-react";
import Link from "next/link";
import styles from "./Chat.module.css";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

function ChatContent() {
  const { casoId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interestId = searchParams.get("interest");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollingRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const [mensagens, setMensagens] = useState([]);
  const [caso, setCaso] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingMeetInvite, setSendingMeetInvite] = useState(false);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [meetLinkInput, setMeetLinkInput] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const loadMensagens = useCallback(async () => {
    try {
      let url = `/api/mensagens?caso_id=${casoId}`;
      if (interestId) url += `&interest_id=${interestId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMensagens(data.data);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  }, [casoId, interestId]);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Carregar perfil para saber quem é o usuário atual
        const perfilRes = await fetch("/api/perfil");
        const perfilData = await perfilRes.json();
        if (perfilData.success) {
          setCurrentUser(perfilData.data);
        } else {
          toast.error("Sessão expirada. Faça login novamente.");
          router.push("/login");
          return;
        }

        // 2. Carregar informações do caso
        const casosRes = await fetch("/api/casos");
        const casosData = await casosRes.json();
        if (casosData.success) {
          const casoAtual = casosData.data.find((c) => c.id === casoId);
          if (casoAtual) {
            setCaso(casoAtual);
          } else {
            // Se for negociação, o advogado pode não ter o caso nos "seus casos"
            // Buscar pelo caso via API específica
            if (!interestId) {
              toast.error("Caso não encontrado.");
              router.push("/dashboard/cliente");
              return;
            }
          }
        }

        // 3. Se é chat de negociação, buscar nome do parceiro
        if (interestId) {
          try {
            const intRes = await fetch(`/api/casos/interesse?interestId=${interestId}`);
            const intData = await intRes.json();
            // O nome do parceiro será exibido no header
          } catch (e) {
            // fallback silencioso
          }
        }

        // 4. Carregar mensagens
        await loadMensagens();
      } catch (err) {
        console.error("Erro ao carregar chat:", err);
        toast.error("Erro ao carregar chat.");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Polling para atualizar mensagens a cada 5 segundos
    pollingRef.current = setInterval(loadMensagens, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [casoId, loadMensagens, router, interestId]);

  useEffect(() => {
    if (currentUser?.role !== "LAWYER" || !currentUser?.id) return;

    let presenceChannel;
    let isActive = true;

    const setupPresence = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      presenceChannel = supabase
        .channel("lawyer-presence-room", {
          config: { presence: { key: currentUser.id } },
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && isActive) {
            await presenceChannel.track({
              user_id: currentUser.id,
              role: "LAWYER",
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    setupPresence();
    return () => {
      isActive = false;
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [currentUser?.id, currentUser?.role]);

  // Scroll para o final — só executa se o usuário já está perto do fim
  useEffect(() => {
    const area = messagesAreaRef.current;
    if (isAtBottomRef.current && area) {
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    }
  }, [mensagens]);

  const handleMessagesScroll = () => {
    const area = messagesAreaRef.current;
    if (!area) return;
    isAtBottomRef.current =
      area.scrollHeight - area.scrollTop - area.clientHeight < 80;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const msgText = newMessage.trim();
    setNewMessage("");

    // Otimistic UI
    isAtBottomRef.current = true;
    const tempMsg = {
      id: "temp-" + Date.now(),
      sender_id: currentUser?.id,
      content: msgText,
      created_at: new Date().toISOString(),
      is_read: false,
      caso_id: casoId,
      interest_id: interestId || null,
      isTemp: true,
    };
    setMensagens((prev) => [...prev, tempMsg]);

    try {
      const bodyData = { caso_id: casoId, content: msgText };
      if (interestId) bodyData.interest_id = interestId;

      const res = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (data.success) {
        await loadMensagens();
      } else {
        toast.error(data.message || "Erro ao enviar mensagem.");
        setMensagens((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setNewMessage(msgText);
      }
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
      setMensagens((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setNewMessage(msgText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isLawyer = currentUser?.role === "LAWYER";
  const dashboardHref = isLawyer ? "/dashboard/advogado" : "/dashboard/cliente";
  const isNegotiationChat = !!interestId;

  const renderMessageContent = (content) => {
    const meetRegex = /(https:\/\/(meet\.google\.com|meet\.jit\.si)\/[^\s]+)/i;
    const match = String(content || "").match(meetRegex);

    if (!match) {
      return <p className={styles.messageText}>{content}</p>;
    }

    const meetLink = match[1];
    const isJitsi = meetLink.includes("meet.jit.si");
    const prefixText = String(content || "")
      .replace(meetLink, "")
      .trim();

    return (
      <div className={styles.messageTextBlock}>
        {prefixText && <p className={styles.messageText}>{prefixText}</p>}
        {isJitsi ? (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.meetLink}
          >
            <Video size={14} style={{ display: "inline", marginRight: "4px" }} />
            Entrar na videochamada (Nativa)
          </a>
        ) : (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.meetLink}
          >
            <Video size={14} style={{ display: "inline", marginRight: "4px" }} />
            Entrar no Google Meet
          </a>
        )}
      </div>
    );
  };

  const handleStartJitsi = async () => {
    if (!isLawyer || sendingMeetInvite) return;
    setSendingMeetInvite(true);
    
    // Gera um nome de sala único
    const roomName = `SJ-Caso-${casoId}-${Date.now().toString().slice(-6)}`;
    const jitsiLink = `https://meet.jit.si/${roomName}`;

    try {
      const res = await fetch("/api/casos/meet-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId, meetLink: jitsiLink }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message || "Não foi possível criar a sala de vídeo.",
        );
        return;
      }

      toast.success("Sala de vídeo criada com sucesso!");
      isAtBottomRef.current = true;
      await loadMensagens();
      
      // Abre a sala para o próprio advogado em nova aba automaticamente
      window.open(jitsiLink, "_blank");

    } catch (error) {
      console.error("Erro ao iniciar Jitsi:", error);
      toast.error("Erro de conexão ao criar videochamada.");
    } finally {
      setSendingMeetInvite(false);
    }
  };

  const handleShareMeet = () => {
    if (!isLawyer || sendingMeetInvite) return;
    setMeetLinkInput("");
    setShowMeetModal(true);
  };

  const handleSendMeetLink = async () => {
    const link = meetLinkInput.trim();
    if (!link) return;

    setSendingMeetInvite(true);
    setShowMeetModal(false);
    try {
      const res = await fetch("/api/casos/meet-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId, meetLink: link }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message || "Não foi possível enviar o convite de vídeo.",
        );
        return;
      }

      toast.success("Convite do Google Meet enviado para o cliente.");
      isAtBottomRef.current = true;
      await loadMensagens();
    } catch (error) {
      console.error("Erro ao compartilhar Meet:", error);
      toast.error("Erro de conexão ao enviar convite Meet.");
    } finally {
      setSendingMeetInvite(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === yesterday.toDateString()) return "Ontem";
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Agrupar mensagens por data
  const mensagensAgrupadas = mensagens.reduce((groups, msg) => {
    const dateKey = formatDate(msg.created_at);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={40} className={styles.spinner} />
        <p>Carregando conversa...</p>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      {/* HEADER */}
      <header className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <Link
            href={dashboardHref}
            className={styles.backBtn}
            onClick={() => {
              if (pollingRef.current) clearInterval(pollingRef.current);
            }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div className={styles.lawyerInfo}>
            <div className={styles.lawyerAvatar} style={isNegotiationChat ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}>
              <Scale size={18} />
            </div>
            <div>
              <h2 className={styles.lawyerName}>
                {isNegotiationChat ? "Chat de Negociação" : caso?.advogado_id ? "Advogado do Caso" : "Chat do Caso"}
              </h2>
              <p className={styles.caseName}>{caso?.titulo || "Sem título"}</p>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {isLawyer && !isNegotiationChat && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={styles.meetBtn}
                onClick={handleStartJitsi}
                disabled={sendingMeetInvite}
              >
                <Video size={16} />
                {sendingMeetInvite ? "Iniciando..." : "Iniciar Videochamada"}
              </button>
            </div>
          )}
          <span className={styles.statusChip} style={isNegotiationChat ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' } : {}}>
            {isNegotiationChat ? "NEGOCIANDO" : caso?.status || "ABERTO"}
          </span>
        </div>
      </header>

      {/* BANNER DE NEGOCIAÇÃO */}
      {isNegotiationChat && (
        <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#f59e0b' }}>
          <span>🔥</span>
          <span>Chat de negociação — Converse com o advogado antes de contratar.</span>
        </div>
      )}

      {/* MODAL GOOGLE MEET */}
      {showMeetModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowMeetModal(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <Video size={20} />
              <h3>Criar videochamada</h3>
            </div>
            <p className={styles.modalDesc}>
              Clique em <strong>Abrir Google Meet</strong> para criar uma nova
              sala. Depois cole o link gerado no campo abaixo e envie ao
              cliente.
            </p>
            <a
              href="https://meet.new"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.modalOpenBtn}
            >
              <Video size={15} />
              Abrir Google Meet
            </a>
            <input
              type="url"
              className={styles.modalInput}
              placeholder="Cole o link do Google Meet aqui..."
              value={meetLinkInput}
              onChange={(e) => setMeetLinkInput(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowMeetModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalSendBtn}
                onClick={handleSendMeetLink}
                disabled={!meetLinkInput.trim()}
              >
                Enviar link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES AREA */}
      <main
        ref={messagesAreaRef}
        className={styles.messagesArea}
        onScroll={handleMessagesScroll}
      >
        {Object.keys(mensagensAgrupadas).length === 0 ? (
          <div className={styles.emptyChat}>
            <MessageSquare size={56} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Nenhuma mensagem ainda</p>
            <p className={styles.emptySubtitle}>
              {isNegotiationChat
                ? "Envie uma mensagem para iniciar a negociação."
                : "Envie uma mensagem para começar a conversa com seu advogado."}
            </p>
          </div>
        ) : (
          Object.entries(mensagensAgrupadas).map(([date, msgs]) => (
            <div key={date}>
              <div className={styles.dateSeparator}>
                <span>{date}</span>
              </div>
              {msgs.map((msg) => {
                const isOwn = msg.sender_id === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageWrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}
                  >
                    {!isOwn && (
                      <div className={styles.otherAvatar}>
                        <Scale size={14} />
                      </div>
                    )}
                    <div
                      className={`${styles.messageBubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${msg.isTemp ? styles.tempBubble : ""}`}
                    >
                      {renderMessageContent(msg.content)}
                      <span className={styles.messageTime}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* INPUT AREA */}
      <footer className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            className={styles.messageInput}
            rows={1}
            disabled={sending}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 size={20} className={styles.spinner} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
        <p className={styles.inputHint}>Shift+Enter para nova linha</p>
      </footer>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d1a', color: '#fff' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

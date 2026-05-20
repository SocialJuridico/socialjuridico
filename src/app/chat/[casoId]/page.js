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
  Paperclip,
  Mic,
  Trash2,
  X,
  Sparkles,
  Bot,
  Copy
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Estados dos Assistentes de IA
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loadingAnalysisId, setLoadingAnalysisId] = useState(null);
  const [analysesMap, setAnalysesMap] = useState({});

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const loadAnalyses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("mensagens_analise_ia")
        .select("*")
        .eq("caso_id", casoId);
      
      if (!error && data) {
        const map = {};
        data.forEach((item) => {
          map[item.mensagem_id] = item;
        });
        setAnalysesMap(map);
      }
    } catch (err) {
      console.error("Erro ao carregar análises de IA:", err);
    }
  }, [casoId]);

  const loadMensagens = useCallback(async () => {
    try {
      let url = `/api/mensagens?caso_id=${casoId}&_t=${Date.now()}`;
      if (interestId) url += `&interest_id=${interestId}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        }
      });
      const data = await res.json();
      if (data.success) {
        setMensagens(data.data);
        await loadAnalyses();
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  }, [casoId, interestId, loadAnalyses]);

  const triggerMessageAnalysis = async (msgId) => {
    if (loadingAnalysisId) return;
    setLoadingAnalysisId(msgId);
    try {
      const res = await fetch("/api/chat/analise-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caso_id: casoId,
          interest_id: interestId || null,
          mensagem_id: msgId
        })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysesMap(prev => ({
          ...prev,
          [msgId]: data.data
        }));
        setSelectedAnalysis(data.data);
        setAiDrawerOpen(true);
        toast.success("Análise de IA gerada!");
      } else {
        toast.error(data.message || "Erro ao gerar análise de IA.");
      }
    } catch (err) {
      console.error("Erro ao solicitar análise:", err);
      toast.error("Erro de conexão ao solicitar análise.");
    } finally {
      setLoadingAnalysisId(null);
    }
  };

  const triggerGlobalAnalysis = async () => {
    setAiDrawerOpen(true);
    setLoadingAnalysisId("global");
    try {
      const res = await fetch("/api/chat/analise-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caso_id: casoId,
          interest_id: interestId || null,
          mensagem_id: "global"
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAnalysis(data.data);
      } else {
        toast.error(data.message || "Erro ao gerar análise geral.");
      }
    } catch (err) {
      console.error("Erro ao solicitar análise global:", err);
      toast.error("Erro de conexão ao solicitar análise global.");
    } finally {
      setLoadingAnalysisId(null);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Resposta copiada para a área de transferência!");
  };

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

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [casoId, loadMensagens, router, interestId]);

  // Polling fallback: garante sincronização do chat a cada 3 segundos em qualquer cenário
  useEffect(() => {
    if (!casoId) return;

    const interval = setInterval(() => {
      loadMensagens();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [casoId, loadMensagens]);

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!casoId || !currentUser) return;

    let subscription;
    let isActive = true;

    async function initRealtime() {
      // 1. Obter a sessão e configurar autenticação do WebSocket
      const { data: { session } } = await supabase.auth.getSession();
      if (!isActive) return;

      let token = session?.access_token;

      // Fallback: se o cliente-side não conseguir ler o cookie de autenticação,
      // busca o token JWT assinado diretamente do servidor.
      if (!token) {
        try {
          const res = await fetch("/api/auth/token");
          const data = await res.json();
          if (data.success && data.token) {
            token = data.token;
          }
        } catch (err) {
          console.error("Erro ao obter token de fallback:", err);
        }
      }

      if (token) {
        supabase.realtime.setAuth(token);
      }

      // 2. Inscrever no canal do caso específico
      const channelName = `chat-caso-${casoId}`;
      subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "mensagens"
          },
          (payload) => {
            console.log("Recebeu evento Realtime na tabela mensagens:", payload);
            const evCasoId = payload.new?.caso_id;
            console.log("Comparando caso_id do evento:", evCasoId, "com casoId da página:", casoId);

            if (payload.new && String(evCasoId).toLowerCase() === String(casoId).toLowerCase()) {
              console.log("IDs correspondem! Evento:", payload.eventType);

              if (payload.eventType === "INSERT") {
                const newMsg = payload.new;
                setMensagens((prev) => {
                  // Evita duplicar mensagens
                  const exists = prev.some((m) => m.id === newMsg.id);
                  if (exists) return prev;

                  // Se for uma mensagem temporária enviada por nós, substitui com os dados finais
                  const tempIndex = prev.findIndex((m) => m.isTemp && m.content === newMsg.content);
                  if (tempIndex !== -1) {
                    const nextList = [...prev];
                    nextList[tempIndex] = newMsg;
                    return nextList;
                  }

                  return [...prev, newMsg];
                });
              } else if (payload.eventType === "UPDATE") {
                setMensagens((prev) =>
                  prev.map((m) => (m.id === payload.new.id ? payload.new : m))
                );
              }
            } else if (payload.eventType === "DELETE" && payload.old) {
              setMensagens((prev) => prev.filter((m) => m.id !== payload.old.id));
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error("Erro na inscrição Realtime do Chat:", err);
          }
          console.log(`Inscrição Realtime (${channelName}) status:`, status);
        });
    }

    initRealtime();

    return () => {
      isActive = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [casoId, currentUser, loadMensagens]);

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

  const sendMediaMessage = async (contentStr) => {
    try {
      const bodyData = { caso_id: casoId, content: contentStr };
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
      }
    } catch (err) {
      toast.error("Erro de conexão ao enviar anexo.");
    }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLt15MB = file.size / 1024 / 1024 < 15;
    if (!isLt15MB) {
      toast.error("O arquivo excede o limite de 15MB.");
      return;
    }

    setUploadingFile(true);
    const toastId = toast.loading("Enviando arquivo...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("casoId", casoId);

      const res = await fetch("/api/mensagens/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erro ao enviar anexo.");
      }

      const mediaContent = JSON.stringify({
        isMedia: true,
        fileUrl: data.url,
        fileName: data.fileName,
        fileType: data.fileType,
      });

      await sendMediaMessage(mediaContent);
      toast.success("Arquivo enviado!", { id: toastId });
    } catch (error) {
      console.error("Erro no upload do anexo:", error);
      toast.error(error.message || "Falha ao enviar arquivo.", { id: toastId });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (mediaRecorderRef.current === null) return;

        const mimeType = audioBlob.type || "audio/webm";
        const fileExt = mimeType.split(";")[0].split("/")[1] || "webm";
        const file = new File([audioBlob], `gravacao-${Date.now()}.${fileExt}`, {
          type: mimeType,
        });

        setUploadingFile(true);
        const toastId = toast.loading("Enviando mensagem de voz...");

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("casoId", casoId);

          const res = await fetch("/api/mensagens/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.message || "Erro ao fazer upload da gravação.");
          }

          const mediaContent = JSON.stringify({
            isMedia: true,
            fileUrl: data.url,
            fileName: "Mensagem de Voz",
            fileType: data.fileType || "audio/webm",
          });

          await sendMediaMessage(mediaContent);
          toast.success("Mensagem de voz enviada!", { id: toastId });
        } catch (error) {
          console.error("Erro ao enviar áudio:", error);
          toast.error("Falha ao enviar mensagem de voz.", { id: toastId });
        } finally {
          setUploadingFile(false);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!isRecording || !mediaRecorderRef.current) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!shouldSend) {
      mediaRecorderRef.current = null;
    }

    try {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.error(e);
    }

    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatRecordingTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const isLawyer = currentUser?.role === "LAWYER";
  const dashboardHref = isLawyer ? "/dashboard/advogado" : "/dashboard/cliente";
  const isNegotiationChat = !!interestId;

  const renderMessageContent = (content) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.isMedia) {
        const isImg = parsed.fileType?.startsWith("image/") || parsed.fileType === "image";
        const isPdf = parsed.fileType === "application/pdf" || parsed.fileType === "pdf";
        const isAudio = parsed.fileType?.startsWith("audio/") || parsed.fileType === "audio";

        if (isImg) {
          return (
            <div className={styles.mediaMessage}>
              <img
                src={parsed.fileUrl}
                alt={parsed.fileName}
                className={styles.mediaImage}
                onClick={() => window.open(parsed.fileUrl, "_blank")}
              />
              <span className={styles.messageText}>{parsed.fileName}</span>
            </div>
          );
        } else if (isPdf) {
          return (
            <div className={styles.pdfCard}>
              <span className={styles.pdfIcon}>📄</span>
              <div className={styles.fileDetails}>
                <span className={styles.fileName}>{parsed.fileName}</span>
                <span
                  className={styles.viewLink}
                  onClick={() => window.open(parsed.fileUrl, "_blank")}
                >
                  Visualizar PDF
                </span>
              </div>
            </div>
          );
        } else if (isAudio) {
          return (
            <div className={styles.audioMessageContainer}>
              <audio src={parsed.fileUrl} controls className={styles.audioPlayer} />
            </div>
          );
        } else {
          return (
            <div className={styles.genericFileCard}>
              <span className={styles.fileIcon}>📁</span>
              <div className={styles.fileDetails}>
                <span className={styles.fileName}>{parsed.fileName}</span>
                <span
                  className={styles.viewLink}
                  onClick={() => window.open(parsed.fileUrl, "_blank")}
                >
                  Baixar arquivo
                </span>
              </div>
            </div>
          );
        }
      }
    } catch (e) {
      // Ignora erro e renderiza texto normal
    }

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
          <button
            type="button"
            className={styles.aiToggleButton}
            onClick={triggerGlobalAnalysis}
            title={currentUser?.role === "LAWYER" ? "Assistente de IA" : "Anjo Jurídico"}
          >
            <Sparkles size={14} />
            <span>{currentUser?.role === "LAWYER" ? "Assistente IA" : "Anjo Jurídico"}</span>
          </button>
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
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%' }}>
                      <div
                        className={`${styles.messageBubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${msg.isTemp ? styles.tempBubble : ""}`}
                        style={{ maxWidth: '100%' }}
                      >
                        {renderMessageContent(msg.content)}
                        <span className={styles.messageTime}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      
                      {!isOwn && !msg.isTemp && (
                        <div className={styles.aiBadgeWrapper}>
                          {analysesMap[msg.id] ? (
                            <button
                              type="button"
                              className={styles.aiBadge}
                              onClick={() => {
                                setSelectedAnalysis(analysesMap[msg.id]);
                                setAiDrawerOpen(true);
                              }}
                            >
                              <Sparkles size={12} />
                              {currentUser?.role === "LAWYER" ? "Ver Parecer da IA" : "Ver Anjo Jurídico"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.aiBadge}
                              onClick={() => triggerMessageAnalysis(msg.id)}
                              disabled={loadingAnalysisId === msg.id}
                            >
                              {loadingAnalysisId === msg.id ? (
                                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              {loadingAnalysisId === msg.id 
                                ? (currentUser?.role === "LAWYER" ? "Analisando..." : "Consultando Anjo...") 
                                : (currentUser?.role === "LAWYER" ? "Pedir Parecer da IA" : "Chamar Anjo Jurídico")}
                            </button>
                          )}
                        </div>
                      )}
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileAttach}
            style={{ display: "none" }}
            accept="image/*,application/pdf,audio/*"
            disabled={uploadingFile || sending}
          />

          {!isRecording && (
            <button
              type="button"
              className={styles.attachmentBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || sending}
              title="Anexar arquivo"
            >
              <Paperclip size={20} />
            </button>
          )}

          {isRecording ? (
            <div className={styles.recordingContainer}>
              <div className={styles.recordingBlink}></div>
              <span className={styles.recordingTime}>
                {formatRecordingTime(recordingTime)}
              </span>
              <span className={styles.recordingLabel}>Gravando voz...</span>
              <button
                type="button"
                className={styles.cancelRecordBtn}
                onClick={() => stopRecording(false)}
                title="Cancelar gravação"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uploadingFile ? "Enviando arquivo..." : "Digite sua mensagem... (Enter para enviar)"}
              className={styles.messageInput}
              rows={1}
              disabled={uploadingFile}
            />
          )}

          {isRecording ? (
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() => stopRecording(true)}
              title="Enviar áudio"
            >
              <Send size={20} />
            </button>
          ) : newMessage.trim() ? (
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!newMessage.trim() || sending || uploadingFile}
            >
              {sending ? (
                <Loader2 size={20} className={styles.spinner} />
              ) : (
                <Send size={20} />
              )}
            </button>
          ) : (
            <button
              type="button"
              className={styles.recordBtn}
              onClick={startRecording}
              disabled={uploadingFile || sending}
              title="Gravar áudio"
            >
              <Mic size={20} />
            </button>
          )}
        </form>
        <p className={styles.inputHint}>
          {isRecording ? "Toque na lixeira para cancelar" : "Shift+Enter para nova linha"}
        </p>
      </footer>

      {/* AI ASSISTANT DRAWER */}
      <div
        className={`${styles.aiDrawerOverlay} ${aiDrawerOpen ? styles.aiDrawerOverlayActive : ""}`}
        onClick={() => setAiDrawerOpen(false)}
      />

      <div className={`${styles.aiDrawer} ${aiDrawerOpen ? styles.aiDrawerOpen : ""}`}>
        <div className={styles.aiDrawerHeader}>
          <div className={styles.aiDrawerTitle}>
            <Sparkles size={20} />
            <span>
              {currentUser?.role === "LAWYER"
                ? "Assessor de Negócios IA"
                : "Anjo Jurídico"}
            </span>
          </div>
          <button
            type="button"
            className={styles.aiCloseBtn}
            onClick={() => setAiDrawerOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.aiDrawerContent}>
          {loadingAnalysisId === "global" ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 0', color: 'white' }}>
              <Loader2 size={32} className={styles.spinner} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--silver)' }}>
                {currentUser?.role === "LAWYER" ? "Analisando o histórico da conversa..." : "Anjo consultando o histórico..."}
              </p>
            </div>
          ) : selectedAnalysis ? (
            <div className={styles.aiCard}>
              <div className={styles.aiCardHeader}>
                <Bot size={18} />
                <span>
                  {selectedAnalysis.mensagem_id 
                    ? (currentUser?.role === "LAWYER" ? "Parecer da Mensagem" : "Análise da Mensagem") 
                    : (currentUser?.role === "LAWYER" ? "Parecer Geral da Conversa" : "Análise Geral da Conversa")}
                </span>
              </div>
              <div className={styles.aiCardContent}>
                {selectedAnalysis.analise_texto}
              </div>
              <button
                type="button"
                className={styles.aiToggleButton}
                style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                onClick={() => handleCopyText(selectedAnalysis.analise_texto)}
              >
                <Copy size={14} />
                {currentUser?.role === "LAWYER" ? "Copiar Parecer" : "Copiar Análise"}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--silver)', fontSize: '0.9rem' }}>
              <Bot size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>Nenhuma análise ativa selecionada.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Clique no botão "Ver Parecer da IA" de qualquer mensagem ou acesse "Assistente IA" no topo para ver uma análise geral da conversa.</p>
            </div>
          )}
        </div>
      </div>
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

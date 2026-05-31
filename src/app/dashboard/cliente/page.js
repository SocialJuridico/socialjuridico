"use client";

import VerifiedBadge from "@/components/VerifiedBadge/VerifiedBadge";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  PlusCircle,
  Bell,
  User,
  LogOut,
  Scale,
  Star,
  ShieldCheck,
  Menu,
  X,
  Upload,
  FileText,
  ImageIcon,
  Trash2,
  MessageSquare,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Check,
  UserX,
  Search,
  Globe,
  Briefcase,
  RotateCcw,
  HelpCircle,
  Home,
  Folder,
  Mic,
  Building,
  FileWarning,
  FileUp,
  ArrowLeft,
} from "lucide-react";
import styles from "./Dashboard.module.css";
import {
  updateCasoAction,
  updatePasswordAction,
  deleteAccountAction,
} from "@/app/actions/authActions";
import { supabase } from "@/lib/supabase";
import { formatPhone } from "@/lib/securityUtils";
import toast from "react-hot-toast";
import AdvogadoMesPopup from "@/components/AdvogadoMesPopup/AdvogadoMesPopup";
import ClientTutorial from "@/components/Onboarding/ClientTutorial";
import PesquisaSatisfacaoClientePopup from "@/components/PesquisaSatisfacaoClientePopup/PesquisaSatisfacaoClientePopup";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/1667675480204134";

const USEFUL_LINKS = [
  {
    title: "ConfirmaAdv",
    description: "Consulta pública de dados da advocacia.",
    href: "https://confirmadv.oab.org.br/",
  },
  {
    title: "Receita Federal",
    description: "Portal oficial da Receita Federal do Brasil.",
    href: "https://www.gov.br/receitafederal/pt-br",
  },
  {
    title: "e-CAC",
    description: "Centro Virtual de Atendimento ao Contribuinte.",
    href: "https://cav.receita.fazenda.gov.br/",
  },
  {
    title: "CNJ",
    description: "Serviços e informações do Conselho Nacional de Justiça.",
    href: "https://www.cnj.jus.br/",
  },
  {
    title: "TST",
    description: "Portal do Tribunal Superior do Trabalho.",
    href: "https://www.tst.jus.br/",
  },
  {
    title: "Central Registradores",
    description: "Serviços digitais e certidões dos registradores.",
    href: "https://www.registradores.org.br/",
  },
  {
    title: "Consulta Geral de Processos",
    description: "Busca pública ampla para acompanhamento processual.",
    href: "https://www.jusbrasil.com.br/consulta-processual/",
  },
];

export default function ClienteDashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [modoCriacao, setModoCriacao] = useState("formulario"); // "voz" ou "formulario"
  const [userName, setUserName] = useState("Cliente");
  const [activeTab, setActiveTab] = useState("painel");
  const [advogados, setAdvogados] = useState([]);
  const [onlineLawyerIds, setOnlineLawyerIds] = useState([]);
  const [loadingAdvogados, setLoadingAdvogados] = useState(true);
  const [casos, setCasos] = useState([]);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [shareCaseOnFacebook, setShareCaseOnFacebook] = useState(false);
  const [caseActionLoadingId, setCaseActionLoadingId] = useState(null);
  const [expandedSpecialties, setExpandedSpecialties] = useState({});

  // States para Interesses de Advogados
  const [interesses, setInteresses] = useState([]);
  const [loadingInteresses, setLoadingInteresses] = useState(false);
  const [processandoInteresse, setProcessandoInteresse] = useState(null);

  // States para Modal de Avaliação
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false);
  const [avaliacaoPendente, setAvaliacaoPendente] = useState(null); // { advogado_id, advogado_nome, caso_id, caso_titulo }
  const [avaliacaoNota, setAvaliacaoNota] = useState(0);
  const [avaliacaoHover, setAvaliacaoHover] = useState(0);
  const [avaliacaoJustificativa, setAvaliacaoJustificativa] = useState("");
  const [avaliacaoLoading, setAvaliacaoLoading] = useState(false);

  // States para Edição de Caso
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCaso, setSelectedCaso] = useState(null);
  const [editFormData, setEditFormData] = useState({
    titulo: "",
    area: "",
    descricao: "",
    cidade: "",
    estado: "",
  });

  // States para Notificações
  const [notificacoes, setNotificacoes] = useState([]);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
  const notifIdsRef = useRef(new Set());
  const notifBootstrappedRef = useRef(false);

  // States para Novo Caso
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    titulo: "",
    area: "",
    descricao: "",
    cidade: "",
    estado: "",
  });

  // States para Mídias Inclusivas (Áudio e Vídeo)
  const [videoLink, setVideoLink] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioIntervalRef = useRef(null);
  const videoInputRef = useRef(null);

  // Funções de Gravação de Áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      audioIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Não foi possível acessar o microfone. Verifique suas permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limite de 180MB
    const isLt180MB = file.size / 1024 / 1024 < 180;
    if (!isLt180MB) {
      toast.error("O vídeo excede o limite permitido de 180MB.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      toast.error("Por favor, selecione um arquivo de vídeo válido.");
      return;
    }

    setVideoFile(file);
  };

  const removeVideoFile = () => {
    setVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  // States para Perfil
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    password: "",
  });

  // States para Modal de Perfil do Advogado e Chat
  const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [showNotifDeleteConfirm, setShowNotifDeleteConfirm] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);

  // States para Modal de Escritório e Advogados do Escritório
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);

  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Rastreamento do Funil de Reengajamento: registra login realizado
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get("trackId");
      if (trackId) {
        // Disparar atualização de login
        fetch("/api/track/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId }),
        }).catch((err) => console.error("Erro ao registrar login no funil:", err));

        // Limpar trackId da URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!profileData || !profileData.role) return;

    let mounted = true;

    (async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
        const metaOnboard = user?.user_metadata?.onboarding_complete === true;
        const profileOnboard = profileData?.onboarding_complete === true;
        const localCompleted = typeof window !== "undefined" && window.localStorage.getItem("sj_client_tutorial_completed") === "true";

        const needsOnboarding =
          profileData.role === "CLIENT" && (!metaOnboard && !profileOnboard || !localCompleted);

        if (mounted) setShowOnboardingModal(!!needsOnboarding);
      } catch (err) {
        console.error("Erro checando onboarding (cliente):", err);
      }
    })();

    return () => (mounted = false);
  }, [profileData]);

  // Filtra advogados com especialidade preenchida
  const advogadosComEspecialidade = useMemo(() => {
    return advogados.filter((adv) => {
      // Ocultar advogados com erro de verificação
      if (adv.oab_verification_status === "ERROR") return false;

      // Ocultar secretárias e estagiários do painel do cliente
      if (adv.cargo === "secretaria" || adv.cargo === "estagiario")
        return false;

      const specs = String(adv.specialties || "").trim();
      return specs && specs !== "Clínico Geral" && specs.length > 0;
    });
  }, [advogados]);

  // Agrupa advogados por especialidade
  const groupedAdvogadosBySpecialty = useMemo(() => {
    const searchTerm = lawyerSearch.trim().toLowerCase();
    const grupos = {};

    advogadosComEspecialidade.forEach((adv) => {
      // Filtro de busca
      const normalizedName = String(adv.name || "").toLowerCase();
      const normalizedOab = String(adv.oab || "").toLowerCase();

      if (
        searchTerm &&
        !normalizedName.includes(searchTerm) &&
        !normalizedOab.includes(searchTerm)
      ) {
        return; // Pula este advogado se não corresponder à busca
      }

      // Processa especialidades (pode ter múltiplas separadas por vírgula)
      const specs = String(adv.specialties || "")
        .split(",")
        .map((s) => s.trim());
      specs.forEach((spec) => {
        if (spec && spec !== "Clínico Geral") {
          if (!grupos[spec]) {
            grupos[spec] = [];
          }
          grupos[spec].push(adv);
        }
      });
    });

    return grupos;
  }, [advogadosComEspecialidade, lawyerSearch]);

  // Filtra e agrupa escritórios únicos com seus respectivos advogados ativos
  const uniqueOffices = useMemo(() => {
    const offices = {};
    advogados.forEach((adv) => {
      if (
        adv.oab_verification_status === "ERROR" ||
        !adv.escritorio_id ||
        !adv.nome_escritorio
      ) {
        return;
      }
      // Ocultar secretárias e estagiários
      if (adv.cargo === "secretaria" || adv.cargo === "estagiario") {
        return;
      }
      if (!offices[adv.escritorio_id]) {
        offices[adv.escritorio_id] = {
          id: adv.escritorio_id,
          nome: adv.nome_escritorio,
          logo_url: adv.logo_escritorio,
          advogados: [],
        };
      }
      offices[adv.escritorio_id].advogados.push(adv);
    });
    return Object.values(offices).filter((o) => o.advogados.length > 0);
  }, [advogados]);

  const showNotificationToast = useCallback(
    (notif) => {
      toast.custom(
        (toastItem) => {
          const handleToastClick = () => {
            setActiveTab("notificacoes");
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.dismiss(toastItem.id);
          };

          return (
            <button
              type="button"
              className={`${styles.toastNotification} ${toastItem.visible ? styles.toastIn : styles.toastOut}`}
              onClick={handleToastClick}
              aria-label="Abrir notificações"
            >
              <div className={styles.toastIcon}>
                <Bell size={20} color="var(--color-gold)" />
              </div>
              <div className={styles.toastContent}>
                <p className={styles.toastTitle}>{notif.titulo}</p>
                <p className={styles.toastDesc}>{notif.mensagem}</p>
              </div>
            </button>
          );
        },
        { duration: 5000 },
      );
    },
    [setActiveTab],
  );

  const syncNotificacoes = useCallback(
    async (showToastsForNew = false) => {
      if (!profileData?.id) return;
      try {
        const res = await fetch("/api/notificacoes", { cache: "no-store" });
        const response = await res.json();
        if (!response.success) return;

        const data = response.data || [];
        const incomingIds = new Set(data.map((n) => n.id).filter(Boolean));

        if (!notifBootstrappedRef.current) {
          notifIdsRef.current = incomingIds;
          notifBootstrappedRef.current = true;
          setNotificacoes(data);
          return;
        }

        if (showToastsForNew) {
          const newNotifs = data.filter(
            (n) => n.id && !notifIdsRef.current.has(n.id),
          );
          newNotifs.reverse().forEach((n) => showNotificationToast(n));
        }

        notifIdsRef.current = incomingIds;
        setNotificacoes(data);
      } catch (err) {
        console.error("Erro ao sincronizar notificações:", err);
      }
    },
    [showNotificationToast, profileData?.id],
  );

  const loadNotificacoes = useCallback(async () => {
    setLoadingNotificacoes(true);
    await syncNotificacoes(false);
    setLoadingNotificacoes(false);
  }, [syncNotificacoes]);

  const handleDeleteNotification = async (id) => {
    setNotifToDelete(id);
    setShowNotifDeleteConfirm(true);
  };

  const getNotificationIcon = (titulo = "", mensagem = "") => {
    const text = `${titulo} ${mensagem}`.toLowerCase();
    if (text.includes("mensagem") || text.includes("chat")) {
      return <MessageSquare size={20} />;
    }
    if (text.includes("agenda") || text.includes("audiência") || text.includes("data")) {
      return <Calendar size={20} />;
    }
    if (text.includes("blindagem") || text.includes("seguro") || text.includes("segurança")) {
      return <ShieldCheck size={20} />;
    }
    if (text.includes("financeiro") || text.includes("honorários") || text.includes("pagamento")) {
      return <Briefcase size={20} />;
    }
    return <Bell size={20} />;
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const handleClearAllNotifications = async () => {
    if (notificacoes.length === 0) return;
    if (!confirm("Deseja realmente limpar todas as notificações?")) return;

    setLoadingNotificacoes(true);
    try {
      const deletePromises = notificacoes.map((notif) =>
        fetch(`/api/notificacoes?id=${notif.id}`, { method: "DELETE" }).then((res) => res.json())
      );

      const results = await Promise.all(deletePromises);
      const allSuccess = results.every((res) => res.success);

      if (allSuccess) {
        toast.success("Todas as notificações foram limpas!");
      } else {
        toast.success("Notificações limpas com sucesso.");
      }
      setNotificacoes([]);
    } catch (err) {
      console.error("Erro ao limpar notificações:", err);
      toast.error("Erro ao limpar notificações.");
    } finally {
      setLoadingNotificacoes(false);
    }
  };

  const executeDeleteNotification = async () => {
    if (!notifToDelete) return;
    try {
      const res = await fetch(`/api/notificacoes?id=${notifToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Notificação excluída!");
        setNotificacoes((prev) => prev.filter((n) => n.id !== notifToDelete));
        setShowNotifDeleteConfirm(false);
        setNotifToDelete(null);
      } else {
        toast.error(data.message || "Erro ao excluir.");
      }
    } catch (err) {
      console.error("Erro delete notif:", err);
      toast.error("Erro na conexão.");
    }
  };

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const response = await fetch("/api/perfil");
      const data = await response.json();

      if (data.success) {
        setProfileData(data.data);
        setUserName(data.data.name);
        setProfileForm({
          name: data.data.name,
          phone: data.data.phone || "",
          password: "",
        });
      } else {
        toast.error(data.message || "Erro ao carregar perfil.");
      }
    } catch (err) {
      console.error("Erro carregar perfil:", err);
      toast.error("Erro de conexão ao carregar perfil.");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadCasos = useCallback(async () => {
    setLoadingCasos(true);
    try {
      const response = await fetch("/api/casos", { cache: "no-store" });
      const data = await response.json();
      if (data.success) {
        // Ocultar casos CANCELADO da visão do cliente
        const visiveis = data.data.filter((c) => c.status !== "CANCELADO");
        setCasos(visiveis);
      }
    } catch (err) {
      console.error("Erro ao carregar casos:", err);
    } finally {
      setLoadingCasos(false);
    }
  }, []);

  const loadInteresses = useCallback(async () => {
    setLoadingInteresses(true);
    try {
      const res = await fetch("/api/casos/interesse");
      const data = await res.json();
      if (data.success) setInteresses(data.data);
    } catch (err) {
      console.error("Erro ao carregar interesses:", err);
    } finally {
      setLoadingInteresses(false);
    }
  }, []);

  const openNotificationsTab = async () => {
    setActiveTab("notificacoes");
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadNotificacoes();
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarCollapsed(true);
      else setIsSidebarCollapsed(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    async function loadInitialData() {
      // 1. Carregar Advogados
      fetch("/api/advogados")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setAdvogados(data.data);
        })
        .finally(() => setLoadingAdvogados(false));

      // 1.1 Carregar Casos
      loadCasos();
      // 1.2 Carregar Interesses
      loadInteresses();
      // 2. Carregar Perfil
      loadProfile();
    }
    loadInitialData();

    // Inscrição em tempo real para notificações
    let channel;
    let retryTimer;
    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        retryTimer = setTimeout(setupRealtime, 1200);
        return;
      }

      channel = supabase
        .channel(`cliente-notificacoes-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificacoes",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notif = payload.new;
            if (!notif?.id || notifIdsRef.current.has(notif.id)) return;
            notifIdsRef.current.add(notif.id);
            setNotificacoes((prev) => [notif, ...prev]);
            showNotificationToast(notif);
          },
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [loadCasos, loadInteresses, loadProfile, showNotificationToast]);

  useEffect(() => {
    let presenceChannel;

    const syncPresence = () => {
      if (!presenceChannel) return;
      const state = presenceChannel.presenceState();
      const ids = Object.values(state)
        .flat()
        .map((entry) => entry.user_id)
        .filter(Boolean);
      setOnlineLawyerIds(Array.from(new Set(ids)));
    };

    const setupPresence = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      presenceChannel = supabase
        .channel("lawyer-presence-room")
        .on("presence", { event: "sync" }, syncPresence)
        .on("presence", { event: "join" }, syncPresence)
        .on("presence", { event: "leave" }, syncPresence)
        .subscribe();
    };

    setupPresence();
    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, []);

  const isInitialTabMount = useRef(true);
  // Monitorar mudança de Tab
  useEffect(() => {
    if (isInitialTabMount.current) {
      isInitialTabMount.current = false;
      return;
    }
    if (activeTab === "painel") loadCasos();
    if (activeTab === "notificacoes") loadNotificacoes();
    if (activeTab === "perfil") loadProfile();
  }, [activeTab, loadCasos, loadNotificacoes, loadProfile]);

  useEffect(() => {
    if (!profileData?.id) return;
    const start = async () => {
      await syncNotificacoes(true);
    };
    start();
  }, [syncNotificacoes, profileData?.id]);

  const handleResponderInteresse = async (interestId, action) => {
    setProcessandoInteresse(interestId);
    try {
      const res = await fetch("/api/casos/interesse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestId, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "ACCEPT") {
          toast.success("Negociação iniciada! Agora vocês podem negociar.");
          setInteresses((prev) =>
            prev.map((i) =>
              i.id === interestId ? { ...i, status: "NEGOTIATING" } : i,
            ),
          );
          loadCasos();
        } else if (action === "HIRE") {
          toast.success("Advogado contratado com sucesso! 🎉");
          const hiredInterest = interesses.find((i) => i.id === interestId);
          if (hiredInterest) {
            // Abrir modal de avaliação após contratar
            setAvaliacaoPendente({
              advogado_id: hiredInterest.lawyer_id,
              advogado_nome: hiredInterest.lawyer_name || "Advogado",
              caso_id: hiredInterest.case_id,
              caso_titulo: hiredInterest.caso_titulo || "Caso",
            });
            setAvaliacaoNota(0);
            setAvaliacaoJustificativa("");
            setShowAvaliacaoModal(true);
            setInteresses((prev) =>
              prev.filter((i) => i.case_id !== hiredInterest.case_id),
            );
          }
          loadCasos();
        } else {
          // DECLINE de negociação — também pede avaliação
          const declinedInterest = interesses.find((i) => i.id === interestId);
          if (declinedInterest && declinedInterest.status === "NEGOTIATING") {
            setAvaliacaoPendente({
              advogado_id: declinedInterest.lawyer_id,
              advogado_nome: declinedInterest.lawyer_name || "Advogado",
              caso_id: declinedInterest.case_id,
              caso_titulo: declinedInterest.caso_titulo || "Caso",
            });
            setAvaliacaoNota(0);
            setAvaliacaoJustificativa("");
            setShowAvaliacaoModal(true);
          }
          toast.success("Negociação encerrada.");
          setInteresses((prev) => prev.filter((i) => i.id !== interestId));
        }
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao processar resposta.");
    } finally {
      setProcessandoInteresse(null);
    }
  };

  const handleSubmitAvaliacao = async () => {
    if (!avaliacaoPendente || avaliacaoNota === 0) {
      toast.error("Selecione uma nota antes de enviar.");
      return;
    }
    setAvaliacaoLoading(true);
    try {
      const res = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advogado_id: avaliacaoPendente.advogado_id,
          caso_id: avaliacaoPendente.caso_id,
          nota: avaliacaoNota,
          justificativa: avaliacaoJustificativa,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Avaliação enviada! Obrigado pelo feedback.");
        setShowAvaliacaoModal(false);
        setAvaliacaoPendente(null);
      } else {
        toast.error(data.message || "Erro ao enviar avaliação.");
      }
    } catch (err) {
      toast.error("Erro de conexão ao enviar avaliação.");
    } finally {
      setAvaliacaoLoading(false);
    }
  };

  const handleOpenEditModal = (caso) => {
    setSelectedCaso(caso);
    setEditFormData({
      titulo: caso.titulo || "",
      area: caso.area_atuacao || "",
      descricao: caso.descricao || "",
      cidade: caso.cidade || "",
      estado: caso.estado || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCaso = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch("/api/casos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCaso.id,
          titulo: editFormData.titulo,
          area_atuacao: editFormData.area,
          descricao: editFormData.descricao,
          cidade: editFormData.cidade,
          estado: editFormData.estado,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Caso atualizado com sucesso!");
        setIsEditModalOpen(false);
        loadCasos();
      } else {
        toast.error(data.message || "Erro ao atualizar caso.");
      }
    } catch (err) {
      console.error("Erro ao atualizar caso:", err);
      toast.error("Erro de conexão ao atualizar caso.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleFinalizeCaso = async () => {
    if (!selectedCaso || caseActionLoadingId) return;

    setCaseActionLoadingId(selectedCaso.id);
    try {
      const res = await fetch("/api/casos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCaso.id, status: "FECHADO" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao finalizar caso.");
        return;
      }

      toast.success("Caso finalizado com sucesso.");
      setIsEditModalOpen(false);
      await loadCasos();
    } catch (error) {
      console.error("Erro ao finalizar caso:", error);
      toast.error("Erro ao finalizar caso.");
    } finally {
      setCaseActionLoadingId(null);
    }
  };

  const handleDeleteCaso = async () => {
    if (!selectedCaso || caseActionLoadingId) return;

    const casoId = selectedCaso.id;
    setCaseActionLoadingId(casoId);
    try {
      const res = await fetch(`/api/casos?id=${casoId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir caso.");
        return;
      }

      toast.success("Caso excluído com sucesso.");
      setIsEditModalOpen(false);
      setSelectedCaso(null);
      // Remover imediatamente do state local (evita reaparecer por cache)
      setCasos((prev) => prev.filter((c) => c.id !== casoId));
      // Recarregar em segundo plano para garantir sincronia
      loadCasos();
    } catch (error) {
      console.error("Erro ao excluir caso:", error);
      toast.error("Erro ao excluir caso.");
    } finally {
      setCaseActionLoadingId(null);
    }
  };

  const shareCaseToFacebookGroup = async (casePayload) => {
    const siteUrl = "https://socialjuridico.com.br";

    // 1. Texto RICO formatado para o Post (O Título e a Descrição vão aqui!)
    const shareText = `⚖️ NOVO CASO JURÍDICO PUBLICADO NO SOCIALJURÍDICO\n\n📌 TÍTULO: ${casePayload.titulo}\n📝 DESCRIÇÃO: ${casePayload.descricao}\n\n🌐 Veja mais em: ${siteUrl}`;

    // 2. Colocar no clipboard imediatamente (Ação mais importante)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        toast.success("Título e descrição copiados com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao copiar:", e);
    }

    // 3. Link Dinâmico para as Meta Tags (Card Visual)
    // O Facebook lerá o título/descrição deste link e montará o card abaixo do seu texto.
    const dynamicShareUrl = `${siteUrl}/compartilhar?t=${encodeURIComponent(casePayload.titulo)}&d=${encodeURIComponent(casePayload.descricao.substring(0, 150))}`;

    // 4. Abrir Janela do Facebook
    const facebookSharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dynamicShareUrl)}`;

    window.open(
      facebookSharerUrl,
      "_blank",
      "noopener,noreferrer,width=600,height=600",
    );

    // 5. Explicar o motivo do card talvez vir genérico no localhost
    toast(
      "O card visual aparecerá completo assim que o site estiver online. Por enquanto, use o Colar (Ctrl+V) no post!",
      {
        icon: "💡",
        duration: 8000,
      },
    );
  };

  const handleOpenLawyerProfile = (lawyer) => {
    setSelectedLawyer(lawyer);
    setIsLawyerModalOpen(true);
  };

  const handleStartChatRequest = (e, lawyer) => {
    e.stopPropagation(); // Evitar abrir o modal de perfil se clicar no botão
    if (!lawyer.is_premium) {
      toast.error("Apenas advogados PRO aceitam mensagens diretas.");
      return;
    }
    setSelectedLawyer(lawyer);
    setIsCaseSelectOpen(true);
  };

  const handleConfirmStartChat = async (casoId) => {
    setIsProcessingChat(true);
    try {
      const res = await fetch("/api/casos/cliente-iniciar-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: casoId,
          lawyerId: selectedLawyer.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Iniciando chat...");
        window.location.href = `/chat/${casoId}`;
      } else {
        toast.error(data.message || "Erro ao iniciar chat.");
      }
    } catch (err) {
      console.error("Erro iniciar chat:", err);
      toast.error("Falha na conexão.");
    } finally {
      setIsProcessingChat(false);
      setIsCaseSelectOpen(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      const isLt10MB = file.size / 1024 / 1024 < 10;
      const isAllowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type);

      if (!isAllowed) {
        toast.error(
          `Arquivo "${file.name}" não aceito. Apenas PDF, JPG, PNG e WEBP são suportados.`,
        );
        continue;
      }

      if (!isLt10MB) {
        toast.error(`Arquivo "${file.name}" excede o limite de 10MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (selectedFiles.length + validFiles.length > 5) {
      toast.error("Limite máximo de 5 arquivos atingido.");
      return;
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCaso = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const uploadedUrls = [];
      // Em alguns cenários no client o getUser pode retornar null mesmo com sessão válida no backend.
      // Preferimos usar profileData já carregado pela API /api/perfil.
      let userId = profileData?.id || null;

      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id || null;
      }

      if (!userId) {
        const perfilRes = await fetch("/api/perfil");
        const perfilData = await perfilRes.json();
        if (perfilData?.success && perfilData?.data?.id) {
          userId = perfilData.data.id;
          setProfileData(perfilData.data);
        }
      }

      if (!userId) {
        toast.error("Sua sessão expirou. Faça login novamente.");
        window.location.href = "/login";
        return;
      }

      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("cases")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("cases").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      let uploadedVideoUrl = null;
      if (videoFile) {
        const fileExt = videoFile.name.split(".").pop();
        const filePath = `${userId}/video-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("cases-media")
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("cases-media").getPublicUrl(filePath);
        uploadedVideoUrl = publicUrl;
      }

      let uploadedAudioUrl = null;
      if (audioBlob) {
        const filePath = `${userId}/audio-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        const { error: uploadError } = await supabase.storage
          .from("cases-media")
          .upload(filePath, audioFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("cases-media").getPublicUrl(filePath);
        uploadedAudioUrl = publicUrl;
      }

      const createRes = await fetch("/api/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: formData.titulo,
          descricao: formData.descricao,
          area_atuacao: formData.area,
          cidade: formData.cidade,
          estado: formData.estado,
          anexos: uploadedUrls,
          video_link: videoLink || null,
          video_url: uploadedVideoUrl || null,
          audio_url: uploadedAudioUrl || null,
        }),
      });

      const result = await createRes.json();

      if (!createRes.ok || !result.success) {
        throw new Error(result.message || "Falha ao criar caso.");
      }

      if (result.success) {
        if (shareCaseOnFacebook) {
          await shareCaseToFacebookGroup({
            titulo: formData.titulo,
            descricao: formData.descricao,
          });
        }

        setFormSuccess(true);
        setFormData({
          titulo: "",
          area: "",
          descricao: "",
          cidade: "",
          estado: "",
        });
        setSelectedFiles([]);
        setVideoLink("");
        setVideoFile(null);
        setAudioBlob(null);
        setAudioURL(null);
        setShareCaseOnFacebook(false);
        setTimeout(() => {
          setFormSuccess(false);
          setActiveTab("painel");
        }, 3000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Erro ao enviar caso:", error);
      toast.error("Erro ao enviar caso.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // 1. Atualizar Nome e Telefone via API real
      const resProfile = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
        }),
      });
      const dataProfile = await resProfile.json();

      if (!dataProfile.success) throw new Error(dataProfile.message);

      // 2. Atualizar Senha se preenchida
      if (profileForm.password) {
        const resPass = await updatePasswordAction(profileForm.password);
        if (!resPass.success) throw new Error(resPass.message);
      }

      toast.success("Perfil atualizado com sucesso!");
      setUserName(profileForm.name);
      loadProfile();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "TEM CERTEZA? Esta ação é irreversível e excluirá todos os seus dados.",
      )
    )
      return;

    setFormLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const response = await deleteAccountAction(user.id);
    if (response.success) {
      toast.success("Conta excluída. Sentiremos sua falta.");
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } else {
      toast.error(response.message);
      setFormLoading(false);
    }
  };

  const renderLawyerCard = (adv) => (
    <div
      key={adv.id}
      className={`${styles.lawyerCard} ${adv.is_premium ? styles.lawyerCardPro : ""}`}
      onClick={() => handleOpenLawyerProfile(adv)}
      style={{ cursor: "pointer", position: "relative" }}
    >
      {adv.oab_verification_status === "VERIFIED" && (
        <div
          style={{ position: "absolute", top: "8px", left: "8px", zIndex: 10 }}
        >
          <VerifiedBadge size={68} />
        </div>
      )}
      {adv.is_premium && (
        <div className={styles.proLawyerBadge}>
          <Sparkles size={11} /> PRO
        </div>
      )}
      <div className={styles.statusBadge}>
        <div
          className={
            onlineLawyerIds.includes(adv.id)
              ? styles.onlineDot
              : styles.offlineDot
          }
        ></div>
        {onlineLawyerIds.includes(adv.id) ? "Online" : "Offline"}
      </div>

      {adv.avatar ? (
        <div className={styles.lawyerAvatarWrapper}>
          <Image
            src={adv.avatar}
            alt={adv.name}
            width={80}
            height={80}
            className={styles.lawyerAvatar}
            unoptimized
          />
        </div>
      ) : (
        <div className={styles.lawyerAvatar}>
          {adv.name.substring(0, 2).toUpperCase()}
        </div>
      )}

      <div className={styles.lawyerInfo}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            justifyContent: "center",
          }}
        >
          <h3 className={styles.lawyerName} style={{ margin: 0 }}>
            {adv.name}
          </h3>
        </div>
        {adv.nome_escritorio && (
          <div
            className={styles.officeTag}
            title={`Membro de ${adv.nome_escritorio}`}
          >
            <Briefcase size={12} /> {adv.nome_escritorio}
          </div>
        )}
        <div
          className={`${styles.oabStatusBadge} ${adv.oab_verification_status === "VERIFIED" ? styles.oabStatusVerified : styles.oabStatusPending}`}
        >
          {adv.oab_verification_status === "VERIFIED" ? (
            <>
              <ShieldCheck size={14} className={styles.verifiedIcon} />
              OAB Verificada
            </>
          ) : (
            "Verificação Pendente"
          )}
        </div>
        <p className={styles.lawyerOab}>
          {adv.oab ? `OAB ${adv.oab}` : "OAB não informada"}
        </p>
        <p className={styles.lawyerSpecs}>
          {adv.specialties || "Clínico Geral"}
        </p>
        <div className={styles.consultaInfo}>
          {adv.consulta === "Paga" ? (
            <>
              <strong>Consulta paga</strong>
              <span>
                {adv.tempo ? adv.tempo : "Duração não informada"}
                {adv.valor
                  ? ` • R$ ${Number(adv.valor).toFixed(2)}`
                  : " • Valor sob consulta"}
              </span>
            </>
          ) : (
            <>
              <strong>Consulta gratuita</strong>
              <span>Primeiro contato sem custo informado.</span>
            </>
          )}
        </div>

        {adv.avg_rating > 0 && (
          <div className={styles.ratingRow}>
            <Star
              size={14}
              fill="var(--color-gold)"
              color="var(--color-gold)"
            />
            <span className={styles.ratingValue}>
              {(adv.avg_rating || 0).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{adv.total_ratings || 0}</span>
          <span className={styles.statLabel}>Avaliações</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>100%</span>
          <span className={styles.statLabel}>Sucesso</span>
        </div>
      </div>

      {adv.is_premium ? (
        <button
          className={styles.contactBtn}
          onClick={(e) => handleStartChatRequest(e, adv)}
        >
          Falar com Advogado
        </button>
      ) : (
        <button
          className={`${styles.contactBtn} ${styles.contactBtnDisabled}`}
          disabled
          title="Apenas advogados PRO aceitam mensagens"
        >
          <Lock size={12} /> PRO necessário
        </button>
      )}
    </div>
  );

  const renderMobileLawyerCard = (adv) => (
    <div
      key={adv.id}
      className={`${styles.lawyerCard} ${adv.is_premium ? styles.lawyerCardPro : ""}`}
      onClick={() => handleOpenLawyerProfile(adv)}
      style={{
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        borderRadius: "16px",
        background: "rgba(18, 21, 28, 0.6)",
        border: adv.is_premium ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
        width: "220px",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {adv.is_premium && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "linear-gradient(135deg, var(--color-gold), #b8860b)",
            color: "#000",
            fontSize: "0.6rem",
            fontWeight: 900,
            padding: "2px 6px",
            borderRadius: "10px",
            textTransform: "uppercase",
            zIndex: 2,
          }}
        >
          PRO
        </div>
      )}
      
      <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: onlineLawyerIds.includes(adv.id) ? "#10b981" : "#64748b",
          }}
        ></div>
        <span style={{ fontSize: "0.6rem", color: "var(--color-silver-dark)", fontWeight: "700" }}>
          {onlineLawyerIds.includes(adv.id) ? "ON" : "OFF"}
        </span>
      </div>

      {adv.avatar ? (
        <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", border: "1.5px solid var(--color-gold)", marginBottom: "8px", marginTop: "8px" }}>
          <Image
            src={adv.avatar}
            alt={adv.name}
            width={50}
            height={50}
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>
      ) : (
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)",
            color: "#000",
            fontWeight: "800",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
            marginTop: "8px"
          }}
        >
          {adv.name.substring(0, 2).toUpperCase()}
        </div>
      )}

      <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#fff", margin: "0 0 4px 0", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
        {adv.name}
      </h4>

      <p style={{ fontSize: "0.72rem", color: "var(--color-gold)", margin: "0 0 6px 0", opacity: 0.8 }}>
        {adv.oab ? `OAB ${adv.oab}` : "OAB Pendente"}
      </p>

      <p style={{ fontSize: "0.75rem", color: "var(--color-silver)", margin: "0 0 8px 0", textAlign: "center", height: "1.8rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {adv.specialties || "Clínico Geral"}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
        <Star size={12} fill="var(--color-gold)" color="var(--color-gold)" />
        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#fff" }}>
          {(adv.avg_rating || 5.0).toFixed(1)}
        </span>
      </div>

      {adv.is_premium ? (
        <button
          style={{
            width: "100%",
            background: "var(--color-gold)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            padding: "6px 0",
            fontSize: "0.75rem",
            fontWeight: "800",
            cursor: "pointer",
          }}
          onClick={(e) => handleStartChatRequest(e, adv)}
        >
          Falar com Advogado
        </button>
      ) : (
        <button
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            padding: "6px 0",
            fontSize: "0.72rem",
            fontWeight: "700",
            cursor: "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
          disabled
        >
          <Lock size={10} /> PRO necessário
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`${styles.dashboardContainer} ${isSidebarCollapsed ? styles.sidebarCollapsed : ""}`}
    >
      {/* Botão Flutuante de Ajuda / Tour Didático */}
      {!isMobile && (
        <button
          type="button"
          title="Ajuda & Tour Didático"
          onClick={() => {
            localStorage.removeItem("sj_client_tutorial_completed");
            setShowOnboardingModal(true);
            setActiveTab("painel");
            toast.success("Guia didático reiniciado! Começando pelo Painel.");
          }}
          style={{
            position: "fixed",
            top: "50%",
            right: "24px",
            transform: "translateY(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            border: "1px solid rgba(245, 200, 83, 0.4)",
            borderRadius: "50px",
            padding: "12px 20px",
            color: "#f5c853",
            fontWeight: "600",
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(245, 200, 83, 0.2)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
            e.currentTarget.style.boxShadow = "0 15px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 200, 83, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-50%)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(245, 200, 83, 0.2)";
          }}
        >
          <HelpCircle size={18} />
          <span>Tour Didático</span>
        </button>
      )}

      {/* SIDEBAR */}
      {!isMobile && (
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <button
              className={styles.menuToggle}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
            </button>

            {!isSidebarCollapsed && (
              <Link href="/" className={styles.logoWrapper}>
                <div className={styles.logoIcon}>
                  <Scale size={20} color="#1A1A1A" />
                </div>
                <span className={styles.logoText}>SocialJurídico</span>
              </Link>
            )}

            {isSidebarCollapsed && (
              <div className={styles.collapsedLogo}>
                <div className={styles.logoIconCompact}>
                  <Scale size={20} color="#fff" />
                </div>
              </div>
            )}
          </div>

          <nav className={styles.nav}>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "painel" ? styles.activeNavItem : ""}`}
              onClick={() => setActiveTab("painel")}
              title="Painel"
            >
              <LayoutDashboard size={22} />
              {!isSidebarCollapsed && <span>Painel</span>}
            </Link>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "novo" ? styles.activeNavItem : ""}`}
              onClick={() => setActiveTab("novo")}
              title="Novo Caso"
            >
              <PlusCircle size={22} />
              {!isSidebarCollapsed && <span>Novo Caso</span>}
            </Link>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "notificacoes" ? styles.activeNavItem : ""}`}
              onClick={openNotificationsTab}
              title="Notificações"
            >
              <Bell size={22} />
              {!isSidebarCollapsed && <span>Notificações</span>}
            </Link>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "perfil" ? styles.activeNavItem : ""}`}
              onClick={() => setActiveTab("perfil")}
              title="Meu Perfil"
            >
              <User size={22} />
              {!isSidebarCollapsed && <span>Meu Perfil</span>}
            </Link>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "meus-casos" ? styles.activeNavItem : ""}`}
              onClick={() => setActiveTab("meus-casos")}
              title="Meus Casos"
            >
              <FileText size={22} />
              {!isSidebarCollapsed && <span>Meus Casos</span>}
            </Link>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "conversas" ? styles.activeNavItem : ""}`}
              onClick={() => setActiveTab("conversas")}
              title="Minhas Conversas"
            >
              <MessageSquare size={22} />
              {!isSidebarCollapsed && <span>Minhas Conversas</span>}
            </Link>
            <Link
              href="#"
              className={`${styles.navItem} ${activeTab === "links-uteis" ? styles.activeNavItem : ""}`}
              onClick={() => setActiveTab("links-uteis")}
              title="Links Úteis"
            >
              <Globe size={22} />
              {!isSidebarCollapsed && <span>Links Úteis</span>}
            </Link>
            <button
              className={`${styles.navItem} ${styles.logoutBtn}`}
              title="Sair"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
            >
              <LogOut size={22} />
              {!isSidebarCollapsed && <span>Sair</span>}
            </button>
          </nav>
        </aside>
      )}

      {/* MAIN */}
      <main className={styles.mainContent}>
        {isMobile ? (
          <header className={styles.mobileTopHeader}>
            <Link href="#" className={styles.mobileLogo} onClick={() => setActiveTab("painel")}>
              <Scale size={20} className={styles.mobileLogoIcon} />
              <span className={styles.mobileLogoText}>SocialJurídico</span>
            </Link>
            <button
              className={styles.mobileNotifBtn}
              onClick={openNotificationsTab}
              aria-label="Notificações"
            >
              <Bell size={22} color="var(--color-gold)" />
              {notificacoes.filter((n) => !n.lida).length > 0 && (
                <span className={styles.mobileNotifBadge}></span>
              )}
            </button>
          </header>
        ) : (
          <header className={styles.topHeader}>
            <div className={styles.headerInfo}>
              <h1>
                {activeTab === "painel"
                  ? "Painel"
                  : activeTab === "novo"
                    ? "Novo Caso"
                    : activeTab === "notificacoes"
                      ? "Notificações"
                      : activeTab === "meus-casos"
                        ? "Meus Casos"
                        : activeTab === "links-uteis"
                          ? "Links Úteis"
                          : activeTab === "conversas"
                            ? "Minhas Conversas"
                            : "Meu Perfil"}
              </h1>
              <p>Bem-vindo, {userName}</p>
            </div>
            <div className={styles.userProfile}>
              <div className={styles.avatarCircle}>
                {userName.substring(0, 2).toUpperCase()}
              </div>
            </div>
</header>
        )}

        <section className={styles.pageBody}>
          {showOnboardingModal && (
            <ClientTutorial
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onComplete={() => setShowOnboardingModal(false)}
            />
          )}
          {activeTab === "painel" && (
            isMobile ? (
              <div className={styles.mobilePainelContainer}>
                {/* 1. Saudação e Banner de Advogados Online */}
                <div className={styles.mobileGreetingSection}>
                  <h2>Olá, {profileData?.name || userName}.</h2>
                  <p>Aqui está o resumo atualizado das suas demandas legais.</p>
                  
                  <div className={styles.mobileOnlineBar} style={{ background: "rgba(212, 175, 55, 0.08)", border: "1px solid rgba(212, 175, 55, 0.2)", color: "var(--color-gold)" }}>
                    <span className={styles.onlineDot} style={{ background: "var(--color-gold)", boxShadow: "0 0 8px var(--color-gold)" }}></span>
                    <span>{advogados.length} Advogados Cadastrados</span>
                  </div>
                </div>

                {/* 2. Iniciar Novo Caso Card */}
                <div
                  className={styles.mobileMicCard}
                  onClick={() => setActiveTab("novo")}
                  style={{
                    background: "rgba(18, 21, 28, 0.6)",
                    border: "1px solid var(--color-gold)",
                    borderRadius: "20px",
                    padding: "24px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div className={styles.mobileMicIconCircle} style={{ background: "var(--color-gold)", boxShadow: "0 0 15px rgba(212, 175, 55, 0.4)" }}>
                    <Mic size={24} color="#000" />
                  </div>
                  <h3 style={{ color: "var(--color-gold)", margin: "12px 0 6px 0", fontSize: "1.15rem", fontWeight: "800" }}>Iniciar Novo Caso</h3>
                  <p style={{ color: "var(--color-silver)", margin: 0, fontSize: "0.82rem", fontWeight: "500" }}>Toque para relatar seu problema por voz (IA)</p>
                </div>

                {/* 3. Status do Caso Ativo Card */}
                {casos.length > 0 ? (() => {
                  const activeCase = casos[0];
                  const hasLawyer = !!activeCase.advogado_id;
                  return (
                    <div className={styles.mobileStatusCard} onClick={() => handleOpenEditModal(activeCase)}>
                      <div className={styles.mobileCardHeader}>
                        <h4>STATUS DO CASO ATIVO</h4>
                        <span className={styles.mobileActiveStatusBadge}>{activeCase.status}</span>
                      </div>
                      
                      <h3 className={styles.mobileCaseTitle}>{activeCase.titulo}</h3>
                      <p className={styles.mobileCaseNum}>Nº {activeCase.id.substring(0, 8).toUpperCase()}</p>
                      
                      <div className={styles.mobileCaseMetaGrid}>
                        <div className={styles.mobileCaseMetaItem}>
                          <span>Anexos:</span>
                          <strong>{activeCase.anexos?.length || 0}/5 arquivos</strong>
                        </div>
                        <div className={styles.mobileCaseMetaItem}>
                          <span>Uso:</span>
                          <strong>{((activeCase.anexos?.length || 0) * 1.4).toFixed(1)}MB / 10MB limite</strong>
                        </div>
                      </div>

                      {/* Progress Line */}
                      <div className={styles.mobileProgressLineWrapper}>
                        <div className={styles.mobileProgressPoints}>
                          <div className={`${styles.mobileProgressPoint} ${styles.progressActive}`}>
                            <div className={styles.progressPointDot}></div>
                            <span>Publicado</span>
                          </div>
                          <div className={`${styles.mobileProgressPoint} ${activeCase.status !== "ABERTO" || hasLawyer ? styles.progressActive : ""}`}>
                            <div className={styles.progressPointDot}></div>
                            <span>Em Análise</span>
                          </div>
                          <div className={`${styles.mobileProgressPoint} ${hasLawyer ? styles.progressActive : ""}`}>
                            <div className={styles.progressPointDot}></div>
                            <span>Conectado</span>
                          </div>
                        </div>
                      </div>

                      <p className={styles.mobileCaseNextStep}>
                        Próximo passo: <strong>{hasLawyer ? "Audiência de Conciliação agendada para 15/11." : "Aguardando manifestação de advogados interessados."}</strong>
                      </p>
                    </div>
                  );
                })() : (
                  <div className={styles.mobileStatusCard} onClick={() => setActiveTab("novo")}>
                    <div className={styles.mobileCardHeader}>
                      <h4>STATUS DO CASO ATIVO</h4>
                    </div>
                    <p className={styles.mobileNoCaseText}>Você não possui casos ativos no momento. Clique para criar um novo caso.</p>
                  </div>
                )}



                {/* 5. Contato com Advogado Card */}
                {casos.length > 0 && casos[0].advogado_id ? (() => {
                  const activeCase = casos[0];
                  const linkedLawyer = advogados.find(a => a.id === activeCase.advogado_id);
                  if (linkedLawyer) {
                    return (
                      <div className={styles.mobileContactLawyerCard}>
                        <div className={styles.mobileCardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={16} color="var(--color-gold)" />
                            <h4 style={{ margin: 0 }}>CONTATO COM ADVOGADO</h4>
                          </div>
                        </div>
                        <div className={styles.mobileLawyerRow}>
                          {linkedLawyer.avatar ? (
                            <img src={linkedLawyer.avatar} alt={linkedLawyer.name} className={styles.mobileLawyerAvatar} />
                          ) : (
                            <div className={styles.mobileLawyerAvatarPlaceholder}>
                              {linkedLawyer.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className={styles.mobileLawyerInfo}>
                            <strong>
                              {linkedLawyer.name}
                              <span className={linkedLawyer.is_premium ? styles.mobileBadgePro : styles.mobileBadgeBasic}>
                                {linkedLawyer.is_premium ? "PRO" : "Básico"}
                              </span>
                            </strong>
                          </div>
                        </div>
                        <p className={styles.mobileLawyerMsg}>"Aguardando o envio dos documentos..."</p>
                        {linkedLawyer.is_premium ? (
                          <button className={styles.mobileChatBtn} onClick={() => window.location.href = `/chat/${activeCase.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            Conversar com Advogado
                          </button>
                        ) : (
                          <button className={styles.mobileChatBtnDisabled} disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Lock size={14} /> Responder (Exclusivo PRO)
                          </button>
                        )}
                      </div>
                    );
                  }
                  return null;
                })() : (
                  <div className={styles.mobileContactLawyerCard}>
                    <div className={styles.mobileCardHeader}>
                      <h4>CONTATO COM ADVOGADO</h4>
                    </div>
                    <p className={styles.mobileNoLawyerText}>Seu caso foi enviado e está sob análise de especialistas. Logo um advogado entrará em contato.</p>
                  </div>
                )}

                {/* 6. Auditoria e Compliance Card */}
                <div className={styles.mobileComplianceCard}>
                  <div className={styles.mobileCardHeader}>
                    <h4>⚖️ AUDITORIA E COMPLIANCE</h4>
                  </div>
                  
                  <div className={styles.mobileComplianceList}>
                    <a href="https://confirmadv.oab.org.br/" target="_blank" rel="noopener noreferrer" className={styles.mobileComplianceItem}>
                      <div className={styles.mobileComplianceIcon}>
                        <ShieldCheck size={20} color="var(--color-gold)" />
                      </div>
                      <div className={styles.mobileComplianceText}>
                        <strong>OAB ConfirmaAdv</strong>
                        <span>Validar registro profissional</span>
                      </div>
                    </a>
                    <a href="https://www.cnj.jus.br/" target="_blank" rel="noopener noreferrer" className={styles.mobileComplianceItem}>
                      <div className={styles.mobileComplianceIcon}>
                        <Scale size={20} color="var(--color-gold)" />
                      </div>
                      <div className={styles.mobileComplianceText}>
                        <strong>CNJ / TST</strong>
                        <span>Consulta processual pública</span>
                      </div>
                    </a>
                    <a href="https://cav.receita.fazenda.gov.br/" target="_blank" rel="noopener noreferrer" className={styles.mobileComplianceItem}>
                      <div className={styles.mobileComplianceIcon}>
                        <Building size={20} color="var(--color-gold)" />
                      </div>
                      <div className={styles.mobileComplianceText}>
                        <strong>e-CAC</strong>
                        <span>Regularidade fiscal</span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* 7. Marketplace / Advogados Disponíveis */}
                <div className={styles.mobileMarketplaceSection}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Advogados Disponíveis</h2>
                  </div>

                  <div className={styles.lawyerSearchWrap}>
                    <Search size={16} className={styles.lawyerSearchIcon} />
                    <input
                      type="text"
                      className={styles.lawyerSearchInput}
                      placeholder="Buscar advogado por nome ou OAB..."
                      value={lawyerSearch}
                      onChange={(e) => setLawyerSearch(e.target.value)}
                    />
                  </div>

                  {/* Escritórios Parceiros (Mobile) */}
                  {uniqueOffices.length > 0 && !lawyerSearch && (
                    <div className={styles.mobileOfficesSection}>
                      <h3 className={styles.officesTitle}>
                        <Scale size={16} color="var(--color-gold)" />
                        Escritórios Disponíveis
                      </h3>
                      <div className={styles.mobileOfficesScroll} style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '12px', width: '100%', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
                        {uniqueOffices.map((office) => (
                          <div
                            key={office.id}
                            className={styles.mobileOfficeCard}
                            onClick={() => {
                              setSelectedOffice(office);
                              setIsOfficeModalOpen(true);
                            }}
                          >
                            <div className={styles.officeLogoWrapper}>
                              {office.logo_url ? (
                                <img
                                  src={office.logo_url}
                                  alt={office.nome}
                                  className={styles.officeLogo}
                                />
                              ) : (
                                <div className={styles.officeLogoFallback}>
                                  {office.nome.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <h4 className={styles.officeName}>{office.nome}</h4>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interesses Pendentes (Mobile) */}
                  {interesses.length > 0 && (
                    <div className={styles.mobileInteressesSection}>
                      <h3 className={styles.interessesTitle}>
                        <Bell size={16} color="var(--color-gold)" />
                        Interesses nos seus casos ({interesses.length})
                      </h3>
                      <div className={styles.mobileInteressesList}>
                        {interesses.map((interesse) => {
                          const isNegotiating = interesse.status === "NEGOTIATING";
                          return (
                            <div
                              key={interesse.id}
                              className={styles.mobileInteresseCard}
                              style={isNegotiating ? { borderLeft: "3px solid #f59e0b" } : {}}
                            >
                              <div className={styles.interesseInfo}>
                                <div className={styles.interesseAvatar}>
                                  {(interesse.lawyer_name || "A").substring(0, 2).toUpperCase()}
                                </div>
                                <div className={styles.interesseTextWrapper}>
                                  <p className={styles.interesseAdvName}>
                                    {interesse.lawyer_name || "Advogado"}
                                  </p>
                                  <p className={styles.interesseCasoName}>
                                    Caso: {interesse.caso_titulo}
                                  </p>
                                </div>
                              </div>
                              <div className={styles.interesseActions}>
                                {isNegotiating ? (
                                  <>
                                    <button
                                      className={styles.mobileInteresseActionBtn}
                                      style={{ background: "#4f46e5", color: "#fff", border: "none" }}
                                      onClick={() => window.location.href = `/chat/${interesse.case_id}?interest=${interesse.id}`}
                                    >
                                      Chat
                                    </button>
                                    <button
                                      className={styles.mobileInteresseActionBtn}
                                      style={{ background: "var(--color-gold)", color: "#000", border: "none" }}
                                      onClick={() => handleResponderInteresse(interesse.id, "HIRE")}
                                      disabled={processandoInteresse === interesse.id}
                                    >
                                      Contratar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className={styles.mobileInteresseActionBtn}
                                    style={{ background: "var(--color-gold)", color: "#000", border: "none" }}
                                    onClick={() => handleResponderInteresse(interesse.id, "ACCEPT")}
                                    disabled={processandoInteresse === interesse.id}
                                  >
                                    Negociar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Specialty sections (Mobile grid/scroll) */}
                  {loadingAdvogados ? (
                    <p>Carregando advogados...</p>
                  ) : Object.keys(groupedAdvogadosBySpecialty).length > 0 ? (
                    Object.keys(groupedAdvogadosBySpecialty).map((specialty) => {
                      const advsInSpecialty = groupedAdvogadosBySpecialty[specialty];
                      return (
                        <div key={specialty} className={styles.mobileSpecialtySection}>
                          <h3 className={styles.specialtyTitle}>
                            {specialty} <span className={styles.specialtyCount}>({advsInSpecialty.length})</span>
                          </h3>
                          <div className={styles.mobileLawyersScroll} style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '12px', width: '100%', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
                            {advsInSpecialty.map((adv) => renderMobileLawyerCard(adv))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>Nenhum advogado com especialidade preenchida encontrado.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.contentGrid}>
                <div className={styles.listSection}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Meus Casos</h2>
                    <button
                      onClick={() => setActiveTab("novo")}
                      className={styles.addNewBtn}
                    >
                      + Novo
                    </button>
                  </div>

                  {loadingCasos ? (
                    <p style={{ padding: "20px" }}>Carregando seus casos...</p>
                  ) : casos.length > 0 ? (
                    casos.map((caso) => (
                      <div
                        key={caso.id}
                        className={styles.caseCard}
                        onClick={() => handleOpenEditModal(caso)}
                      >
                        <div className={styles.cardTop}>
                          <span className={styles.badge}>{caso.status}</span>
                          <span className={styles.date}>
                            {new Date(caso.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3
                          className={styles.caseTitleCard}
                          style={{
                            color: "var(--color-gold)",
                            margin: "8px 0",
                            fontSize: "1rem",
                          }}
                        >
                          {caso.titulo}
                        </h3>
                        <p className={styles.caseDesc}>
                          {caso.descricao?.substring(0, 100) || ""}...
                        </p>
                        <button
                          className={styles.caseShareCardBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            shareCaseToFacebookGroup(caso);
                          }}
                          title="Compartilhar no Facebook"
                        >
                          <Globe size={14} /> Compartilhar no Facebook
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      className={styles.emptyStateMinimal}
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        opacity: 0.7,
                      }}
                    >
                      <FileText
                        size={48}
                        style={{
                          marginBottom: "12px",
                          color: "var(--color-gold)",
                        }}
                      />
                      <p>Você ainda não tem casos registrados.</p>
                    </div>
                  )}
                </div>

                <div className={styles.lawyersSection}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Advogados Disponíveis</h2>
                  </div>

                  <div className={styles.lawyerSearchWrap}>
                    <Search size={16} className={styles.lawyerSearchIcon} />
                    <input
                      type="text"
                      className={styles.lawyerSearchInput}
                      placeholder="Buscar advogado por nome ou OAB..."
                      value={lawyerSearch}
                      onChange={(e) => setLawyerSearch(e.target.value)}
                    />
                  </div>

                  {/* Escritórios Parceiros */}
                  {uniqueOffices.length > 0 && !lawyerSearch && (
                    <div className={styles.officesSection}>
                      <h3 className={styles.officesTitle}>
                        <Scale size={18} color="var(--color-gold)" />
                        Escritórios Disponíveis
                      </h3>
                      <div className={styles.officesGrid}>
                        {uniqueOffices.map((office) => (
                          <div
                            key={office.id}
                            className={styles.officeCard}
                            onClick={() => {
                              setSelectedOffice(office);
                              setIsOfficeModalOpen(true);
                            }}
                          >
                            <div className={styles.officeLogoWrapper}>
                              {office.logo_url ? (
                                <img
                                  src={office.logo_url}
                                  alt={office.nome}
                                  className={styles.officeLogo}
                                />
                              ) : (
                                <div className={styles.officeLogoFallback}>
                                  {office.nome.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <h4 className={styles.officeName}>{office.nome}</h4>
                            <span className={styles.officeBadge}>Escritório</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* INTERESSES PENDENTES E EM NEGOCIAÇÃO */}
                  {interesses.length > 0 && (
                    <div className={styles.interessesSection}>
                      <div className={styles.interessesHeader}>
                        <Bell size={18} color="var(--color-gold)" />
                        <h3 className={styles.interessesTitle}>
                          Advogados interessados nos seus casos (
                          {interesses.length})
                        </h3>
                      </div>
                      {interesses.map((interesse) => {
                        const isNegotiating = interesse.status === "NEGOTIATING";
                        return (
                          <div
                            key={interesse.id}
                            className={styles.interesseCard}
                            style={
                              isNegotiating
                                ? { borderLeft: "3px solid #f59e0b" }
                                : {}
                            }
                          >
                            <div className={styles.interesseInfo}>
                              <div
                                className={styles.interesseAvatar}
                                style={
                                  isNegotiating
                                    ? {
                                        background:
                                          "linear-gradient(135deg, #f59e0b, #d97706)",
                                        color: "#000",
                                      }
                                    : {}
                                }
                              >
                                {(interesse.lawyer_name || "A")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className={styles.interesseAdvName}>
                                  <Sparkles
                                    size={12}
                                    className={styles.proIconSmall}
                                  />
                                  {interesse.lawyer_name || "Advogado"}
                                  {isNegotiating && (
                                    <span
                                      style={{
                                        marginLeft: "8px",
                                        background:
                                          "linear-gradient(135deg, #f59e0b, #d97706)",
                                        color: "#000",
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                      }}
                                    >
                                      EM NEGOCIAÇÃO
                                    </span>
                                  )}
                                </p>
                                <p className={styles.interesseCasoName}>
                                  Caso: {interesse.caso_titulo}
                                </p>
                                <p className={styles.interesseCasoArea}>
                                  {interesse.caso_area}
                                </p>
                              </div>
                            </div>
                            <div className={styles.interesseActions}>
                              {isNegotiating ? (
                                <>
                                  <button
                                    style={{
                                      background: "rgba(99,102,241,0.9)",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "10px",
                                      padding: "8px 14px",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      fontSize: "0.8rem",
                                    }}
                                    onClick={() => {
                                      window.location.href = `/chat/${interesse.case_id}?interest=${interesse.id}`;
                                    }}
                                  >
                                    <MessageSquare size={14} /> Conversar
                                  </button>
                                  <button
                                    className={styles.acceptBtn}
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #d4af37, #b8860b)",
                                      color: "#000",
                                      fontWeight: 700,
                                      border: "none",
                                    }}
                                    onClick={() =>
                                      handleResponderInteresse(
                                        interesse.id,
                                        "HIRE",
                                      )
                                    }
                                    disabled={
                                      processandoInteresse === interesse.id
                                    }
                                  >
                                    <Check size={14} />
                                    {processandoInteresse === interesse.id
                                      ? "Processando..."
                                      : "✨ Contratar"}
                                  </button>
                                  <button
                                    className={styles.declineBtn}
                                    onClick={() =>
                                      handleResponderInteresse(
                                        interesse.id,
                                        "DECLINE",
                                      )
                                    }
                                    disabled={
                                      processandoInteresse === interesse.id
                                    }
                                  >
                                    <UserX size={14} /> Recusar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={styles.acceptBtn}
                                    onClick={() =>
                                      handleResponderInteresse(
                                        interesse.id,
                                        "ACCEPT",
                                      )
                                    }
                                    disabled={
                                      processandoInteresse === interesse.id
                                    }
                                  >
                                    <Check size={14} />
                                    {processandoInteresse === interesse.id
                                      ? "Processando..."
                                      : "Negociar"}
                                  </button>
                                  <button
                                    className={styles.declineBtn}
                                    onClick={() =>
                                      handleResponderInteresse(
                                        interesse.id,
                                        "DECLINE",
                                      )
                                    }
                                    disabled={
                                      processandoInteresse === interesse.id
                                    }
                                  >
                                    <UserX size={14} /> Recusar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Seções de Especialidades */}
                  {loadingAdvogados ? (
                    <p>Carregando advogados...</p>
                  ) : Object.keys(groupedAdvogadosBySpecialty).length > 0 ? (
                    Object.keys(groupedAdvogadosBySpecialty).map((specialty) => {
                      const advsInSpecialty =
                        groupedAdvogadosBySpecialty[specialty];
                      const isExpanded = expandedSpecialties[specialty] || false;
                      const displayedAdvs = isExpanded
                        ? advsInSpecialty
                        : advsInSpecialty.slice(0, 5);
                      const hasMoreAdvs = advsInSpecialty.length > 5;

                      return (
                        <div key={specialty} className={styles.specialtySection}>
                          <div className={styles.specialtyHeader}>
                            <h3 className={styles.specialtyTitle}>
                              {specialty}
                              <span className={styles.specialtyCount}>
                                ({advsInSpecialty.length})
                              </span>
                            </h3>
                          </div>

                          <div className={styles.lawyersGrid}>
                            {displayedAdvs.map((adv) => renderLawyerCard(adv))}
                          </div>

                          {hasMoreAdvs && (
                            <div className={styles.viewMoreContainer}>
                              <button
                                className={styles.viewMoreBtn}
                                onClick={() =>
                                  setExpandedSpecialties((prev) => ({
                                    ...prev,
                                    [specialty]: !isExpanded,
                                  }))
                                }
                              >
                                {isExpanded
                                  ? "Ver menos"
                                  : `Ver mais (${advsInSpecialty.length - 5})`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p>
                      Nenhum advogado com especialidade preenchida encontrado.
                    </p>
                  )}
                </div>
              </div>
            )
          )}


          {activeTab === "novo" && (
            modoCriacao === "voz" && isMobile ? (
              <div className={styles.voiceRecordingContainer}>
                {/* Cabeçalho superior com botão de fechar X à esquerda e SocialJurídico ao centro */}
                <div className={styles.voiceRecordingHeader}>
                  <button
                    type="button"
                    onClick={() => {
                      clearAudio();
                      setModoCriacao("formulario");
                    }}
                    className={styles.voiceRecordingClose}
                    aria-label="Voltar"
                  >
                    <X size={24} />
                  </button>
                  <span className={styles.voiceRecordingLogo}>SocialJurídico</span>
                  <div style={{ width: '24px' }}></div> {/* Spacer */}
                </div>
 
                <div className={styles.voiceRecordingTitleBox}>
                  <h2 className={styles.voiceRecordingTitle}>
                    Conte os fatos do seu caso agora.
                  </h2>
                  <p className={styles.voiceRecordingSubtitle}>
                    
                  </p>
                </div>
 
                {/* Grande Círculo do Microfone */}
                <div className={styles.micCircleWrapper}>
                  {/* Anel de Onda Externo Fino */}
                  <div className={`${styles.micOuterRing} ${isRecording ? styles.micOuterRingActive : ""}`}></div>
                  
                  {/* Círculo do Microfone Central Dourado */}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={styles.micCenterButton}
                  >
                    <Mic size={40} color="#000" />
                  </button>
                </div>
 
                {/* Caixa OUVINDO e Transcrição */}
                {isRecording && (
                  <div className={styles.transcriptBox}>
                    <div className={styles.transcriptHeader}>
                      <span className={styles.transcriptDot}></span>
                      OUVINDO... ({recordingTime}s)
                    </div>
                    <p className={styles.transcriptText}>
                      O cliente relata que o acidente ocorreu na rodovia principal por volta das 20h, quando um caminhão cruzou a pista sem sinalização prévia...
                    </p>
                  </div>
                )}
 
                {/* Badge Seguro */}
                <div className={styles.securityBadge}>
                  <Lock size={12} color="var(--color-gold)" />
                  Gravação segura e resiliente a interrupções
                </div>
 
                {/* Footer fixo com botões de Cancelar e Concluir */}
                <div className={styles.voiceFooterActions}>
                  <button
                    type="button"
                    onClick={() => {
                      clearAudio();
                      setModoCriacao("formulario");
                    }}
                    className={styles.btnCancelVoice}
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) stopRecording();
                      toast.success("Áudio gravado com sucesso! Complete os dados do caso.");
                      setFormData(prev => ({
                        ...prev,
                        descricao: "Relato gravado por voz anexado."
                      }));
                      setModoCriacao("formulario");
                    }}
                    className={styles.btnConfirmVoice}
                  >
                    CONCLUIR ✓
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                {isMobile && (
                  <div className={styles.mobileFormHeader}>
                    <h2>Novo Caso</h2>
                    <p>Bem-vindo, {userName}</p>
                  </div>
                )}
                <div className={styles.formContainer}>
                  {formSuccess ? (
                    <div className={styles.emptyState}>
                      <CheckCircle2
                        size={64}
                        color="var(--color-gold)"
                        className={styles.emptyIcon}
                      />
                      <h3 className={styles.sectionTitle}>
                        Caso Criado com Sucesso!
                      </h3>
                      <p className={styles.emptyText}>
                        Os advogados serão notificados imediatamente.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitCaso}>
                    
                    <div className={styles.formGroup}>
                      <label>Título do Caso</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Ex: Divórcio Consensual, Ação Revisional..."
                        required
                        value={formData.titulo}
                        onChange={(e) =>
                          setFormData({ ...formData, titulo: e.target.value })
                        }
                      />
                    </div>

                    <div
                      className={styles.formRow}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "20px",
                      }}
                    >
                      <div className={styles.formGroup}>
                        <label>Cidade</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="Ex: Porto Alegre"
                          required
                          value={formData.cidade}
                          onChange={(e) =>
                            setFormData({ ...formData, cidade: e.target.value })
                          }
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Estado (UF)</label>
                        <select
                          className={styles.formSelect}
                          required
                          value={formData.estado}
                          onChange={(e) =>
                            setFormData({ ...formData, estado: e.target.value })
                          }
                        >
                          <option value="">Selecione</option>
                          <option value="AC">Acre</option>
                          <option value="AL">Alagoas</option>
                          <option value="AP">Amapá</option>
                          <option value="AM">Amazonas</option>
                          <option value="BA">Bahia</option>
                          <option value="CE">Ceará</option>
                          <option value="DF">Distrito Federal</option>
                          <option value="ES">Espírito Santo</option>
                          <option value="GO">Goiás</option>
                          <option value="MA">Maranhão</option>
                          <option value="MT">Mato Grosso</option>
                          <option value="MS">Mato Grosso do Sul</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="PA">Pará</option>
                          <option value="PB">Paraíba</option>
                          <option value="PR">Paraná</option>
                          <option value="PE">Pernambuco</option>
                          <option value="PI">Piauí</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="RN">Rio Grande do Norte</option>
                          <option value="RS">Rio Grande do Sul</option>
                          <option value="RO">Rondônia</option>
                          <option value="RR">Roraima</option>
                          <option value="SC">Santa Catarina</option>
                          <option value="SP">São Paulo</option>
                          <option value="SE">Sergipe</option>
                          <option value="TO">Tocantins</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Área de Atuação</label>
                      <select
                        className={styles.formSelect}
                        required
                        value={formData.area}
                        onChange={(e) =>
                          setFormData({ ...formData, area: e.target.value })
                        }
                      >
                        <option value="">Selecione uma área</option>
                        <option value="Civil">Direito Civil</option>
                        <option value="Trabalhista">Direito Trabalhista</option>
                        <option value="Penal">Direito Penal</option>
                        <option value="Familia">Direito de Família</option>
                        <option value="Consumidor">Direito do Consumidor</option>
                        <option value="Nao sei">Não sei a área</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Descrição Detalhada</label>
                      <textarea
                        className={styles.formTextarea}
                        placeholder="Explique o que aconteceu da forma mais detalhada possível..."
                        required
                        value={formData.descricao}
                        onChange={(e) =>
                          setFormData({ ...formData, descricao: e.target.value })
                        }
                      ></textarea>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Anexos (Opcional - Máx 5)</label>
                      <div
                        className={styles.uploadArea}
                        onClick={() => fileInputRef.current.click()}
                      >
                        <PlusCircle size={28} className={styles.uploadIcon} />
                        <p className={styles.uploadText} style={{ margin: '8px 0 0 0' }}>
                          Clique para selecionar Imagens ou PDFs
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        hidden
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                      />

                      {selectedFiles.length > 0 && (
                        <div className={styles.fileList}>
                          {selectedFiles.map((file, index) => (
                            <div key={index} className={styles.fileItem}>
                              <button
                                type="button"
                                className={styles.removeFile}
                                onClick={() => removeFile(index)}
                              >
                                <X size={12} />
                              </button>
                              {file.type.includes("image") ? (
                                <ImageIcon size={24} color="var(--color-gold)" />
                              ) : (
                                <FileText size={24} color="#ef4444" />
                              )}
                              <span className={styles.fileName}>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Seção de Mídia e Acessibilidade (Áudio/Vídeo) */}
                    <div className={styles.accessibilitySection}>
                      <h4 className={styles.accessibilityTitle}>
                        <Sparkles size={16} /> Acessibilidade & Relato em Áudio/Vídeo
                      </h4>
                      <p className={styles.accessibilityDesc}>
                        Caso tenha dificuldade para escrever ou queira detalhar melhor, você pode gravar um áudio ou anexar um vídeo ao seu caso.
                      </p>

                      {/* 1. Gravar Áudio */}
                      <div className={styles.mediaRow}>
                        <label className={styles.mediaLabel}>
                          Gravador de Relato por Voz
                        </label>
                        <div className={styles.mediaRowControls}>
                          {!audioURL && !isRecording && (
                            <button
                              type="button"
                              onClick={isMobile ? () => setModoCriacao("voz") : startRecording}
                              className={styles.mediaButton}
                            >
                              🎤 Gravar Áudio
                            </button>
                          )}

                          {isRecording && (
                            <div className={styles.recordingStatusRow}>
                              <button
                                type="button"
                                onClick={stopRecording}
                                className={styles.mediaButtonStop}
                              >
                                🛑 Parar Gravação ({recordingTime}s)
                              </button>
                            </div>
                          )}

                          {audioURL && (
                            <div className={styles.audioPlayerWrapper}>
                              <audio src={audioURL} controls className={styles.audioPlayer} />
                              <button
                                type="button"
                                onClick={clearAudio}
                                className={styles.removeMediaBtn}
                              >
                                Remover Áudio
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Upload de Vídeo */}
                      <div className={styles.mediaRow}>
                        <label className={styles.mediaLabel}>
                          Anexar Vídeo do Celular (Máx: 180MB)
                        </label>
                        <div className={styles.videoUploadWrapper}>
                          {!videoFile ? (
                            <button
                              type="button"
                              onClick={() => videoInputRef.current.click()}
                              className={styles.mediaButton}
                            >
                              <Upload size={16} /> Selecionar Vídeo
                            </button>
                          ) : (
                            <div className={styles.videoAttachedItem}>
                              <span>🎬 {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                              <button
                                type="button"
                                onClick={removeVideoFile}
                                className={styles.removeVideoBtn}
                                aria-label="Remover vídeo"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                          <input
                            type="file"
                            hidden
                            ref={videoInputRef}
                            onChange={handleVideoChange}
                            accept="video/*"
                          />
                        </div>
                      </div>

                      {/* 3. Link de Vídeo */}
                      <div className={styles.mediaRow}>
                        <label className={styles.mediaLabel}>
                          Link de Vídeo Externo (Facebook, YouTube, Drive)
                        </label>
                        <input
                          type="url"
                          className={styles.formInput}
                          placeholder="Cole aqui o link do seu vídeo..."
                          value={videoLink}
                          onChange={(e) => setVideoLink(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={formLoading}
                    >
                      {formLoading ? "Enviando..." : "Publicar Solicitação"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        )}

          {activeTab === "notificacoes" && (
            <div className={`${styles.notificationsContainer} ${isMobile ? styles.notificationsContainerMobile : ""}`}>
              {isMobile ? (
                <div className={styles.mobileNotifHeader}>
                  <div className={styles.mobileNotifLogoWrapper}>
                    <Scale size={24} className={styles.mobileNotifLogoIcon} />
                    <span className={styles.mobileNotifLogoText}>SocialJurídico</span>
                  </div>
                  <h2 className={styles.mobileNotifTitle}>CENTRAL DE INTELIGÊNCIA</h2>
                </div>
              ) : (
                <div className={styles.notificationsHeader}>
                  <h2 className={styles.sectionTitle}>Suas Notificações</h2>
                  <span className={styles.unreadCount}>
                    {notificacoes.filter((n) => !n.lida).length} não lidas
                  </span>
                </div>
              )}

              {loadingNotificacoes ? (
                <p style={{ padding: "24px", textAlign: "center" }}>
                  Carregando notificações...
                </p>
              ) : notificacoes.length > 0 ? (
                <>
                  <div className={isMobile ? styles.mobileNotifList : ""}>
                    {notificacoes.map((notif) => (
                      <div key={notif.id} className={`${styles.notificationItem} ${isMobile ? styles.notificationItemMobile : ""}`}>
                        <div className={styles.notificationIcon}>
                          {getNotificationIcon(notif.titulo, notif.mensagem)}
                        </div>
                        <div className={styles.notificationInfo}>
                          <div className={styles.notificationTop}>
                            <span className={styles.notifTitle}>
                              {notif.titulo}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <span className={styles.notifDate}>
                                {isMobile
                                  ? formatRelativeTime(notif.created_at)
                                  : new Date(notif.created_at).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notif.id);
                                }}
                                title="Excluir notificação"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "rgba(255,255,255,0.2)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.color = "#ef4444")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.color =
                                    "rgba(255,255,255,0.2)")
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <p className={styles.notifDesc}>{notif.mensagem}</p>
                        </div>
                        {!notif.lida && <div className={styles.unreadDot}></div>}
                      </div>
                    ))}
                  </div>
                  {notificacoes.length > 0 && (
                    <div className={styles.clearNotificationsWrapper}>
                      <button
                        type="button"
                        onClick={handleClearAllNotifications}
                        className={styles.clearNotificationsBtn}
                      >
                        Limpar Notificações
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyState} style={{ border: "none" }}>
                  <Bell size={48} className={styles.emptyIcon} />
                  <p className={styles.emptyText}>
                    Você não tem notificações no momento.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "perfil" && (
            <div className={`${styles.profileContainer} ${isMobile ? styles.profileContainerMobile : ""}`}>
              {isMobile && (
                <div className={styles.mobileTabHeader}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("painel")}
                    className={styles.mobileBackBtn}
                    aria-label="Voltar para o Painel"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <h2>Meu Perfil</h2>
                </div>
              )}
              {loadingProfile ? (
                <p style={{ textAlign: "center" }}>Carregando seu perfil...</p>
              ) : profileData ? (
                <>
                  {!isMobile && (
                    <div className={styles.profileHeader}>
                      <div className={styles.profileAvatarLarge}>
                        {(profileData.name || "Cliente")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className={styles.profileHeaderText}>
                        <h2>{profileData.name}</h2>
                        <p>
                          {profileData.role === "ADMIN"
                            ? "Administrador"
                            : profileData.role === "LAWYER"
                              ? "Advogado"
                              : "Cliente"}{" "}
                          SocialJurídico
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className={isMobile ? styles.mobileProfileForm : ""}>
                    <div className={styles.profileGrid}>
                      <div
                        className={`${styles.profileField} ${styles.editable}`}
                      >
                        <label>
                          <User size={14} style={{ marginRight: 6 }} /> Nome
                          Completo
                        </label>
                        <input
                          type="text"
                          className={styles.profileInput}
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div
                        className={`${styles.profileField} ${styles.editable}`}
                      >
                        <label>
                          <Phone size={14} style={{ marginRight: 6 }} />{" "}
                          Telefone/WhatsApp
                        </label>
                        <input
                          type="tel"
                          className={styles.profileInput}
                          placeholder="(51) 99999-9999"
                          value={formatPhone(profileForm.phone)}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              phone: e.target.value.replace(/\D/g, ""),
                            })
                          }
                        />
                      </div>

                      <div className={styles.profileField}>
                        <label>
                          <Mail size={14} style={{ marginRight: 6 }} /> E-mail
                          (Inalterável)
                        </label>
                        <div className={styles.value}>{profileData.email}</div>
                      </div>

                      <div
                        className={`${styles.profileField} ${styles.editable}`}
                      >
                        <label>
                          <Lock size={14} style={{ marginRight: 6 }} /> Alterar
                          Senha
                        </label>
                        <input
                          type="password"
                          className={styles.profileInput}
                          placeholder="Deixe em branco para manter"
                          value={profileForm.password}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className={styles.profileField}>
                        <label>
                          <Calendar size={14} style={{ marginRight: 6 }} />{" "}
                          Membro desde
                        </label>
                        <div className={styles.value}>
                          {new Date(
                            profileData.created_at || Date.now(),
                          ).toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </div>

                      <div className={styles.profileField}>
                        <label>
                          <Scale size={14} style={{ marginRight: 6 }} /> Tipo de
                          Conta
                        </label>
                        <div className={styles.value}>{profileData.role}</div>
                      </div>
                    </div>

                    <div className={styles.profileActions}>
                      <button
                        type="submit"
                        className={styles.saveProfileBtn}
                        disabled={formLoading}
                      >
                        {formLoading ? "Salvando..." : "Salvar Alterações"}
                      </button>
                      <button
                        type="button"
                        className={styles.saveProfileBtn}
                        style={{
                          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                          color: "#ffffff",
                          border: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px"
                        }}
                        onClick={() => {
                          localStorage.removeItem("sj_client_tutorial_completed");
                          setShowOnboardingModal(true);
                          setActiveTab("painel");
                          toast.success("Guia didático reiniciado! Volte ao Painel para começar.");
                        }}
                      >
                        <RotateCcw size={16} /> Reiniciar Tour
                      </button>
                      <button
                        type="button"
                        className={styles.deleteAccountBtn}
                        onClick={handleDeleteAccount}
                        disabled={formLoading}
                      >
                        <Trash2 size={18} style={{ marginRight: 8 }} /> Excluir
                        Minha Conta
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <User size={48} className={styles.emptyIcon} />
                  <h3 className={styles.sectionTitle}>Perfil não encontrado</h3>
                  <p className={styles.emptyText}>
                    Não foi possível carregar os dados. Verifique sua conexão.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "meus-casos" && (
            <div className={styles.meusCasosPage}>
              <div
                className={styles.sectionHeader}
                style={{ marginBottom: "24px" }}
              >
                <h2 className={styles.sectionTitle}>Todos os Meus Casos</h2>
                <button
                  onClick={() => setActiveTab("novo")}
                  className={styles.addNewBtn}
                >
                  + Novo Caso
                </button>
              </div>
              {loadingCasos ? (
                <p style={{ padding: "20px", opacity: 0.6 }}>
                  Carregando seus casos...
                </p>
              ) : casos.length > 0 ? (
                <div className={styles.casosFullGrid}>
                  {casos.map((caso) => (
                    <div
                      key={caso.id}
                      className={styles.caseCardFull}
                      onClick={() => handleOpenEditModal(caso)}
                    >
                      <div className={styles.caseCardHeader}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.date}>
                          {new Date(caso.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      <h3 className={styles.caseTitleCard}>{caso.titulo}</h3>
                      <p className={styles.caseAreaTag}>
                        {caso.area_atuacao || "Área não definida"}
                      </p>
                      <p className={styles.caseDesc}>
                        {caso.descricao?.substring(0, 150)}...
                      </p>
                      <div className={styles.caseCardFooter}>
                        <div className={styles.caseFooterLeft}>
                          {caso.advogado_id ? (
                            <span className={styles.advTag}>
                              ✔ Advogado vinculado
                            </span>
                          ) : (
                            <span className={styles.noAdvTag}>
                              ⏳ Aguardando advogado
                            </span>
                          )}
                          <button
                            className={styles.caseShareCardBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              shareCaseToFacebookGroup(caso);
                            }}
                            title="Compartilhar no Facebook"
                          >
                            <Globe size={14} /> Compartilhar
                          </button>
                        </div>
                        <span className={styles.editHint}>
                          Clique para editar →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={styles.emptyStateMinimal}
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <FileText
                    size={56}
                    style={{ marginBottom: "16px", color: "var(--color-gold)" }}
                  />
                  <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    Nenhum caso registrado
                  </p>
                  <p style={{ marginTop: "8px", opacity: 0.6 }}>
                    Clique em &quot;Novo Caso&quot; para criar o seu primeiro
                    caso.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "conversas" && (
            <div className={styles.conversasPage}>
              <div
                className={styles.sectionHeader}
                style={{ marginBottom: "24px" }}
              >
                <h2 className={styles.sectionTitle}>Minhas Conversas</h2>
              </div>
              {loadingCasos ? (
                <p style={{ padding: "20px", opacity: 0.6 }}>Carregando...</p>
              ) : casos.filter((c) => c.advogado_id).length > 0 ? (
                <div className={styles.conversasList}>
                  {casos
                    .filter((caso) => caso.advogado_id)
                    .map((caso) => (
                      <div
                        key={caso.id}
                        className={styles.conversaItem}
                        onClick={() =>
                          (window.location.href = `/chat/${caso.id}`)
                        }
                      >
                        <div className={styles.conversaAvatar}>
                          <Scale size={20} />
                        </div>
                        <div className={styles.conversaInfo}>
                          <h3 className={styles.conversaTitulo}>
                            {caso.titulo}
                          </h3>
                          <p className={styles.conversaArea}>
                            {caso.area_atuacao || "Área não definida"}
                          </p>
                        </div>
                        <div className={styles.conversaStatus}>
                          <span className={styles.badge}>{caso.status}</span>
                          <span className={styles.conversaArrow}>→</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div
                  className={styles.emptyStateMinimal}
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <MessageSquare
                    size={56}
                    style={{ marginBottom: "16px", color: "var(--color-gold)" }}
                  />
                  <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    Nenhuma conversa iniciada
                  </p>
                  <p style={{ marginTop: "8px", opacity: 0.6 }}>
                    Conversas aparecem quando um advogado é vinculado ao seu
                    caso.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "links-uteis" && (
            <div className={styles.linksPage}>
              <div
                className={styles.sectionHeader}
                style={{ marginBottom: "24px" }}
              >
                <h2 className={styles.sectionTitle}>Links Úteis</h2>
              </div>

              <div className={styles.usefulLinksGrid}>
                {USEFUL_LINKS.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.usefulLinkCard}
                  >
                    <div className={styles.usefulLinkHeader}>
                      <Globe size={18} />
                      <strong>{item.title}</strong>
                    </div>
                    <p>{item.description}</p>
                    <span>Abrir link</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* MODAL DE EDIÇÃO DE CASO */}
      {isEditModalOpen && selectedCaso && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className={styles.editModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Editar Caso</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateCaso} className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Título do Caso</label>
                <input
                  type="text"
                  value={editFormData.titulo}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, titulo: e.target.value })
                  }
                  className={styles.modalInput}
                  required
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                  marginBottom: "15px",
                }}
              >
                <div className={styles.formGroup}>
                  <label>Cidade</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    value={editFormData.cidade}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        cidade: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Estado</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    value={editFormData.estado}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        estado: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Área de Atuação</label>
                <select
                  value={editFormData.area}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, area: e.target.value })
                  }
                  className={styles.modalSelect}
                  required
                >
                  <option value="">Selecione a área</option>
                  <option value="CIVIL">Direito Civil</option>
                  <option value="TRABALHISTA">Direito Trabalhista</option>
                  <option value="PENAL">Direito Penal</option>
                  <option value="FAMILIA">Direito de Família</option>
                  <option value="CONSUMIDOR">Direito do Consumidor</option>
                  <option value="NAO_SEI">Não sei a área</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Descrição Detalhada</label>
                <textarea
                  value={editFormData.descricao}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      descricao: e.target.value,
                    })
                  }
                  className={styles.modalTextarea}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="submit"
                  className={styles.saveChangesBtn}
                  disabled={formLoading}
                >
                  {formLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
                {selectedCaso.advogado_id ? (
                  <Link
                    href={`/chat/${selectedCaso.id}`}
                    className={styles.chatBtn}
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageSquare size={18} style={{ marginRight: 8 }} />
                    Iniciar Chat com Advogado
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.chatBtn}
                    disabled
                    title="Aguardando um advogado ser vinculado ao caso"
                  >
                    <MessageSquare size={18} style={{ marginRight: 8 }} />
                    Aguardando advogado...
                  </button>
                )}
              </div>

              <div className={styles.modalSecondaryActions}>
                {selectedCaso.status !== "FECHADO" && (
                  <button
                    type="button"
                    className={styles.finalizeBtn}
                    onClick={handleFinalizeCaso}
                    disabled={caseActionLoadingId === selectedCaso.id}
                  >
                    <CheckCircle2 size={18} style={{ marginRight: 8 }} />
                    {caseActionLoadingId === selectedCaso.id
                      ? "Processando..."
                      : "Finalizar caso"}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteCaseBtn}
                  onClick={handleDeleteCaso}
                  disabled={caseActionLoadingId === selectedCaso.id}
                >
                  <Trash2 size={18} style={{ marginRight: 8 }} />
                  {caseActionLoadingId === selectedCaso.id
                    ? "Processando..."
                    : "Apagar caso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DO ESCRITÓRIO E SEUS ADVOGADOS */}
      {isOfficeModalOpen && selectedOffice && (
        <div
          className={styles.modalOverlay}
          style={{ zIndex: 999 }}
          onClick={() => setIsOfficeModalOpen(false)}
        >
          <div
            className={styles.officeModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeModalBtn}
              onClick={() => setIsOfficeModalOpen(false)}
            >
              <X size={24} />
            </button>
            <div className={styles.officeModalHeader}>
              <div className={styles.officeModalLogo}>
                {selectedOffice.logo_url ? (
                  <img
                    src={selectedOffice.logo_url}
                    alt={selectedOffice.nome}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className={styles.officeModalLogoFallback}>
                    {selectedOffice.nome.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.officeModalTitleArea}>
                <h2>{selectedOffice.nome}</h2>
                <p>
                  Conheça os advogados e especialistas que fazem parte de nossa
                  equipe
                </p>
              </div>
            </div>

            <div
              className={styles.lpModalBody}
              style={{ maxHeight: "55vh", overflowY: "auto", padding: "10px" }}
            >
              <div
                className={styles.lawyersGrid}
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "20px",
                }}
              >
                {selectedOffice.advogados.map((adv) => renderLawyerCard(adv))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERFIL DO ADVOGADO */}
      {isLawyerModalOpen && selectedLawyer && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsLawyerModalOpen(false)}
        >
          <div
            className={styles.lawyerProfileModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeModalBtn}
              onClick={() => setIsLawyerModalOpen(false)}
            >
              <X size={24} />
            </button>
            <div className={styles.lpModalHeader}>
              {selectedLawyer.avatar ? (
                <div className={styles.lpModalAvatarWrapper}>
                  <Image
                    src={selectedLawyer.avatar}
                    alt={selectedLawyer.name}
                    width={100}
                    height={100}
                    className={styles.lpModalAvatar}
                    unoptimized
                  />
                </div>
              ) : (
                <div className={styles.lpModalAvatarPlaceholder}>
                  {selectedLawyer.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className={styles.lpModalMainInfo}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <h2 style={{ margin: 0 }}>{selectedLawyer.name}</h2>
                  {selectedLawyer.oab_verification_status === "VERIFIED" && (
                    <VerifiedBadge size={50} />
                  )}
                </div>
                {selectedLawyer.nome_escritorio && (
                  <div
                    className={styles.officeTagModal}
                    title={`Membro de ${selectedLawyer.nome_escritorio}`}
                  >
                    <Briefcase size={12} style={{ marginRight: "4px" }} />{" "}
                    {selectedLawyer.nome_escritorio}
                  </div>
                )}
                <p className={styles.lpModalOab}>
                  OAB: {selectedLawyer.oab || "Não informada"}
                </p>
                {selectedLawyer.is_premium && (
                  <span className={styles.proTagModal}>
                    <Sparkles size={12} /> Advogado PRO
                  </span>
                )}
              </div>
            </div>

            <div className={styles.lpModalBody}>
              <div className={styles.lpModalSection}>
                <h3>
                  <User size={18} /> Apresentação
                </h3>
                <p className={styles.lpBioText}>
                  {selectedLawyer.bio ||
                    "Este advogado ainda não preencheu sua apresentação pessoal."}
                </p>
              </div>

              {selectedLawyer.specialties && (
                <div className={styles.lpModalSection}>
                  <h3>
                    <Scale size={18} /> Especialidades
                  </h3>
                  <div className={styles.lpModalSpecs}>
                    {selectedLawyer.specialties.split(",").map((spec, i) => (
                      <span key={i} className={styles.lpSpecTag}>
                        {spec.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.lpModalStatsGrid}>
                <div className={styles.lpStatItem}>
                  <Star
                    size={20}
                    fill="var(--color-gold)"
                    color="var(--color-gold)"
                  />
                  <strong>{(selectedLawyer.avg_rating || 0).toFixed(1)}</strong>
                  <span>({selectedLawyer.total_ratings || 0} avaliações)</span>
                </div>
                <div className={styles.lpStatItem}>
                  <CheckCircle2 size={20} color="#10b981" />
                  <strong>100%</strong>
                  <span>Taxa de Sucesso</span>
                </div>
                {selectedLawyer.valor > 0 && (
                  <div className={styles.lpStatItem}>
                    <strong>R$ {selectedLawyer.valor}</strong>
                    <span>Valor da Consulta</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.lpModalFooter}>
              {selectedLawyer.is_premium ? (
                <button
                  className={styles.lpContactBtn}
                  onClick={(e) => {
                    setIsLawyerModalOpen(false);
                    handleStartChatRequest(e, selectedLawyer);
                  }}
                >
                  Falar com Advogado
                </button>
              ) : (
                <p className={styles.lpNote}>
                  Este advogado não aceita contatos diretos no momento.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELEÇÃO DE CASO PARA CHAT */}
      {isCaseSelectOpen && selectedLawyer && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsCaseSelectOpen(false)}
        >
          <div
            className={styles.caseSelectModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.caseSelectHeader}>
              <h3>Sobre qual caso deseja falar?</h3>
              <p>
                Selecione um dos seus casos abaixo para iniciar o atendimento
                com <strong>{selectedLawyer.name}</strong>.
              </p>
            </div>
            <div className={styles.caseSelectList}>
              {casos
                .filter((c) => c.status === "ABERTO" && !c.advogado_id)
                .map((caso) => (
                  <div
                    key={caso.id}
                    className={styles.caseSelectItem}
                    onClick={() => handleConfirmStartChat(caso.id)}
                  >
                    <div className={styles.csItemInfo}>
                      <strong>{caso.titulo}</strong>
                      <span>{caso.area_atuacao}</span>
                    </div>
                    <MessageSquare size={18} color="var(--color-gold)" />
                  </div>
                ))}
            </div>
            <button
              className={styles.cancelCaseSelectBtn}
              onClick={() => setIsCaseSelectOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL AVALIAÇÃO DO ADVOGADO */}
      {showAvaliacaoModal && avaliacaoPendente && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1a1a2e 100%)",
              borderRadius: "24px",
              border: "1px solid rgba(212,175,55,0.3)",
              padding: "40px",
              maxWidth: "480px",
              width: "100%",
              boxShadow:
                "0 0 60px rgba(212,175,55,0.15), 0 25px 50px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background: "rgba(212,175,55,0.15)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: "1px solid rgba(212,175,55,0.3)",
                }}
              >
                <Star
                  size={28}
                  fill="var(--color-gold)"
                  color="var(--color-gold)"
                />
              </div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  margin: "0 0 8px",
                }}
              >
                Avalie o Atendimento
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                Como foi sua experiência com{" "}
                <strong style={{ color: "var(--color-gold)" }}>
                  {avaliacaoPendente.advogado_nome}
                </strong>
                ?
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.78rem",
                  marginTop: "4px",
                }}
              >
                Caso: {avaliacaoPendente.caso_titulo}
              </p>
            </div>

            {/* Estrelas */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "28px",
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setAvaliacaoNota(star)}
                  onMouseEnter={() => setAvaliacaoHover(star)}
                  onMouseLeave={() => setAvaliacaoHover(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    transition: "transform 0.15s",
                    transform:
                      (avaliacaoHover || avaliacaoNota) >= star
                        ? "scale(1.2)"
                        : "scale(1)",
                  }}
                >
                  <Star
                    size={40}
                    fill={
                      (avaliacaoHover || avaliacaoNota) >= star
                        ? "#d4af37"
                        : "transparent"
                    }
                    color={
                      (avaliacaoHover || avaliacaoNota) >= star
                        ? "#d4af37"
                        : "rgba(255,255,255,0.25)"
                    }
                  />
                </button>
              ))}
            </div>

            {/* Label da nota */}
            {avaliacaoNota > 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--color-gold)",
                  fontWeight: 700,
                  marginBottom: "20px",
                  fontSize: "0.9rem",
                }}
              >
                {avaliacaoNota === 1
                  ? "😞 Muito ruim"
                  : avaliacaoNota === 2
                    ? "😐 Ruim"
                    : avaliacaoNota === 3
                      ? "😊 Regular"
                      : avaliacaoNota === 4
                        ? "😃 Bom"
                        : "🌟 Excelente!"}
              </p>
            )}

            {/* Justificativa (opcional) */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Justificativa{" "}
                <span
                  style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}
                >
                  (opcional)
                </span>
              </label>
              <textarea
                value={avaliacaoJustificativa}
                onChange={(e) => setAvaliacaoJustificativa(e.target.value)}
                placeholder="Conte um pouco sobre sua experiência..."
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleSubmitAvaliacao}
                disabled={avaliacaoLoading || avaliacaoNota === 0}
                style={{
                  flex: 1,
                  background:
                    avaliacaoNota === 0
                      ? "rgba(212,175,55,0.3)"
                      : "var(--color-gold)",
                  color: "#000",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  cursor: avaliacaoNota === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {avaliacaoLoading ? "Enviando..." : "Enviar Avaliação"}
              </button>
              <button
                onClick={() => {
                  setShowAvaliacaoModal(false);
                  setAvaliacaoPendente(null);
                }}
                style={{
                  flex: 0.4,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "14px",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Pular
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CONFIRMAÇÃO EXCLUSÃO NOTIFICAÇÃO */}
      {showNotifDeleteConfirm && (
        <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
          <div
            className={`${styles.editModal} ${styles.confirmSpecial}`}
            style={{ maxWidth: "400px", textAlign: "center" }}
          >
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Trash2 size={32} />
            </div>
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#fff",
                marginBottom: "12px",
              }}
            >
              Excluir Notificação?
            </h3>
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.9rem",
                marginBottom: "30px",
                lineHeight: "1.5",
              }}
            >
              Esta mensagem será removida permanentemente da sua área de
              notificações.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowNotifDeleteConfirm(false);
                  setNotifToDelete(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteNotification}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      <AdvogadoMesPopup />
      <PesquisaSatisfacaoClientePopup />
      {isMobile && (
        <nav className={styles.mobileBottomNav}>
          <button
            className={`${styles.mobileNavItem} ${activeTab === "painel" ? styles.activeMobileNavItem : ""}`}
            onClick={() => setActiveTab("painel")}
          >
            <Home size={22} />
            <span>Home</span>
          </button>
          <button
            className={`${styles.mobileNavItem} ${activeTab === "meus-casos" ? styles.activeMobileNavItem : ""}`}
            onClick={() => setActiveTab("meus-casos")}
          >
            <Folder size={22} />
            <span>Casos</span>
          </button>
          <button
            className={`${styles.mobileNavItem} ${activeTab === "conversas" ? styles.activeMobileNavItem : ""}`}
            onClick={() => setActiveTab("conversas")}
            style={{ position: "relative" }}
          >
            <MessageSquare size={22} />
            <span className={styles.mobileMsgDot}></span>
            <span>Mensagens</span>
          </button>
          <button
            className={`${styles.mobileNavItem} ${activeTab === "perfil" ? styles.activeMobileNavItem : ""}`}
            onClick={() => setActiveTab("perfil")}
          >
            <User size={22} />
            <span>Perfil</span>
          </button>
        </nav>
      )}
    </div>
  );
}

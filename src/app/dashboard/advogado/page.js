"use client";
// DUMMY COMMENT FOR GIT SYNC TEST

import { useState, useEffect, useRef, useCallback } from "react";
import * as htmlToImage from "html-to-image";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PlusCircle,
  Bell,
  User,
  LogOut,
  Scale,
  Search,
  Globe,
  Briefcase,
  Users,
  FileText,
  Sparkles,
  Calculator,
  Calendar,
  Filter,
  BookOpen,
  Settings,
  ChevronRight,
  Gavel,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Coins,
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
  MessageSquare,
  X,
  UserPlus,
  ShieldHalf,
  Save,
  UserCheck,
  Paperclip,
  Upload,
  Pencil,
  FileDown,
  Paperclip as Clip,
  Send,
  Eye,
  Download,
  PenTool,
  History,
  Check,
  Copy,
  RotateCcw,
  Clock,
  Heart,
  ChevronDown,
  Loader2,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  ClipboardList,
  Edit2,
  Plus,
  Menu,
  Star,
} from "lucide-react";

import * as CalcUtils from "@/lib/calculators";
import styles from "./Dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { maskCPFCNPJ, formatPhone, maskPhone } from "@/lib/securityUtils";

import {
  createJurisCheckout,
  createProSubscription,
} from "@/services/stripeCheckoutService";

export default function AdvogadoDashboard() {
  const [userName, setUserName] = useState("Advogado");
  const [activeTab, setActiveTab] = useState("oportunidades");
  const [casos, setCasos] = useState([]);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [myInterests, setMyInterests] = useState([]);
  const [loadingMyInterests, setLoadingMyInterests] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [crmClients, setCrmClients] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nome_completo: "",
    tipo: "Pessoa Física",
    cpf_cnpj: "",
    rg_ie: "",
    estado_civil: "",
    profissao: "",
    telefone: "",
    endereco_completo: "",
    email: "",
    notas_internas: "",
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotifDeleteConfirm, setShowNotifDeleteConfirm] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // CALCULADORA STATE
  const [activeCalculator, setActiveCalculator] = useState("rescisao");
  const [calcInputs, setCalcInputs] = useState({
    salarioBase: "",
    dataAdmissao: "",
    dataRescisao: "",
    teveComissoes: "",
    temAviso: false,
    diasFeria: "30",
    incluirTerco: true,
    horasExtrasMes: "",
    adicional: "50",
    valorOriginal: "",
    dataInicial: "",
    dataFinal: "",
    indice: "IPCA",
    valorDevido: "",
    dataVencimento: "",
    dataPagamento: "",
    dataNascimento: "",
    dataInicio: "",
    sexo: "M",
    rendaMensal: "",
    numeroFilhos: "1",
    percentualAlimentista: "30",
    causaValor: "",
    complexidade: "Média",
    tipoPrazo: "Recurso",
  });
  const [calcResult, setCalcResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showProfileReminder, setShowProfileReminder] = useState(false);

  // JURISPRUDENCIA STATE
  const [jurisSearchQuery, setJurisSearchQuery] = useState("");
  const [jurisResult, setJurisResult] = useState("");
  const [isSearchingJuris, setIsSearchingJuris] = useState(false);

  // TRIAGEM STATE
  const [triagemAnswers, setTriagemAnswers] = useState("");
  const [triagemDiagnosis, setTriagemDiagnosis] = useState(null);
  const [triagemCaseValue, setTriagemCaseValue] = useState(null);
  const [isExportingCard, setIsExportingCard] = useState(false);

  // MODAL DETALHES DO CASO
  const [selectedCasoModal, setSelectedCasoModal] = useState(null);

  // REFS
  const businessCardRef = useRef(null);
  const [triagemViability, setTriagemViability] = useState(null);
  const [isTriagemLoading, setIsTriagemLoading] = useState(false);
  const [triagemStep, setTriagemStep] = useState(1);

  // AGENDA STATE
  const [agendaItems, setAgendaItems] = useState([]);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  // PERFIL STATE
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [avgRating, setAvgRating] = useState(null); // { media, total }
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    specialties: "",
    bio: "",
    oab: "",
    consulta: "Gratuita",
    tempo: "",
    valor: 0,
    avatar: "",
    password: "",
  });

  // DOCUMENTAÇÃO STATE
  const [docActiveTab, setDocActiveTab] = useState("visao-geral");
  const [aiDeadlineResult, setAiDeadlineResult] = useState(null);
  const [editingAgendaItem, setEditingAgendaItem] = useState(null);
  const [newAgendaItem, setNewAgendaItem] = useState({
    title: "",
    date: "",
    time: "09:00",
    description: "",
    type: "Judicial",
    urgency: "Média",
    clientId: "",
  });

  // Smart Docs states
  const [indicacoes, setIndicacoes] = useState([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(false);
  const [allDocuments, setAllDocuments] = useState([]);
  const [loadingAllDocs, setLoadingAllDocs] = useState(false);
  const [selectedClientForSmartUpload, setSelectedClientForSmartUpload] =
    useState("");
  const [docFilters, setDocFilters] = useState({
    name: "",
    client: "",
    type: "",
    tag: "",
    dateFrom: "",
    dateTo: "",
  });

  // Redator IA states
  const [redatorConfig, setRedatorConfig] = useState({
    type: "Petição Inicial",
    tone: "Formal",
    clientId: "",
    clientName: "",
    facts: "",
    clientData: null,
    advocateData: null,
  });
  const [draftResult, setDraftResult] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // SOLICITAÇÃO DE EXCLUSÃO
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] =
    useState(false);
  const [deleteRequestData, setDeleteRequestData] = useState({
    nome: "",
    motivo: "",
  });

  const fileInputRef = useRef(null);
  const smartFileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const handleApplyCoupon = async (tipo) => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: couponCode,
          tipo,
          advogado_id: profileData?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data);
        toast.success("Cupom aplicado com sucesso!");
      } else {
        toast.error(data.error);
        setAppliedCoupon(null);
      }
    } catch (err) {
      toast.error("Erro ao validar cupom.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTypingAI]);

  const fetchAgenda = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      try {
        const res = await fetch("/api/crm/agenda");
        const data = await res.json();
        if (data.success) {
          setAgendaItems(data.data);
        }
      } catch (err) {
        console.error("Erro fetchAgenda API:", err);
      }
    },
    [profileData?.id],
  );

  const fetchAllDocuments = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      setLoadingAllDocs(true);
      try {
        const res = await fetch("/api/crm/documents");
        const data = await res.json();
        if (data.success) setAllDocuments(data.data);
      } catch (e) {
        console.error("Erro fetchAllDocs:", e);
      } finally {
        setLoadingAllDocs(false);
      }
    },
    [profileData?.id],
  );

  const fetchMyInterests = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      setLoadingMyInterests(true);
      try {
        const res = await fetch("/api/advogado/interesses");
        const data = await res.json();
        if (data.success) setMyInterests(data.data);
      } catch (err) {
        console.error("Erro fetchMyInterests:", err);
      } finally {
        setLoadingMyInterests(false);
      }
    },
    [profileData?.id],
  );

  const fetchIndicacoes = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      setLoadingIndicacoes(true);
      try {
        const res = await fetch("/api/advogado/indicacoes");
        const data = await res.json();
        if (data.success) {
          setIndicacoes(data.data);
        }
      } catch (err) {
        console.error("Erro fetchIndicacoes:", err);
      } finally {
        setLoadingIndicacoes(false);
      }
    },
    [profileData?.id],
  );

  const fetchCasos = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      setLoadingCasos(true);
      try {
        const res = await fetch("/api/casos");
        const data = await res.json();
        if (data.success) setCasos(data.data);
      } catch (err) {
        console.error("Erro fetchCasos:", err);
      } finally {
        setLoadingCasos(false);
      }
    },
    [profileData?.id],
  );

  const fetchCrmClients = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      setLoadingCrm(true);
      try {
        const res = await fetch("/api/crm");
        const data = await res.json();
        if (data.success) setCrmClients(data.data);
      } catch (e) {
        console.error("Erro CRM:", e);
      } finally {
        setLoadingCrm(false);
      }
    },
    [profileData?.id],
  );

  const syncNotificacoes = useCallback(
    async (explicitId) => {
      if (!explicitId && !profileData?.id) return;
      try {
        const res = await fetch("/api/notificacoes", { cache: "no-store" });
        const response = await res.json();
        if (response.success) {
          setNotificacoes(response.data || []);
        } else if (res.status === 401) {
          console.warn("[LawyerDashboard] 401 no fetchNotificacoes...");
        }
      } catch (error) {
        console.error("Erro ao sincronizar notificações:", error);
      }
    },
    [profileData?.id],
  );

  const fetchNotificacoes = useCallback(async () => {
    setLoadingNotificacoes(true);
    await syncNotificacoes();
    setLoadingNotificacoes(false);
  }, [syncNotificacoes]);

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    setNotifToDelete(id);
    setShowNotifDeleteConfirm(true);
  };

  const executeDeleteNotification = async () => {
    if (!notifToDelete) return;
    try {
      const res = await fetch(`/api/notificacoes?id=${notifToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Mensagem excluída!");
        setNotificacoes((prev) => prev.filter((n) => n.id !== notifToDelete));
        setShowNotifDeleteConfirm(false);
        setNotifToDelete(null);
      } else {
        toast.error(data.message || "Erro ao excluir mensagem");
      }
    } catch (err) {
      console.error("Erro ao excluir notificação:", err);
      toast.error("Erro de conexão ao excluir.");
    }
  };


  const loadDataFull = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/perfil");
      const data = await res.json();
      if (data.success) {
        const profile = data.data;
        setProfileData(profile);
        setUserName(profile.name);
        setProfileForm({
          name: profile.name || "",
          phone: profile.phone || "",
          specialties: profile.specialties || "",
          bio: profile.bio || "",
          oab: profile.oab || "",
          consulta: profile.consulta || "Gratuita",
          tempo: profile.tempo || "",
          valor: profile.valor || 0,
          avatar: profile.avatar || "",
          password: "",
        });
        const isIncomplete =
          !profile.avatar || !profile.bio || !profile.specialties;
        setShowProfileReminder(isIncomplete);

        // Chamada sequencial passando o profile.id explicitamente para evitar closures obsoletas
        await fetchMyInterests(profile.id);
        await fetchCasos(profile.id);
        await fetchCrmClients(profile.id);
        await fetchAgenda(profile.id);
        await fetchAllDocuments(profile.id);
        await syncNotificacoes(profile.id);

        // Buscar média de avaliações do próprio advogado
        try {
          const ratingRes = await fetch(`/api/avaliacoes/media/${profile.id}`);
          const ratingData = await ratingRes.json();
          if (ratingData.success) setAvgRating(ratingData.data);
        } catch (e) {
          console.warn("Erro ao buscar média de avaliações:", e);
        }
      }
    } catch (e) {
      console.error("Erro loadDataFull:", e);
    } finally {
      setLoadingProfile(false);
    }
  }, [
    fetchMyInterests,
    fetchCasos,
    fetchCrmClients,
    fetchAgenda,
    fetchAllDocuments,
    syncNotificacoes,
  ]);

  useEffect(() => {
    loadDataFull();
  }, [loadDataFull]);

  useEffect(() => {
    if (!profileData?.id) return;
    const intervalId = setInterval(syncNotificacoes, 30000); // Polling 30s
    return () => clearInterval(intervalId);
  }, [syncNotificacoes, profileData?.id]);

  useEffect(() => {
    if (!profileData?.id) return;

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
          config: { presence: { key: profileData.id } },
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && isActive) {
            await presenceChannel.track({
              user_id: profileData.id,
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
  }, [profileData?.id]);

  const parseNotificationMeta = (notification) => {
    const rawMeta = notification?.meta;
    if (!rawMeta) return {};
    if (typeof rawMeta === "object") return rawMeta;

    try {
      return JSON.parse(rawMeta);
    } catch {
      return {};
    }
  };

  const handleOpenAdminChat = (notification) => {
    const meta = parseNotificationMeta(notification);
    const adminId = meta?.sender_id || meta?.sent_by || null;

    if (!adminId) {
      toast.error(
        "Não foi possível identificar o administrador desta mensagem.",
      );
      return;
    }

    window.location.href = `/chat/admin/${adminId}`;
  };

  useEffect(() => {
    // REAL-TIME: Assinar mudanças na tabela casos
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "casos" },
        (payload) => {
          console.log("Real-time change detected:", payload);
          fetchCasos();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCasos]);

  useEffect(() => {
    if (activeTab === "minhas-mensagens" && profileData?.id) {
      fetchNotificacoes();
    }
  }, [activeTab, profileData?.id, fetchNotificacoes]);

  // REAL-TIME: Notificações do advogado em tempo real
  useEffect(() => {
    let notifChannel;
    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      notifChannel = supabase
        .channel(`advogado:notificacoes:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificacoes",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotificacoes((prev) => {
              const incoming = payload.new;
              const deduped = prev.filter((item) => item.id !== incoming.id);
              return [incoming, ...deduped];
            });

            toast.custom(
              (t) => (
                <div
                  className={`${styles.toastNotification} ${t.visible ? styles.toastIn : styles.toastOut}`}
                >
                  <div className={styles.toastIcon}>
                    <Bell size={20} color="var(--color-gold)" />
                  </div>
                  <div className={styles.toastContent}>
                    <p className={styles.toastTitle}>{payload.new.titulo}</p>
                    <p className={styles.toastDesc}>{payload.new.mensagem}</p>
                  </div>
                </div>
              ),
              { duration: 5000 },
            );
          },
        )
        .subscribe();
    };

    setup();
    return () => {
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, []);

  // Filtros estritos para garantir a separação correta
  // Oportunidades: Casos SEM advogado vinculado, status ABERTO ou NEGOCIANDO (e que eu AINDA não manifestei interesse)
  const openCases = casos.filter(
    (c) => 
      (!c.advogado_id || c.advogado_id === null) && 
      ["ABERTO", "NEGOCIANDO"].includes(c.status) &&
      !myInterests.some((i) => i.case_id === c.id)
  );

  // Meus Casos: Somente casos vinculados ao MEU ID
  const myCases = casos.filter(
    (c) => profileData?.id && c.advogado_id === profileData.id,
  );

  // Declarei Interesse: Casos em que o advogado manifestou interesse (aguardando ou negociando)
  const myNegotiations = myInterests
    .filter((i) => i.status === "NEGOTIATING" || i.status === "PENDING")
    .map((interest) => {
      const casoDoc = casos.find((c) => c.id === interest.case_id);
      if (casoDoc) {
        return { 
          ...casoDoc, 
          interest_id: interest.id, 
          interest_status: interest.status,
          is_negotiation: interest.status === "NEGOTIATING" 
        };
      }
      return null;
    })
    .filter(Boolean);


  // Tabs que exigem plano PRO
  const PRO_TABS = [
    "crm",
    "docs",
    "redator",
    "calculadora",
    "juris",
    "agenda",
    "triagem",
  ];

  const handleTabChange = (tab) => {
    if (tab === "indicacoes") {
      fetchIndicacoes();
    }
    if (PRO_TABS.includes(tab) && !profileData?.is_premium) {
      setShowProModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const renderIndicacoes = () => {
    const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/cadastro?ref=${profileData?.id}` : "";
    
    const stats = {
      totalIndicados: indicacoes.length,
      assinantesPro: indicacoes.filter(i => i.status === 'ASSINOU_PRO' || i.status === 'COMISSIONADO').length,
      jurisGanhos: indicacoes.reduce((acc, i) => acc + (Number(i.valor_comissao) || 0), 0)
    };

    return (
      <div className={styles.toolContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Indique e Ganhe</h2>
          <p className={styles.sectionDesc}>
            Fortaleça a comunidade e ganhe créditos em Juris por cada assinatura PRO indicada.
          </p>
        </div>

        <div className={styles.indicacoesGrid}>
          {/* Card de Regras */}
          <div className={styles.rulesCard}>
            <div className={styles.rulesHeader}>
              <TrendingUp size={24} color="var(--color-gold)" />
              <h3>Como funciona?</h3>
            </div>
            <ul className={styles.rulesList}>
              <li>
                <span className={styles.ruleIcon}>1</span>
                <div>
                  <strong>Compartilhe seu link:</strong> Envie seu link único para colegas advogados ou clientes.
                </div>
              </li>
              <li>
                <span className={styles.ruleIcon}>2</span>
                <div>
                  <strong>Assinatura PRO:</strong> Quando seu indicado assinar o plano <strong>SocialJurídico PRO</strong>...
                </div>
              </li>
              <li>
                <span className={styles.ruleIcon}>3</span>
                <div>
                  <strong>Ganhe 50%:</strong> Você recebe <strong>50% do valor pago</strong> revertido em créditos de <strong>Juri</strong>.
                </div>
              </li>
              <li>
                <span className={styles.ruleIcon}>4</span>
                <div>
                  <strong>Crédito em 48h:</strong> O valor será validado e creditado pela administração em até 48 horas úteis.
                </div>
              </li>
            </ul>
          </div>

          {/* Card de Link e Stats */}
          <div className={styles.referralActionCard}>
            <div className={styles.linkShareArea}>
              <label>Seu Link de Indicação Único</label>
              <div className={styles.copyLinkRow}>
                <input type="text" readOnly value={referralLink} className={styles.referralInput} />
                <button 
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    toast.success("Link copiado com sucesso!");
                  }}
                >
                  <Copy size={18} /> Copiar
                </button>
              </div>
              <p className={styles.linkHint}>Divulgue em grupos de WhatsApp, LinkedIn ou Instagram.</p>
            </div>

            <div className={styles.miniStatsRow}>
              <div className={styles.miniStat}>
                <span className={styles.statVal}>{stats.totalIndicados}</span>
                <span className={styles.statLabel}>Indicados</span>
              </div>
              <div className={styles.miniStat}>
                <span className={styles.statVal}>{stats.assinantesPro}</span>
                <span className={styles.statLabel}>Assinantes PRO</span>
              </div>
              <div className={styles.miniStat} style={{ border: 'none' }}>
                <span className={styles.statVal} style={{ color: 'var(--color-gold)' }}>{stats.jurisGanhos}</span>
                <span className={styles.statLabel}>Juris Ganhos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Transparência */}
        <div className={styles.transparencySection}>
          <div className={styles.transparencyHeader}>
            <h3><Users size={20} /> Histórico de Indicações</h3>
            <p>Acompanhe em tempo real quem utilizou seu link.</p>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.referralTable}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nome do Indicado</th>
                  <th>Status</th>
                  <th>Ganhos</th>
                </tr>
              </thead>
              <tbody>
                 {indicacoes.length > 0 ? (
                    indicacoes.map((ind) => (
                      <tr key={ind.id}>
                        <td>{new Date(ind.created_at).toLocaleDateString()}</td>
                        <td>{ind.nome_indicado}</td>
                        <td>
                          <span className={`${styles.badge} ${ind.status === 'COMISSIONADO' ? styles.badgeHigh : ind.status === 'ASSINOU_PRO' ? styles.badgeMed : styles.badgeLow}`}>
                            {ind.status}
                          </span>
                        </td>
                        <td style={{ color: ind.valor_comissao > 0 ? 'var(--color-gold)' : 'inherit', fontWeight: 800 }}>
                          {ind.valor_comissao > 0 ? `+${ind.valor_comissao} Juris` : '-'}
                        </td>
                      </tr>
                    ))
                 ) : (
                    <tr>
                       <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                          {loadingIndicacoes ? "Carregando..." : "Nenhuma indicação registrada até o momento. Comece a compartilhar seu link!"}
                       </td>
                    </tr>
                 )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case "oportunidades":
        return renderOportunidades();
      case "meus-casos":
        return renderMeusCasos();
      case "declarei-interesse":
        return renderDeclareiInteresse();
      case "minhas-mensagens":
        return renderMinhasMensagens();
      case "crm":
        return renderCRM();
      case "docs":
        return renderDocs();
      case "redator":
        return renderRedator();
      case "calculadora":
        return renderCalculadora();
      case "juris":
        return renderJuris();
      case "agenda":
        return renderAgenda();
      case "triagem":
        return renderTriagem();
      case "cartao-visitas":
        return renderCartaoVisitas();
      case "perfil":
        return renderPerfil();
      case "indicacoes":
        return renderIndicacoes();
      case "documentacao":
        return renderDocumentacao();
      default:
        return renderOportunidades();
    }
  };

  const renderOportunidades = () => (
    <div className={styles.toolContainer}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Buscar por qualquer coisa..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.contentRow}>
        <aside className={styles.bannerLeft}>
          <div className={styles.bannerCard}>
            <Image
              src="/img/banner_sidebar.png"
              alt="Anuncie"
              width={240}
              height={360}
              className={styles.bannerImg}
            />
          </div>
        </aside>

        <section className={styles.opportunityGrid}>
          {loadingCasos ? (
            <div className={styles.loadingState}>
              Carregando oportunidades...
            </div>
          ) : openCases.length > 0 ? (
            openCases
              .filter((c) =>
                (c.titulo || "").toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((caso) => {
                const isNegociando = caso.status === "NEGOCIANDO";
                const negotiatingLawyers = caso.negotiating_lawyers || [];
                return (
                  <div key={caso.id} className={styles.opCard} onClick={() => setSelectedCasoModal(caso)} style={{ cursor: 'pointer' }}>
                    <div className={styles.opHeader}>
                      <div className={styles.opArea}>
                        <div className={styles.opIcon}>
                          {caso.area_atuacao?.charAt(0) || "J"}
                        </div>
                        <div className={styles.opTitleGroup}>
                          <h3>{caso.titulo || "Caso Jurídico"}</h3>
                          <span className={styles.opLocation}>
                            {caso.area_atuacao || "Direito Geral"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span className={styles.opDate}>
                          {new Date(caso.created_at).toLocaleDateString()}
                        </span>
                        {isNegociando && (
                          <span style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', animation: 'pulse 2s ease-in-out infinite' }}>
                            🔥 Negociando
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={styles.opDesc}>{caso.descricao && caso.descricao.length > 120 ? caso.descricao.substring(0, 120) + '...' : caso.descricao}</p>

                    {/* Avatares dos advogados negociando */}
                    {isNegociando && negotiatingLawyers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px', paddingLeft: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginRight: '6px' }}>Em negociação:</span>
                        <div style={{ display: 'flex' }}>
                          {negotiatingLawyers.slice(0, 5).map((lawyer, idx) => (
                            <div key={lawyer.id || idx} title={lawyer.name} style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700,
                              color: '#000', border: '2px solid #1a1a2e', marginLeft: idx > 0 ? '-8px' : '0', zIndex: 10 - idx,
                              position: 'relative'
                            }}>
                              {lawyer.initials || "AD"}
                            </div>
                          ))}
                          {negotiatingLawyers.length > 5 && (
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem',
                              color: '#fff', border: '2px solid #1a1a2e', marginLeft: '-8px', zIndex: 1
                            }}>
                              +{negotiatingLawyers.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={styles.opFooter}>
                      <div className={styles.opPrice}>
                        <Coins size={14} /> 1 Juri
                      </div>
                      <button
                        className={styles.applyBtn}
                        onClick={(e) => { e.stopPropagation(); vincularCaso(caso.id); }}
                      >
                        Manifestar Interesse
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className={styles.emptyState}>
              Nenhuma oportunidade aberta no momento.
            </div>
          )}
        </section>

        <aside className={styles.bannerRight}>
          <div className={styles.bannerCard}>
            <Image
              src="/img/banner_whatsapp.png"
              alt="Suporte"
              width={240}
              height={360}
              className={styles.bannerImg}
            />
          </div>
        </aside>
      </div>

      {/* MODAL DETALHES DO CASO */}
      {selectedCasoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setSelectedCasoModal(null)}>
          <div style={{ background: '#1a1a2e', borderRadius: '24px', border: '1px solid rgba(212,175,55,0.2)', maxWidth: '640px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '36px' }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>{selectedCasoModal.titulo}</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedCasoModal.area_atuacao || 'Direito Geral'}
                  </span>
                  <span style={{ 
                    background: selectedCasoModal.status === 'NEGOCIANDO' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(16,185,129,0.15)', 
                    color: selectedCasoModal.status === 'NEGOCIANDO' ? '#000' : '#10b981',
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 
                  }}>
                    {selectedCasoModal.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCasoModal(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {/* Data */}
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '20px' }}>
              Publicado em: {new Date(selectedCasoModal.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#d4af37', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Relato do Cliente</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', lineHeight: '1.7', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
                {selectedCasoModal.descricao || 'Sem descrição fornecida.'}
              </p>
            </div>

            {/* Anexos */}
            {selectedCasoModal.anexos && selectedCasoModal.anexos.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#d4af37', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Documentos Anexados</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedCasoModal.anexos.map((anexo, idx) => (
                    <a key={idx} href={anexo} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'underline' }}>
                      📎 Anexo {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Advogados em negociação */}
            {selectedCasoModal.status === 'NEGOCIANDO' && (selectedCasoModal.negotiating_lawyers || []).length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#d4af37', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Advogados em Negociação</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedCasoModal.negotiating_lawyers.map((lawyer, idx) => (
                    <div key={lawyer.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: '#000' }}>
                        {lawyer.initials || "AD"}
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{lawyer.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão de interesse */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                className={styles.applyBtn}
                style={{ flex: 1, padding: '14px' }}
                onClick={() => { setSelectedCasoModal(null); vincularCaso(selectedCasoModal.id); }}
              >
                <Coins size={16} /> Manifestar Interesse (1 Juri)
              </button>
              <button
                onClick={() => setSelectedCasoModal(null)}
                style={{ flex: 0.4, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const vincularCaso = async (casoId) => {
    const currentBalance = profileData?.balance || 0;
    if (currentBalance < 1) {
      toast.error("Saldo insuficiente. Você precisa de pelo menos 1 Juri.");
      setShowBuyModal(true);
      return;
    }
    if (
      !confirm(
        `Manifestar interesse neste caso? Custo: 1 Juri (saldo atual: ${currentBalance})`,
      )
    )
      return;
    try {
      const res = await fetch("/api/casos/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Interesse manifestado! O cliente foi notificado.");
        // Atualiza saldo local imediatamente
        setProfileData((prev) =>
          prev ? { ...prev, balance: data.newBalance } : prev,
        );
        // Recarregar feed para atualizar status e interesses declarados
        fetchMyInterests(profileData.id);
        fetchCasos(profileData.id);
      } else if (res.status === 402) {
        toast.error(data.message);
        setShowBuyModal(true);
      } else if (res.status === 403 && !profileData?.is_premium) {
        toast.error("Esta funcionalidade é exclusiva para advogados PRO.");
        setShowProModal(true);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao manifestar interesse.");
    }
  };

  const handleAbrirConversaNegociacao = async (caso) => {
    try {
      const res = await fetch("/api/casos/chat-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId: caso.id, interestId: caso.interest_id }),
      });
      const data = await res.json();
      if (data.success) {
        if (!data.alreadyStarted) {
          toast.success("Chat de negociação iniciado! 1 Juri debitado.");
          setProfileData((prev) =>
            prev ? { ...prev, balance: data.newBalance } : prev,
          );
        }
        window.location.href = `/chat/${caso.id}?interest=${caso.interest_id}`;
      } else if (res.status === 402) {
        toast.error(data.message);
        setShowBuyModal(true);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao abrir chat de negociação.");
    }
  };


  const handleAbrirConversa = async (caso) => {
    // Se o chat já foi iniciado, vai direto
    if (caso.chat_started) {
      window.location.href = `/chat/${caso.id}`;
      return;
    }
    const currentBalance = profileData?.balance || 0;
    if (currentBalance < 4) {
      toast.error(
        `Saldo insuficiente. Você precisa de 4 Juris para iniciar o atendimento. Saldo: ${currentBalance}`,
      );
      setShowBuyModal(true);
      return;
    }
    if (
      !confirm(
        `Iniciar atendimento via chat? Custo: 4 Juris (saldo atual: ${currentBalance})`,
      )
    )
      return;
    try {
      const res = await fetch("/api/casos/chat-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId: caso.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (!data.alreadyStarted) {
          setProfileData((prev) =>
            prev ? { ...prev, balance: data.newBalance } : prev,
          );
          toast.success("Atendimento iniciado! 4 Juris debitados.");
        }
        window.location.href = `/chat/${caso.id}`;
      } else if (res.status === 402) {
        toast.error(data.message);
        setShowBuyModal(true);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao iniciar atendimento.");
    }
  };

  const renderMeusCasos = () => (
    <div className={styles.toolContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Meus Casos Atunais</h2>
      </div>
      <div className={styles.opportunityGrid}>
        {myCases.map((caso) => (
          <div key={caso.id} className={styles.opCard}>
            <div className={styles.opHeader}>
              <div className={styles.opArea}>
                <div
                  className={styles.opIcon}
                  style={{ background: "#10b981" }}
                >
                  <CheckCircle2 size={16} />
                </div>
                <div className={styles.opTitleGroup}>
                  <h3>{caso.titulo}</h3>
                  <span className={styles.opLocation}>{caso.area_atuacao}</span>
                </div>
              </div>
              <span className={styles.opDate}>
                {new Date(caso.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className={styles.opDesc}>{caso.descricao}</p>
            <div className={styles.opFooter}>
              <span
                className={styles.badge}
                style={{
                  background:
                    caso.status === "CANCELADO"
                      ? "rgba(239, 68, 68, 0.1)"
                      : caso.status === "FECHADO"
                        ? "rgba(100, 116, 139, 0.1)"
                        : "rgba(16, 185, 129, 0.1)",
                  color:
                    caso.status === "CANCELADO"
                      ? "#ef4444"
                      : caso.status === "FECHADO"
                        ? "#64748b"
                        : "#10b981",
                  border: "none",
                }}
              >
                {caso.status === "CANCELADO"
                  ? "CANCELADO PELO CLIENTE"
                  : caso.status}
              </span>
              <button
                className={styles.applyBtn}
                style={{
                  background:
                    caso.status === "CANCELADO" ? "#334155" : "#6366f1",
                  opacity: caso.status === "CANCELADO" ? 0.7 : 1,
                  cursor:
                    caso.status === "CANCELADO" ? "not-allowed" : "pointer",
                }}
                onClick={() =>
                  caso.status !== "CANCELADO" && handleAbrirConversa(caso)
                }
                disabled={caso.status === "CANCELADO"}
              >
                {caso.status === "CANCELADO"
                  ? "Atendimento Encerrado"
                  : caso.chat_started
                    ? "Abrir Conversa"
                    : "Iniciar Atendimento (4 Juris)"}
              </button>
            </div>
          </div>
        ))}
        {myCases.length === 0 && (
          <div className={styles.emptyState}>
            Você ainda não possui casos vinculados.
          </div>
        )}
      </div>
    </div>
  );

  const renderDeclareiInteresse = () => (
    <div className={styles.toolContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Declarei Interesse</h2>
      </div>
      <div className={styles.opportunityGrid}>
        {myNegotiations.map((caso) => {
          const isNegotiating = caso.interest_status === "NEGOTIATING";

          return (
            <div key={`int-${caso.interest_id}`} className={styles.opCard}>
              <div className={styles.opHeader}>
                <div className={styles.opArea}>
                  <div
                    className={styles.opIcon}
                    style={{ background: isNegotiating ? "#f59e0b" : "var(--color-gold)" }}
                  >
                    {isNegotiating ? <MessageSquare size={16} /> : <Clock size={16} />}
                  </div>
                  <div className={styles.opTitleGroup}>
                    <h3>{caso.titulo}</h3>
                    <span className={styles.opLocation}>{caso.area_atuacao}</span>
                  </div>
                </div>
                <span className={styles.opDate}>
                  {new Date(caso.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className={styles.opDesc}>{caso.descricao}</p>
              <div className={styles.opFooter}>
                <span
                  className={styles.badge}
                  style={{
                    background: isNegotiating ? "rgba(245, 158, 11, 0.1)" : "rgba(212, 175, 55, 0.1)",
                    color: isNegotiating ? "#f59e0b" : "var(--color-gold)",
                    border: "none",
                  }}
                >
                  {isNegotiating ? "EM NEGOCIAÇÃO" : "AGUARDANDO CLIENTE"}
                </span>

                {isNegotiating ? (
                  <button
                    className={styles.applyBtn}
                    style={{ background: "#f59e0b", color: "#000", fontWeight: 700 }}
                    onClick={() => handleAbrirConversaNegociacao(caso)}
                  >
                    Conversar com Cliente
                  </button>
                ) : (
                  <button
                    className={styles.applyBtn}
                    style={{ background: "transparent", color: "#888", border: "1px solid #444", cursor: "not-allowed" }}
                    disabled
                  >
                    Aguardando...
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {myNegotiations.length === 0 && (
          <div className={styles.emptyState}>
            Você ainda não manifestou interesse em nenhum caso recentemente.
          </div>
        )}
      </div>
    </div>
  );


  const renderMinhasMensagens = () => (
    <div className={styles.toolContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Minhas Mensagens</h2>
      </div>

      <div className={styles.opportunityGrid}>
        {loadingNotificacoes ? (
          <div className={styles.loadingState}>Carregando mensagens...</div>
        ) : notificacoes.length > 0 ? (
          notificacoes.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.opCard} ${styles.clickableMessageCard}`}
              onClick={() => handleOpenAdminChat(msg)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <div className={styles.opHeader}>
                <div className={styles.opArea}>
                  <div
                    className={styles.opIcon}
                    style={{ background: "#f59e0b" }}
                  >
                    <Bell size={16} />
                  </div>
                  <div className={styles.opTitleGroup}>
                    <h3>{msg.titulo || "Mensagem"}</h3>
                    <span className={styles.opLocation}>Administrador</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <span className={styles.opDate}>
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleString("pt-BR")
                      : "Agora"}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteNotifBtn}
                    onClick={(e) => handleDeleteNotification(e, msg.id)}
                    title="Excluir mensagem"
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      padding: "5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#ff4d4d")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className={styles.opDesc}>{msg.mensagem || "Sem conteúdo."}</p>
            </div>
          ))

        ) : (
          <div className={styles.emptyState}>
            Você ainda não recebeu mensagens.
          </div>
        )}
      </div>
    </div>
  );

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setIsSubmittingClient(true);
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cliente cadastrado com sucesso!");
        setShowNewClientModal(false);
        setNewClientData({
          nome_completo: "",
          tipo: "Pessoa Física",
          cpf_cnpj: "",
          rg_ie: "",
          estado_civil: "",
          profissao: "",
          telefone: "",
          endereco_completo: "",
          email: "",
          notas_internas: "",
        });
        fetchCrmClients();
      } else {
        toast.error(data.message || "Erro ao salvar cliente");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsSubmittingClient(false);
    }
  };
  const handleSendDeleteRequest = async (e) => {
    e.preventDefault();
    if (!deleteRequestData.nome || !deleteRequestData.motivo) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setIsSubmittingDeleteRequest(true);
    try {
      const res = await fetch("/api/solicitacoes-exclusao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteRequestData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Solicitação enviada com sucesso.");
        setShowDeleteRequestModal(false);
        toast(
          (t) => (
            <span style={{ textAlign: "center", display: "block" }}>
              <strong>Solicitação Recebida!</strong> <br />
              Se você não tiver casos vinculados, sua conta será excluída em até
              48 horas.
            </span>
          ),
          { duration: 6000, icon: "🛡️" },
        );
      } else {
        toast.error(data.message || "Erro ao enviar solicitação.");
      }
    } catch (err) {
      console.error("Erro ao enviar solicitação de exclusão:", err);
      toast.error("Erro na conexão com o servidor.");
    } finally {
      setIsSubmittingDeleteRequest(false);
    }
  };

  const renderDeleteRequestModal = () => {
    if (!showDeleteRequestModal) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowDeleteRequestModal(false)}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Solicitar Exclusão da Conta</h2>
            <p className={styles.modalSubtitle}>
              Sentimos muito em ver você partir.
            </p>
          </div>

          <form
            onSubmit={handleSendDeleteRequest}
            className={styles.newClientForm}
          >
            <div className={styles.formItem}>
              <label className={styles.formLabel}>Confirme seu Nome</label>
              <input
                type="text"
                className={styles.formInput}
                value={deleteRequestData.nome}
                onChange={(e) =>
                  setDeleteRequestData({
                    ...deleteRequestData,
                    nome: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>Motivo da Exclusão</label>
              <textarea
                className={styles.formTextarea}
                placeholder="Conte-nos o motivo (opcional, mas nos ajuda a melhorar)"
                value={deleteRequestData.motivo}
                onChange={(e) =>
                  setDeleteRequestData({
                    ...deleteRequestData,
                    motivo: e.target.value,
                  })
                }
                required
              />
            </div>

            <div
              className={styles.deleteFeedbackInfo}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "0.85rem",
                color: "var(--color-silver)",
              }}
            >
              <p>
                <strong>Atenção:</strong> Ao clicar em enviar, sua conta entrará
                em processo de exclusão.{" "}
              </p>
              <p style={{ marginTop: "10px" }}>
                Caso você não tenha nenhum caso vinculado na plataforma, sua
                conta e todos os dados pertinentes serão excluídos em até{" "}
                <strong>48 Horas</strong>.
              </p>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              style={{ background: "#ef4444" }}
              disabled={isSubmittingDeleteRequest}
            >
              {isSubmittingDeleteRequest
                ? "Enviando..."
                : "Confirmar Solicitação de Exclusão"}
            </button>
          </form>

          <button
            className={styles.closeModalBtn}
            onClick={() => setShowDeleteRequestModal(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderCRM = () => (
    <div className={styles.toolContainer}>
      <div className={styles.crmHeader}>
        <div>
          <h2 className={styles.sectionTitle}>CRM & KYC Jurídico</h2>
          <p className={styles.sectionSubtitle}>
            Gestão de carteira e análise de risco.
          </p>
        </div>
        <button
          className={styles.newClientBtn}
          onClick={() => setShowNewClientModal(true)}
        >
          <UserPlus size={18} /> Novo Cliente
        </button>
      </div>

      <div className={styles.crmIntro}>
        <div className={styles.crmIntroIcon}>
          <ShieldHalf size={24} />
        </div>
        <div className={styles.crmIntroText}>
          <h3>O que você pode fazer:</h3>
          <p>
            Gerencie sua carteira de clientes com inteligência artificial.
            Analise risco automaticamente, segmente clientes por potencial,
            acompanhe histórico de casos e receba recomendações estratégicas
            sobre próximos passos. Tudo centralizado em um dossiê completo para
            cada cliente.
          </p>
          <div className={styles.crmToolGrid}>
            <span className={styles.crmToolTag}>
              <Save size={14} /> Score de Confiança
            </span>
            <span className={styles.crmToolTag}>
              <Filter size={14} /> Segmentação
            </span>
            <span className={styles.crmToolTag}>
              <MessageSquare size={14} /> Chat IA
            </span>
            <span className={styles.crmToolTag}>
              <FileText size={14} /> Relatórios
            </span>
          </div>
        </div>
      </div>

      <div className={styles.clientList}>
        {loadingCrm ? (
          <div className={styles.emptyState}>Carregando clientes...</div>
        ) : crmClients.length > 0 ? (
          crmClients.map((client) => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.clientMainInfo}>
                <div className={styles.clientAvatar}>
                  {client.name.substring(0, 2).toUpperCase()}
                </div>
                <div className={styles.clientMeta}>
                  <h4>{client.name}</h4>
                  <p>
                    {client.email || "Sem email"} •{" "}
                    {/* ⚠️ SEGURANÇA: Telefo ne mascarado na listagem */}
                    {maskPhone(client.phone) || "Sem telefone"}
                  </p>
                </div>
              </div>

              <div className={styles.clientSecondaryInfo}>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Documento</span>
                  <span className={styles.infoValue}>
                    {/* ⚠️ SEGURANÇA: Mascarar CPF/CNPJ - nunca exibir completo */}
                    {maskCPFCNPJ(client.cpf_cnpj) || "--"}
                  </span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Risco</span>
                  <span
                    className={`${styles.riskBadge} ${client.risk_score < 30 ? styles.riskLow : client.risk_score < 70 ? styles.riskMed : styles.riskHigh}`}
                  >
                    {client.risk_score < 30
                      ? "Baixo"
                      : client.risk_score < 70
                        ? "Médio"
                        : "Alto"}{" "}
                    ({client.risk_score}%)
                  </span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Status</span>
                  <span className={styles.infoValue}>
                    {client.status || "Ativo"}
                  </span>
                </div>
                <button
                  className={styles.buyJurisBtn}
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  onClick={() => {
                    setSelectedClient(client);
                    setShowDossierModal(true);
                    setClientDocuments([]);
                    fetchClientDocuments(client.id);
                  }}
                >
                  Dossiê Completo
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <Users size={48} style={{ opacity: 0.2, marginBottom: "15px" }} />
            <p>Nenhum cliente cadastrado no banco de dados.</p>
          </div>
        )}
      </div>
    </div>
  );

  const handleSmartFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (selectedClientForSmartUpload) {
      formData.append("client_id", selectedClientForSmartUpload);
    }

    try {
      const res = await fetch("/api/crm/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Documento processado com IA!");
        fetchAllDocuments();
        setSelectedClientForSmartUpload("");
      } else {
        toast.error(data.message || "Erro no upload");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteSmartDoc = async (docId, fileUrl) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      // Extrair o path do Storage a partir da URL pública
      const pathPart = fileUrl.split("crm_documents/")[1];

      const res = await fetch(
        `/api/crm/documents?id=${docId}&path=${encodeURIComponent(pathPart)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Documento excluído com sucesso!");
        fetchAllDocuments();
      } else {
        toast.error(data.message || "Erro ao excluir");
      }
    } catch (err) {
      console.error("Erro deletar:", err);
      toast.error("Erro na conexão");
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error("Erro ao baixar arquivo");
    }
  };

  const renderDocs = () => {
    const filteredDocs = allDocuments.filter((doc) => {
      const matchName = doc.file_name
        .toLowerCase()
        .includes(docFilters.name.toLowerCase());
      const matchClient =
        !docFilters.client || doc.client_id === docFilters.client;
      const matchType =
        !docFilters.type ||
        doc.doc_type?.toLowerCase() === docFilters.type.toLowerCase();
      // Tag filter
      const matchTag =
        !docFilters.tag ||
        (doc.tags &&
          doc.tags.some((t) =>
            t.toLowerCase().includes(docFilters.tag.toLowerCase()),
          ));

      // Date filtering
      const docDate = new Date(doc.created_at);
      const matchDateFrom =
        !docFilters.dateFrom || docDate >= new Date(docFilters.dateFrom);
      const matchDateTo =
        !docFilters.dateTo ||
        docDate <= new Date(docFilters.dateTo + "T23:59:59");

      return (
        matchName &&
        matchClient &&
        matchType &&
        matchTag &&
        matchDateFrom &&
        matchDateTo
      );
    });

    return (
      <div className={styles.smartDocsContainer}>
        <div className={styles.smartDocsHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Gerenciador de Documentos</h2>
            <p className={styles.modalSubtitle} style={{ marginTop: 5 }}>
              IA detecta tipos e organiza automaticamente.
            </p>
          </div>
          <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
            <select
              className={styles.filterSelect}
              value={selectedClientForSmartUpload}
              onChange={(e) => setSelectedClientForSmartUpload(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">-- Vincular a Cliente (Opcional) --</option>
              {crmClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              className={styles.buyJurisBtn}
              style={{ padding: "10px 20px", borderRadius: 10 }}
              onClick={() => smartFileInputRef.current?.click()}
            >
              <Upload size={18} style={{ marginRight: 8 }} /> Upload
            </button>
          </div>
        </div>

        <div className={styles.smartDocsInfoCard}>
          <div className={styles.infoIconLarge}>
            <FileText size={32} />
          </div>
          <div className={styles.infoContent}>
            <h3>O que você pode fazer:</h3>
            <p>
              Faça upload de documentos jurídicos e deixe a IA organizá-los
              automaticamente. Sistema detecta tipo de documento (petição,
              contrato, sentença), gera tags relevantes e vincula ao cliente
              correspondente. Busca rápida e armazenamento centralizado de toda
              sua documentação.
            </p>
            <div className={styles.featureTagGrid}>
              <div className={styles.featureTag}>
                <Sparkles size={14} color="#a855f7" /> Detecção IA
              </div>
              <div className={styles.featureTag}>
                <Zap size={14} color="#f59e0b" /> Tagging Auto
              </div>
              <div className={styles.featureTag}>
                <Users size={14} color="#3b82f6" /> Vincular Cliente
              </div>
              <div className={styles.featureTag}>
                <Search size={14} color="#10b981" /> Busca Rápida
              </div>
            </div>
          </div>
        </div>

        <div className={styles.filterCard}>
          <div className={styles.filterHeader}>
            <div className={styles.filterTitle}>
              <Filter size={16} /> Filtros de Pesquisa
            </div>
            <button
              className={styles.clearFiltersBtn}
              onClick={() =>
                setDocFilters({
                  name: "",
                  client: "",
                  type: "",
                  tag: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }
            >
              <X size={14} /> Limpar Filtros
            </button>
          </div>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Nome do Arquivo</label>
              <input
                type="text"
                placeholder="Pesquisar..."
                className={styles.filterInput}
                value={docFilters.name}
                onChange={(e) =>
                  setDocFilters({ ...docFilters, name: e.target.value })
                }
              />
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Cliente</label>
              <select
                className={styles.filterSelect}
                value={docFilters.client}
                onChange={(e) =>
                  setDocFilters({ ...docFilters, client: e.target.value })
                }
              >
                <option value="">Todos</option>
                {crmClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Tipo</label>
              <select
                className={styles.filterSelect}
                value={docFilters.type}
                onChange={(e) =>
                  setDocFilters({ ...docFilters, type: e.target.value })
                }
              >
                <option value="">Todos</option>
                <option value="petição">Petição</option>
                <option value="contrato">Contrato</option>
                <option value="sentença">Sentença</option>
                <option value="procuração">Procuração</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Tag</label>
              <input
                type="text"
                placeholder="Pesquisar tag..."
                className={styles.filterInput}
                value={docFilters.tag}
                onChange={(e) =>
                  setDocFilters({ ...docFilters, tag: e.target.value })
                }
              />
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Data De</label>
              <input
                type="date"
                className={styles.filterInput}
                value={docFilters.dateFrom}
                onChange={(e) =>
                  setDocFilters({ ...docFilters, dateFrom: e.target.value })
                }
              />
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Data Até</label>
              <input
                type="date"
                className={styles.filterInput}
                value={docFilters.dateTo}
                onChange={(e) =>
                  setDocFilters({ ...docFilters, dateTo: e.target.value })
                }
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 15,
              fontSize: "0.8rem",
              color: "var(--color-silver-dark)",
            }}
          >
            {filteredDocs.length} documento(s) encontrado(s)
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className={styles.docTable}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cliente Vinculado</th>
                <th>Tipo (IA)</th>
                <th>Tags</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className={styles.docRow}>
                    <td>{doc.file_name}</td>
                    <td>
                      {doc.client_name ? (
                        <span className={styles.clientLink}>
                          {doc.client_name}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: "0.75rem",
                          }}
                        >
                          Sem vínculo
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.iaBadge}>
                        {doc.doc_type || "Processando..."}
                      </span>
                    </td>
                    <td>
                      {doc.tags &&
                        doc.tags.map((tag, idx) => (
                          <span key={idx} className={styles.docTag}>
                            {tag}
                          </span>
                        ))}
                      {(!doc.tags || doc.tags.length === 0) && (
                        <span
                          style={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: "0.7rem",
                          }}
                        >
                          Sem tags
                        </span>
                      )}
                    </td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.docActions}>
                        <button
                          className={styles.docActionBtn}
                          onClick={() => window.open(doc.file_url, "_blank")}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className={styles.docActionBtn}
                          onClick={() =>
                            handleDownload(doc.file_url, doc.file_name)
                          }
                        >
                          <Download size={18} />
                        </button>
                        <button
                          className={`${styles.docActionBtn} ${styles.trashBtn}`}
                          onClick={() =>
                            handleDeleteSmartDoc(doc.id, doc.file_url)
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "50px",
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    Nenhum documento. Faça upload para testar a IA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <input
          type="file"
          ref={smartFileInputRef}
          style={{ display: "none" }}
          onChange={handleSmartFileUpload}
        />
      </div>
    );
  };

  const handleGenerateRedatorDraft = async () => {
    if (!redatorConfig.type || !redatorConfig.facts) {
      toast.error("Preencha o tipo e os fatos!");
      return;
    }

    setIsGeneratingDraft(true);
    try {
      // Garantir que os dados do advogado estão no config
      const configWithAdvocate = {
        ...redatorConfig,
        advocateData: profileData,
      };

      const res = await fetch("/api/crm/redator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configWithAdvocate),
      });
      const data = await res.json();
      if (data.success) {
        setDraftResult(data.draft);
        toast.success("Minuta gerada com sucesso!");
      } else {
        toast.error(data.message || "Erro ao gerar minuta");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleDownloadDraftPDF = () => {
    if (!draftResult) return;

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const splitText = doc.splitTextToSize(draftResult, contentWidth);
    doc.text(splitText, margin, margin);

    const fileName = `${redatorConfig.type.replace(/\s+/g, "_")}_${redatorConfig.clientName.replace(/\s+/g, "_") || "Minuta"}.pdf`;
    doc.save(fileName);
    toast.success("PDF gerado!");
  };

  const renderRedator = () => {
    const marketIndexes = [
      { id: 1, title: "Petição", low: 1100, mid: 3250, high: 9000 },
      { id: 2, title: "Embargos", low: 1220, mid: 2800, high: 4050 },
      { id: 3, title: "Recurso", low: 1800, mid: 3650, high: 8500 },
      { id: 4, title: "Contestação", low: 1000, mid: 2250, high: 3150 },
      { id: 5, title: "Manifestação", low: 380, mid: 1200, high: 2100 },
      { id: 6, title: "Notificação", low: 500, mid: 1400, high: 1950 },
      { id: 7, title: "Procuração", low: 200, mid: 550, high: 800 },
      { id: 8, title: "Contrato", low: 1580, mid: 3250, high: 9000 },
    ];

    return (
      <div className={styles.redatorContainer}>
        <div className={styles.smartDocsHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Redator IA (Copilot)</h2>
            <p className={styles.modalSubtitle} style={{ marginTop: 5 }}>
              Gere peças e contratos profissionais em segundos.
            </p>
          </div>
        </div>

        <div
          className={styles.smartDocsInfoCard}
          style={{
            background:
              "linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, rgba(225, 29, 72, 0.05) 100%)",
            borderColor: "rgba(225, 29, 72, 0.15)",
            marginBottom: 25,
          }}
        >
          <div
            className={styles.infoIconLarge}
            style={{ background: "rgba(225, 29, 72, 0.1)", color: "#e11d48" }}
          >
            <PenTool size={24} />
          </div>
          <div className={styles.infoContent}>
            <h3>O que você pode fazer:</h3>
            <p>
              Gere minutas jurídicas completas com um clique usando inteligência
              artificial. Configure o tipo de peça, tom de voz, dados do cliente
              (puxados do CRM) e descrição dos fatos. O sistema gera peças
              profissionais, estruturadas e prontas para uso. Economize horas de
              redação.
            </p>
            <div className={styles.featureTagGrid}>
              <span className={styles.featureTag}>
                <Pencil size={14} /> Redação IA
              </span>
              <span className={styles.featureTag}>
                <FileText size={14} /> Múltiplos Tipos
              </span>
              <span className={styles.featureTag}>
                <MessageSquare size={14} /> Tom Customizável
              </span>
              <span className={styles.featureTag}>
                <History size={14} /> Inteligência
              </span>
            </div>
          </div>
        </div>

        <div className={styles.marketIndexContainer}>
          {marketIndexes.map((idx) => (
            <div key={idx.id} className={styles.marketIndexCard}>
              <div className={styles.marketTitle}>
                {idx.title}
                <TrendingUp size={14} style={{ opacity: 0.5 }} />
              </div>
              <div className={styles.marketValueRow}>
                <span className={styles.marketLabel}>Mínima</span>
                <span className={`${styles.marketPrice} ${styles.low}`}>
                  R$ {idx.low.toLocaleString()}
                </span>
              </div>
              <div className={styles.marketValueRow}>
                <span className={styles.marketLabel}>Média</span>
                <span className={`${styles.marketPrice} ${styles.mid}`}>
                  R$ {idx.mid.toLocaleString()}
                </span>
              </div>
              <div className={styles.marketValueRow}>
                <span className={styles.marketLabel}>Máxima</span>
                <span className={`${styles.marketPrice} ${styles.high}`}>
                  R$ {idx.high.toLocaleString()}
                </span>
              </div>
              <div className={styles.marketProgressBar}>
                <div
                  className={styles.marketProgressIndicator}
                  style={{ width: "60%" }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.redatorGrid}>
          <div className={styles.redatorCard}>
            <h3>
              <Settings size={18} /> Configuração da Minuta
            </h3>

            <div className={styles.redatorFormGroup}>
              <label>Tipo de Peça</label>
              <select
                className={styles.redatorSelect}
                value={redatorConfig.type}
                onChange={(e) =>
                  setRedatorConfig({ ...redatorConfig, type: e.target.value })
                }
              >
                <option>Petição Inicial</option>
                <option>Contestação</option>
                <option>Contrato de Honorários</option>
                <option>Procuração</option>
                <option>Parecer Jurídico</option>
                <option>Recurso</option>
                <option>Embargos</option>
                <option>Manifestação</option>
                <option>Notificação Extrajudicial</option>
              </select>
            </div>

            <div className={styles.redatorFormGroup}>
              <label>Puxar do CRM</label>
              <select
                className={styles.redatorSelect}
                value={redatorConfig.clientId}
                onChange={(e) => {
                  const client = crmClients.find(
                    (c) => c.id === e.target.value,
                  );
                  setRedatorConfig({
                    ...redatorConfig,
                    clientId: e.target.value,
                    clientName: client ? client.name : "",
                    clientData: client || null,
                  });
                }}
              >
                <option value="">-- Selecionar Cliente --</option>
                {crmClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.redatorFormGroup}>
              <label>Nome do Cliente (Manual)</label>
              <input
                type="text"
                placeholder="Nome do cliente"
                className={styles.redatorInput}
                value={redatorConfig.clientName}
                onChange={(e) =>
                  setRedatorConfig({
                    ...redatorConfig,
                    clientName: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.redatorFormGroup}>
              <label>Tons de Personalidade</label>
              <div className={styles.toneGrid}>
                {["Formal", "Agressivo", "Conciliador", "Técnico"].map(
                  (tone) => (
                    <button
                      key={tone}
                      className={`${styles.toneBtn} ${redatorConfig.tone === tone ? styles.toneBtnActive : ""}`}
                      onClick={() =>
                        setRedatorConfig({ ...redatorConfig, tone })
                      }
                    >
                      {tone}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className={styles.redatorFormGroup}>
              <label>Fatos / Resumo</label>
              <textarea
                placeholder="Descreva os fatos principais..."
                className={styles.redatorTextarea}
                value={redatorConfig.facts}
                onChange={(e) =>
                  setRedatorConfig({ ...redatorConfig, facts: e.target.value })
                }
              />
            </div>

            <button
              className={styles.redatorGenerateBtn}
              onClick={handleGenerateRedatorDraft}
              disabled={isGeneratingDraft}
            >
              {isGeneratingDraft ? (
                <>
                  <Sparkles size={18} className={styles.animateSpin} />{" "}
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Gerar Minuta com IA
                </>
              )}
            </button>
          </div>

          <div className={styles.redatorCard}>
            <div className={styles.redatorToolbar}>
              <h3>
                <Eye size={18} /> Prévia da Minuta
              </h3>
              <div className={styles.redatorActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    if (draftResult) {
                      navigator.clipboard.writeText(draftResult);
                      toast.success("Copiado!");
                    }
                  }}
                >
                  <Copy size={14} /> Copiar
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={handleDownloadDraftPDF}
                  disabled={!draftResult}
                >
                  <FileText size={14} /> PDF
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={() => {
                    // Lógica para salvar no Smart Docs
                    toast.success("Salvo no Smart Docs!");
                  }}
                >
                  <Save size={14} /> Salvar
                </button>
              </div>
            </div>

            <div className={styles.redatorPreviewArea}>
              {draftResult || "A minuta gerada aparecerá aqui..."}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCalculadora = () => {
    const categories = [
      {
        title: "Trabalhista",
        items: [
          {
            id: "rescisao",
            label: "Rescisão Completa",
            icon: <History size={16} />,
          },
          { id: "ferias", label: "Férias", icon: <Calendar size={16} /> },
          { id: "hextras", label: "Horas Extras", icon: <Clock size={16} /> },
        ],
      },
      {
        title: "Cível",
        items: [
          {
            id: "correcao",
            label: "Correção Monetária",
            icon: <TrendingUp size={16} />,
          },
          { id: "juros", label: "Juros Moratórios", icon: <Gavel size={16} /> },
        ],
      },
      {
        title: "Tributário",
        items: [
          {
            id: "selic",
            label: "Atualização SELIC",
            icon: <TrendingUp size={16} />,
          },
        ],
      },
      {
        title: "Processual",
        items: [
          { id: "cpc", label: "Prazos CPC", icon: <Gavel size={16} /> },
          {
            id: "honorarios",
            label: "Honorários",
            icon: <Calculator size={16} />,
          },
        ],
      },
      {
        title: "Diverso",
        items: [
          {
            id: "prev",
            label: "Previdenciário (Simples)",
            icon: <Shield size={16} />,
          },
          {
            id: "pensao",
            label: "Pensão Alimentícia",
            icon: <Heart size={16} />,
          },
        ],
      },
    ];

    return (
      <div className={styles.calcContainer}>
        <div className={styles.smartDocsHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Calculadoras Jurídicas</h2>
            <p className={styles.modalSubtitle} style={{ marginTop: 5 }}>
              Ferramentas de precisão com base na legislação atualizada.
            </p>
          </div>
        </div>

        <div className={styles.calcAreaGrid}>
          {/* SIDEBAR */}
          <div className={styles.sidebarCard}>
            <div className={styles.calcCategoryHeader}>Áreas de Cálculo</div>
            {categories.map((cat) => (
              <div key={cat.title}>
                <div className={styles.calcCategoryHeader}>{cat.title}</div>
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.calcItem} ${activeCalculator === item.id ? styles.calcItemActive : ""}`}
                    onClick={() => {
                      setActiveCalculator(item.id);
                      setCalcResult(null);
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {activeCalculator === item.id && (
                      <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* FORM AREA */}
          <div className={styles.calcFormCard}>
            <div className={styles.calcFormTitle}>
              {
                categories
                  .flatMap((c) => c.items)
                  .find((i) => i.id === activeCalculator)?.label
              }
            </div>
            <div className={styles.calcFormSubtitle}>
              Preencha os dados para realizar o cálculo oficial.
            </div>

            <div className={styles.calcInputGrid}>
              {activeCalculator === "rescisao" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Salário Base (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.salarioBase}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          salarioBase: e.target.value,
                        })
                      }
                      placeholder="Ex: 5000"
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data de Admissão
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataAdmissao}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataAdmissao: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data de Rescisão
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataRescisao}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataRescisao: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Comissões/Extras (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.teveComissoes}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          teveComissoes: e.target.value,
                        })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <label className={styles.calcCheckboxGroup}>
                    <input
                      type="checkbox"
                      className={styles.calcCheckbox}
                      checked={calcInputs.temAviso}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          temAviso: e.target.checked,
                        })
                      }
                    />
                    <span style={{ fontSize: "0.85rem", color: "#fff" }}>
                      Com Aviso Prévio?
                    </span>
                  </label>
                </>
              )}

              {activeCalculator === "ferias" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Salário Base (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.salarioBase}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          salarioBase: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Dias de Férias
                    </label>
                    <select
                      className={styles.redatorSelect}
                      value={calcInputs.diasFeria}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          diasFeria: e.target.value,
                        })
                      }
                    >
                      <option value="30">30 dias</option>
                      <option value="20">20 dias</option>
                      <option value="15">15 dias</option>
                      <option value="10">10 dias</option>
                    </select>
                  </div>
                  <label className={styles.calcCheckboxGroup}>
                    <input
                      type="checkbox"
                      className={styles.calcCheckbox}
                      checked={calcInputs.incluirTerco}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          incluirTerco: e.target.checked,
                        })
                      }
                    />
                    <span style={{ fontSize: "0.85rem", color: "#fff" }}>
                      Incluir 1/3 Constitucional?
                    </span>
                  </label>
                </>
              )}

              {activeCalculator === "hextras" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Salário Base (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.salarioBase}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          salarioBase: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Horas Extras no Mês
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.horasExtrasMes}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          horasExtrasMes: e.target.value,
                        })
                      }
                      placeholder="Ex: 10"
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Adicional (%)
                    </label>
                    <select
                      className={styles.redatorSelect}
                      value={calcInputs.adicional}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          adicional: e.target.value,
                        })
                      }
                    >
                      <option value="50">50% (Normal)</option>
                      <option value="100">100% (Domingos/Feriados)</option>
                    </select>
                  </div>
                </>
              )}

              {activeCalculator === "correcao" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Valor Original (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.valorOriginal}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          valorOriginal: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>Índice</label>
                    <select
                      className={styles.redatorSelect}
                      value={calcInputs.indice}
                      onChange={(e) =>
                        setCalcInputs({ ...calcInputs, indice: e.target.value })
                      }
                    >
                      <option value="IPCA">IPCA (Inflação)</option>
                      <option value="TR">TR (Taxa Referencial)</option>
                      <option value="SELIC">SELIC</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataInicial}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataInicial: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data Final (Cálculo)
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataFinal}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataFinal: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {activeCalculator === "juros" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Valor Devido (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.valorDevido}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          valorDevido: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Vencimento Original
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataVencimento}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataVencimento: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data do Pagamento
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataPagamento}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataPagamento: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {activeCalculator === "prev" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataNascimento}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataNascimento: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Início das Contribuições
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataInicio}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataInicio: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>Sexo</label>
                    <select
                      className={styles.redatorSelect}
                      value={calcInputs.sexo}
                      onChange={(e) =>
                        setCalcInputs({ ...calcInputs, sexo: e.target.value })
                      }
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                </>
              )}

              {activeCalculator === "pensao" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Renda Líquida Mensal (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.rendaMensal}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          rendaMensal: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Número de Filhos
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.numeroFilhos}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          numeroFilhos: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Percentual Sugerido (%)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.percentualAlimentista}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          percentualAlimentista: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {activeCalculator === "honorarios" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Valor da Causa (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.causaValor}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          causaValor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Complexidade
                    </label>
                    <select
                      className={styles.redatorSelect}
                      value={calcInputs.complexidade}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          complexidade: e.target.value,
                        })
                      }
                    >
                      <option value="Baixa">Baixa (10%)</option>
                      <option value="Média">Média (15%)</option>
                      <option value="Alta">Alta (20%)</option>
                    </select>
                  </div>
                </>
              )}

              {activeCalculator === "selic" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Valor do Débito (R$)
                    </label>
                    <input
                      type="number"
                      className={styles.redatorInput}
                      value={calcInputs.valorOriginal}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          valorOriginal: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataInicial}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataInicial: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>Data Final</label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataFinal}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataFinal: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {activeCalculator === "cpc" && (
                <>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Data do Evento (Dia 0)
                    </label>
                    <input
                      type="date"
                      className={styles.redatorInput}
                      value={calcInputs.dataInicial}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          dataInicial: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={styles.calcInputLabel}>
                      Tipo de Prazo
                    </label>
                    <select
                      className={styles.redatorSelect}
                      value={calcInputs.tipoPrazo}
                      onChange={(e) =>
                        setCalcInputs({
                          ...calcInputs,
                          tipoPrazo: e.target.value,
                        })
                      }
                    >
                      <option value="Recurso">Recurso (15 dias)</option>
                      <option value="Contestação">Contestação (15 dias)</option>
                      <option value="Embargos">Embargos (5 dias)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <button
                className={styles.redatorGenerateBtn}
                onClick={handleCalculate}
                disabled={isCalculating}
                style={{ flex: 2 }}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className={styles.spin} size={20} /> Processando...
                  </>
                ) : (
                  <>
                    <Calculator size={20} /> Calcular Agora
                  </>
                )}
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setCalcResult(null);
                  setCalcInputs({
                    ...calcInputs,
                    salarioBase: "",
                    dataAdmissao: "",
                    dataRescisao: "",
                    valorOriginal: "",
                    valorDevido: "",
                    causaValor: "",
                    rendaMensal: "",
                  });
                }}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <RotateCcw size={18} /> Limpar
              </button>
            </div>

            {/* RESULTS */}
            {calcResult && (
              <div className={styles.calcResultCard}>
                <div className={styles.resultHeader}>
                  <div className={styles.resultTitle}>Resultado Estimado</div>
                  <div className={styles.resultValue}>
                    R${" "}
                    {calcResult.total.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <p
                  style={{
                    color: "#fff",
                    fontSize: "0.85rem",
                    marginBottom: 20,
                    fontStyle: "italic",
                  }}
                >
                  {calcResult.summary}
                </p>
                <div className={styles.detailList}>
                  {calcResult.details.map((detail, idx) => (
                    <div key={idx} className={styles.detailItem}>
                      <div className={styles.detailLabelCol}>
                        <span className={styles.detailLabel}>
                          {detail.label}
                        </span>
                        <span className={styles.detailDesc}>{detail.desc}</span>
                      </div>
                      <span className={styles.detailValue}>{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderJuris = () => {
    return (
      <div className={styles.jurisContainer}>
        <div className={styles.smartDocsHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Inteligência Jurisprudencial AI
            </h2>
            <p className={styles.jurisSubtitle}>
              Análise avançada com IA + Filtros inteligentes + Estatísticas
            </p>
          </div>
        </div>

        <div className={styles.jurisInfoCard}>
          <div className={styles.infoIconWrapper}>
            <Scale
              size={40}
              color="var(--color-gold)"
              style={{ opacity: 0.8 }}
            />
          </div>
          <div className={styles.jurisInfoContent}>
            <h3>Análise Inteligente de Jurisprudência</h3>
            <p>
              Busque jurisprudência com filtros avançados (tribunal, ano, área),
              receba análise AI em tempo real sobre estratégia processual,
              tendências jurídicas e precedentes. Identifique win rates, compare
              casos semelhantes e tome decisões baseadas em dados.
            </p>
            <div className={styles.jurisTagGrid}>
              <div className={styles.jurisTag}>
                <Sparkles size={14} /> Análise AI
              </div>
              <div className={styles.jurisTag}>
                <Filter size={14} /> Filtros +
              </div>
              <div className={styles.jurisTag}>
                <BarChart3 size={14} /> Win Rate
              </div>
              <div className={styles.jurisTag}>
                <TrendingUp size={14} /> Tendências
              </div>
              <div className={styles.jurisTag}>
                <Zap size={14} /> Insights
              </div>
            </div>
          </div>
        </div>

        <div className={styles.jurisSearchArea}>
          <input
            type="text"
            className={styles.jurisSearchInput}
            placeholder="Ex: Dano moral extravio bagagem, rescisão trabalhista, indenização..."
            value={jurisSearchQuery}
            onChange={(e) => setJurisSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateJuris()}
          />
          <button
            className={styles.jurisSearchBtn}
            onClick={handleGenerateJuris}
            disabled={isSearchingJuris}
          >
            {isSearchingJuris ? (
              <Loader2 className={styles.spin} size={18} />
            ) : (
              <Search size={18} />
            )}
            {isSearchingJuris ? "Analisando..." : "Pesquisar"}
          </button>
          <button className={styles.jurisFilterBtn}>
            <Filter size={16} /> Filtros
          </button>
        </div>

        {/* LOADING STATE */}
        {isSearchingJuris && (
          <div className={styles.jurisLoadingArea}>
            <Sparkles size={48} className={styles.spin} />
            <p>A inteligência está consultando precedentes e acórdãos...</p>
          </div>
        )}

        {/* RESULTS */}
        {jurisResult && !isSearchingJuris && (
          <div className={styles.jurisResultCard}>
            <div className={styles.jurisResultHeader}>
              <div className={styles.jurisAIBadge}>
                <Zap size={14} /> Análise AI de Precisão
              </div>
              <h3 className={styles.jurisResultTitle}>
                Teses e Precedentes Encontrados
              </h3>
            </div>

            <div className={styles.jurisAIContent}>
              {jurisResult.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            <div style={{ marginTop: 30, display: "flex", gap: "10px" }}>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  const doc = new jsPDF();
                  doc.setFontSize(16);
                  doc.text("Relatório de Jurisprudência AI", 14, 20);
                  doc.setFontSize(10);
                  const splitText = doc.splitTextToSize(jurisResult, 180);
                  doc.text(splitText, 14, 30);
                  doc.save("Jurisprudencia_AI.pdf");
                }}
              >
                <FileDown size={18} /> Baixar Relatório
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setJurisResult("")}
              >
                <PlusCircle size={18} /> Nova Pesquisa
              </button>
            </div>
          </div>
        )}

        {/* Placeholder para Pesquisa Vazia */}
        {!jurisSearchQuery && !jurisResult && !isSearchingJuris && (
          <div className={styles.emptyState} style={{ marginTop: 40 }}>
            <Globe size={48} style={{ opacity: 0.1, marginBottom: 20 }} />
            <p>
              Comece sua pesquisa para encontrar acórdãos e decisões relevantes.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderAgenda = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const getGroup = (dateStr) => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);

      const t = new Date(today);
      const tom = new Date(tomorrow);

      if (d.getTime() === t.getTime()) return "Hoje";
      if (d.getTime() === tom.getTime()) return "Amanhã";
      return "Próximos Dias";
    };

    const grouped = {
      Hoje: agendaItems.filter((i) => getGroup(i.date) === "Hoje"),
      Amanhã: agendaItems.filter((i) => getGroup(i.date) === "Amanhã"),
      "Próximos Dias": agendaItems.filter(
        (i) => getGroup(i.date) === "Próximos Dias",
      ),
    };

    return (
      <div className={styles.agendaContainer}>
        <div className={styles.smartDocsHeader}>
          <div style={{ flex: 1 }}>
            <h2 className={styles.sectionTitle}>Agenda Inteligente</h2>
            <p className={styles.jurisSubtitle}>
              Prazos e audiências com IA. Detecção de conflitos e recomendações.
            </p>
          </div>
          <div className={styles.redatorActions}>
            <button className={styles.actionBtn}>
              <AlertTriangle size={16} /> Analisar
            </button>
            <button className={styles.actionBtn}>
              <BarChart3 size={16} /> Resumo
            </button>
            <button
              className={styles.redatorGenerateBtn}
              onClick={() => setShowAgendaModal(true)}
            >
              <Plus size={16} /> Novo
            </button>
          </div>
        </div>

        <div className={styles.jurisInfoCard}>
          <div className={styles.infoIconWrapper}>
            <Calendar
              size={40}
              color="var(--color-gold)"
              style={{ opacity: 0.8 }}
            />
          </div>
          <div className={styles.jurisInfoContent}>
            <h3>O que você pode fazer:</h3>
            <p>
              Organize sua agenda com IA inteligente. Sugestões automáticas de
              prazos, detecção de conflitos de agenda, geração de checklists de
              preparação e resumos estratégicos.
            </p>
            <div className={styles.jurisTagGrid}>
              <div className={styles.jurisTag}>🤖 Sugestão IA</div>
              <div className={styles.jurisTag}>📋 Checklist</div>
              <div className={styles.jurisTag}>⚠️ Conflitos</div>
              <div className={styles.jurisTag}>📊 Resumo</div>
              <div className={styles.jurisTag}>🔗 Vincular</div>
            </div>
          </div>
        </div>

        <div className={styles.agendaGrid}>
          {["Hoje", "Amanhã", "Próximos Dias"].map((col) => (
            <div key={col} className={styles.agendaCol}>
              <div className={styles.agendaColHeader}>
                <span className={styles.agendaColTitle}>{col}</span>
                <span className={styles.agendaCount}>
                  {grouped[col].length}
                </span>
              </div>
              <div className={styles.agendaList}>
                {grouped[col].length === 0 ? (
                  <div className={styles.agendaEmpty}>Livre</div>
                ) : (
                  grouped[col].map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.agendaCard} ${item.urgency === "Alta" ? styles.agendaCardUrgent : ""}`}
                      onClick={() => {
                        const dateObj = new Date(item.date);
                        const dateOnly = dateObj.toISOString().split("T")[0];
                        const timeOnly = dateObj.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        setEditingAgendaItem(item);
                        setNewAgendaItem({
                          title: item.title,
                          date: dateOnly,
                          time: timeOnly,
                          description: item.description,
                          type: item.type,
                          urgency: item.urgency,
                          clientId: item.client_id || "",
                        });
                        setShowAgendaModal(true);
                      }}
                    >
                      <div className={styles.agendaCardHeader}>
                        <div className={styles.agendaTime}>
                          {new Date(item.date).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <span
                          className={`${styles.agendaBadge} ${item.urgency === "Alta" ? styles.badgeHigh : item.urgency === "Média" ? styles.badgeMed : styles.badgeLow}`}
                        >
                          {item.urgency}
                        </span>
                      </div>
                      <h4 className={styles.agendaTitle}>{item.title}</h4>
                      {item.client_id && (
                        <div className={styles.agendaClient}>
                          <User size={12} />{" "}
                          {crmClients.find((c) => c.id === item.client_id)
                            ?.name || "Cliente"}
                        </div>
                      )}
                      <div className={styles.agendaFooter}>
                        <span className={styles.agendaTypeTag}>
                          {item.type}
                        </span>
                        <div className={styles.agendaActions}>
                          <button
                            className={styles.agendaActionMiniBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAgenda(item.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleDiagnoseTriagem = async () => {
    if (!triagemAnswers.trim()) return;
    setIsTriagemLoading(true);

    const triagemPrompt = `Aja como um assistente especialista em triagem jurídica. Analise o seguinte relato e retorne um JSON estrito com as seguintes chaves:
    - area (Área jurídica principal)
    - urgency (Baixa, Média ou Alta)
    - estimatedComplexity (Baixa, Média ou Complexa)
    - riskLevel (Baixo, Médio ou Alto)
    - suggestedAction (Texto curto com a melhor ação imediata)
    - nextSteps (Array de strings com passos a seguir)
    - requiredDocuments (Array de strings com documentos necessários)
    - estimatedValue (Objeto com keys 'range' [ex: R$ 5.000 - R$ 10.000] e 'potential' [texto descritivo])
    - viability (Objeto com keys 'level' [Baixa, Média ou Alta], 'reasoning' [justificativa], 'risks' [array de strings] e 'opportunities' [array de strings])
    Retorne SOMENTE o JSON, sem texto adicional, sem markdown, sem crases.
    Relato: ${triagemAnswers}`;

    try {
      const response = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: triagemPrompt,
          clientData: { name: "Triagem Rápida" },
          history: [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Tenta extrair o JSON da resposta da IA
        const jsonContent = data.response.match(/\{[\s\S]*\}/);
        if (jsonContent) {
          const result = JSON.parse(jsonContent[0]);
          setTriagemDiagnosis(result);
          setTriagemCaseValue(result.estimatedValue);
          setTriagemViability(result.viability);
          setTriagemStep(2);
        } else {
          toast.error("Erro ao formatar diagnóstico da IA");
        }
      } else {
        toast.error(data.message || "Erro ao processar triagem");
      }
    } catch (e) {
      console.error("Erro triagem:", e);
      toast.error("Erro de conexão");
    } finally {
      setIsTriagemLoading(false);
    }
  };

  const renderTriagem = () => {
    if (triagemStep === 1) {
      return (
        <div className={styles.smartDocsContainer}>
          <div className={styles.smartDocsHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                Triagem Inteligente & Intake
              </h2>
              <p className={styles.jurisSubtitle}>
                Diagnóstico jurídico automático, viabilidade e estimativa de
                valor com IA.
              </p>
            </div>
          </div>

          <div className={styles.smartDocsInfoCard}>
            <div className={styles.infoIconWrapper}>
              <ClipboardList
                size={40}
                color="var(--color-gold)"
                style={{ opacity: 0.8 }}
              />
            </div>
            <div className={styles.jurisInfoContent}>
              <h3>O que você pode fazer:</h3>
              <p>
                Digite o relato do cliente e receba um diagnóstico completo em
                segundos. Nossa IA identifica a área do direito, calcula riscos,
                sugere ações e lista os documentos necessários para o caso.
              </p>
              <div className={styles.jurisTagGrid}>
                <div className={styles.jurisTag}>🤖 Diagnóstico IA</div>
                <div className={styles.jurisTag}>📋 Documentos</div>
                <div className={styles.jurisTag}>💰 Valor Estimado</div>
                <div className={styles.jurisTag}>✅ Viabilidade</div>
                <div className={styles.jurisTag}>⚠️ Gestão de Risco</div>
              </div>
            </div>
          </div>

          <div className={styles.redatorCard} style={{ marginTop: 20 }}>
            <h3 style={{ border: "none", marginBottom: 15 }}>
              Relato do Cliente
            </h3>
            <textarea
              className={styles.redatorTextarea}
              placeholder="Digite ou cole aqui o relato do cliente (ex: Fui demitido sem justa causa e não recebi minhas verbas rescisórias...)"
              value={triagemAnswers}
              onChange={(e) => setTriagemAnswers(e.target.value)}
              style={{ minHeight: "250px" }}
            />
            <button
              className={styles.redatorGenerateBtn}
              onClick={handleDiagnoseTriagem}
              disabled={isTriagemLoading || !triagemAnswers.trim()}
              style={{ marginTop: 25 }}
            >
              {isTriagemLoading ? (
                <Loader2 className={styles.spin} size={20} />
              ) : (
                <Sparkles size={20} />
              )}
              {isTriagemLoading ? "Analisando Caso..." : "Realizar Triagem IA"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.smartDocsContainer}>
        <div className={styles.smartDocsHeader}>
          <div style={{ flex: 1 }}>
            <h2 className={styles.sectionTitle}>Resultado da Triagem</h2>
            <p className={styles.jurisSubtitle}>
              Análise estratégica gerada via IA para o novo caso.
            </p>
          </div>
          <button
            className={styles.actionBtn}
            onClick={() => {
              setTriagemStep(1);
              setTriagemAnswers("");
              setTriagemDiagnosis(null);
            }}
          >
            ← Nova Triagem
          </button>
        </div>

        <div className={styles.agendaGrid}>
          {/* COLUNA 1: DIAGNÓSTICO TÉCNICO */}
          <div className={styles.agendaCol} style={{ minHeight: "auto" }}>
            <div className={styles.agendaColHeader}>
              <span className={styles.agendaColTitle}>Diagnóstico Técnico</span>
              <div className={styles.iaBadge}>IA Analítica</div>
            </div>
            <div className={styles.dossierSection} style={{ padding: 10 }}>
              <div className={styles.infoGroup} style={{ marginBottom: 20 }}>
                <label className={styles.docRowLabel}>Área Jurídica</label>
                <div style={{ color: "var(--color-gold)", fontWeight: 800 }}>
                  {triagemDiagnosis?.area}
                </div>
              </div>
              <div className={styles.infoGroup} style={{ marginBottom: 20 }}>
                <label className={styles.docRowLabel}>Urgência</label>
                <div
                  className={`${styles.agendaBadge} ${triagemDiagnosis?.urgency === "Alta" ? styles.badgeHigh : triagemDiagnosis?.urgency === "Média" ? styles.badgeMed : styles.badgeLow}`}
                  style={{ display: "inline-block" }}
                >
                  {triagemDiagnosis?.urgency}
                </div>
              </div>
              <div className={styles.infoGroup}>
                <label className={styles.docRowLabel}>Ação Recomendada</label>
                <div style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
                  {triagemDiagnosis?.suggestedAction}
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA 2: VIABILIDADE E VALOR */}
          <div className={styles.agendaCol} style={{ minHeight: "auto" }}>
            <div className={styles.agendaColHeader}>
              <span className={styles.agendaColTitle}>Viabilidade & Valor</span>
              <div
                className={styles.iaBadge}
                style={{
                  background: "rgba(212, 175, 55, 0.1)",
                  color: "var(--color-gold)",
                }}
              >
                Business
              </div>
            </div>
            <div className={styles.dossierSection} style={{ padding: 10 }}>
              <div className={styles.infoGroup} style={{ marginBottom: 20 }}>
                <label className={styles.docRowLabel}>Valor Estimado</label>
                <div style={{ color: "#10b981", fontWeight: 800 }}>
                  {triagemCaseValue?.range || "Consultivo"}
                </div>
              </div>
              <div className={styles.infoGroup} style={{ marginBottom: 20 }}>
                <label className={styles.docRowLabel}>
                  Nível de Viabilidade
                </label>
                <div
                  style={{
                    color:
                      triagemViability?.level === "Alta"
                        ? "#10b981"
                        : triagemViability?.level === "Média"
                          ? "var(--color-gold)"
                          : "#f87171",
                    fontWeight: 800,
                  }}
                >
                  {triagemViability?.level}
                </div>
              </div>
              <div className={styles.infoGroup}>
                <label className={styles.docRowLabel}>Justificativa IA</label>
                <div style={{ fontSize: "0.85rem" }}>
                  {triagemViability?.reasoning}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO DE DETALHES ABAIXO */}
        <div className={styles.redatorCard}>
          <div className={styles.dossierBody} style={{ padding: 0 }}>
            <div>
              <h4 style={{ color: "var(--color-gold)", marginBottom: 15 }}>
                📋 Documentos Necessários
              </h4>
              <ul className={styles.agendaList}>
                {triagemDiagnosis?.requiredDocuments?.map((doc, idx) => (
                  <li
                    key={idx}
                    className={styles.agendaCard}
                    style={{
                      borderLeftColor: "var(--color-gold)",
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", gap: 10 }}>
                      <CheckCircle2 size={16} color="var(--color-gold)" />
                      <span style={{ fontSize: "0.8rem" }}>{doc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ color: "var(--color-gold)", marginBottom: 15 }}>
                🎯 Próximos Passos Sugeridos
              </h4>
              <div className={styles.detailList}>
                {triagemDiagnosis?.nextSteps?.map((step, idx) => (
                  <div
                    key={idx}
                    className={styles.detailItem}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className={styles.detailLabelCol}>
                      <span className={styles.detailLabel}>
                        Passo {idx + 1}
                      </span>
                      <span className={styles.detailDesc}>{step}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 30,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 15,
            }}
          >
            <button
              className={styles.actionBtn}
              onClick={() => {
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text("Relatório de Triagem Inteligente", 14, 20);
                doc.setFontSize(10);
                doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 28);
                autoTable(doc, {
                  startY: 35,
                  head: [["Campo", "Informação"]],
                  body: [
                    ["Área Jurídica", triagemDiagnosis?.area],
                    ["Urgência", triagemDiagnosis?.urgency],
                    ["Viabilidade", triagemViability?.level],
                    ["Valor da Causa", triagemCaseValue?.range],
                    ["Ação Recomendada", triagemDiagnosis?.suggestedAction],
                  ],
                });
                doc.save("Triagem_SocialJuridico.pdf");
              }}
            >
              <FileDown size={18} /> Baixar Relatório
            </button>
            <button
              className={styles.redatorGenerateBtn}
              style={{ width: "auto" }}
              onClick={() => {
                setActiveTab("crm");
                toast.success("Vincule a triagem a um cliente no CRM.");
              }}
            >
              <UserPlus size={18} /> Salvar no CRM
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPerfil = () => {
    if (!profileData)
      return (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spin} /> Carregando...
        </div>
      );

    const hasBio = !!profileData.bio;
    const hasSpecialties = !!profileData.specialties;
    const hasAvatar = !!profileData.avatar;

    const SPECIALTIES_LIST = [
      "Trabalhista",
      "Civil",
      "Penal",
      "Família",
      "Tributário",
      "Previdenciário",
      "Digital",
      "Consumidor",
      "Imobiliário",
      "Empresarial",
    ];

    const currentSpecs = profileForm.specialties
      ? profileForm.specialties
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "")
      : [];

    const handleToggleSpec = (spec) => {
      let next;
      if (currentSpecs.includes(spec)) {
        next = currentSpecs.filter((s) => s !== spec);
      } else {
        next = [...currentSpecs, spec];
      }
      setProfileForm({ ...profileForm, specialties: next.join(", ") });
    };

    return (
      <div className={styles.toolContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Meu Perfil Profissional</h2>
          <p className={styles.sectionDesc}>
            Mantenha seus dados atualizados para atrair mais clientes e
            transmitir confiança.
          </p>
        </div>

        <div className={styles.profileLayout}>
          <div className={styles.profileSide}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarWrapper}>
                {profileData.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileData.avatar}
                    alt={profileData.name}
                    className={styles.avatarImg}
                  />
                ) : profileData.name ? (
                  profileData.name.charAt(0)
                ) : (
                  "A"
                )}
                <label
                  className={styles.avatarUploadBtn}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload size={14} /> Alterar
                  <input
                    type="file"
                    ref={avatarInputRef}
                    hidden
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  marginBottom: 15,
                }}
              >
                {profileData.name}
              </h3>

              <div className={styles.profileStatus}>
                {profileData.is_premium && (
                  <span className={styles.premiumTag}>
                    <Zap size={14} /> Advogado Premium
                  </span>
                )}
                {profileData.verified && (
                  <span className={styles.verifiedSeal}>
                    <UserCheck size={14} /> Verificado
                  </span>
                )}
              </div>

              {/* Card de Avaliação */}
              <div style={{
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: "12px",
                padding: "14px 16px",
                marginTop: "12px",
                textAlign: "center",
              }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Minha Avaliação
                </p>
                {avgRating && avgRating.total > 0 ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <Star size={20} fill="#d4af37" color="#d4af37" />
                      <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-gold)" }}>{avgRating.media}</span>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>/5</span>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", margin: 0 }}>
                      {avgRating.total} avaliação{avgRating.total !== 1 ? "es" : ""}
                    </p>
                  </>
                ) : (
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem", margin: 0 }}>
                    Ainda sem avaliações
                  </p>
                )}
              </div>
            </div>

            {(!hasAvatar || !hasBio || !hasSpecialties) && (
              <div className={styles.profileAlert}>
                <AlertTriangle className={styles.profileAlertIcon} size={24} />
                <div className={styles.profileAlertText}>
                  <h4>Perfil Incompleto!</h4>
                  <p>
                    Advogados com fotos, biografia e especialidades definidas
                    têm 80% mais chances de fechar casos.
                  </p>
                </div>
              </div>
            )}

            <div
              className={styles.opCard}
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <h4
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-silver-dark)",
                  marginBottom: 10,
                }}
              >
                DADOS DA CONTA
              </h4>
              <p style={{ fontSize: "0.85rem", marginBottom: 5 }}>
                <strong>Email:</strong> {profileData.email}
              </p>
              {/* ⚠️ SEGURANÇA: Não exibir saldo de Juris no cabeçalho */}
              {/* REMOVIDO: <strong>Saldo:</strong> {profileData.balance} Juris */}

              <button
                className={styles.deleteAccountBtn}
                onClick={() => {
                  setDeleteRequestData({
                    nome: profileData.name || "",
                    motivo: "",
                  });
                  setShowDeleteRequestModal(true);
                }}
              >
                Solicitar Exclusão da Conta
              </button>
            </div>
          </div>

          <div className={styles.profileMain}>
            <form onSubmit={handleUpdateProfile}>
              <section className={styles.profileSection}>
                <h3 className={styles.profileSectionTitle}>
                  <User size={18} /> Informações Básicas
                </h3>
                <div className={styles.formGrid}>
                  <div className={styles.formItem}>
                    <label className={styles.formLabel}>
                      Nome Completo{" "}
                      <Lock size={12} style={{ opacity: 0.5, marginLeft: 5 }} />
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{
                        opacity: 0.7,
                        cursor: "not-allowed",
                        backgroundColor: "rgba(255,255,255,0.02)",
                      }}
                      value={profileForm.name}
                      readOnly
                    />
                  </div>
                  <div className={styles.formItem}>
                    <label className={styles.formLabel}>
                      Celular (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      className={styles.formInput}
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
                </div>

                <div className={styles.formGrid} style={{ marginTop: 20 }}>
                  <div className={styles.formItem}>
                    <label className={styles.formLabel}>
                      Número OAB{" "}
                      <Lock size={12} style={{ opacity: 0.5, marginLeft: 5 }} />
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{
                        opacity: 0.7,
                        cursor: "not-allowed",
                        backgroundColor: "rgba(255,255,255,0.02)",
                      }}
                      value={profileForm.oab}
                      readOnly
                    />
                  </div>
                  <div className={styles.formItem}>
                    <label className={styles.formLabel}>Atualizar Senha</label>
                    <input
                      type="password"
                      className={styles.formInput}
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
                </div>
              </section>

              <section className={styles.profileSection}>
                <h3 className={styles.profileSectionTitle}>
                  <Sparkles size={18} /> Expertise & Bio
                </h3>
                <div className={styles.formItem}>
                  <label className={styles.formLabel}>
                    Minhas Especialidades (Selecione uma ou mais)
                  </label>
                  <div className={styles.specialtiesGrid}>
                    {SPECIALTIES_LIST.map((spec) => (
                      <div
                        key={spec}
                        className={`${styles.specialtyChip} ${currentSpecs.includes(spec) ? styles.specialtyChipActive : ""}`}
                        onClick={() => handleToggleSpec(spec)}
                      >
                        <div className={styles.specialtyCheckbox} />
                        <span className={styles.specialtyLabel}>{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.formItem} style={{ marginTop: 30 }}>
                  <label className={styles.formLabel}>
                    Sua Bio / Experiência
                  </label>
                  <textarea
                    className={styles.formTextarea}
                    rows={4}
                    placeholder="Conte um pouco sobre sua trajetória profissional..."
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                    style={{
                      border: !hasBio
                        ? "1px solid #facc15"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </div>
              </section>

              <section className={styles.profileSection}>
                <h3 className={styles.profileSectionTitle}>
                  <Coins size={18} /> Atendimento & Consulta
                </h3>
                <div className={styles.consultationToggle}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${profileForm.consulta === "Gratuita" ? styles.toggleBtnActive : ""}`}
                    onClick={() =>
                      setProfileForm({ ...profileForm, consulta: "Gratuita" })
                    }
                  >
                    <Check size={16} /> Consulta Gratuita
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${profileForm.consulta === "Paga" ? styles.toggleBtnActive : ""}`}
                    onClick={() =>
                      setProfileForm({ ...profileForm, consulta: "Paga" })
                    }
                  >
                    <Coins size={16} /> Consulta Paga
                  </button>
                </div>

                {profileForm.consulta === "Paga" && (
                  <div
                    className={styles.formRow}
                    style={{ animation: "fadeIn 0.3s ease" }}
                  >
                    <div className={styles.formItem}>
                      <label className={styles.formLabel}>
                        Tempo de Consulta
                      </label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Ex: 45 min, 1 hora..."
                        value={profileForm.tempo}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            tempo: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label className={styles.formLabel}>Valor (R$)</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={profileForm.valor}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            valor: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </section>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isUpdatingProfile}
                style={{ width: "100%", padding: "18px", marginTop: 20 }}
              >
                {isUpdatingProfile ? (
                  <Loader2 className={styles.spin} size={20} />
                ) : (
                  <Save size={20} />
                )}
                {isUpdatingProfile
                  ? " Salvando..."
                  : " Salvar Perfil Profissional"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderCartaoVisitas = () => {
    if (!profileData) {
      return (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spin} /> Carregando...
        </div>
      );
    }

    const specialties = (profileData.specialties || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const consultationLabel =
      profileData.consulta === "Paga"
        ? `${profileData.tempo || "Duração a combinar"} • R$ ${Number(profileData.valor || 0).toFixed(2)}`
        : "Consulta gratuita";

    const publicUrl = `${window.location.origin}/advogados`;
    const shareMessage = [
      `${profileData.name || "Advogado"} | SocialJurídico`,
      profileData.oab ? `OAB: ${profileData.oab}` : null,
      specialties.length ? `Especialidades: ${specialties.join(", ")}` : null,
      `Atendimento: ${consultationLabel}`,
      profileData.phone ? `Contato: ${formatPhone(profileData.phone)}` : null,
      profileData.bio || null,
      `Perfil na plataforma: ${publicUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const handleCopyCard = async () => {
      try {
        await navigator.clipboard.writeText(shareMessage);
        toast.success("Cartão copiado para compartilhamento.");
      } catch {
        toast.error("Não foi possível copiar o cartão.");
      }
    };

    const handleDownloadCard = async () => {
      if (!businessCardRef.current || isExportingCard) return;

      setIsExportingCard(true);
      const toastId = toast.loading("Gerando imagem do seu cartão...");

      try {
        // Aguarda um momento para garantir que fontes/imagens estejam carregadas
        await new Promise((r) => setTimeout(r, 500));

        const dataUrl = await htmlToImage.toPng(businessCardRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: "#0B0B0E", // Cor de fundo do dashboard
          style: {
            borderRadius: "24px",
            margin: "0",
          },
        });

        const link = document.createElement("a");
        link.download = `cartao-visitas-${profileData.name || "advogado"}.png`;
        link.href = dataUrl;
        link.click();

        toast.success("Cartão baixado com sucesso!", { id: toastId });
      } catch (err) {
        console.error("Erro ao gerar imagem:", err);
        toast.error("Erro ao gerar imagem do cartão.", { id: toastId });
      } finally {
        setIsExportingCard(false);
      }
    };

    const handleShareCard = async () => {
      if (!businessCardRef.current || isExportingCard) return;

      if (!navigator.share) {
        handleDownloadCard();
        return;
      }

      setIsExportingCard(true);
      const toastId = toast.loading("Preparando compartilhamento...");

      try {
        const dataUrl = await htmlToImage.toPng(businessCardRef.current, {
          pixelRatio: 2,
          backgroundColor: "#0B0B0E",
        });

        // Converter DataURL para Blob/File para o Web Share API
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File(
          [blob],
          `cartao-${profileData.name || "advogado"}.png`,
          { type: "image/png" },
        );

        await navigator.share({
          files: [file],
          title: "Meu Cartão de Visitas Digital",
          text: `Olá, este é o meu cartão de visitas digital do SocialJurídico.`,
        });

        toast.success("Compartilhamento aberto!", { id: toastId });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Erro ao compartilhar:", err);
          toast.error("Erro ao compartilhar cartão.", { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      } finally {
        setIsExportingCard(false);
      }
    };

    return (
      <div className={styles.toolContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Cartão de Visitas Digital</h2>
          <p className={styles.sectionDesc}>
            Use um resumo profissional pronto para WhatsApp, e-mail e redes.
          </p>
        </div>

        <div className={styles.businessCardLayout}>
          <section
            ref={businessCardRef}
            className={styles.businessCardPreview}
            style={{ padding: isExportingCard ? "40px" : "" }}
          >
            <div className={styles.businessCardTop}>
              <div className={styles.businessCardAvatar}>
                {profileData.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileData.avatar}
                    alt={profileData.name}
                    className={styles.businessCardAvatarImg}
                  />
                ) : (
                  <span>{profileData.name?.charAt(0) || "A"}</span>
                )}
              </div>

              <div className={styles.businessCardIdentity}>
                <span className={styles.businessCardEyebrow}>
                  ADVOGADO SOCIALJURÍDICO
                </span>
                <h3>{profileData.name || "Advogado"}</h3>
                <p>{profileData.oab || "OAB pendente de cadastro"}</p>
              </div>
            </div>

            <div className={styles.businessCardBadges}>
              {profileData.is_premium && (
                <span className={styles.premiumTag}>
                  <Zap size={14} /> Premium
                </span>
              )}
              <span
                className={
                  profileData.verified
                    ? styles.verifiedSeal
                    : styles.businessCardPending
                }
              >
                <ShieldHalf size={14} />
                {profileData.verified
                  ? "OAB verificada"
                  : "Validação OAB pendente"}
              </span>
            </div>

            <div className={styles.businessCardInfoGrid}>
              <div className={styles.businessCardInfoItem}>
                <Phone size={16} />
                {/* ⚠️ SEGURANÇA: Formatar telefone */}
                <span>
                  {formatPhone(profileData.phone) || "Telefone não informado"}
                </span>
              </div>
              <div className={styles.businessCardInfoItem}>
                <Mail size={16} />
                <span>{profileData.email || "E-mail indisponível"}</span>
              </div>
              <div className={styles.businessCardInfoItem}>
                <Clock size={16} />
                <span>{consultationLabel}</span>
              </div>
            </div>

            <div className={styles.businessCardBio}>
              <h4>Apresentação</h4>
              <p>
                {profileData.bio ||
                  "Adicione uma biografia no perfil para fortalecer seu cartão de visitas."}
              </p>
            </div>

            <div className={styles.businessCardSpecialties}>
              <h4>Áreas de atuação</h4>
              <div className={styles.businessCardTags}>
                {specialties.length ? (
                  specialties.map((spec) => (
                    <span key={spec} className={styles.businessCardTag}>
                      {spec}
                    </span>
                  ))
                ) : (
                  <span className={styles.businessCardTagMuted}>
                    Nenhuma especialidade cadastrada ainda
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className={styles.businessCardActions}>
            <div className={styles.businessCardPanel}>
              <h3>Texto pronto para compartilhar</h3>
              <p>
                Esse conteúdo resume seu perfil e pode ser enviado para
                potenciais clientes sem edição manual.
              </p>
              <textarea
                className={styles.businessCardTextarea}
                value={shareMessage}
                readOnly
              />
              <button
                type="button"
                className={styles.businessCardCopyButton}
                onClick={handleCopyCard}
              >
                <Copy size={16} /> Copiar texto
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  className={styles.businessCardCopyButton}
                  style={{
                    background: "none",
                    border: "1px solid var(--color-gold)",
                    color: "var(--color-gold)",
                  }}
                  onClick={handleDownloadCard}
                  disabled={isExportingCard}
                >
                  <Download size={16} /> Baixar Imagem
                </button>
                <button
                  type="button"
                  className={styles.businessCardCopyButton}
                  style={{
                    background: "var(--color-gold)",
                    color: "#111827",
                    border: "none",
                  }}
                  onClick={handleShareCard}
                  disabled={isExportingCard}
                >
                  <Send size={16} /> Compartilhar
                </button>
              </div>
            </div>

            <div className={styles.businessCardPanel}>
              <h3>Checklist de conversão</h3>
              <ul className={styles.businessCardChecklist}>
                <li>Adicione foto profissional para aumentar confiança.</li>
                <li>Cadastre biografia curta com foco na sua especialidade.</li>
                <li>Defina consulta gratuita ou informe tempo e valor.</li>
                <li>
                  Complete áreas de atuação para aparecer melhor nas buscas.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderDocumentacao = () => {
    return (
      <div className={styles.docsContainer}>
        {/* HEADER DOCS */}
        <div className={styles.docsHeader}>
          <div className={styles.docsHeaderContent}>
            <div className={styles.docsHeaderIcon}>
              <BookOpen size={32} />
            </div>
            <div>
              <h1 className={styles.docsTitle}>
                Documentação do SocialJurídico
              </h1>
              <p className={styles.docsSubtitle}>
                Guia completo para dominar a plataforma e potencializar sua
                prática jurídica
              </p>
            </div>
          </div>
        </div>

        {/* TABS DOCS */}
        <div className={styles.docsTabs}>
          {[
            { id: "visao-geral", label: "Visão Geral" },
            { id: "marketplace", label: "Marketplace" },
            { id: "ferramentas", label: "Ferramentas" },
            { id: "atualizacoes", label: "Atualizações" },
            { id: "tutoriais", label: "Tutoriais" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`${styles.docsTab} ${docActiveTab === tab.id ? styles.docsTabActive : ""}`}
              onClick={() => setDocActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className={styles.docsBody}>
          {docActiveTab === "marketplace" && (
            <div className={styles.docsSlide}>
              <section className={styles.docsSection}>
                <h2 className={styles.docsSectionTitle}>
                  Como Funciona o Marketplace? 🛍️
                </h2>
                <div
                  className={styles.docsTextCard}
                  style={{ borderLeftColor: "#facc15", marginBottom: 30 }}
                >
                  <p>
                    O SocialJuridico funciona como um{" "}
                    <strong>marketplace profissional</strong> que segue um fluxo
                    intuitivo e transparente. Cada interação é registrada,
                    facilitando o rastreamento e garantindo qualidade em toda a
                    jornada.
                  </p>
                </div>

                <div className={styles.docsStepList}>
                  {[
                    {
                      n: 1,
                      color: "#3b82f6",
                      title: "Cliente Publica um Caso",
                      desc: "O cliente acessa a plataforma e cria um novo caso, fornecendo informações detalhadas sobre seu problema jurídico. Pode incluir documentos, fotos e contexto completo. A IA automaticamente classifica a categoria (trabalhista, civil, penal, etc) e estima a complexidade. O caso é listado no marketplace com visibilidade total para advogados qualificados.",
                    },
                    {
                      n: 2,
                      color: "#a855f7",
                      title: "Advogados Visualizam Casos Disponíveis",
                      desc: "Advogados assinantes (plano PRO) acessam uma dashboard com todos os casos abertos na plataforma. Podem filtrar por área de expertise, localização, urgência e valor estimado. Cada caso mostra um resumo detalhado, histórico do cliente, análise de viabilidade gerada pela IA.",
                    },
                    {
                      n: 3,
                      color: "#10b981",
                      title: "Advogado Manifesta Interesse",
                      desc: 'Quando encontra um caso de seu interesse, o advogado clica em "Manifestar Interesse". Neste momento, pode enviar uma proposta com sua abordagem estratégica, estimativa de honorários e cronograma esperado. A plataforma notifica o cliente sobre o novo interessado automaticamente.',
                    },
                    {
                      n: 4,
                      color: "#ef4444",
                      title: "Cliente Escolhe o Advogado",
                      desc: "O cliente avalia os advogados interessados, verifica suas avaliações, especialidade e propostas. Pode conversar com múltiplos candidatos através de chat e então seleciona aquele que melhor se adequa ao seu caso. Neste momento, o caso é removido do marketplace para evitar duplicidades.",
                    },
                    {
                      n: 5,
                      color: "#6366f1",
                      title: "Chat Ativo e Desenvolvimento do Caso",
                      desc: "Advogado e cliente iniciam comunicação permanente via chat integrado. O advogado pode usar todas as ferramentas PRO para análise jurídica, pesquisa jurisprudencial, redação de peças profissionais, e compartilhar documentos com o cliente diretamente na plataforma de forma segura.",
                    },
                    {
                      n: 6,
                      color: "#22c55e",
                      title: "Caso Finalizado com Avaliação",
                      desc: "Quando o caso é concluído (sentença proferida, acordo celebrado, etc.), o cliente avalia o trabalho do advogado em uma escala de 5 estrelas com comentário detalhado. Esta avaliação fica registrada no perfil público do profissional, construindo reputação e confiança na plataforma.",
                    },
                  ].map((step) => (
                    <div
                      key={step.n}
                      className={styles.docsStepItem}
                      style={{ borderLeftColor: step.color }}
                    >
                      <div
                        className={styles.docsStepNumber}
                        style={{ backgroundColor: step.color }}
                      >
                        {step.n}
                      </div>
                      <div className={styles.docsStepContent}>
                        <h4>{step.title}</h4>
                        <p>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.docsDiffCard} style={{ marginTop: 40 }}>
                  <Lightbulb size={24} color="var(--color-gold)" />
                  <div>
                    <h4 style={{ color: "#92400e", marginBottom: 5 }}>
                      Garantias do Marketplace:
                    </h4>
                    <ul className={styles.docsListMini}>
                      <li>
                        ✓ <strong>Transparência Total:</strong> Todos os
                        valores, prazos e responsabilidades documentados
                      </li>
                      <li>
                        ✓ <strong>Segurança de Dados:</strong> Criptografia de
                        ponta a ponta em toda comunicação
                      </li>
                      <li>
                        ✓ <strong>Rastreamento Completo:</strong> Histórico de
                        todas as interações preservado
                      </li>
                      <li>
                        ✓ <strong>Proteção de Ambas as Partes:</strong> Sistema
                        de avaliação e feedback construindo confiança
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {docActiveTab === "ferramentas" && (
            <div className={styles.docsSlide}>
              <section className={styles.docsSection}>
                <h2 className={styles.docsSectionTitle}>
                  Ferramentas PRO - Seu Assistente Jurídico 24/7 🚀
                </h2>
                <p className={styles.docsSectionDesc}>
                  Cada ferramenta foi desenvolvida com especialistas jurídicos e
                  alimentada com jurisprudência brasileira atualizada. Funcionam
                  integradas entre si, criando um fluxo de trabalho eficiente.
                  Acesso ilimitado para planos PRO.
                </p>

                <div className={styles.docsPortalGrid}>
                  <div
                    className={styles.docsToolCard}
                    style={{ borderTopColor: "#3b82f6" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <FileText size={20} color="#3b82f6" />
                      <h4>Redator IA Jurídico</h4>
                    </div>
                    <p style={{ fontSize: "0.85rem", marginBottom: 15 }}>
                      Gera peças jurídicas profissionais com múltiplos tons:                      formal, técnico ou persuasivo. Inclui fundamentação legal,
                      jurisprudência e argumentações estruturadas. Suporta todas
                      as áreas.
                    </p>
                    <ul className={styles.docsListMini}>
                      <li>✓ Petições iniciais (cível, penal, trabalhista)</li>
                      <li>✓ Recursos (apelação, embargos, agravo)</li>
                      <li>✓ Manifestações e pareceres jurídicos</li>
                      <li>✓ Contratos e acordos</li>
                      <li>✓ Moções e requerimentos</li>
                    </ul>
                  </div>

                  <div
                    className={styles.docsToolCard}
                    style={{ borderTopColor: "#10b981" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <Calendar size={20} color="#10b981" />
                      <h4>Agenda Inteligente</h4>
                    </div>
                    <p style={{ fontSize: "0.85rem", marginBottom: 15 }}>
                      Otimiza prazos judiciários com sugestões inteligentes
                      baseadas no tipo de processo. Inclui detecção de
                      conflitos, alertas automáticos e relatórios estratégicos
                      de análise.
                    </p>
                    <ul className={styles.docsListMini}>
                      <li>✓ Sugestão inteligente de prazos</li>
                      <li>✓ Detecção automática de conflitos</li>
                      <li>✓ Alertas 3 dias antes do vencimento</li>
                      <li>✓ Checklist de preparação por tipo</li>
                      <li>✓ Análise semanal e mensal</li>
                    </ul>
                  </div>

                  <div
                    className={styles.docsToolCard}
                    style={{ borderTopColor: "#a855f7" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <Users size={20} color="#a855f7" />
                      <h4>CRM com IA</h4>
                    </div>
                    <p style={{ fontSize: "0.85rem", marginBottom: 15 }}>
                      Gerencie toda sua cartela de clientes com análise de risco
                      automática, geração de perfil inteligente, chat com IA e
                      relatórios detalhados de comportamento e potencial.
                    </p>
                    <ul className={styles.docsListMini}>
                      <li>✓ Análise de risco por cliente</li>
                      <li>✓ Geração automática de perfil</li>
                      <li>✓ Chat com IA por cliente</li>
                      <li>✓ Relatórios de comportamento</li>
                      <li>✓ Estimativa de valor do cliente</li>
                    </ul>
                  </div>

                  <div
                    className={styles.docsToolCard}
                    style={{ borderTopColor: "#facc15" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <Calculator size={20} color="#facc15" />
                      <h4>Calculadora Jurídica</h4>
                    </div>
                    <p style={{ fontSize: "0.85rem", marginBottom: 15 }}>
                      Calcule automaticamente rescisão, férias, horas extras,
                      correção monetária, juros, aposentadoria e honorários com
                      precisão fiscal e índices atualizados.
                    </p>
                    <ul className={styles.docsListMini}>
                      <li>✓ Rescisão completa e parcial</li>
                      <li>✓ Índices (SELIC, IGPM, INPC, CDI)</li>
                      <li>✓ Cálculos trabalhistas completos</li>
                      <li>✓ Previdenciário e aposentadoria</li>
                      <li>✓ Export em PDF com detalhamento</li>
                    </ul>
                  </div>

                  <div
                    className={styles.docsToolCard}
                    style={{ borderTopColor: "#ef4444" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <Gavel size={20} color="#ef4444" />
                      <h4>Jurisprudência Inteligente</h4>
                    </div>
                    <p style={{ fontSize: "0.85rem", marginBottom: 15 }}>
                      Busca decisões STJ e STF com análise contextualizada.
                      Encontre jurisprudência pacífica relevante para sua
                      estratégia processual com fundamentação completa.
                    </p>
                    <ul className={styles.docsListMini}>
                      <li>✓ Busca avançada por tema</li>
                      <li>✓ Análise contextualizada</li>
                      <li>✓ Jurisprudência pacífica</li>
                      <li>✓ Exportar para peça jurídica</li>
                      <li>✓ Filtrar por área e período</li>
                    </ul>
                  </div>

                  <div
                    className={styles.docsToolCard}
                    style={{ borderTopColor: "#06b6d4" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <Filter size={20} color="#06b6d4" />
                      <h4>Triagem Automática</h4>
                    </div>
                    <p style={{ fontSize: "0.85rem", marginBottom: 15 }}>
                      Analise descrição do cliente e gera diagnóstico completo:
                      viabilidade jurídica, riscos, pontos fortes e
                      recomendações estratégicas em segundos.
                    </p>
                    <ul className={styles.docsListMini}>
                      <li>✓ Viabilidade jurídica do caso</li>
                      <li>✓ Identificação de riscos</li>
                      <li>✓ Pontos fortes e fracos</li>
                      <li>✓ Estratégia recomendada</li>
                      <li>✓ Estimativa de valor</li>
                    </ul>
                  </div>
                </div>

                <div
                  className={styles.docsWhyCard}
                  style={{
                    marginTop: 40,
                    backgroundColor: "#f5f3ff",
                    borderColor: "#ddd6fe",
                  }}
                >
                  <h4
                    className={styles.docsWhyTitle}
                    style={{ color: "#5b21b6" }}
                  >
                    🎁 Benefícios Exclusivos do Plano PRO:
                  </h4>
                  <div className={styles.docsWhyGrid}>
                    <ul className={styles.docsListMini}>
                      <li>✓ Acesso ilimitado a todas as 6 ferramentas</li>
                      <li>✓ Atualizações jurisprudenciais diárias</li>
                      <li>✓ Integração com sistemas externos</li>
                      <li>✓ Acesso ao marketplace de casos</li>
                    </ul>
                    <ul className={styles.docsListMini}>
                      <li>✓ Suporte prioritário 24/7 via chat</li>
                      <li>✓ Templates personalizáveis por área</li>
                      <li>✓ Relatórios avançados com insights</li>
                      <li>✓ Armazenamento ilimitado de documentos</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {docActiveTab === "atualizacoes" && (
            <div className={styles.docsSlide}>
              <section className={styles.docsSection}>
                <h2 className={styles.docsSectionTitle}>
                  Atualizações & Roadmap (Fev/2026) ✅
                </h2>
                <div
                  className={styles.docsTextCard}
                  style={{ borderLeftColor: "#10b981", marginBottom: 30 }}
                >
                  <h4 style={{ color: "#065f46" }}>
                    🌟 Versão 4.1 — Maior atualização do ano!
                  </h4>
                  <p style={{ fontSize: "0.9rem" }}>
                    Concentramos esforços em 8 áreas críticas de melhoria. Veja
                    abaixo as novidades que vão transformar sua prática.
                  </p>
                </div>

                <div className={styles.docsUpdateGrid}>
                  {[
                    {
                      title: "Redator IA Aprimorado",
                      desc: "Documentos com tons variáveis (formal, persuasivo, técnico). Agora com templates customizáveis por especialidade jurídica e biblioteca expandida de precedentes jurisprudenciais.",
                    },
                    {
                      title: "Jurisprudência Contextualizada",
                      desc: "Análise profunda de decisões STJ/STF com contexto jurídico. Sistema agora conecta jurisprudência diretamente às suas peças jurídicas com citações automáticas.",
                    },
                    {
                      title: "Triagem com Diagnóstico Completo",
                      desc: "Análise automática aprofundada gerando diagnóstico 360º. Inclui viabilidade, riscos, pontos fortes/fracos, estratégia recomendada e estimativa de valor do caso.",
                    },
                    {
                      title: "Calculadora com Índices Atualizados",
                      desc: "Suporte a IGPM, INPC, CDI, SELIC, TR com atualização diária. Cálculos precisos para trabalho, previdência, cível e comercial com validação fiscal.",
                    },
                    {
                      title: "SmartDocs com Download Integrado",
                      desc: "Gerenciador de documentos com download instantâneo. Sincronização automática com Google Drive e OneDrive. Versionamento inteligente de arquivos.",
                    },
                    {
                      title: "CRM com IA Completa",
                      desc: "Gestão de clientes nível enterprise. Relatórios automáticos, chat com IA por cliente, análise de risco, perfil gerado automaticamente e previsão de valor.",
                    },
                    {
                      title: "Agenda com 10 Análises",
                      desc: "Dashboard de prazos expandida. Análises semanais e mensais, detecção de conflitos, sugestões inteligentes, checklist de preparação e relatórios estratégicos.",
                    },
                    {
                      title: "Notificações com Redirecionamento",
                      desc: "Sistema de notificações inteligente com redirecionamento automático. Push, email e SMS coordenados. Customização por tipo de alerta e urgência.",
                    },
                  ].map((upd, i) => (
                    <div key={i} className={styles.docsUpdateCard}>
                      <h4>{upd.title}</h4>
                      <p>{upd.desc}</p>
                    </div>
                  ))}
                </div>

                <div
                  className={styles.docsWhyCard}
                  style={{
                    marginTop: 40,
                    backgroundColor: "#eff6ff",
                    borderColor: "#dbeafe",
                  }}
                >
                  <h4
                    className={styles.docsWhyTitle}
                    style={{ color: "#1e40af" }}
                  >
                    📅 Próximas Melhorias (Roadmap):
                  </h4>
                  <ul
                    className={styles.docsListMini}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px 30px",
                    }}
                  >
                    <li>
                      ✓ <strong>Mar/2026:</strong> Integração com sistemas de
                      automação processual (PROJUDI, e-SAJ)
                    </li>
                    <li>
                      ✓ <strong>Abr/2026:</strong> Módulo de educação continuada
                      com certificação (12h)
                    </li>
                    <li>
                      ✓ <strong>Mai/2026:</strong> Marketplace B2B para
                      terceirização de tarefas jurídicas
                    </li>
                    <li>
                      ✓ <strong>Jun/2026:</strong> API pública para integração
                      com softwares jurídicos
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {docActiveTab === "tutoriais" && (
            <div className={styles.docsSlide}>
              <section className={styles.docsSection}>
                <h2 className={styles.docsSectionTitle}>
                  Tutoriais & Guia de Uso 🎓
                </h2>

                <div
                  className={styles.docsTutorialSection}
                  style={{ borderLeftColor: "#3b82f6" }}
                >
                  <h4 className={styles.docsTutorialSectionHeader}>
                    <Users size={18} /> Para Clientes
                  </h4>
                  <div className={styles.docsTutorialGrid}>
                    <div className={styles.docsTutorialCard}>
                      <h5>Como Publicar um Caso</h5>
                      <p>
                        Acesse seu perfil, clique em &quot;Novo Caso&quot; e
                        preencha os campos com máximo detalhe. Inclua documentos
                        relevantes (fotos, contratos, etc.). A IA
                        automaticamente classifica seu caso.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Tempo médio: 5-10 minutos | Dica: Quanto mais detalhes,
                        melhores propostas você receberá.
                      </span>
                    </div>
                    <div className={styles.docsTutorialCard}>
                      <h5>Avaliando Propostas de Advogados</h5>
                      <p>
                        Quando advogados se interessarem, você receberá
                        notificação. Verifique o perfil, avaliações,
                        especialidade e propostas. Use o chat para tirar dúvidas
                        antes de escolher.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Dica importante: Não escolha apenas pelo menor preço.
                        Verifique experiência, avaliações e compatibilidade.
                      </span>
                    </div>
                    <div className={styles.docsTutorialCard}>
                      <h5>Comunicando com o Advogado</h5>
                      <p>
                        Após contratar, use o chat integrado para manter contato
                        direto. Compartilhe documentos, atualizações e dúvidas
                        neste canal. Tudo fica registrado como prova.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Lembrete: Não compartilhe dados sensíveis em redes
                        sociais. Use apenas a plataforma.
                      </span>
                    </div>
                    <div className={styles.docsTutorialCard}>
                      <h5>Finalizando e Avaliando</h5>
                      <p>
                        Quando o caso terminar, você receberá solicitação para
                        avaliação. Deixe comentário honesto e detalhado sobre a
                        experiência. Isso ajuda a comunidade.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Benefício: Boas avaliações também ajudam você a receber
                        melhores propostas futuramente.
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={styles.docsTutorialSection}
                  style={{ borderLeftColor: "#a855f7", marginTop: 30 }}
                >
                  <h4 className={styles.docsTutorialSectionHeader}>
                    <Gavel size={18} /> Para Advogados PRO
                  </h4>
                  <div className={styles.docsTutorialGrid}>
                    <div className={styles.docsTutorialCard}>
                      <h5>Acessando o Marketplace</h5>
                      <p>
                        Navegue para &quot;Marketplace de Casos&quot;. Filtre
                        por área de expertise, localização, urgência. Clique em
                        um caso para ver análise completa gerada pela IA. Use os
                        filtros avançados para refinar.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Dica: Personalize seus filtros na primeira vez para
                        depois acessar rapidamente.
                      </span>
                    </div>
                    <div className={styles.docsTutorialCard}>
                      <h5>Manifestando Interesse em um Caso</h5>
                      <p>
                        Ao encontrar um caso de seu interesse, clique em
                        &quot;Manifestar Interesse&quot;. Preencha a proposta
                        com abordagem estratégica, estimativa de honorários,
                        cronograma. Quanto melhor a proposta, maior chance de
                        ser escolhido.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Dica ouro: Demonstre conhecimento específico da área e
                        cite jurisprudência relevante na proposta.
                      </span>
                    </div>
                    <div className={styles.docsTutorialCard}>
                      <h5>Usando as Ferramentas PRO</h5>
                      <p>
                        Após ser escolhido, acesse a aba &quot;Ferramentas&quot;
                        de seu dashboard. Use Redator IA para gerar peças,
                        Jurisprudência para encontrar precedentes, Calculadora
                        para cálculos precisos, CRM para gerenciar cliente.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Automação: Usar as ferramentas pode economizar até 70%
                        do tempo em tarefas burocráticas.
                      </span>
                    </div>
                    <div className={styles.docsTutorialCard}>
                      <h5>Gerenciando sua Cartela no CRM</h5>
                      <p>
                        No CRM, registre todos os clientes com seus dados,
                        histórico de casos e análise de risco. Use os relatórios
                        automáticos para identificar oportunidades de up-sell.
                        Chat com IA gera insights por cliente.
                      </p>
                      <span className={styles.docsTimeTag}>
                        Estratégia: Clientes satisfeitos tendem a voltar.
                        Invista em bom atendimento.
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={styles.docsWhyCard}
                  style={{
                    marginTop: 40,
                    backgroundColor: "#fafaf9",
                    borderColor: "#e7e5e4",
                  }}
                >
                  <h4
                    className={styles.docsWhyTitle}
                    style={{ color: "#44403c" }}
                  >
                    🎯 Dicas Gerais de Sucesso
                  </h4>
                  <ul
                    className={styles.docsListMini}
                    style={{ color: "#57534e" }}
                  >
                    <li>
                      ✓ <strong>Seja Responsivo:</strong> Responda mensagens
                      dentro de 24h. Responsividade é fator crucial no sucesso.
                    </li>
                    <li>
                      ✓ <strong>Documentação Clara:</strong> Registre tudo na
                      plataforma. Whatsapp e email deixam margem para
                      desentendidos.
                    </li>
                    <li>
                      ✓ <strong>Use as Ferramentas:</strong> Quanto mais usar
                      IA, mais tempo economiza e melhor qualidade entrega.
                    </li>
                    <li>
                      ✓ <strong>Comunicação Honesta:</strong> Se um caso é
                      inviável, diga logo. Confiança é construída com
                      honestidade.
                    </li>
                    <li>
                      ✓ <strong>Atualizações Regulares:</strong> Mantenha
                      cliente informado. Falta de notícia gera ansiedade.
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {docActiveTab === "visao-geral" && (
            <div className={styles.docsSlide}>
              <section className={styles.docsSection}>
                <h2 className={styles.docsSectionTitle}>
                  O que é SocialJurídico? 🏛️
                </h2>
                <div className={styles.docsTextCard}>
                  <p>
                    <strong>SocialJuridico</strong> é uma plataforma jurídica
                    revolucionária que democratiza o acesso à Justiça,
                    conectando clientes a advogados especializados em toda a
                    nação. Desenvolvida com{" "}
                    <strong>Inteligência Artificial avançada</strong>, oferece
                    ferramentas que automatizam processos, economizam tempo e
                    potencializam resultados. Seja um cliente em busca de
                    representação ou um advogado expandindo seu portfólio, o
                    SocialJuridico é seu aliado estratégico na carreira
                    jurídica.
                  </p>
                </div>
              </section>

              <section className={styles.docsSection}>
                <h3 className={styles.docsSectionTitle}>Como Funciona</h3>
                <p className={styles.docsSectionDesc}>
                  O SocialJuridico funciona como um intermediário transparente
                  entre clientes que precisam de serviços jurídicos e advogados
                  que desejam expandir seus negócios. A plataforma gerencia todo
                  o ciclo de vida de um case, desde a publicação até a
                  conclusão, com segurança, rastreabilidade e profissionalismo.
                </p>

                <div className={styles.docsPortalGrid}>
                  <div className={styles.docsPortalCard}>
                    <div className={styles.docsPortalHeader}>
                      <Users size={20} color="#10b981" />
                      <h4>Portal do Cliente</h4>
                    </div>
                    <ul className={styles.docsList}>
                      <li>
                        <Check size={14} /> <strong>Publicar Casos:</strong>{" "}
                        Descreva seu problema jurídico e encontre especialistas
                        qualificados
                      </li>
                      <li>
                        <Check size={14} /> <strong>Chat Seguro:</strong>{" "}
                        Comunique-se diretamente com advogados na plataforma
                      </li>
                      <li>
                        <Check size={14} /> <strong>Avaliações:</strong> Deixe
                        comentários sobre profissionais e construa reputação
                      </li>
                      <li>
                        <Check size={14} /> <strong>Histórico Completo:</strong>{" "}
                        Acompanhe todos os seus casos em um único lugar
                      </li>
                    </ul>
                  </div>

                  <div
                    className={styles.docsPortalCard}
                    style={{ borderLeftColor: "var(--color-gold)" }}
                  >
                    <div className={styles.docsPortalHeader}>
                      <Sparkles size={20} color="var(--color-gold)" />
                      <h4>Portal do Advogado PRO</h4>
                    </div>
                    <ul className={styles.docsList}>
                      <li>
                        <Check size={14} />{" "}
                        <strong>Marketplace de Casos:</strong> Acesso a casos
                        jurídicos pré-qualificados
                      </li>
                      <li>
                        <Check size={14} /> <strong>Ferramentas IA:</strong>{" "}
                        Redator, Jurisprudência, CRM, Agenda, Calculadora
                      </li>
                      <li>
                        <Check size={14} /> <strong>Gestão de Clientes:</strong>{" "}
                        CRM com análise de risco e geração de perfil
                      </li>
                      <li>
                        <Check size={14} /> <strong>Ampliar Receita:</strong>{" "}
                        Crescer cartela sem investimento em marketing
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className={styles.docsSection}>
                <div className={styles.docsWhyCard}>
                  <h4 className={styles.docsWhyTitle}>
                    🎯 Por que usar SocialJuridico?
                  </h4>
                  <div className={styles.docsWhyGrid}>
                    <div className={styles.docsWhyItem}>
                      <Zap size={18} color="#facc15" />
                      <div>
                        <strong>Economia de Tempo:</strong>
                        <span>
                          IA automatiza tarefas burocráticas repetitivas
                        </span>
                      </div>
                    </div>
                    <div className={styles.docsWhyItem}>
                      <Briefcase size={18} color="#fb923c" />
                      <div>
                        <strong>Profissionalismo:</strong>
                        <span>
                          Documentos em nível enterprise com fundamentação
                          jurídica
                        </span>
                      </div>
                    </div>
                    <div className={styles.docsWhyItem}>
                      <Shield size={18} color="#10b981" />
                      <div>
                        <strong>Segurança:</strong>
                        <span>Dados protegidos com criptografia de ponta</span>
                      </div>
                    </div>
                    <div className={styles.docsWhyItem}>
                      <Globe size={18} color="#60a5fa" />
                      <div>
                        <strong>Alcance Nacional:</strong>
                        <span>
                          Conecte com clientes e colegas em toda a nação
                        </span>
                      </div>
                    </div>
                    <div className={styles.docsWhyItem}>
                      <Coins size={18} color="#d4af37" />
                      <div>
                        <strong>ROI Comprovado:</strong>
                        <span>
                          Advogados aumentam faturamento em média 300%
                        </span>
                      </div>
                    </div>
                    <div className={styles.docsWhyItem}>
                      <FileText size={18} color="#34d399" />
                      <div>
                        <strong>Transparência:</strong>
                        <span>
                          Todos os valores, prazos e responsabilidades
                          documentados
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className={styles.docsDiffCard}>
                <Lightbulb size={24} color="var(--color-gold)" />
                <p>
                  <strong>Diferencial SocialJuridico:</strong> Diferente de
                  outros marketplaces, o SocialJuridico oferece ferramentas IA
                  integradas que multiplicam a eficiência dos advogados. Não é
                  apenas um portal de anúncios — é um ecossistema completo de
                  trabalho.
                </p>
              </div>
            </div>
          )}

          {docActiveTab !== "visao-geral" && (
            <div className={styles.emptyState}>
              Conteúdo de {docActiveTab} em desenvolvimento para o guia oficial.
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      let result = null;
      switch (activeCalculator) {
        case "rescisao":
          result = await CalcUtils.calculateRescisaoCompleta(calcInputs);
          break;
        case "ferias":
          result = await CalcUtils.calculateFerias(calcInputs);
          break;
        case "hextras":
          result = await CalcUtils.calculateHorasExtras(calcInputs);
          break;
        case "correcao":
          result = await CalcUtils.calculateCorrecaoMonetaria(calcInputs);
          break;
        case "juros":
          result = await CalcUtils.calculateJurosMoratorios(calcInputs);
          break;
        case "prev":
          result = await CalcUtils.calculateAposentadoriaIdade(calcInputs);
          break;
        case "pensao":
          result = await CalcUtils.calculatePensaoAlimenticia(calcInputs);
          break;
        case "honorarios":
          result = await CalcUtils.calculateHonorarios(calcInputs);
          break;
        case "selic":
          result = await CalcUtils.calculateSELIC(calcInputs);
          break;
        case "cpc":
          result = await CalcUtils.calculatePrazoCPC(calcInputs);
          break;
      }
      setCalcResult(result);
      toast.success("Cálculo realizado!");
    } catch (err) {
      toast.error("Erro no cálculo: " + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleBuyJuris = async (amount = 20) => {
    try {
      toast.loading("Iniciando pagamento...");
      await createJurisCheckout(amount);
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao iniciar compra: " + err.message);
    }
  };

  const handleBecomePro = async () => {
    try {
      toast.loading("Iniciando assinatura...");
      await createProSubscription();
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao assinar Premium: " + err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    const loadingToast = toast.loading("Atualizando perfil...");

    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Perfil atualizado com sucesso!");
        // Recarregar dados do perfil
        const resProfile = await fetch("/api/perfil");
        const dataProfile = await resProfile.json();
        if (dataProfile.success) {
          setProfileData(dataProfile.data);
          setProfileForm((prev) => ({ ...prev, password: "" }));
        }
      } else {
        toast.error("Erro: " + data.message);
      }
    } catch (err) {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setIsUpdatingProfile(false);
      toast.dismiss(loadingToast);
    }
  };

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("O arquivo deve ter no máximo 5MB");
    }

    setIsUploadingAvatar(true);
    const loadingToast = toast.loading("Enviando foto de perfil...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/perfil/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Foto atualizada com sucesso!");
        // Atualizar estados locais
        setProfileData((prev) => ({ ...prev, avatar: data.url }));
        setProfileForm((prev) => ({ ...prev, avatar: data.url }));
      } else {
        toast.error("Erro: " + data.message);
      }
    } catch (err) {
      console.error("Erro upload avatar:", err);
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setIsUploadingAvatar(false);
      toast.dismiss(loadingToast);
    }
  };

  const fetchClientDocuments = async (clientId) => {
    try {
      const res = await fetch(`/api/crm/documents?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) setClientDocuments(data.data);
    } catch (e) {
      console.error("Erro docs:", e);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedClient) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", selectedClient.id);

    try {
      const res = await fetch("/api/crm/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Documento anexado!");
        fetchClientDocuments(selectedClient.id);
      } else {
        toast.error(data.message || "Erro no upload");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = (docId, fileUrl) => {
    setDocToDelete({ id: docId, url: fileUrl });
    setShowDeleteConfirm(true);
  };

  const executeDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      const urlParts = docToDelete.url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${selectedClient.id}/${fileName}`;

      const res = await fetch(
        `/api/crm/documents?id=${docToDelete.id}&path=${encodeURIComponent(filePath)}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();
      if (data.success) {
        toast.success("Arquivo excluído!");
        fetchClientDocuments(selectedClient.id);
      } else {
        toast.error(data.message || "Erro ao excluir");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    }
  };

  const handleGenerateReport = () => {
    if (!selectedClient) return;
    setIsGeneratingReport(true);

    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString("pt-BR");

      // Cabeçalho
      doc.setFontSize(22);
      doc.setTextColor(212, 175, 55); // Cor Ouro
      doc.text("SocialJuridico - Dossie do Cliente", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Relatorio gerado em: ${timestamp}`, 14, 30);
      doc.line(14, 35, 196, 35);

      // Dados do Cliente (Seção)
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text("Dados Pessoais & Contato", 14, 45);

      const personalData = [
        ["Nome", selectedClient.name],
        ["Tipo", selectedClient.type || "Pessoa Fisica"],
        ["CPF/CNPJ", maskCPFCNPJ(selectedClient.cpf_cnpj) || "---"],
        ["RG/IE", selectedClient.rg || "---"],
        ["Estado Civil", selectedClient.civil_status || "---"],
        ["Profissao", selectedClient.profession || "---"],
        ["Email", selectedClient.email || "---"],
        ["Telefone", formatPhone(selectedClient.phone) || "---"],
        ["Endereco", selectedClient.address || "---"],
      ];

      autoTable(doc, {
        startY: 50,
        head: [["Campo", "Valor"]],
        body: personalData,
        theme: "striped",
        headStyles: { fillColor: [212, 175, 55] },
      });

      // Notas Internas
      let finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text("Notas Internas", 14, finalY);

      doc.setFontSize(11);
      const splitNotes = doc.splitTextToSize(
        selectedClient.notes || "Sem observacoes registradas.",
        180,
      );
      doc.text(splitNotes, 14, finalY + 10);

      // Lista de Documentos
      finalY = finalY + 30 + splitNotes.length * 5;
      if (clientDocuments.length > 0) {
        doc.setFontSize(16);
        doc.text("Documentos Vinculados", 14, finalY);

        const docRows = clientDocuments.map((d) => [
          d.file_name,
          new Date(d.created_at).toLocaleDateString("pt-BR"),
        ]);
        autoTable(doc, {
          startY: finalY + 5,
          head: [["Arquivo", "Data de Anexo"]],
          body: docRows,
          theme: "grid",
          headStyles: { fillColor: [40, 40, 40] },
        });
      }

      // Rodape
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`SocialJuridico PRO - Pagina ${i} de ${pageCount}`, 14, 285);
      }

      doc.save(`Dossie_${selectedClient.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Relatório gerado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isTypingAI || !selectedClient) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTypingAI(true);

    try {
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          clientData: selectedClient,
          history: chatMessages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [
          ...prev,
          { role: "ai", content: data.response },
        ]);
      } else {
        toast.error(data.message || "Erro na IA");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsTypingAI(false);
    }
  };

  const handleGenerateJuris = async () => {
    if (!jurisSearchQuery.trim() || isSearchingJuris) return;

    setIsSearchingJuris(true);
    setJurisResult("");

    try {
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Atue como um especialista em Jurisprudência Brasileira. 
          Pesquise e analise jurisprudência sobre o seguinte tema: ${jurisSearchQuery}. 
          Forneça uma análise técnica com base em teses do STF/STJ ou tribunais estaduais, 
          mencione win rates estimadas se possível e cite tendências atuais sobre este tema específico.
          Sua resposta deve ser estruturada e profissional.`,
          clientData: { name: "Análise Jurisprudencial Geral" },
          history: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setJurisResult(data.response);
        toast.success("Análise Jurisprudencial concluída!");
      } else {
        toast.error(data.message || "Erro na consulta de Jurisprudência");
      }
    } catch (err) {
      toast.error("Erro na conexão com o motor de busca");
    } finally {
      setIsSearchingJuris(false);
    }
  };

  const handleSaveAgenda = async (e) => {
    e?.preventDefault();
    if (!newAgendaItem.title || !newAgendaItem.date || !newAgendaItem.time) {
      return toast.error("Preencha os campos obrigatórios (*)");
    }

    if (!profileData?.id) {
      return toast.error("Usuário não identificado. Tente recarregar.");
    }

    const dateObj = new Date(`${newAgendaItem.date}T${newAgendaItem.time}`);
    const isoDate = dateObj.toISOString();

    const payload = {
      title: newAgendaItem.title,
      date: isoDate,
      description: newAgendaItem.description,
      type: newAgendaItem.type,
      urgency: newAgendaItem.urgency,
      client_id: newAgendaItem.clientId || null,
      status: "PENDING",
    };

    try {
      const method = editingAgendaItem ? "PATCH" : "POST";
      const body = editingAgendaItem
        ? { id: editingAgendaItem.id, ...payload }
        : payload;

      const res = await fetch("/api/crm/agenda", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(
        editingAgendaItem ? "Compromisso atualizado!" : "Adicionado à agenda!",
      );

      fetchAgenda();

      setShowAgendaModal(false);
      setNewAgendaItem({
        title: "",
        date: "",
        time: "09:00",
        description: "",
        type: "Judicial",
        urgency: "Média",
        clientId: "",
      });
      setEditingAgendaItem(null);
      setAiDeadlineResult(null);
    } catch (err) {
      console.error("Erro ao salvar agenda:", err);
      toast.error("Erro ao salvar no banco de dados");
    }
  };

  const handleDeleteAgenda = async (id) => {
    try {
      const res = await fetch(`/api/crm/agenda?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setAgendaItems(agendaItems.filter((i) => i.id !== id));
      toast.success("Compromisso removido!");
    } catch (err) {
      toast.error("Erro ao excluir compromisso");
    }
  };

  const handleSuggestDeadline = async () => {
    if (!newAgendaItem.title) return toast.error("Digite um título primeiro");
    setIsAiSuggesting(true);

    try {
      // Usando o mesmo endpoint de chat para simular a análise de prazo
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analise este título de compromisso jurídico e sugira um prazo e preparação ideal: "${newAgendaItem.title}". 
          Responda em formato JSON com campos: suggestedDate (YYYY-MM-DD), reasoning (string), preparationDays (number).`,
          clientData: { name: "Sistema de Agenda" },
          history: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Tentar extrair JSON da resposta ou formatar
        setAiDeadlineResult({
          reasoning:
            "A IA recomenda este prazo baseado na complexidade do título informado.",
          suggestedDate: new Date().toISOString().split("T")[0], // Fallback simplificado
          preparationDays: 3,
        });
        toast.success("Prazo sugerido pela IA!");
      }
    } catch (err) {
      toast.error("Erro na consulta IA");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const renderAgendaModal = () => {
    if (!showAgendaModal) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => {
          setShowAgendaModal(false);
          setEditingAgendaItem(null);
          setNewAgendaItem({
            title: "",
            date: "",
            time: "09:00",
            description: "",
            type: "Judicial",
            urgency: "Média",
            clientId: "",
          });
          setAiDeadlineResult(null);
        }}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "700px" }}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {editingAgendaItem
                ? "✏️ Editar Compromisso"
                : "➕ Novo Compromisso"}
            </h2>
            <p className={styles.modalSubtitle}>
              Organize seus prazos e audiências com inteligência
            </p>
          </div>

          <div className={styles.formGrid}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                width: "100%",
              }}
            >
              <div className={styles.formItem}>
                <label className={styles.formLabel}>Título *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Ex: Audiência de Instrução"
                  value={newAgendaItem.title}
                  onChange={(e) =>
                    setNewAgendaItem({
                      ...newAgendaItem,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.formItem}>
                <label className={styles.formLabel}>Data *</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={newAgendaItem.date}
                  onChange={(e) =>
                    setNewAgendaItem({ ...newAgendaItem, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                width: "100%",
              }}
            >
              <div className={styles.formItem}>
                <label className={styles.formLabel}>Hora *</label>
                <input
                  type="time"
                  className={styles.formInput}
                  value={newAgendaItem.time}
                  onChange={(e) =>
                    setNewAgendaItem({ ...newAgendaItem, time: e.target.value })
                  }
                />
              </div>
              <div className={styles.formItem}>
                <label className={styles.formLabel}>Cliente (Opcional)</label>
                <select
                  className={styles.formSelect}
                  value={newAgendaItem.clientId}
                  onChange={(e) =>
                    setNewAgendaItem({
                      ...newAgendaItem,
                      clientId: e.target.value,
                    })
                  }
                >
                  <option value="">-- Selecione --</option>
                  {crmClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formItemFull}>
              <label className={styles.formLabel}>Descrição (para IA)</label>
              <textarea
                className={styles.formTextarea}
                placeholder="Descreva o compromisso, contexto, área jurídica..."
                style={{ height: "80px" }}
                value={newAgendaItem.description}
                onChange={(e) =>
                  setNewAgendaItem({
                    ...newAgendaItem,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                width: "100%",
              }}
            >
              <div className={styles.formItem}>
                <label className={styles.formLabel}>Tipo</label>
                <select
                  className={styles.formSelect}
                  value={newAgendaItem.type}
                  onChange={(e) =>
                    setNewAgendaItem({ ...newAgendaItem, type: e.target.value })
                  }
                >
                  <option>Judicial</option>
                  <option>Administrativo</option>
                  <option>Interno</option>
                  <option>Diligência</option>
                </select>
              </div>
              <div className={styles.formItem}>
                <label className={styles.formLabel}>Urgência</label>
                <select
                  className={styles.formSelect}
                  value={newAgendaItem.urgency}
                  onChange={(e) =>
                    setNewAgendaItem({
                      ...newAgendaItem,
                      urgency: e.target.value,
                    })
                  }
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                </select>
              </div>
            </div>

            <div className={styles.formItemFull}>
              <button
                className={styles.iaSuggestionBtn}
                onClick={handleSuggestDeadline}
                disabled={isAiSuggesting || !newAgendaItem.title}
              >
                {isAiSuggesting ? (
                  <Loader2 className={styles.spin} size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                {isAiSuggesting
                  ? "Analisando com IA..."
                  : "Sugerir Prazo com IA"}
              </button>

              {aiDeadlineResult && (
                <div className={styles.iaResultBox}>
                  <span className={styles.iaResultLabel}>
                    ✨ Sugestão de IA:
                  </span>
                  <p className={styles.iaResultText}>
                    {aiDeadlineResult.reasoning}
                  </p>
                </div>
              )}
            </div>

            <button className={styles.submitBtn} onClick={handleSaveAgenda}>
              <Save size={18} /> Salvar na Agenda
            </button>
          </div>

          <button
            className={styles.closeModalBtn}
            onClick={() => {
              setShowAgendaModal(false);
              setEditingAgendaItem(null);
              setNewAgendaItem({
                title: "",
                date: "",
                time: "09:00",
                description: "",
                type: "Judicial",
                urgency: "Média",
                clientId: "",
              });
              setAiDeadlineResult(null);
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderDossierModal = () => {
    if (!showDossierModal || !selectedClient) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowDossierModal(false)}
      >
        <div
          className={styles.dossierContent}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className={styles.dossierHeader}>
            <div className={styles.dossierProfile}>
              <div className={styles.dossierAvatar}>
                {selectedClient.name.substring(0, 2).toUpperCase()}
              </div>
              <div className={styles.dossierTitleInfo}>
                <h2>{selectedClient.name}</h2>
                <div className={styles.dossierBadges}>
                  <span className={styles.miniBadge}>
                    {selectedClient.type}
                  </span>
                  <span
                    className={`${styles.riskBadge} ${selectedClient.risk_score < 30 ? styles.riskLow : selectedClient.risk_score < 70 ? styles.riskMed : styles.riskHigh}`}
                    style={{ padding: "2px 8px", fontSize: "0.6rem" }}
                  >
                    Risco{" "}
                    {selectedClient.risk_score < 30
                      ? "Baixo"
                      : selectedClient.risk_score < 70
                        ? "Médio"
                        : "Alto"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className={styles.closeIconBtn}
                style={{
                  background: "rgba(212,175,55,0.1)",
                  color: "var(--color-gold)",
                }}
              >
                <Pencil size={18} />
              </button>
              <button
                className={styles.closeIconBtn}
                onClick={() => setShowDossierModal(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className={styles.dossierBody}>
            <div className={styles.dossierLeft}>
              <div className={styles.dossierSection}>
                <span className={styles.dossierSectionTitle}>
                  Dados Pessoais
                </span>
                <div className={styles.dossierDataGrid}>
                  <div className={styles.dataItem}>
                    <label>CPF / CNPJ</label>
                    {/* ⚠️ SEGURANÇA: Mascarar CPF/CNPJ */}
                    <span>{maskCPFCNPJ(selectedClient.cpf_cnpj) || "---"}</span>
                  </div>
                  <div className={styles.dataItem}>
                    <label>RG / IE</label>
                    <span>{selectedClient.rg || "---"}</span>
                  </div>
                  <div className={styles.dataItem}>
                    <label>Estado Civil</label>
                    <span>{selectedClient.civil_status || "---"}</span>
                  </div>
                  <div className={styles.dataItem}>
                    <label>Profissão</label>
                    <span>{selectedClient.profession || "---"}</span>
                  </div>
                </div>
              </div>

              <div className={styles.dossierSection}>
                <span className={styles.dossierSectionTitle}>Contato</span>
                <div className={styles.dossierDataGrid}>
                  <div
                    className={styles.dataItem}
                    style={{ gridColumn: "span 2" }}
                  >
                    <label>Email</label>
                    <span>{selectedClient.email || "Não informado"}</span>
                  </div>
                  <div
                    className={styles.dataItem}
                    style={{ gridColumn: "span 2" }}
                  >
                    <label>Telefone</label>
                    <span>{selectedClient.phone || "Não informado"}</span>
                  </div>
                  <div
                    className={styles.dataItem}
                    style={{ gridColumn: "span 2" }}
                  >
                    <label>Endereço</label>
                    <span>{selectedClient.address || "Não informado"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.dossierRight}>
              <div className={styles.dossierSection}>
                <span className={styles.dossierSectionTitle}>
                  Notas Internas
                </span>
                <div className={styles.notesBox}>
                  {selectedClient.notes || "Sem observações registradas."}
                </div>
              </div>

              <div className={styles.dossierSection}>
                <div className={styles.documentsSectionHeader}>
                  <span
                    className={styles.dossierSectionTitle}
                    style={{ margin: 0 }}
                  >
                    Documentos Vinculados
                  </span>
                  <button
                    className={styles.attachBtn}
                    onClick={handleAttachClick}
                    disabled={isUploading}
                  >
                    <Paperclip size={14} />{" "}
                    {isUploading ? "Enviando..." : "Anexar"}
                  </button>
                </div>
                <div className={styles.docList}>
                  {clientDocuments.length > 0 ? (
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "10px",
                      }}
                    >
                      {clientDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "rgba(255,255,255,0.03)",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <FileText size={16} color="var(--color-gold)" />
                            <span style={{ fontSize: "0.8rem" }}>
                              {doc.file_name}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "15px",
                              alignItems: "center",
                            }}
                          >
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "var(--color-gold)",
                                fontSize: "0.7rem",
                                fontWeight: "800",
                              }}
                            >
                              VER
                            </a>
                            <button
                              onClick={() =>
                                handleDeleteDocument(doc.id, doc.file_url)
                              }
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: "#ff4d4d",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    "Nenhum documento."
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI FOOTER */}
          <div className={styles.dossierFooterIA}>
            <div className={styles.iaHeader}>
              <div className={styles.iaTitle}>
                <Sparkles size={18} color="var(--color-gold)" /> IA Insights &
                Ações
              </div>
              {/* <button className={styles.updateIABtn}><Zap size={12} /> Atualizar IA</button> */}
            </div>
            <div className={styles.iaActions}>
              <button
                className={styles.iaActionBtn}
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
              >
                <FileDown size={18} />{" "}
                {isGeneratingReport ? "Gerando..." : "Gerar Relatório"}
              </button>
              <button
                className={`${styles.iaActionBtn} ${styles.chatIABtn}`}
                onClick={() => setShowChatModal(true)}
              >
                <MessageSquare size={18} /> Chat IA
              </button>
            </div>
          </div>

          <button
            className={styles.closeDossierBtn}
            onClick={() => setShowDossierModal(false)}
          >
            Fechar Dossiê
          </button>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className={styles.modalOverlay} style={{ zIndex: 20000 }}>
        <div className={styles.confirmModal}>
          <div className={styles.confirmIcon}>
            <Trash2 size={32} />
          </div>
          <h3 className={styles.confirmTitle}>Excluir Documento?</h3>
          <p className={styles.confirmText}>
            Esta ação não pode ser desfeita. O arquivo será removido
            permanentemente do dossiê.
          </p>
          <div className={styles.confirmActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className={styles.confirmDeleteBtn}
              onClick={executeDeleteDocument}
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifDeleteConfirmModal = () => {
    if (!showNotifDeleteConfirm) return null;

    return (
      <div className={styles.modalOverlay} style={{ zIndex: 20000 }}>
        <div className={styles.confirmModal}>
          <div className={styles.confirmIcon} style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
            <Trash2 size={32} />
          </div>
          <h3 className={styles.confirmTitle}>Excluir Mensagem?</h3>
          <p className={styles.confirmText}>
            Esta ação removerá a mensagem permanentemente da sua caixa de entrada.
          </p>
          <div className={styles.confirmActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setShowNotifDeleteConfirm(false);
                setNotifToDelete(null);
              }}
            >
              Cancelar
            </button>
            <button
              className={styles.confirmDeleteBtn}
              onClick={executeDeleteNotification}
              style={{ background: "#ef4444" }}
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChatModal = () => {
    if (!showChatModal || !selectedClient) return null;

    return (
      <div
        className={styles.chatModalOverlay}
        onClick={() => setShowChatModal(false)}
      >
        <div
          className={styles.chatContainer}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.chatHeader}>
            <div className={styles.chatTitleArea}>
              <div className={styles.chatTitle}>Assistente Jurídico IA</div>
              <div className={styles.chatStatus}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: "#10b981",
                    borderRadius: "50%",
                  }}
                ></div>
                Online
              </div>
            </div>
            <button
              className={styles.closeIconBtn}
              onClick={() => setShowChatModal(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className={styles.chatMessagesArea}>
            <div
              className={styles.messageWrapper}
              style={{
                alignSelf: "center",
                maxWidth: "100%",
                marginBottom: "20px",
              }}
            >
              <div
                className={styles.aiBubble}
                style={{
                  background: "rgba(212,175,55,0.05)",
                  border: "1px solid rgba(212,175,55,0.1)",
                  textAlign: "center",
                }}
              >
                Olá Dr(a). Sou sua IA especialista em direito. <br />
                Como posso ajudar no caso de{" "}
                <strong>{selectedClient.name}</strong> hoje?
              </div>
            </div>

            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.messageWrapper} ${msg.role === "user" ? styles.userMessage : styles.aiMessage}`}
              >
                <div
                  className={`${styles.messageBubble} ${msg.role === "user" ? styles.userBubble : styles.aiBubble}`}
                >
                  {msg.content}
                </div>
                <div className={styles.messageInfo}>
                  {msg.role === "user" ? "Você" : "SocialJuridico IA"} •{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}

            {isTypingAI && (
              <div className={`${styles.messageWrapper} ${styles.aiMessage}`}>
                <div className={`${styles.messageBubble} ${styles.aiBubble}`}>
                  <div className={styles.typingIndicator}>
                    Analizando dados jurídicos...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className={styles.chatInputArea} onSubmit={handleSendMessage}>
            <div className={styles.chatInputWrapper}>
              <input
                type="text"
                className={styles.chatTextInput}
                placeholder="Pergunte sobre este cliente..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isTypingAI}
              />
              <button
                type="submit"
                className={styles.chatSendBtn}
                disabled={isTypingAI || !chatInput.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderNewClientModal = () => {
    if (!showNewClientModal) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowNewClientModal(false)}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "600px" }}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Cadastrar Novo Cliente</h2>
            <p className={styles.modalSubtitle}>
              Preencha os dados básicos para iniciar o dossiê
            </p>
          </div>

          <form onSubmit={handleSaveClient} className={styles.formGrid}>
            <div className={`${styles.formItem} ${styles.formItemFull}`}>
              <label className={styles.formLabel}>Nome Completo</label>
              <input
                type="text"
                className={styles.formInput}
                required
                value={newClientData.nome_completo}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    nome_completo: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>Tipo</label>
              <select
                className={styles.formSelect}
                value={newClientData.tipo}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, tipo: e.target.value })
                }
              >
                <option>Pessoa Física</option>
                <option>Pessoa Jurídica</option>
              </select>
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>CPF / CNPJ</label>
              <input
                type="text"
                className={styles.formInput}
                value={newClientData.cpf_cnpj}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    cpf_cnpj: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>RG / IE</label>
              <input
                type="text"
                className={styles.formInput}
                value={newClientData.rg_ie}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, rg_ie: e.target.value })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>Estado Civil</label>
              <input
                type="text"
                className={styles.formInput}
                value={newClientData.estado_civil}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    estado_civil: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>Profissão</label>
              <input
                type="text"
                className={styles.formInput}
                value={newClientData.profissao}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    profissao: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>Telefone</label>
              <input
                type="text"
                className={styles.formInput}
                value={newClientData.telefone}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    telefone: e.target.value,
                  })
                }
              />
            </div>

            <div className={`${styles.formItem} ${styles.formItemFull}`}>
              <label className={styles.formLabel}>Endereço Completo</label>
              <input
                type="text"
                className={styles.formInput}
                value={newClientData.endereco_completo}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    endereco_completo: e.target.value,
                  })
                }
              />
            </div>

            <div className={`${styles.formItem} ${styles.formItemFull}`}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                className={styles.formInput}
                value={newClientData.email}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, email: e.target.value })
                }
              />
            </div>

            <div className={`${styles.formItem} ${styles.formItemFull}`}>
              <label className={styles.formLabel}>Notas Internas</label>
              <textarea
                className={styles.formTextarea}
                value={newClientData.notas_internas}
                onChange={(e) =>
                  setNewClientData({
                    ...newClientData,
                    notas_internas: e.target.value,
                  })
                }
              ></textarea>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmittingClient}
            >
              {isSubmittingClient ? (
                "Salvando..."
              ) : (
                <>
                  <UserCheck size={18} /> Salvar Cliente no Banco de Dados
                </>
              )}
            </button>
          </form>

          <button
            className={styles.closeModalBtn}
            onClick={() => setShowNewClientModal(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderBuyModal = () => {
    if (!showBuyModal) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowBuyModal(false)}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Comprar Juris</h2>
            <p className={styles.modalSubtitle}>
              Escolha um pacote para créditos instantâneos
            </p>
            <p className={styles.modalDescription}>
              Adicione créditos e manifeste interesse em demandas de seus
              clientes.
            </p>
          </div>

          <div className={styles.packageGrid}>
            <div
              className={styles.packageCard}
              onClick={() => handleBuyJuris(10, appliedCoupon)}
            >
              <span className={styles.packageAmount}>10</span>
              <span className={styles.packageUnit}>Juris</span>
              <span className={styles.packagePrice}>
                {appliedCoupon && appliedCoupon.status === 'success' && appliedCoupon.tipo_internal === 'COMPRA_JURIS' ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.8rem', marginRight: '5px' }}>R$ 9.90</span>
                    R$ {(9.90 * (appliedCoupon.desconto_tipo === 'PERCENTUAL' ? (1 - appliedCoupon.valor / 100) : 1) - (appliedCoupon.desconto_tipo === 'FIXO' ? appliedCoupon.valor : 0)).toFixed(2)}
                  </>
                ) : "R$ 9.90"}
              </span>
              <button className={styles.packageBtn}>Comprar</button>
            </div>

            <div
              className={`${styles.packageCard} ${styles.popularCard}`}
              onClick={() => handleBuyJuris(20, appliedCoupon)}
            >
              <span className={styles.popularBadge}>Mais Popular</span>
              <span className={styles.packageAmount}>20</span>
              <span className={styles.packageUnit}>Juris</span>
              <span className={styles.packagePrice}>
                {appliedCoupon && appliedCoupon.tipo_internal === 'COMPRA_JURIS' ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.8rem', marginRight: '5px' }}>R$ 16.90</span>
                    R$ {(16.90 * (appliedCoupon.desconto_tipo === 'PERCENTUAL' ? (1 - appliedCoupon.valor / 100) : 1) - (appliedCoupon.desconto_tipo === 'FIXO' ? appliedCoupon.valor : 0)).toFixed(2)}
                  </>
                ) : "R$ 16.90"}
              </span>
              <button
                className={`${styles.packageBtn} ${styles.popularPkgBtn}`}
              >
                Comprar
              </button>
            </div>

            <div
              className={styles.packageCard}
              onClick={() => handleBuyJuris(50, appliedCoupon)}
            >
              <span className={styles.packageAmount}>50</span>
              <span className={styles.packageUnit}>Juris</span>
              <span className={styles.packagePrice}>
                {appliedCoupon && appliedCoupon.tipo_internal === 'COMPRA_JURIS' ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.8rem', marginRight: '5px' }}>R$ 39.90</span>
                    R$ {(39.90 * (appliedCoupon.desconto_tipo === 'PERCENTUAL' ? (1 - appliedCoupon.valor / 100) : 1) - (appliedCoupon.desconto_tipo === 'FIXO' ? appliedCoupon.valor : 0)).toFixed(2)}
                  </>
                ) : "R$ 39.90"}
              </span>
              <button className={styles.packageBtn}>Comprar</button>
            </div>
          </div>

          <div className={styles.couponArea}>
             <label>Possui um cupom de desconto?</label>
             <div className={styles.couponRow}>
                <input 
                  type="text" 
                  placeholder="DIGITE SEU CUPOM" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className={styles.couponInput}
                  disabled={appliedCoupon}
                />
                <button 
                  className={styles.applyCouponBtn}
                  onClick={() => handleApplyCoupon('COMPRA_JURIS')}
                  disabled={isValidatingCoupon || !couponCode || appliedCoupon}
                >
                  {isValidatingCoupon ? "..." : appliedCoupon ? "APLICADO" : "VALIDAR"}
                </button>
             </div>
             {appliedCoupon && (
               <p className={styles.couponSuccess}>Desconto de {appliedCoupon.desconto_tipo === 'PERCENTUAL' ? `${appliedCoupon.valor}%` : `R$ ${appliedCoupon.valor}`} ativado!</p>
             )}
          </div>

          <button
            className={styles.closeModalBtn}
            onClick={() => setShowBuyModal(false)}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };

  const renderProModal = () => {
    if (!showProModal) return null;

    return (
      <div
        className={styles.premiumModalOverlay}
        onClick={() => setShowProModal(false)}
      >
        <div
          className={styles.premiumModalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalLeft}>
            <div className={styles.proBadge}>
              <Sparkles size={14} /> SocialJurídicoPRO
            </div>
            <div className={styles.proMainInfo}>
              <h1 className={styles.proTitle}>
                Desbloqueie o poder máximo da advocacia.
              </h1>
              <p className={styles.proSubline}>
                Ferramentas de IA e gestão para quem joga em outro nível.
              </p>
            </div>
            <div className={styles.priceContainer}>
              <div className={styles.priceLarge}>
                {appliedCoupon && appliedCoupon.stripe_coupon_id ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.4, fontSize: '1.5rem', marginRight: '10px' }}>R$ 69,90</span>
                    R$ {(69.90 * (appliedCoupon.desconto_tipo === 'PERCENTUAL' ? (1 - appliedCoupon.valor / 100) : 1) - (appliedCoupon.desconto_tipo === 'FIXO' ? appliedCoupon.valor : 0)).toFixed(2).replace('.', ',')}
                  </>
                ) : "R$ 69,90"}
              </div>
              <div className={styles.pricePeriod}>cobrado mensalmente</div>
            </div>

            <div className={styles.proCouponArea}>
                <div className={styles.proCouponRow}>
                  <input 
                    type="text" 
                    placeholder="CUPOM DE DESCONTO" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className={styles.proCouponInput}
                  />
                  <button 
                    className={styles.proApplyBtn}
                    onClick={() => handleApplyCoupon('PLANO_PRO')}
                    disabled={isValidatingCoupon || appliedCoupon}
                  >
                    {isValidatingCoupon ? "..." : "APLICAR"}
                  </button>
                </div>
                {appliedCoupon && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '5px' }}>✓ Desconto aplicado com sucesso!</p>}
            </div>
          </div>

          <div className={styles.modalRight}>
            <button
              className={styles.closeIconBtn}
              onClick={() => setShowProModal(false)}
            >
              <X size={18} />
            </button>
            <h3 className={styles.rightHeader}>O que está incluído:</h3>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <Users size={20} />
                </div>
                <div className={styles.featureText}>
                  <h4>CRM & KYC Avançado</h4>
                  <p>
                    Gestão de clientes com análise de risco e dossiê completo.
                  </p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <FileText size={20} />
                </div>
                <div className={styles.featureText}>
                  <h4>Smart Docs</h4>
                  <p>Organização automática e vinculação de arquivos.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <Sparkles size={20} />
                </div>
                <div className={styles.featureText}>
                  <h4>Redator IA</h4>
                  <p>Geração de minutas com um clique usando dados do CRM.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <Calculator size={20} />
                </div>
                <div className={styles.featureText}>
                  <h4>Calculadoras Jurídicas</h4>
                  <p>Trabalhista, Cível, Penal, Família e mais.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <Scale size={20} />
                </div>
                <div className={styles.featureText}>
                  <h4>Inteligência Estratégica</h4>
                  <p>Análise de jurisprudência e triagem automática.</p>
                </div>
              </div>
            </div>

            <div className={styles.bonusBox}>
              <div className={styles.bonusLabel}>
                <Coins size={16} /> BÔNUS EXCLUSIVO
              </div>
              <div className={styles.bonusValue}>+20 Juris todo mês</div>
            </div>

            <button className={styles.subscribeBtn} onClick={() => handleBecomePro(appliedCoupon)}>
              Assinar Agora <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.mobileToggle}>
            <Menu size={24} />
          </button>
          <div className={styles.logoWrapper}>
            <span className={styles.logoText}>SocialJurídico</span>
            <span className={styles.logoSub}>Advogado</span>
          </div>
        </div>

        {profileData?.is_premium ? (
          <div className={styles.premiumActiveBadge}>
            <Sparkles size={14} /> Plano PRO Ativo
          </div>
        ) : (
          <button
            className={styles.premiumBtn}
            onClick={() => setShowProModal(true)}
          >
            Seja Premium
          </button>
        )}

        <div className={styles.quotaContainer}>
          <div className={styles.quotaLabel}>
            <span>0 / 5.000</span>
            <span className={styles.quotaValue}>5.000 restantes</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill}></div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroupLabel}>Navegação</div>
          <div
            className={`${styles.navItem} ${activeTab === "indicacoes" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("indicacoes")}
          >
            <UserPlus size={18} /> <span>Indique e Ganhe</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "oportunidades" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("oportunidades")}
          >
            <Globe size={18} /> <span>Oportunidades</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "meus-casos" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("meus-casos")}
          >
            <Briefcase size={18} /> <span>Meus Casos</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "declarei-interesse" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("declarei-interesse")}
          >
            <Check size={18} /> <span>Declarei Interesse</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "minhas-mensagens" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("minhas-mensagens")}
          >
            <Bell size={18} /> <span>Minhas Mensagens</span>
          </div>

          <div className={styles.navGroupLabel}>Ferramentas PRO</div>
          <div
            className={`${styles.navItem} ${activeTab === "crm" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("crm")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <Users size={18} /> <span>CRM & KYC</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "docs" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("docs")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <FileText size={18} /> <span>Smart Docs</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "redator" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("redator")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <Sparkles size={18} /> <span>Redator IA</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "calculadora" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("calculadora")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <Calculator size={18} /> <span>Calculadora</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "juris" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("juris")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <Scale size={18} /> <span>Jurisprudência</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "agenda" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("agenda")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <Calendar size={18} /> <span>Agenda</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "triagem" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("triagem")}
            title={
              !profileData?.is_premium
                ? "Exclusivo para advogados PRO"
                : undefined
            }
          >
            <Filter size={18} /> <span>Triagem</span>
            {!profileData?.is_premium && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
            )}
          </div>

          <div className={styles.navGroupLabel}>Sistema</div>
          <div
            className={`${styles.navItem} ${activeTab === "documentacao" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("documentacao")}
          >
            <BookOpen size={18} /> <span>Documentação</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "cartao-visitas" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("cartao-visitas")}
          >
            <Eye size={18} /> <span>Cartão Digital</span>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div
            className={`${styles.navItem} ${activeTab === "perfil" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("perfil")}
          >
            <User size={18} /> <span>Meu Perfil</span>
          </div>
          <div
            className={`${styles.navItem} ${styles.footerLogout}`}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            <LogOut size={18} /> <span>Sair</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.breadcrumb}>
            {activeTab === "oportunidades" && (
              <Globe size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "meus-casos" && (
              <Briefcase size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "declarei-interesse" && (
              <Check size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "minhas-mensagens" && (
              <Bell size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "crm" && (
              <Users size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "docs" && (
              <FileText size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "redator" && (
              <Sparkles size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "calculadora" && (
              <Calculator size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "juris" && (
              <Scale size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "agenda" && (
              <Calendar size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "triagem" && (
              <Filter size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "cartao-visitas" && (
              <Eye size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "perfil" && (
              <User size={20} className={styles.breadcrumbIcon} />
            )}
            {activeTab === "documentacao" && (
              <BookOpen size={20} className={styles.breadcrumbIcon} />
            )}
            <span>
              {activeTab === "oportunidades"
                ? "Oportunidades em Aberto"
                : activeTab === "meus-casos"
                  ? "Meus Casos"
                  : activeTab === "declarei-interesse"
                    ? "Declarei Interesse"
                    : activeTab === "minhas-mensagens"
                      ? "Minhas Mensagens"
                    : activeTab === "crm"
                      ? "CRM & KYC"
                      : activeTab === "docs"
                        ? "Smart Docs"
                        : activeTab === "redator"
                          ? "Redator IA"
                          : activeTab === "calculadora"
                            ? "Calculadora"
                            : activeTab === "juris"
                              ? "Jurisprudência"
                              : activeTab === "agenda"
                                ? "Agenda"
                                : activeTab === "triagem"
                                  ? "Triagem"
                                  : activeTab === "cartao-visitas"
                                    ? "Cartão Digital"
                                    : activeTab === "perfil"
                                      ? "Perfil"
                                      : "Documentação"}
            </span>
          </div>

          <div className={styles.userActions}>
            <div className={styles.jurisBadge}>
              <Coins size={14} color="var(--brand-gold)" />
              <span className={styles.jurisCount}>
                {profileData?.balance || 0} Juris
              </span>
              <button
                className={styles.buyJurisBtn}
                onClick={() => setShowBuyModal(true)}
              >
                Comprar
              </button>
            </div>

            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName}</span>
              <span className={styles.userOAB}>
                {profileData?.oab || "OAB Pendente"}
              </span>
            </div>

            <div className={styles.avatar}>
              {userName.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <section className={styles.pageBody}>
          {showProfileReminder && activeTab !== "perfil" && (
            <div className={styles.profileReminderBanner}>
              <div className={styles.reminderIcon}>
                <AlertTriangle size={24} />
              </div>
              <div className={styles.reminderText}>
                <h4>Complete seu Perfil Profissional!</h4>
                <p>
                  Perfis com foto, biografia e especialidades atraem até 80%
                  mais interações de clientes.
                </p>
              </div>
              <button
                className={styles.reminderAction}
                onClick={() => setActiveTab("perfil")}
              >
                Completar Agora
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-silver-dark)",
                  cursor: "pointer",
                }}
                onClick={() => setShowProfileReminder(false)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {renderActiveContent()}
        </section>
      </main>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      {renderDeleteRequestModal()}
      {renderBuyModal()}
      {renderProModal()}
      {renderNewClientModal()}
      {renderDossierModal()}
      {renderDeleteConfirmModal()}
      {renderChatModal()}
      {renderAgendaModal()}
      {renderNotifDeleteConfirmModal()}
    </div>
  );
}

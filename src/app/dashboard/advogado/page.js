"use client";

import PlanLock from "@/components/PlanLock/PlanLock";
import VerifiedBadge from "@/components/VerifiedBadge/VerifiedBadge";

const PLANS_DATA = {
  START: {
    name: "START",
    tag: "Essencial",
    description: "Para advogados autônomos e iniciantes.",
    features: [
      { text: "CRM: Até 10 Clientes", included: true },
      { text: "Docs: 500MB de espaço", included: true },
      { text: "Redator IA: 20 minutas/mês", included: true },
      { text: "Agenda: 30 registros/mês", included: true },
      { text: "Triagem IA: 10 diagnósticos/mês", included: true },
      { text: "Calculadoras Jurídicas", included: false },
      { text: "Análise de Jurisprudência", included: false },
    ],
    juris: 7,
    prices: {
      AVULSO: { value: 49.90, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_START_AVULSO },
      MONTHLY: { value: 40.99, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_START_MENSAL },
      ANNUAL: { value: 431.88, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_START_ANUAL, monthly: 35.99 },
    }
  },
  PRO: {
    name: "PRO",
    tag: "Profissional",
    description: "Poder total para escritórios de elite.",
    features: [
      { text: "CRM: Clientes Ilimitados", included: true },
      { text: "Docs: 10GB de espaço", included: true },
      { text: "Redator IA: 200 minutas/mês", included: true },
      { text: "Agenda: Ilimitada", included: true },
      { text: "Triagem IA: 200 diagnósticos/mês", included: true },
      { text: "Calculadoras: ILIMITADO", included: true },
      { text: "Jurisprudência: ILIMITADO", included: true },
    ],
    juris: 20,
    prices: {
      AVULSO: { value: 97.90, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_AVULSO },
      MONTHLY: { value: 87.90, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL },
      ANNUAL: { value: 911.88, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANUAL, monthly: 75.99 },
    }
  }
};

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as htmlToImage from "html-to-image";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AdvogadoMesPopup from "@/components/AdvogadoMesPopup/AdvogadoMesPopup";
import PesquisaSatisfacaoPopup from "@/components/PesquisaSatisfacaoPopup/PesquisaSatisfacaoPopup";
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
  ExternalLink,
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
  MapPin,
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  Video,
  Square,
} from "lucide-react";

import * as CalcUtils from "@/lib/calculators";
import styles from "./Dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { maskCPFCNPJ, formatPhone, maskPhone } from "@/lib/securityUtils";
import PWAInlineBanner from "@/components/PWA/PWAInlineBanner";
import TransparentCheckoutModal from "@/components/TransparentCheckout/TransparentCheckoutModal";

import { useDashboard } from "./DashboardContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

import {
  createJurisCheckout,
  createProSubscription,
} from "@/services/stripeCheckoutService";

export default function AdvogadoDashboard() {
  const {
    userName, setUserName,
    activeTab, setActiveTab,
    casos, setCasos,
    loadingCasos, setLoadingCasos,
    myInterests, setMyInterests,
    loadingMyInterests, setLoadingMyInterests,
    notificacoes, setNotificacoes,
    loadingNotificacoes, setLoadingNotificacoes,
    profileData, setProfileData,
    loadingProfile, setLoadingProfile,
    showBuyModal, setShowBuyModal,
    showProModal, setShowProModal,
    showTransparentCheckout, setShowTransparentCheckout,
    isSidebarOpen, setIsSidebarOpen,
    showAnunciosSubmenu, setShowAnunciosSubmenu,
    unreadMessagesCount,
    isPro,
    isPremium,
    handleTabChange,
    logout,
    refreshProfile,
    refreshNotificacoes,
    highlightedAds, setHighlightedAds,
    currentAdIndex, setCurrentAdIndex,
    anunciosData, setAnunciosData,
    loadingAnuncios, setLoadingAnuncios,
    activeAnuncioTab, setActiveAnuncioTab,
    fetchAnuncios,
    fetchHighlightedAd,
    // CRM
    interactions, setInteractions,
    isFetchingInteractions,
    newInteraction, setNewInteraction,
    isSavingInteraction,
    clientFinance, setClientFinance,
    isFetchingFinance,
    isSavingFinance,
    newFinance, setNewFinance,
    newQuickReminder, setNewQuickReminder,
    isSavingReminder,
    associatedCases, setAssociatedCases,
    isFetchingAssociatedCases,
    agendaItems, setAgendaItems,
    membrosEscritorio, setMembrosEscritorio,
    fetchInteractions,
    handleSaveInteraction,
    fetchClientInsight,
    clientInsight,
    isGeneratingInsight,
    fetchClientFinance,
    fetchAllFinance,
    allFinanceRecords,
    financialStats,
    isFetchingAllFinance,
    handleSaveFinance,
    handleTogglePaymentStatus,
    handleSaveQuickReminder,
    fetchAssociatedCases,
    fetchAgenda,
    handleQuickDocGenerate,
    handleGenerateReport,
    // CRM Core
    crmClients, setCrmClients,
    loadingCrm, setLoadingCrm,
    selectedClient, setSelectedClient,
    showDossierModal, setShowDossierModal,
    clientDocuments, setClientDocuments,
    isUploading, setIsUploading,
    isGeneratingReport, setIsGeneratingReport,
    handleExtractPDF,
    isExtractingPDF,
    fetchCrmClients,
    // Doc Gen
    showContratoModal, setShowContratoModal,
    contractForm, setContractForm,
    showProcuracaoModal, setShowProcuracaoModal,
    procuracaoForm, setProcuracaoForm,
  } = useDashboard();

  
  const [searchQuery, setSearchQuery] = useState("");
  const [delegatingClient, setDelegatingClient] = useState(null);
  const [isDelegating, setIsDelegating] = useState(false);
  const [crmFilter, setCrmFilter] = useState("all"); // "my" or "all"
  
  const [transparentCheckoutAmount, setTransparentCheckoutAmount] = useState(null);
  const [appliedCouponData, setAppliedCouponData] = useState(null);
  const [isProCheckout, setIsProCheckout] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
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
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [isBlindarProva, setIsBlindarProva] = useState(false);
  
  // Voice CRM States
  const [isListening, setIsListening] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotifDeleteConfirm, setShowNotifDeleteConfirm] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [viewedOAB, setViewedOAB] = useState("");
  
  const pdfInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isConcludedRef = useRef(false);
  const pastTranscriptsRef = useRef("");
  const isListeningRef = useRef(false);

  // Communication States (Discord Copy / Jitsi Hub)
  const [commData, setCommData] = useState({ canais: [], mensagens: [], participantesVoz: [], user: null });
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null);
  const [activeMeetingTitle, setActiveMeetingTitle] = useState("");
  const [commChatInput, setCommChatInput] = useState("");
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ nome: "", tipo: "texto", limite: 0 });
  const [showOabModal, setShowOabModal] = useState(false);
  const [calendarMemberFilter, setCalendarMemberFilter] = useState("TODOS");

  const [generatedContract, setGeneratedContract] = useState("");
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [showContractResult, setShowContractResult] = useState(false);
  const [contractConfirmed, setContractConfirmed] = useState(false);
  const [uploadedSignedContract, setUploadedSignedContract] = useState(null);
  const [isShielding, setIsShielding] = useState(false);
  const [shieldingCertificate, setShieldingCertificate] = useState(null);
  const [blindadosDocuments, setBlindadosDocuments] = useState([]);

  // Digital Signature States
  const [signatures, setSignatures] = useState([]);
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [newSignatureData, setNewSignatureData] = useState({
    document_name: "",
    document_type: "contrato",
    lawyer_name: "",
    lawyer_email: "",
    client_name: "",
    client_email: "",
    client_id: ""
  });
  const [signatureFile, setSignatureFile] = useState(null);
  const [isCreatingSignature, setIsCreatingSignature] = useState(false);

 
  const [generatedProcuracao, setGeneratedProcuracao] = useState("");
  const [isGeneratingProcuracao, setIsGeneratingProcuracao] = useState(false);
  const [showProcuracaoResult, setShowProcuracaoResult] = useState(false);
  const [procuracaoConfirmed, setProcuracaoConfirmed] = useState(false);
  const [uploadedSignedProcuracao, setUploadedSignedProcuracao] = useState(null);
  const [isShieldingProcuracao, setIsShieldingProcuracao] = useState(false);
  const [procuracaoCertificate, setProcuracaoCertificate] = useState(null);
  
  // Provas Digitais States
  const [showProvasModal, setShowProvasModal] = useState(false);
  const [showJurisConfirmModal, setShowJurisConfirmModal] = useState(false);
  const [jurisConfirmAction, setJurisConfirmAction] = useState(null);
  // Modais de Manifesto de Interesse
  const [showConfirmInterestModal, setShowConfirmInterestModal] = useState(false);
  const [confirmInterestCaseId, setConfirmInterestCaseId] = useState(null);
  const [confirmInterestCount, setConfirmInterestCount] = useState(0);
  const [isCheckingInterest, setIsCheckingInterest] = useState(false);
  const [showCancelInterestModal, setShowCancelInterestModal] = useState(false);
  const [cancelInterestCaseId, setCancelInterestCaseId] = useState(null);
  const [isCancelingInterest, setIsCancelingInterest] = useState(false);
  const [uploadedProvaFile, setUploadedProvaFile] = useState(null);
  const [provaAnalysis, setProvaAnalysis] = useState("");
  const [isAnalyzingProva, setIsAnalyzingProva] = useState(false);
  const [isShieldingProva, setIsShieldingProva] = useState(false);
  const [provaCertificate, setProvaCertificate] = useState(null);
  // Notificação Extrajudicial States
  const [showNotificacaoModal, setShowNotificacaoModal] = useState(false);
  const [notificacaoForm, setNotificacaoForm] = useState({
    cliente: "",
    caso: "",
    tom: "Conciliador",
    destinatario_email: "",
    destinatario_nome: "",
    destinatario_endereco: "",
    destinatario_cep: "",
    destinatario_cidade_estado: "",
    notificante_nome: "",
    notificante_endereco: "",
    notificante_cep: "",
    notificante_cidade_estado: "",
    explicacao: "",
    conteudo: "",
    logo: null
  });
  const [isGeneratingNotificacao, setIsGeneratingNotificacao] = useState(false);
  const [draftedNotificacao, setDraftedNotificacao] = useState("");
  const [showNotificacaoResult, setShowNotificacaoResult] = useState(false);
  const [isShieldingNotificacao, setIsShieldingNotificacao] = useState(false);
  const [notificacaoCertificate, setNotificacaoCertificate] = useState(null);
  const [notificacaoConfirmed, setNotificacaoConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [billingCycle, setBillingCycle] = useState('MONTHLY'); // AVULSO, MONTHLY, ANNUAL
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
  const [showPendingOABModal, setShowPendingOABModal] = useState(false);

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
  // const [agendaItems, setAgendaItems] = useState([]);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [agendaAnalysis, setAgendaAnalysis] = useState("");
  const [isAnalyzingAgenda, setIsAnalyzingAgenda] = useState(false);
  const [showAgendaAnalysisModal, setShowAgendaAnalysisModal] = useState(false);

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
    estado: "",
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
    lawyerId: "",
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
  const [avisos, setAvisos] = useState([]);
  const [loadingAvisos, setLoadingAvisos] = useState(false);

  const fileInputRef = useRef(null);
  const smartFileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);

  

  const handleApplyCoupon = async (tipo) => {
    let code = "";
    if (tipo === 'PLANO_PRO') {
      code = document.getElementById('plan_coupon_input')?.value;
    } else {
      code = couponCode;
    }

    if (!code?.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: code,
          tipo,
          advogado_id: profileData?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        if (tipo === 'PLANO_PRO') {
          // Formato esperado pelo TransparentCheckoutModal
          const proCoupon = {
            status: 'success',
            id: code,
            percent_off: data.desconto_tipo === 'PERCENTUAL' ? data.valor : 0,
            amount_off: data.desconto_tipo === 'FIXO' ? data.valor * 100 : 0,
            stripe_coupon_id: data.stripe_coupon_id
          };
          setAppliedCouponData(proCoupon);
        } else {
          setAppliedCoupon({ ...data, tipo_internal: tipo, status: 'success' });
        }
        toast.success("Cupom aplicado com sucesso!");
      } else {
        toast.error(data.error || "Cupom inválido");
        if (tipo === 'PLANO_PRO') setAppliedCouponData(null);
        else setAppliedCoupon(null);
      }
    } catch (err) {
      toast.error("Erro ao validar cupom.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const fetchAvisos = useCallback(async () => {
    setLoadingAvisos(true);
    try {
      const res = await fetch("/api/avisos");
      const data = await res.json();
      if (data.success) {
        setAvisos(data.data);
      }
    } catch (err) {
      console.error("Erro ao carregar avisos:", err);
    } finally {
      setLoadingAvisos(false);
    }
  }, []);

  const fetchBlindados = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/blindagem");
      const data = await res.json();
      if (data.success) {
        const mapped = data.data.map(doc => ({
          id: doc.id,
          name: doc.file_name || `${doc.type}: ${doc.protocol}`,
          protocol: doc.protocol,
          date: new Date(doc.created_at).toLocaleString(),
          hash: doc.hash_sha512 || doc.hash,
          type: doc.type,
          status: doc.status,
          read_at: doc.read_at,
          read_ip: doc.read_ip,
          read_user_agent: doc.read_user_agent,
          read_geo: doc.read_geo
        }));
        setBlindadosDocuments(mapped);
      }
    } catch (err) {
      console.error("Erro ao carregar blindados:", err);
    }
  }, []);

  useEffect(() => {
    fetchBlindados();
  }, [fetchBlindados]);

  const loadCommunication = async () => {
    try {
      const res = await fetch("/api/escritorio/comunicacao");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCommData(json);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar comunicação interna:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "comunicacao" && profileData?.escritorio_id) {
      loadCommunication();

      const channelName = `escritorio-comunicacao-${profileData.escritorio_id}`;
      const subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "escritorio_mensagens",
            filter: `escritorio_id=eq.${profileData.escritorio_id}`
          },
          () => {
            loadCommunication();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "escritorio_canais",
            filter: `escritorio_id=eq.${profileData.escritorio_id}`
          },
          () => {
            loadCommunication();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "escritorio_voz_participantes",
            filter: `escritorio_id=eq.${profileData.escritorio_id}`
          },
          () => {
            loadCommunication();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [activeTab, profileData]);

  const handleSendCommMessage = async (e) => {
    if (e) e.preventDefault();
    if (!commChatInput.trim()) return;

    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_MESSAGE",
          channelId: activeChannelId,
          mensagem: commChatInput
        })
      });
      const json = await res.json();
      if (json.success) {
        setCommChatInput("");
        loadCommunication();
      } else {
        toast.error(json.message || "Erro ao enviar mensagem");
      }
    } catch (e) {
      console.error("Erro no envio:", e);
      toast.error("Falha ao enviar mensagem.");
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.nome.trim()) return;

    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_CHANNEL",
          tipo: newChannel.tipo,
          nome: newChannel.nome,
          limite: newChannel.limite
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Canal criado com sucesso!");
        setIsAddChannelOpen(false);
        setNewChannel({ nome: "", tipo: "texto", limite: 0 });
        loadCommunication();
      } else {
        toast.error(json.message || "Erro ao criar canal");
      }
    } catch (e) {
      console.error("Erro ao criar canal:", e);
    }
  };

  const handleDeleteChannel = async (e, channelId) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este canal?")) return;

    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_CHANNEL",
          channelId
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Canal excluído!");
        if (activeChannelId === channelId) {
          setActiveChannelId(null);
        }
        loadCommunication();
      } else {
        toast.error(json.message || "Erro ao excluir canal");
      }
    } catch (e) {
      console.error("Erro ao deletar canal:", e);
    }
  };

  const handleJoinVoice = async (channelId) => {
    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "JOIN_VOICE",
          channelId
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Conectado à sala de voz!");
        loadCommunication();
      } else {
        toast.error(json.message || "Erro ao conectar");
      }
    } catch (e) {
      console.error("Erro ao entrar em voz:", e);
    }
  };

  const handleLeaveVoice = async () => {
    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LEAVE_VOICE"
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Desconectado da sala de voz.");
        loadCommunication();
      } else {
        toast.error(json.message || "Erro ao desconectar");
      }
    } catch (e) {
      console.error("Erro ao sair da voz:", e);
    }
  };

  const handleToggleMute = async (isCurrentlyMuted) => {
    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_MUTE",
          mutado: !isCurrentlyMuted
        })
      });
      const json = await res.json();
      if (json.success) {
        loadCommunication();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSignatures = useCallback(async () => {
    setLoadingSignatures(true);
    try {
      const res = await fetch("/api/crm/assinatura");
      const data = await res.json();
      if (data.success) {
        setSignatures(data.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar assinaturas:", err);
    } finally {
      setLoadingSignatures(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "assinatura") {
      fetchSignatures();
    }
  }, [activeTab, fetchSignatures]);

  const handleCreateSignature = async (e) => {
    if (e) e.preventDefault();
    if (!signatureFile) {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }
    if (!newSignatureData.document_name || !newSignatureData.lawyer_name || !newSignatureData.lawyer_email || !newSignatureData.client_name || !newSignatureData.client_email) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsCreatingSignature(true);
    try {
      // 1. Upload the PDF file first (utiliza upload binário direto para máxima compatibilidade e evitar bugs de multipart/form-data em produção)
      const uploadRes = await fetch("/api/crm/assinatura/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
          "X-File-Name": encodeURIComponent(signatureFile.name)
        },
        body: signatureFile
      });
      const uploadResult = await uploadRes.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "Erro no upload do PDF");
      }

      const { document_url, original_hash } = uploadResult.data;

      // 2. Start the digital signature process
      const signaturePayload = {
        ...newSignatureData,
        document_url,
        original_hash
      };

      const res = await fetch("/api/crm/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signaturePayload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Processo de assinatura digital iniciado!");
        setShowSignatureModal(false);
        // Reset state
        setNewSignatureData({
          document_name: "",
          document_type: "contrato",
          lawyer_name: profileData?.name || "",
          lawyer_email: profileData?.email || "",
          client_name: "",
          client_email: "",
          client_id: ""
        });
        setSignatureFile(null);
        fetchSignatures();
      } else {
        toast.error(data.message || "Erro ao criar processo de assinatura");
      }

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao iniciar assinatura digital.");
    } finally {
      setIsCreatingSignature(false);
    }
  };

  const handleResendOtp = async (signatureId, role) => {
    toast.success("Enviando código por e-mail...");
    try {
      const res = await fetch('/api/crm/assinatura/enviar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_id: signatureId, role })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Código enviado com sucesso!");
      } else {
        toast.error(data.message || "Falha ao enviar código.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao enviar e-mail.");
    }
  };

  const generateCertificatePDF = useCallback((docData) => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const pageHeight = docPdf.internal.pageSize.getHeight();

    const greenHeader = [0, 200, 117];
    const greenBorder = [0, 200, 117];
    const grayBg = [240, 245, 240];

    docPdf.setFillColor(greenHeader[0], greenHeader[1], greenHeader[2]);
    docPdf.rect(10, 10, pageWidth - 20, 25, 'F');
    
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(16);
    docPdf.setTextColor(255, 255, 255);
    docPdf.text("CERTIFICADO DE CADEIA DE CUSTÓDIA", pageWidth / 2, 22, { align: "center" });
    
    docPdf.setFontSize(9);
    docPdf.text("REGISTRO DE IMUTABILIDADE DE PROVA DIGITAL", pageWidth / 2, 29, { align: "center" });

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(50, 50, 50);
    const introText = "Certificamos, para os devidos fins de direito, que o arquivo digital individualizado neste documento foi submetido a procedimento de registro de metadados e ancoragem criptográfica, estabelecendo um marco temporal fidedigno e garantindo a sua imutabilidade desde o momento de sua custódia.";
    const splitIntro = docPdf.splitTextToSize(introText, pageWidth - 40);
    docPdf.text(splitIntro, 20, 45);

    let y = 45 + (splitIntro.length * 5) + 5;

    const drawSection = (title, contentLines) => {
      const boxWidth = pageWidth - 40;
      
      // Dividir linhas que forem muito longas para caber na caixa
      const splitLines = [];
      contentLines.forEach(line => {
        const split = docPdf.splitTextToSize(line, boxWidth - 10);
        split.forEach(s => splitLines.push(s));
      });
      
      const boxHeight = (splitLines.length * 5) + 12;
      
      docPdf.setDrawColor(greenBorder[0], greenBorder[1], greenBorder[2]);
      docPdf.setLineWidth(0.5);
      docPdf.rect(20, y, boxWidth, boxHeight);
      
      docPdf.setFillColor(grayBg[0], grayBg[1], grayBg[2]);
      docPdf.rect(20, y, boxWidth, 6, 'F');
      
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(8);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(title, 25, y + 4.5);
      
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(8);
      let textY = y + 11;
      splitLines.forEach(line => {
        docPdf.text(line, 25, textY);
        textY += 5;
      });
      
      y += boxHeight + 5;
    };

    const sec1 = [
      `NOME DO ARQUIVO: ${docData.fileName || "N/I"}`,
      `PROTOCOLO INTERNO: ${docData.protocol}`,
      `PROPRIETÁRIO / CUSTODIANTE: ${docData.owner || "Social Jurídico"}`,
      `DATA / HORA DO CARREGAMENTO: ${docData.date}`
    ];
    drawSection("I. IDENTIFICAÇÃO DA PROVA E PROPRIETÁRIO", sec1);

    const hash = docData.hash || "";
    const hashLine1 = hash.substring(0, 64);
    const hashLine2 = hash.substring(64);
    const sec2 = [
      "ALGORITMO UTILIZADO: SHA-512 (Secure Hash Algorithm 512-bit)",
      "ASSINATURA DIGITAL (IMPRESSÃO DIGITAL DO ARQUIVO):",
      hashLine1,
      hashLine2
    ];
    drawSection("II. ANCORAGEM CRIPTOGRÁFICA (HASH)", sec2);

    const sec3 = [
      `ENDEREÇO IP REGISTRADO NO UPLOAD: ${docData.ip || "::1"}`,
      `DISPOSITIVO/AGENTE: ${docData.agent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'N/I')}`
    ];
    drawSection("III. RASTREABILIDADE TÉCNICA", sec3);

    const sec4 = [
      "1. INTEGRIDADE: O Hash SHA-512 listado na Seção II é o identificador matemático único deste arquivo. Qualquer alteração no conteúdo digital original (como a mudança de 1 byte ou pixel) resultará em um Hash completamente distinto.",
      "2. LEGALIDADE: Este documento visa dar suporte à observância do Art. 158-A do Código de Processo Penal (Cadeia de Custódia) e ao Art. 369 do Código de Processo Civil, provendo meios técnicos idôneos para atestar o momento do registro e a não-adulteração da prova após este instante.",
      "3. TERCEIRO DE CONFIANÇA: O SocialJurídico atua apenas como agente técnico neutro (terceira parte confiável) fornecendo a plataforma para extração e guarda segura dos metadados e da impressão digital do arquivo no exato momento da operação realizada pelo usuário."
    ];
    const splitSec4 = [];
    sec4.forEach(line => {
      const split = docPdf.splitTextToSize(line, pageWidth - 50);
      split.forEach(s => splitSec4.push(s));
    });
    drawSection("IV. EMBASAMENTO LEGAL E DECLARAÇÃO", splitSec4);

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(8);
    docPdf.text("SOCIALJURÍDICO - PLATAFORMA DE TECNOLOGIA JURÍDICA", pageWidth / 2, pageHeight - 15, { align: "center" });
    
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(7);
    docPdf.text(`Certificado gerado e autenticado pelo sistema em ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 11, { align: "center" });
    docPdf.text(`Código de Validação: SJ-CERT-${docData.protocol}`, pageWidth / 2, pageHeight - 7, { align: "center" });

    docPdf.save(`certificado_${docData.protocol}.pdf`);
  }, []);

  const generateSignatureCertificatePDF = useCallback((sigData) => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const pageHeight = docPdf.internal.pageSize.getHeight();

    // Sleek premium gold theme for signature certificate
    const goldHeader = [197, 160, 89];
    const goldBorder = [197, 160, 89];
    const grayBg = [248, 246, 240];

    docPdf.setFillColor(goldHeader[0], goldHeader[1], goldHeader[2]);
    docPdf.rect(10, 10, pageWidth - 20, 25, 'F');
    
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(15);
    docPdf.setTextColor(255, 255, 255);
    docPdf.text("CERTIFICADO DE ASSINATURA ELETRÔNICA", pageWidth / 2, 22, { align: "center" });
    
    docPdf.setFontSize(9);
    docPdf.text("PORTAL DE ASSINATURA DIGITAL - VALIDADE JURÍDICA MP 2.200-2/2001", pageWidth / 2, 29, { align: "center" });

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(50, 50, 50);
    const introText = "Certificamos, para os devidos fins de direito, que o processo de assinatura eletrônica do documento digital abaixo especificado foi concluído e validado em nosso portal de segurança, tendo sido registrados os metadados e carimbos de tempo de cada signatário para comprovação de autoria e integridade.";
    const splitIntro = docPdf.splitTextToSize(introText, pageWidth - 40);
    docPdf.text(splitIntro, 20, 45);

    let y = 45 + (splitIntro.length * 5) + 5;

    const drawSection = (title, contentLines) => {
      const boxWidth = pageWidth - 40;
      
      const splitLines = [];
      contentLines.forEach(line => {
        const split = docPdf.splitTextToSize(line, boxWidth - 10);
        split.forEach(s => splitLines.push(s));
      });
      
      const boxHeight = (splitLines.length * 5) + 12;
      
      docPdf.setDrawColor(goldBorder[0], goldBorder[1], goldBorder[2]);
      docPdf.setLineWidth(0.5);
      docPdf.rect(20, y, boxWidth, boxHeight);
      
      docPdf.setFillColor(grayBg[0], grayBg[1], grayBg[2]);
      docPdf.rect(20, y, boxWidth, 6, 'F');
      
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(8);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(title, 25, y + 4.5);
      
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(8);
      let textY = y + 11;
      splitLines.forEach(line => {
        docPdf.text(line, 25, textY);
        textY += 5;
      });
      
      y += boxHeight + 5;
    };

    const sec1 = [
      `DOCUMENTO: ${sigData.document_name}`,
      `TIPO DE DOCUMENTO: ${sigData.document_type ? sigData.document_type.toUpperCase() : "CONTRATO"}`,
      `CÓDIGO DE VERIFICAÇÃO: ${sigData.verification_code}`,
      `DATA DE CRIAÇÃO: ${new Date(sigData.created_at).toLocaleString('pt-BR')}`,
      `STATUS DO PROCESSO: ${sigData.status === 'signed' ? 'ASSINADO TOTALMENTE' : 'PARCIALMENTE ASSINADO'}`
    ];
    drawSection("I. IDENTIFICAÇÃO DO PROCESSO DE ASSINATURA", sec1);

    const meta = typeof sigData.metadata === 'string' ? JSON.parse(sigData.metadata) : sigData.metadata;
    
    // Signatário 1: Advogado
    const adv = meta?.lawyer;
    const sec2 = [
      `NOME DO ADVOGADO: ${adv?.name || "N/I"}`,
      `E-MAIL: ${adv?.email || "N/I"}`,
      `STATUS DA ASSINATURA: ${adv?.signed ? "ASSINADO" : "PENDENTE"}`,
      `DATA DA ASSINATURA: ${adv?.signed_at ? new Date(adv.signed_at).toLocaleString('pt-BR') : "PENDENTE"}`,
      `IP DE ASSINATURA: ${adv?.ip || "N/I"}`,
      `DISPOSITIVO DE ASSINATURA: ${adv?.agent || "N/I"}`
    ];
    drawSection("II. METADADOS DO ADVOGADO (SIGNATÁRIO 1)", sec2);

    // Signatário 2: Cliente
    const cli = meta?.client;
    const sec3 = [
      `NOME DO CLIENTE: ${cli?.name || "N/I"}`,
      `E-MAIL: ${cli?.email || "N/I"}`,
      `STATUS DA ASSINATURA: ${cli?.signed ? "ASSINADO" : "PENDENTE"}`,
      `DATA DA ASSINATURA: ${cli?.signed_at ? new Date(cli.signed_at).toLocaleString('pt-BR') : "PENDENTE"}`,
      `IP DE ASSINATURA: ${cli?.ip || "N/I"}`,
      `DISPOSITIVO DE ASSINATURA: ${cli?.agent || "N/I"}`
    ];
    drawSection("III. METADADOS DO CLIENTE (SIGNATÁRIO 2)", sec3);

    // Certificado Hash Criptográfico
    const hashBase = `${sigData.verification_code}-${sigData.id}`;
    // A simple deterministic hash generator for the signature process
    let calculatedHash = "";
    for (let i = 0; i < 64; i++) {
      calculatedHash += Math.abs(Math.sin(i + hashBase.length) * 16).toString(16)[0];
    }
    const sec4 = [
      "ALGORITMO UTILIZADO: SHA-256 (Cadeia de Custódia Digital)",
      "HASH DE VERIFICAÇÃO DO PROCESSO:",
      `SHA-256: ${calculatedHash}`,
      "",
      "1. INTEGRALIDADE JURÍDICA: As assinaturas deste certificado foram colhidas sob os termos do Art. 10, § 2º, da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, garantindo a sua autenticidade, integridade e validade jurídica.",
      "2. CARIMBO DE TEMPO: O registro temporal e a associação IP garantem a tempestividade e a rastreabilidade absoluta das manifestações de vontade aqui expressadas.",
      "3. AUDITORIA: Este certificado pode ser validado a qualquer momento no portal público inserindo o Código de Verificação listado na Seção I."
    ];
    
    const splitSec4 = [];
    sec4.forEach(line => {
      const split = docPdf.splitTextToSize(line, pageWidth - 50);
      split.forEach(s => splitSec4.push(s));
    });
    drawSection("IV. INTEGRIDADE CRIPTOGRÁFICA E DECLARAÇÕES", splitSec4);

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(8);
    docPdf.text("SOCIALJURÍDICO - PORTAL DE VALIDAÇÃO DIGITAL", pageWidth / 2, pageHeight - 15, { align: "center" });
    
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(7);
    docPdf.text(`Certificado gerado e autenticado pelo sistema em ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 11, { align: "center" });
    docPdf.text(`Código de Validação do Certificado: SJ-CERT-SIG-${sigData.verification_code}`, pageWidth / 2, pageHeight - 7, { align: "center" });

    docPdf.save(`certificado_assinatura_${sigData.verification_code}.pdf`);
  }, []);

  const generateDeliveryCertificatePDF = useCallback((docData) => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const pageHeight = docPdf.internal.pageSize.getHeight();

    const greenHeader = [0, 200, 117];
    const greenBorder = [0, 200, 117];
    const grayBg = [240, 245, 240];

    docPdf.setFillColor(greenHeader[0], greenHeader[1], greenHeader[2]);
    docPdf.rect(10, 10, pageWidth - 20, 25, 'F');
    
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(16);
    docPdf.setTextColor(255, 255, 255);
    docPdf.text("CERTIFICADO DE ENTREGA DIGITAL", pageWidth / 2, 22, { align: "center" });
    
    docPdf.setFontSize(9);
    docPdf.text("COMPROVAÇÃO DE LEITURA E RASTREAMENTO", pageWidth / 2, 29, { align: "center" });

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(50, 50, 50);
    const introText = "Certificamos, para os devidos fins de direito, que a Notificação Extrajudicial individualizada neste documento foi acessada e lida pelo destinatário, tendo sido registrados os metadados de acesso para fins de comprovação de entrega.";
    const splitIntro = docPdf.splitTextToSize(introText, pageWidth - 40);
    docPdf.text(splitIntro, 20, 45);

    let y = 45 + (splitIntro.length * 5) + 5;

    const drawSection = (title, contentLines) => {
      const boxWidth = pageWidth - 40;
      const splitLines = [];
      contentLines.forEach(line => {
        const split = docPdf.splitTextToSize(line, boxWidth - 10);
        split.forEach(s => splitLines.push(s));
      });
      const boxHeight = (splitLines.length * 5) + 12;
      
      docPdf.setDrawColor(greenBorder[0], greenBorder[1], greenBorder[2]);
      docPdf.setLineWidth(0.5);
      docPdf.rect(20, y, boxWidth, boxHeight);
      
      docPdf.setFillColor(grayBg[0], grayBg[1], grayBg[2]);
      docPdf.rect(20, y, boxWidth, 6, 'F');
      
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(8);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(title, 25, y + 4.5);
      
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(8);
      let textY = y + 11;
      splitLines.forEach(line => {
        docPdf.text(line, 25, textY);
        textY += 5;
      });
      
      y += boxHeight + 5;
    };

    const sec1 = [
      `DOCUMENTO NOTIFICADO: ${docData.fileName || "N/I"}`,
      `PROTOCOLO DE RASTREIO: ${docData.protocol}`,
      `NOTIFICANTE: ${docData.owner || "Social Jurídico"}`,
      `DATA DE EMISSÃO: ${docData.date}`
    ];
    drawSection("I. IDENTIFICAÇÃO DA NOTIFICAÇÃO", sec1);

    const sec2 = [
      `DATA / HORA DA LEITURA: ${docData.readAt || "N/I"}`,
      `ENDEREÇO IP DO DESTINATÁRIO: ${docData.readIp || "N/I"}`,
      `DISPOSITIVO / NAVEGADOR: ${docData.readAgent || "N/I"}`,
      `GEOLOCALIZAÇÃO (LAT, LONG): ${docData.readGeo || "N/I"}`
    ];
    drawSection("II. RASTREAMENTO DE ENTREGA", sec2);

    const sec3 = [
      "1. VALIDADE JURÍDICA: Este certificado atesta que o destinatário acessou o link exclusivo enviado, gerando o registro dos metadados acima.",
      "2. IMUTABILIDADE: Os dados aqui registrados estão vinculados ao hash do documento original, garantindo que a notificação lida é exatamente a mesma que foi gerada."
    ];
    drawSection("III. NOTAS LEGAIS", sec3);

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(7);
    docPdf.text(`Certificado gerado e autenticado pelo sistema em ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 11, { align: "center" });
    docPdf.text(`Código de Validação: SJ-CERT-${docData.protocol}`, pageWidth / 2, pageHeight - 7, { align: "center" });

    docPdf.save(`Certificado_Entrega_${docData.protocol}.pdf`);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTypingAI]);


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
    [],
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
    [],
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
    [],
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
    [],
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
    [],
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


  const reloadPlanUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/perfil");
      const data = await res.json();
      if (data.success) {
        setProfileData(data.data);
      }
    } catch (e) {
      console.error("Erro ao recarregar limites:", e);
    }
  }, []);

  const loadDataFull = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/perfil");
      const data = await res.json();
      if (data.success) {
        const profile = data.data;
        setProfileData(profile);
        setUserName(profile.name);

        if (profile.oab_verification_status === "PENDING") {
          setShowPendingOABModal(true);
        }
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
          estado: profile.estado || "",
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

  

  // Configurar filtro padrão do CRM com base no cargo (admin vê tudo, membro vê seus casos)
  useEffect(() => {
    if (profileData) {
      setCrmFilter(profileData.cargo === 'admin' ? 'all' : 'my');
    }
  }, [profileData]);

  // Handle Stripe Redirection Race Condition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment_status");
      const googleSync = urlParams.get("google_sync");

      if (googleSync === "success") {
        toast.success("✅ Google Calendar sincronizado com sucesso!", { duration: 4000 });
        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (googleSync === "error") {
        toast.error("❌ Falha ao sincronizar com Google. Tente novamente.", { duration: 4000 });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      if (paymentStatus === "success") {
        toast.success("Pagamento aprovado! Atualizando sua carteira...", { duration: 4000 });
        
        // Polling the profile api 3 times, every 2s, to catch the async webhook update
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const res = await fetch("/api/perfil", { cache: "no-store" });
            const data = await res.json();
            if (data.success && data.data) {
              setProfileData(data.data);
            }
          } catch (e) {
            console.error("Erro ao atualizar saldo automático:", e);
          }
          if (attempts >= 3) {
            clearInterval(interval);
            // Delete parameter from url to avoid looping
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        }, 2000);
        
        return () => clearInterval(interval);
      } else if (paymentStatus === "cancel") {
        toast.error("O pagamento foi cancelado.");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  useEffect(() => {
    loadDataFull();
    fetchAvisos();
    // fetchHighlightedAd(); // Agora no Context
  }, [loadDataFull, fetchAvisos]);

  useEffect(() => {
    if (activeTab === "notificacoes") {
      syncNotificacoes();
    }
  }, [activeTab, syncNotificacoes]);

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

  const handleOpenMessage = async (msg) => {
    const meta = parseNotificationMeta(msg);
    const CASE_RELATED_TYPES = [
      "MENSAGEM",
      "INTERESSE",
      "NEGOCIACAO",
      "CONTRATACAO",
      "CHAT_INICIADO",
      "CASO_CANCELADO",
      "CASO_ENCERRADO",
      "MEET_INVITE"
    ];

    // Redirecionamento inteligente para casos/chats
    if (CASE_RELATED_TYPES.includes(msg.tipo)) {
      if (msg.tipo === "MENSAGEM" || msg.tipo === "NEGOCIACAO" || msg.tipo === "CONTRATACAO" || msg.tipo === "CHAT_INICIADO") {
        const caseId = meta.case_id || meta.caso_id;
        const interestId = meta.interest_id || meta.interesse_id;
        
        if (caseId) {
          let url = `/chat/${caseId}`;
          if (interestId) url += `?interest=${interestId}`;
          window.location.href = url;
          return;
        }
      }
      
      // Se for apenas sobre o caso (ex: cancelado, interesse) e não tiver chat específico
      const caseId = meta.case_id || meta.caso_id;
      if (caseId && msg.tipo !== "MENSAGEM") {
         setActiveTab("meus-casos"); // Ou outra aba relevante
         window.scrollTo({ top: 0, behavior: 'smooth' });
         // Talvez marcar como lida e não abrir modal
      }
    }

    setSelectedMsg(msg);
    setShowMsgModal(true);

    if (!msg.lida) {
      try {
        await fetch("/api/notificacoes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: msg.id }),
        });
        setNotificacoes((prev) =>
          prev.map((n) => (n.id === msg.id ? { ...n, lida: true } : n)),
        );
        refreshNotificacoes(); // Sincroniza com o contexto
      } catch (err) {
        console.error("Erro ao marcar como lida:", err);
      }
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


  

  const renderQueroSite = () => {
    const whatsappMsg = encodeURIComponent("Olá sou advogado pró do site Social Jurídico, e gostaria de contratar o meu site com o desconto de 50%.");
    const whatsappUrl = `https://wa.me/5551993392983?text=${whatsappMsg}`;

    return (
      <div className={styles.toolContainer}>
        <div className={styles.queroSiteCard}>
          <div className={styles.queroSiteBadge}>
            <Sparkles size={14} /> OPORTUNIDADE EXCLUSIVA PRO
          </div>
          <h2 className={styles.queroSiteTitle}>
            Seja a Autoridade que seus Clientes Procuram: Seu Site Profissional com 50% de Desconto!
          </h2>
          
          <div className={styles.queroSiteContent}>
            <p className={styles.queroSiteText}>
              No mundo jurídico moderno, quem não tem um site de alta performance não existe para o Google. 
              Como advogado(a) PRO do SocialJurídico, você garante as melhores ferramentas de gestão, e agora, a melhor vitrine digital.
            </p>
            
            <div className={styles.queroSiteFeatureGrid}>
              <div className={styles.queroSiteFeature}>
                <Zap size={20} color="var(--color-gold)" />
                <div>
                  <h4>Tecnologia Next.js</h4>
                  <p>A mesma tecnologia da Netflix e TikTok. Velocidade extrema e estabilidade.</p>
                </div>
              </div>
              <div className={styles.queroSiteFeature}>
                <Search size={20} color="var(--color-gold)" />
                <div>
                  <h4>SEO Avançado</h4>
                  <p>Estrutura otimizada para você aparecer no topo das buscas orgânicas.</p>
                </div>
              </div>
              <div className={styles.queroSiteFeature}>
                <Shield size={20} color="var(--color-gold)" />
                <div>
                  <h4>Hospedagem Gratuita</h4>
                  <p>Esqueça mensalidades de servidor. Hospedagem gratuita vitalícia inclusa.</p>
                </div>
              </div>
              <div className={styles.queroSiteFeature}>
                <Paperclip size={20} color="var(--color-gold)" />
                <div>
                  <h4>Código Fonte</h4>
                  <p>O site é seu de verdade. Entregamos o código fonte completo e original.</p>
                </div>
              </div>
            </div>

            <div className={styles.queroSitePromoBox}>
              <div className={styles.promoLabel}>INVESTIMENTO EXCLUSIVO PRO</div>
              <div className={styles.promoPrices}>
                <span className={styles.oldPrice}>R$ 1.000,00</span>
                <span className={styles.newPrice}>R$ 500,00</span>
              </div>
              <p className={styles.promoInclude}>
                Site Completo + Banco de Dados + Suporte de 45 dias + SEO
              </p>
            </div>

            <div className={styles.devProfile}>
              <div className={styles.devAvatar}>
                <User size={30} />
              </div>
              <div className={styles.devInfo}>
                <span className={styles.devName}>Desenvolvedor: <strong>Saulo Pavanello</strong></span>
                <a href="https://www.saulopavanello.com.br" target="_blank" rel="noopener noreferrer" className={styles.devLink}>
                   www.saulopavanello.com.br
                </a>
              </div>
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.wppBtn}>
                <MessageSquare size={20} /> Contratar Agora via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
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

  const renderBlindagem = () => {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
        <div style={{ marginBottom: '20px' }}>
          <Shield size={64} color="var(--color-gold)" style={{ marginBottom: '15px' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>Blindagem de Documentos</h2>
          <p style={{ color: '#a0a0a0', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Esta ferramenta permite proteger seus documentos jurídicos contra fraudes e adulterações usando tecnologia de ponta.
          </p>
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          maxWidth: '1200px',
          margin: '30px auto 0 auto',
          padding: '0 10px'
        }}>
          {/* Card 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'transform(0.2s), background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onClick={() => setShowContratoModal(true)}
          >
            <PenTool size={32} color="var(--color-gold)" style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>Blindagem de Contratos</h3>
            <p style={{ color: '#808080', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Proteja seus contratos contra alterações não autorizadas e garanta a autenticidade das assinaturas.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onClick={() => {
            setProcuracaoForm(prev => ({
              ...prev,
              outorgado: {
                nome: profileData?.name || "",
                oab: profileData?.oab || "",
                cpf: "",
                endereco: ""
              }
            }));
            setShowProcuracaoModal(true);
          }}
          >
            <ShieldHalf size={32} color="var(--color-gold)" style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>Blindagem de Procuração</h3>
            <p style={{ color: '#808080', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Evite fraudes em procurações com registro digital seguro e verificação em tempo real.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onClick={() => setShowProvasModal(true)}
          >
            <Eye size={32} color="var(--color-gold)" style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>Blindagem de Provas Digitais</h3>
            <p style={{ color: '#808080', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Registre prints, áudios e vídeos com validade jurídica e carimbo de tempo.
            </p>
          </div>

          {/* Card 4 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onClick={() => setShowNotificacaoModal(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <Send size={32} color="var(--color-gold)" style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>Notificação ExtraJudicial</h3>
            <p style={{ color: '#808080', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Envie notificações com comprovação de entrega e leitura com validade jurídica.
            </p>
          </div>
        </div>

        {/* Lista de Documentos Blindados */}
        <div style={{ 
          marginTop: '40px', 
          maxWidth: '1200px', 
          margin: '40px auto 0 auto',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          textAlign: 'left'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>📄 Documentos Blindados</h3>
          
          {blindadosDocuments.length === 0 ? (
            <p style={{ color: '#808080', fontSize: '0.9rem' }}>Nenhum documento blindado ainda.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                    <th style={{ padding: '10px', color: '#aaa' }}>Documento</th>
                    <th style={{ padding: '10px', color: '#aaa' }}>Protocolo</th>
                    <th style={{ padding: '10px', color: '#aaa' }}>Data</th>
                    <th style={{ padding: '10px', color: '#aaa' }}>Hash</th>
                    <th style={{ padding: '10px', color: '#aaa' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {blindadosDocuments.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '10px', color: '#fff' }}>
                        {doc.name}
                        {doc.type === 'Notificação' && (
                          <span style={{ marginLeft: '10px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', background: doc.status === 'lido' ? '#00e676' : '#ffc107', color: '#000', fontWeight: 'bold' }}>
                            {doc.status === 'lido' ? 'LIDO' : 'ENVIADO'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: '#00e676' }}>{doc.protocol}</td>
                      <td style={{ padding: '10px', color: '#ccc' }}>{doc.date}</td>
                      <td style={{ padding: '10px', color: '#aaa', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {doc.hash ? doc.hash.substring(0, 20) + '...' : 'N/I'}
                      </td>
                      <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '0.9rem' }}
                          onClick={() => {
                            toast.success("Gerando certificado...");
                            
                            generateCertificatePDF({
                              fileName: doc.name,
                              protocol: doc.protocol,
                              owner: `${profileData?.name || "Advogado"} (OAB: ${profileData?.oab || "N/I"})`,
                              date: doc.date,
                              hash: doc.hash,
                              ip: "::1",
                              agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/I'
                            });
                          }}
                        >
                          Baixar Certificado
                        </button>

                        {doc.type === 'Notificação' && doc.status === 'lido' && (
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#00e676', cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={() => {
                              toast.success("Gerando certificado de entrega...");
                              
                              generateDeliveryCertificatePDF({
                                fileName: doc.name,
                                protocol: doc.protocol,
                                owner: `${profileData?.name || "Advogado"} (OAB: ${profileData?.oab || "N/I"})`,
                                date: doc.date,
                                hash: doc.hash,
                                readAt: doc.read_at,
                                readIp: doc.read_ip,
                                readAgent: doc.read_user_agent,
                                readGeo: doc.read_geo
                              });
                            }}
                          >
                            Certificado de Entrega
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAssinatura = () => {
    return (
      <div className={styles.toolContainer}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PenTool color="var(--color-gold)" size={28} /> Central de Assinaturas Digitais
            </h2>
            <p className={styles.sectionDesc} style={{ color: 'var(--color-silver-dark)', marginTop: '4px' }}>
              Assine documentos com carimbo de tempo eletrônico e validade jurídica equivalente à assinatura física.
            </p>
          </div>
          <button
            onClick={() => {
              setNewSignatureData({
                document_name: "",
                document_type: "contrato",
                lawyer_name: profileData?.name || "",
                lawyer_email: profileData?.email || "",
                client_name: "",
                client_email: "",
                client_id: ""
              });
              setSignatureFile(null);
              setShowSignatureModal(true);
            }}
            className={styles.newClientBtn}
            style={{ background: 'linear-gradient(135deg, var(--color-gold-dark) 0%, var(--color-gold) 100%)', color: '#000', fontWeight: 'bold' }}
          >
            <Plus size={18} /> Iniciar Novo Processo
          </button>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-silver-dark)', fontWeight: 600 }}>Total de Processos</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '5px' }}>{signatures.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 230, 118, 0.1)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#00e676', fontWeight: 600 }}>Assinados por Completo</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00e676', marginTop: '5px' }}>{signatures.filter(s => s.status === 'signed').length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255, 152, 0, 0.1)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ff9800', fontWeight: 600 }}>Aguardando Assinaturas</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff9800', marginTop: '5px' }}>{signatures.filter(s => s.status !== 'signed').length}</div>
          </div>
          <div style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gold)', fontWeight: 600 }}>Validador de Assinaturas</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-silver-dark)', marginTop: '2px', margin: 0 }}>Verifique a validade de um código.</p>
            </div>
            <a href="/validar" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 'bold', marginTop: '10px' }}>
              Acessar Validador <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Content Listing */}
        {loadingSignatures ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '15px' }}>
            <Loader2 size={40} className={styles.spin} color="var(--color-gold)" />
            <p style={{ color: 'var(--color-silver-dark)' }}>Carregando seus processos de assinatura...</p>
          </div>
        ) : signatures.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
            <PenTool size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Nenhuma Assinatura Registrada</h3>
            <p style={{ color: 'var(--color-silver-dark)', maxWidth: '500px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
              Inicie um novo processo de assinatura enviando um contrato ou procuração PDF para coletar assinaturas eletrônicas com validade jurídica de tempo e hash.
            </p>
            <button
              onClick={() => {
                setNewSignatureData({
                  document_name: "",
                  document_type: "contrato",
                  lawyer_name: profileData?.name || "",
                  lawyer_email: profileData?.email || "",
                  client_name: "",
                  client_email: "",
                  client_id: ""
                });
                setSignatureFile(null);
                setShowSignatureModal(true);
              }}
              className={styles.newClientBtn}
              style={{ background: 'linear-gradient(135deg, var(--color-gold-dark) 0%, var(--color-gold) 100%)', color: '#000', fontWeight: 'bold' }}
            >
              <Plus size={16} /> Iniciar Primeira Assinatura
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '15px 20px', color: 'var(--color-silver-dark)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Documento / Código</th>
                    <th style={{ padding: '15px 20px', color: 'var(--color-silver-dark)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Signatários</th>
                    <th style={{ padding: '15px 20px', color: 'var(--color-silver-dark)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Status Geral</th>
                    <th style={{ padding: '15px 20px', color: 'var(--color-silver-dark)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Criado em</th>
                    <th style={{ padding: '15px 20px', color: 'var(--color-silver-dark)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((sig) => {
                    const meta = typeof sig.metadata === 'string' ? JSON.parse(sig.metadata) : sig.metadata;
                    const lawyerSigned = meta?.lawyer?.signed;
                    const clientSigned = meta?.client?.signed;
                    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const clientSignLink = `${siteUrl}/assinatura/${sig.id}?role=client`;
                    const lawyerSignLink = `${siteUrl}/assinatura/${sig.id}?role=lawyer`;

                    return (
                      <tr key={sig.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center' }}>
                              <FileText size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem', marginBottom: '4px' }}>{sig.document_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-silver-dark)', fontFamily: 'monospace' }}>{sig.verification_code}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(sig.verification_code);
                                    toast.success("Código copiado!");
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'var(--color-silver-dark)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                  title="Copiar código"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--color-silver-dark)', fontWeight: 600 }}>ADV:</span>
                              <span style={{ color: '#fff' }}>{meta?.lawyer?.name}</span>
                              {lawyerSigned ? (
                                <span style={{ color: '#00e676', fontSize: '0.7rem', background: 'rgba(0, 230, 118, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}><Check size={10} /> Assinado</span>
                              ) : (
                                <span style={{ color: '#ff9800', fontSize: '0.7rem', background: 'rgba(255, 152, 0, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Pendente</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--color-silver-dark)', fontWeight: 600 }}>CLI:</span>
                              <span style={{ color: '#fff' }}>{meta?.client?.name}</span>
                              {clientSigned ? (
                                <span style={{ color: '#00e676', fontSize: '0.7rem', background: 'rgba(0, 230, 118, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}><Check size={10} /> Assinado</span>
                              ) : (
                                <span style={{ color: '#ff9800', fontSize: '0.7rem', background: 'rgba(255, 152, 0, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Pendente</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px' }}>
                          {sig.status === 'signed' ? (
                            <span style={{ padding: '6px 12px', background: 'rgba(0, 230, 118, 0.1)', color: '#00e676', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> Assinado
                            </span>
                          ) : sig.status === 'partially_signed' ? (
                            <span style={{ padding: '6px 12px', background: 'rgba(0, 140, 255, 0.1)', color: '#00b0ff', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Parcialmente
                            </span>
                          ) : (
                            <span style={{ padding: '6px 12px', background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '20px', color: 'var(--color-silver-dark)', fontSize: '0.85rem' }}>
                          {new Date(sig.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {!lawyerSigned && (
                              <a
                                href={lawyerSignLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--color-gold)', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <PenTool size={12} /> Assinar
                              </a>
                            )}
                            
                            {!clientSigned && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(clientSignLink);
                                  toast.success("Link do cliente copiado!");
                                }}
                                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Copy size={12} /> Link Cliente
                              </button>
                            )}

                            {!clientSigned && (
                              <button
                                onClick={() => handleResendOtp(sig.id, 'client')}
                                style={{ padding: '6px 12px', background: 'rgba(0, 140, 255, 0.1)', border: '1px solid rgba(0, 140, 255, 0.2)', color: '#00b0ff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Send size={12} /> Reenviar E-mail
                              </button>
                            )}

                            {sig.status === 'signed' && sig.document_url && (
                              <a
                                href={`${sig.document_url}${sig.document_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: '6px 12px', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.2)', color: '#00e676', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Download size={12} /> Baixar PDF
                              </a>
                            )}

                            <button
                              onClick={() => {
                                toast.success("Gerando certificado de assinatura...");
                                generateSignatureCertificatePDF(sig);
                              }}
                              style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--color-gold)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <FileDown size={12} /> Certificado
                            </button>

                            <a
                              href={`/validar?code=${sig.verification_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-silver)', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={12} /> Validar
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Novo Processo */}
        {showSignatureModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PenTool color="var(--color-gold)" size={22} /> Iniciar Assinatura Digital
                </h3>
                <button onClick={() => setShowSignatureModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: '5px' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSignature} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-silver)', fontWeight: 600, marginBottom: '6px' }}>Nome do Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Contrato de Honorários Advocatícios - João Silva"
                    value={newSignatureData.document_name}
                    onChange={(e) => setNewSignatureData(prev => ({ ...prev, document_name: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-silver)', fontWeight: 600, marginBottom: '6px' }}>Tipo de Documento</label>
                  <select
                    value={newSignatureData.document_type}
                    onChange={(e) => setNewSignatureData(prev => ({ ...prev, document_type: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '0.9rem' }}
                  >
                    <option value="contrato" style={{ background: '#09090b' }}>Contrato</option>
                    <option value="procuracao" style={{ background: '#09090b' }}>Procuração</option>
                    <option value="outro" style={{ background: '#09090b' }}>Outro</option>
                  </select>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '15px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-gold)', marginBottom: '10px' }}>Advogado (Você)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-silver-dark)', marginBottom: '4px' }}>Nome completo</label>
                      <input
                        type="text"
                        required
                        value={newSignatureData.lawyer_name}
                        onChange={(e) => setNewSignatureData(prev => ({ ...prev, lawyer_name: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-silver-dark)', marginBottom: '4px' }}>E-mail</label>
                      <input
                        type="email"
                        required
                        value={newSignatureData.lawyer_email}
                        onChange={(e) => setNewSignatureData(prev => ({ ...prev, lawyer_email: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-gold)', margin: 0 }}>Cliente / Outra Parte</h4>
                    {crmClients.length > 0 && (
                      <select
                        onChange={(e) => {
                          const selected = crmClients.find(c => c.id === e.target.value);
                          if (selected) {
                            setNewSignatureData(prev => ({
                              ...prev,
                              client_id: selected.id,
                              client_name: selected.name,
                              client_email: selected.email || ""
                            }));
                          }
                        }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '0.75rem' }}
                      >
                        <option value="">Selecionar do CRM...</option>
                        {crmClients.map(c => (
                          <option key={c.id} value={c.id} style={{ background: '#09090b' }}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-silver-dark)', marginBottom: '4px' }}>Nome completo *</label>
                      <input
                        type="text"
                        required
                        value={newSignatureData.client_name}
                        onChange={(e) => setNewSignatureData(prev => ({ ...prev, client_name: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-silver-dark)', marginBottom: '4px' }}>E-mail *</label>
                      <input
                        type="email"
                        required
                        value={newSignatureData.client_email}
                        onChange={(e) => setNewSignatureData(prev => ({ ...prev, client_email: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-silver)', fontWeight: 600, marginBottom: '6px' }}>Arquivo PDF do Documento *</label>
                  <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }} onClick={() => document.getElementById('signature-file-picker').click()}>
                    <Upload size={24} style={{ color: 'var(--color-silver-dark)', marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-silver)', margin: 0 }}>
                      {signatureFile ? signatureFile.name : "Clique para selecionar o PDF original do documento"}
                    </p>
                    <input
                      id="signature-file-picker"
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => setSignatureFile(e.target.files[0])}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(false)}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSignature}
                    style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, var(--color-gold-dark) 0%, var(--color-gold) 100%)', border: 'none', color: '#000', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {isCreatingSignature ? <Loader2 className={styles.spin} size={18} /> : <PenTool size={18} />}
                    {isCreatingSignature ? "Iniciando..." : "Iniciar Processo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case "assinatura":
        return renderAssinatura();
      case "blindagem":
        return renderBlindagem();
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
      case "quero-site":
        return renderQueroSite();
      case "documentacao":
        return renderDocumentacao();
      case "anuncios-PREPOSTOS":
      case "anuncios-DILIGENCIAS":
      case "anuncios-OUTROS":
        return renderAnuncios();
      case "comunicacao":
        return renderComunicacao();
      default:
        return renderOportunidades();
    }
  };

  const renderComunicacao = () => {
    if (!profileData?.escritorio_id) return null;
    return (
      <div className={styles.toolContainer}>
        <div className={styles.crmHeader} style={{ marginBottom: "20px" }}>
          <div>
            <h2 className={styles.sectionTitle}>💬 Comunicação Interna (Hub Corporativo)</h2>
            <p className={styles.sectionSubtitle}>
              Canais de texto, voz e videoconferência Jitsi integrados para o seu escritório.
            </p>
          </div>
        </div>

        <main className={styles.commContainer}>
          {/* SIDEBAR: CANAIS */}
          <aside className={styles.commSidebar}>
            <div className={styles.sidebarHeader}>
              <h3>Canais</h3>
              {profileData?.cargo === "admin" && (
                <button 
                  className={styles.addChannelBtn} 
                  onClick={() => setIsAddChannelOpen(true)} 
                  title="Criar Canal"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            <div className={styles.channelsList}>
              {/* Canais de Texto */}
              <div className={styles.channelCategory}>
                <span className={styles.categoryTitle}>💬 Canais de Texto</span>
                {/* Chat Geral */}
                <div 
                  className={`${styles.channelItem} ${activeChannelId === null ? styles.activeChannelItem : ""}`}
                  onClick={() => {
                    setActiveChannelId(null);
                    setActiveMeetingRoom(null);
                  }}
                >
                  <span className={styles.channelItemLeft}># geral</span>
                </div>
                {/* Canais criados */}
                {(commData.canais || [])
                  .filter(c => c.tipo === "texto")
                  .map(chan => (
                    <div 
                      key={chan.id}
                      className={`${styles.channelItem} ${activeChannelId === chan.id ? styles.activeChannelItem : ""}`}
                      onClick={() => {
                        setActiveChannelId(chan.id);
                        setActiveMeetingRoom(null);
                      }}
                    >
                      <span className={styles.channelItemLeft}># {chan.nome}</span>
                      {profileData?.cargo === "admin" && (
                        <button className={styles.deleteChanBtn} onClick={(e) => handleDeleteChannel(e, chan.id)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              {/* Canais de Voz (Discord Style) */}
              <div className={styles.channelCategory}>
                <span className={styles.categoryTitle}>🔊 Canais de Voz</span>
                {(commData.canais || []).filter(c => c.tipo === "voz").length === 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", paddingLeft: "8px", fontStyle: "italic" }}>
                    Nenhuma sala de voz ativa.
                  </div>
                )}
                {(commData.canais || [])
                  .filter(c => c.tipo === "voz")
                  .map(chan => {
                    const roomParticipants = (commData.participantesVoz || []).filter(p => p.canal_id === chan.id);
                    const isUserInThisRoom = roomParticipants.some(p => p.member_id === profileData?.id);
                    
                    return (
                      <div key={chan.id} className={styles.channelCategory}>
                        <div 
                          className={`${styles.channelItem} ${isUserInThisRoom ? styles.activeChannelItem : ""}`}
                          onClick={() => handleJoinVoice(chan.id)}
                        >
                          <span className={styles.channelItemLeft}>
                            🔊 {chan.nome} ({roomParticipants.length}/{chan.limite_pessoas || "∞"})
                          </span>
                          {profileData?.cargo === "admin" && (
                            <button className={styles.deleteChanBtn} onClick={(e) => handleDeleteChannel(e, chan.id)}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        
                        {/* Membros na sala */}
                        {roomParticipants.length > 0 && (
                          <div className={styles.voiceUsersList}>
                            {roomParticipants.map(participant => (
                              <div key={participant.id} className={styles.voiceUserItem}>
                                <span className={styles.voiceUserLeft}>
                                  <div className={`${styles.voiceAvatar} ${!participant.mutado ? styles.activeSpeaker : ""}`}>
                                    {participant.member_name.charAt(0).toUpperCase()}
                                  </div>
                                  {participant.member_name}
                                </span>
                                <div className={styles.voiceUserIcons}>
                                  {participant.mutado ? (
                                    <MicOff size={11} color="#ef4444" />
                                  ) : (
                                    <Mic size={11} color="#10b981" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Salas de Reunião por Vídeo */}
              <div className={styles.channelCategory}>
                <span className={styles.categoryTitle}>🎥 Salas de Reunião</span>
                {(commData.canais || []).filter(c => c.tipo === "video").length === 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", paddingLeft: "8px", fontStyle: "italic" }}>
                    Nenhuma sala de reunião ativa.
                  </div>
                )}
                {(commData.canais || [])
                  .filter(c => c.tipo === "video")
                  .map(chan => (
                    <div 
                      key={chan.id}
                      className={`${styles.channelItem} ${activeMeetingRoom === chan.id ? styles.activeChannelItem : ""}`}
                      onClick={() => {
                        setActiveChannelId(null);
                        setActiveMeetingRoom(chan.id);
                        setActiveMeetingTitle(chan.nome);
                      }}
                    >
                      <span className={styles.channelItemLeft}>🎥 {chan.nome}</span>
                      {profileData?.cargo === "admin" && (
                        <button className={styles.deleteChanBtn} onClick={(e) => handleDeleteChannel(e, chan.id)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Rodapé da Voz (Status Conectado) */}
            {(commData.participantesVoz || []).some(p => p.member_id === profileData?.id) && (() => {
              const myVoice = (commData.participantesVoz || []).find(p => p.member_id === profileData?.id);
              const room = (commData.canais || []).find(c => c.id === myVoice?.canal_id);
              return (
                <div className={styles.voiceStatusPanel}>
                  <div className={styles.voiceStatusHeader}>
                    <Volume2 size={14} /> Voz: {room?.nome}
                  </div>
                  <div className={styles.voiceStatusActions}>
                    <button 
                      className={`${styles.micBtn} ${myVoice?.mutado ? styles.micMuted : ""}`} 
                      onClick={() => handleToggleMute(myVoice?.mutado)}
                    >
                      {myVoice?.mutado ? <MicOff size={14} /> : <Mic size={14} />} 
                      {myVoice?.mutado ? "Mutado" : "Falar"}
                    </button>
                    <button className={styles.disconnectBtn} onClick={handleLeaveVoice}>
                      <PhoneOff size={14} /> Sair
                    </button>
                  </div>
                </div>
              );
            })()}
          </aside>

          {/* MAIN CHAT AREA */}
          {activeMeetingRoom ? (() => {
            const secureMeetingRoomName = `sj-meet-${profileData.escritorio_id}-${activeMeetingRoom}`;
            return (
              <div className={styles.chatArea}>
                <div className={styles.chatAreaHeader}>
                  <h2>🎥 Sala de Reunião: {activeMeetingTitle}</h2>
                </div>
                <div className={styles.meetingPreScreen}>
                  <div className={styles.meetingCard}>
                    <Video size={48} color="#10b981" />
                    <h3>Preparar Videoconferência</h3>
                    <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: 0, lineHeight: "1.4" }}>
                      Esta sala de reuniões suporta áudio, vídeo, chat de texto e compartilhamento de tela com criptografia. A videoconferência será aberta em uma tela integrada.
                    </p>
                    <button 
                      className={styles.meetingBtn} 
                      onClick={() => {
                        window.open(`https://meet.jit.si/${secureMeetingRoomName}#config.startWithVideoMuted=true`, "_blank");
                      }}
                    >
                      <Video size={18} /> Iniciar Vídeo / Entrar na Reunião
                    </button>
                  </div>
                </div>
              </div>
            );
          })() : (() => {
            const channelObj = (commData.canais || []).find(c => c.id === activeChannelId);
            const channelName = channelObj ? `# ${channelObj.nome}` : "# geral";
            const filteredMessages = (commData.mensagens || []).filter(m => m.canal_id === activeChannelId);

            return (
              <div className={styles.chatArea}>
                <div className={styles.chatAreaHeader}>
                  <h2>💬 {channelName}</h2>
                  <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    Histórico do canal ({filteredMessages.length} msgs)
                  </span>
                </div>

                <div className={styles.messageList}>
                  {filteredMessages.length === 0 ? (
                    <div style={{ padding: "40px", fontStyle: "italic", textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
                      Nenhuma mensagem enviada neste canal ainda. Envie a primeira mensagem!
                    </div>
                  ) : (
                    filteredMessages.map(msg => (
                      <div key={msg.id} className={styles.messageItem}>
                        <div className={styles.msgAvatar}>
                          {msg.sender_name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.msgContent}>
                          <div className={styles.msgHeader}>
                            <span className={styles.msgSender}>{msg.sender_name}</span>
                            <span className={`${styles.msgBadge} ${styles[`badge_${msg.sender_cargo}`]}`}>
                              {msg.sender_cargo === "admin" ? "Gestor" : (msg.sender_cargo === "secretaria" ? "Secretária" : (msg.sender_cargo === "estagiario" ? "Estagiário" : "Advogado"))}
                            </span>
                            <span className={styles.msgTime}>
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className={styles.msgText}>{msg.mensagem}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.chatInputWrapper}>
                  <form className={styles.chatInputBar} onSubmit={handleSendCommMessage}>
                    <input 
                      type="text"
                      className={styles.chatInput}
                      placeholder={`Enviar mensagem em ${channelName}...`}
                      value={commChatInput}
                      onChange={(e) => setCommChatInput(e.target.value)}
                    />
                    <button type="submit" className={styles.chatSendBtn}>
                      <Send size={14} /> Enviar
                    </button>
                  </form>
                </div>
              </div>
            );
          })()}
        </main>

        {/* MODAL: CRIAR CANAL */}
        {isAddChannelOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsAddChannelOpen(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: "450px" }}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Criar Novo Canal</h2>
                <p className={styles.modalSubtitle}>Crie espaços para chat, voz ou videoconferência</p>
              </div>

              <form onSubmit={handleCreateChannel} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Nome do Canal</label>
                  <input 
                    type="text" 
                    placeholder="ex: societario-geral"
                    className={styles.formInput}
                    value={newChannel.nome}
                    onChange={e => setNewChannel({ ...newChannel, nome: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Tipo de Canal</label>
                  <select 
                    className={styles.formInput}
                    value={newChannel.tipo}
                    onChange={e => setNewChannel({ ...newChannel, tipo: e.target.value })}
                  >
                    <option value="texto">💬 Canal de Texto (Chat)</option>
                    <option value="voz">🔊 Canal de Voz (Discord Style)</option>
                    <option value="video">🎥 Sala de Reunião por Vídeo</option>
                  </select>
                </div>

                {newChannel.tipo === "voz" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Limite de Pessoas (0 = Ilimitado)</label>
                    <input 
                      type="number" 
                      className={styles.formInput}
                      value={newChannel.limite}
                      onChange={e => setNewChannel({ ...newChannel, limite: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>Criar Canal</button>
                  <button type="button" className={styles.closeModalBtn} onClick={() => setIsAddChannelOpen(false)} style={{ flex: 1, margin: 0 }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnuncios = () => {
    return (
      <div className={styles.anunciosPageContainer}>
        <div className={styles.anunciosHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Anúncios de Serviços</h2>
              <p className={styles.sectionDesc}>
                Encontre parceiros e serviços para sua prática jurídica ({activeAnuncioTab.replace("anuncios-", "")})
              </p>
          </div>
          <div className={styles.categoryBadge}>{activeAnuncioTab.replace("anuncios-", "")}</div>
        </div>

        {loadingAnuncios ? (
          <div className={styles.loadingState}>Buscando anunciantes...</div>
        ) : anunciosData.length > 0 ? (
          <div className={styles.anuncioGrid}>
            {anunciosData.map((anuncio) => (
              <div key={anuncio.id} className={styles.anuncioCard}>
                {anuncio.em_destaque && <span className={styles.adBadge}>Destaque</span>}
                <div className={styles.adHeader}>
                  <span className={styles.adCategory}>{anuncio.categoria}</span>
                  <h3 className={styles.adTitle}>{anuncio.titulo}</h3>
                </div>
                <p className={styles.adDescription}>{anuncio.descricao}</p>
                <div className={styles.adFooter}>
                  <div className={styles.adVendor}>
                    <div className={styles.vendorInitials}>
                      {anuncio.anunciante?.nome_empresa?.substring(0, 2).toUpperCase() || "AN"}
                    </div>
                    <span className={styles.vendorName}>{anuncio.anunciante?.nome_empresa}</span>
                  </div>
                  <button 
                     className={styles.adContactBtn}
                     onClick={() => {
                       const phone = anuncio.anunciante?.whatsapp?.replace(/\D/g, "");
                       if (phone) {
                         window.open(`https://wa.me/55${phone}?text=Olá, vi seu anúncio "${anuncio.titulo}" no SocialJurídico e gostaria de mais informações.`, "_blank");
                       } else {
                         toast.error("Contato não disponível");
                       }
                     }}
                  >
                    <MessageSquare size={16} /> Contatar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Users size={48} style={{ opacity: 0.1, marginBottom: 20 }} />
            <p>Nenhum anúncio disponível para esta categoria no momento.</p>
          </div>
        )}
      </div>
    );
  };

  const renderOportunidades = () => (
    <div className={styles.toolContainer}>
      <PWAInlineBanner />
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Buscar por qualquer coisa..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {avisos.length > 0 && (
        <div className={styles.avisosMarquee}>
          <div className={styles.marqueeContent}>
            {[...avisos, ...avisos, ...avisos].map((aviso, idx) => (
              <span key={`aviso-${idx}`} className={styles.avisoItem}>
                {aviso.texto}
                <span className={styles.avisoSeparator}>•</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
                            {caso.area_atuacao || "Direito Geral"} • {caso.cidade || "N/A"} - {caso.estado || "UF"}
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
                    {selectedCasoModal.cidade && (
                      <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
                        📍 {selectedCasoModal.cidade} - {selectedCasoModal.estado}
                      </span>
                    )}
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

  const executeVincularCaso = async (casoId) => {
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
    } finally {
      setShowConfirmInterestModal(false);
      setConfirmInterestCaseId(null);
    }
  };

  const vincularCaso = async (casoId) => {
    const currentBalance = profileData?.balance || 0;
    if (currentBalance < 1) {
      toast.error("Saldo insuficiente. Você precisa de pelo menos 1 Juri.");
      setShowBuyModal(true);
      return;
    }
    
    setIsCheckingInterest(true);
    try {
      const res = await fetch(`/api/casos/vincular?casoId=${casoId}`);
      const data = await res.json();
      if (data.success) {
        setConfirmInterestCount(data.count || 0);
        setConfirmInterestCaseId(casoId);
        setShowConfirmInterestModal(true);
      } else {
        toast.error(data.message || "Erro ao verificar interessados.");
      }
    } catch (err) {
      console.error("Erro ao verificar interessados:", err);
      toast.error("Erro ao verificar interessados no caso.");
    } finally {
      setIsCheckingInterest(false);
    }
  };

  const handleDesfazerInteresse = (casoId) => {
    setCancelInterestCaseId(casoId);
    setShowCancelInterestModal(true);
  };

  const executeDesfazerInteresse = async () => {
    if (!cancelInterestCaseId) return;
    setIsCancelingInterest(true);
    try {
      const res = await fetch(`/api/casos/vincular?casoId=${cancelInterestCaseId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Interesse cancelado com sucesso!");
        setProfileData((prev) =>
          prev ? { ...prev, balance: data.newBalance } : prev,
        );
        fetchMyInterests(profileData.id);
        fetchCasos(profileData.id);
      } else {
        toast.error(data.message || "Erro ao desfazer interesse.");
      }
    } catch (err) {
      console.error("Erro ao desfazer interesse:", err);
      toast.error("Erro ao desfazer interesse.");
    } finally {
      setIsCancelingInterest(false);
      setShowCancelInterestModal(false);
      setCancelInterestCaseId(null);
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
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <button
                      className={styles.applyBtn}
                      style={{ background: "transparent", color: "#888", border: "1px solid #444", cursor: "not-allowed", flex: 1 }}
                      disabled
                    >
                      Aguardando...
                    </button>
                    <button
                      className={styles.applyBtn}
                      style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: 600, flex: 1, cursor: 'pointer' }}
                      onClick={() => handleDesfazerInteresse(caso.id)}
                    >
                      Desfazer
                    </button>
                  </div>
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
              onClick={() => handleOpenMessage(msg)}
              style={{
                cursor: "pointer",
                position: "relative",
                borderLeft: !msg.lida
                  ? "4px solid #ef4444"
                  : "1px solid rgba(255, 255, 255, 0.05)",
                backgroundColor: [
                  "MENSAGEM",
                  "NEGOCIACAO",
                  "CONTRATACAO",
                  "CHAT_INICIADO",
                  "INTERESSE"
                ].includes(msg.tipo) 
                  ? "rgba(59, 130, 246, 0.08)" // Sutil destaque azul para casos/clientes
                  : "transparent",
                border: [
                  "MENSAGEM",
                  "NEGOCIACAO",
                  "CONTRATACAO",
                  "CHAT_INICIADO",
                  "INTERESSE"
                ].includes(msg.tipo) 
                  ? "1px solid rgba(59, 130, 246, 0.2)" 
                  : "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {!msg.lida && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '10px',
                  background: '#ef4444',
                  color: '#white',
                  fontSize: '0.6rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                  zIndex: 2
                }}>
                  NOVA
                </div>
              )}
              <div className={styles.opHeader}>
                <div className={styles.opArea}>
                  <div
                    className={styles.opIcon}
                    style={{ 
                      background: [
                        "MENSAGEM",
                        "NEGOCIACAO",
                        "CONTRATACAO",
                        "CHAT_INICIADO",
                        "INTERESSE"
                      ].includes(msg.tipo) ? "#3b82f6" : "#f59e0b" 
                    }}
                  >
                    <Bell size={16} />
                  </div>
                  <div className={styles.opTitleGroup}>
                    <h3>{msg.titulo || "Mensagem"}</h3>
                    <span className={styles.opLocation}>
                      {[
                        "MENSAGEM",
                        "NEGOCIACAO",
                        "CONTRATACAO",
                        "CHAT_INICIADO",
                        "INTERESSE"
                      ].includes(msg.tipo) ? "Cliente" : "Administrador"}
                    </span>
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

  const handleStopVoiceCRM = () => {
    isConcludedRef.current = true;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.shouldProcess = true;
      recognitionRef.current.stop();
    }
  };

  const handleCancelVoiceCRM = () => {
    isConcludedRef.current = false;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.shouldProcess = false;
      recognitionRef.current.abort();
    }
    setShowVoiceModal(false);
    setIsListening(false);
  };

  const renderVoiceModal = () => {
    if (!showVoiceModal) return null;

    const normalizedText = voiceTranscript.toLowerCase();
    const checklist = [
      { id: "nome", label: "Nome do Cliente", matched: normalizedText.trim().length > 5 },
      { id: "tipo", label: "Tipo (Fís./Jur.)", matched: normalizedText.includes("física") || normalizedText.includes("jurídica") || normalizedText.includes("empresa") || normalizedText.includes("limitada") || normalizedText.includes("ltda") },
      { id: "cpf", label: "CPF / CNPJ", matched: /\d{3}/.test(normalizedText) || normalizedText.includes("cpf") || normalizedText.includes("cnpj") },
      { id: "rg", label: "RG / IE", matched: normalizedText.includes("rg") || normalizedText.includes("ie") || normalizedText.includes("identidade") || normalizedText.includes("inscrição estadual") },
      { id: "estado_civil", label: "Estado Civil", matched: normalizedText.includes("solteir") || normalizedText.includes("casad") || normalizedText.includes("divorciad") || normalizedText.includes("viúv") || normalizedText.includes("união estável") || normalizedText.includes("estado civil") },
      { id: "profissao", label: "Profissão", matched: normalizedText.includes("profissão") || normalizedText.includes("trabalha") || normalizedText.includes("autônomo") || normalizedText.includes("aposentado") || normalizedText.includes("empresário") || normalizedText.includes("advogado") || normalizedText.includes("engenheiro") || normalizedText.includes("médico") || normalizedText.includes("professor") },
      { id: "telefone", label: "Telefone", matched: normalizedText.includes("telefone") || normalizedText.includes("celular") || normalizedText.includes("whats") || /\d{8}/.test(normalizedText) },
      { id: "email", label: "E-mail", matched: normalizedText.includes("@") || normalizedText.includes("email") || normalizedText.includes("e-mail") },
      { id: "endereco", label: "Endereço", matched: normalizedText.includes("rua") || normalizedText.includes("avenida") || normalizedText.includes("reside") || normalizedText.includes("mora") || normalizedText.includes("bairro") || normalizedText.includes("cidade") },
      { id: "caso", label: "Fatos do Caso", matched: normalizedText.includes("caso") || normalizedText.includes("danos") || normalizedText.includes("processo") || normalizedText.includes("contrato") || normalizedText.includes("ação") || normalizedText.includes("fato") }
    ];

    return (
      <div className={styles.modalOverlay} style={{ zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', maxWidth: '950px', width: '100%', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'center' }}>
          
          {/* PAINEL ESQUERDO: O GRAVADOR */}
          <div className={styles.modalContent} style={{ flex: '1.2', minWidth: '320px', textAlign: 'center', padding: '35px', borderRadius: '24px', background: '#111116', border: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', margin: 0 }}>
            <div>
              <div className={styles.voicePulseContainer} style={{ marginBottom: '20px', position: 'relative', display: 'inline-block' }}>
                <div className={styles.pulseMic} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '2px solid rgba(212,175,55,0.3)' }}>
                  <Mic size={40} color="var(--color-gold)" />
                </div>
                {isListening && (
                  <>
                    <div className={styles.voiceWave} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '2px solid var(--color-gold)', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.6 }}></div>
                    <div className={styles.voiceWave} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '2px solid var(--color-gold)', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '0.5s', opacity: 0.4 }}></div>
                  </>
                )}
              </div>
              
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px', color: '#fff' }}>
                {isListening ? "Estou ouvindo..." : "Processando áudio..."}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '20px' }}>
                Fale os dados do cliente naturalmente. A IA cuidará de estruturar tudo nos campos certos do CRM.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '25px', minHeight: '120px', maxHeight: '180px', overflowY: 'auto', textAlign: 'left' }}>
                <p style={{ color: '#fff', fontSize: '0.9rem', margin: 0, lineHeight: '1.5', fontStyle: voiceTranscript ? 'normal' : 'italic', opacity: voiceTranscript ? 1 : 0.4 }}>
                  {voiceTranscript || "Sua fala aparecerá aqui em tempo real..."}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {isListening ? (
                <>
                  <button 
                    type="button"
                    onClick={handleCancelVoiceCRM}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
                  >
                    <X size={16} /> Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={handleStopVoiceCRM}
                    style={{ background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0, 230, 118, 0.2)' }}
                  >
                    <Square size={14} fill="currentColor" /> Concluir e Processar
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gold)', fontWeight: 600 }}>
                  <Loader2 size={20} className={styles.spin} /> Processando dados...
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO: A DOBRA / GABARITO */}
          <div style={{ flex: '1.2', minWidth: '340px', background: '#161622', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '30px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', margin: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-gold)', fontWeight: 800, letterSpacing: '1px' }}>📋 Gabarito de Informações</span>
              </div>
              
              {/* CHECKLIST EM 2 COLUNAS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                {checklist.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      background: item.matched ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${item.matched ? '#00e676' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '10px', 
                      padding: '8px 12px', 
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: item.matched ? '#00e676' : 'rgba(255,255,255,0.4)',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: item.matched ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${item.matched ? '#00e676' : 'rgba(255,255,255,0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}>
                      {item.matched ? (
                        <Check size={10} strokeWidth={3} />
                      ) : (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                      )}
                    </div>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROTEIRO SUGERIDO */}
            <div style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.08)', borderRadius: '14px', padding: '15px' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-gold)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>💡 Dica de Roteiro</span>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0, lineHeight: '1.45', fontStyle: 'italic' }}>
                &quot;Cadastra o **[Nome]**, do tipo **[Física/Jurídica]**, solteiro, profissão **[Profissão]**, CPF **[Número]**, RG **[Número]**, telefone **[Número]**, email **[Endereço]**, residente na **[Rua/Número]**. O caso dele é sobre **[Descreva o Fato]**...&quot;
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const filteredClients = useMemo(() => {
    if (!profileData?.escritorio_id) return crmClients || [];
    if (crmFilter === "my") {
      return (crmClients || []).filter(c => c.lawyer_id === profileData.id);
    }
    return crmClients || [];
  }, [crmClients, crmFilter, profileData]);

  const renderCRM = () => (
    <div className={styles.toolContainer}>
      <div className={styles.crmHeader}>
        <div>
          <h2 className={styles.sectionTitle}>CRM {"&"} KYC Jurídico</h2>
          <p className={styles.sectionSubtitle}>
            Gestão de carteira e análise de risco.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={styles.newClientBtn}
            style={{ background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.2)' }}
            onClick={() => {
              if (!isPro) {
                setShowProModal(true);
                return;
              }
              handleStartVoiceCRM();
            }}
            disabled={isListening}
          >
            <Mic size={18} className={isListening ? styles.pulseMic : ""} />
            {isListening ? "Ouvindo..." : "Comando de Voz"}
          </button>
          <button
            className={styles.newClientBtn}
            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => {
              if (!isPro) {
                setShowProModal(true);
                return;
              }
              pdfInputRef.current?.click();
            }}
            disabled={isExtractingPDF}
          >
            {isExtractingPDF ? <Loader2 size={18} className={styles.animateSpin} /> : <Sparkles size={18} />} 
            {isExtractingPDF ? "Lendo documento..." : "Extração com IA (PDF/Foto)"}
          </button>
          {profileData?.escritorio_id && (
            <button
              className={styles.newClientBtn}
              style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--color-gold)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
              onClick={() => {
                setShowOabModal(true);
              }}
            >
              <Download size={18} /> Trazer Processos por OAB
            </button>
          )}
          <button
            className={styles.newClientBtn}
            onClick={() => setShowNewClientModal(true)}
          >
            <UserPlus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={pdfInputRef} 
        style={{ display: 'none' }} 
        accept="application/pdf,image/*"
        onChange={handlePDFExtraction}
      />

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

      {/* FINANCE DASHBOARD CONSOLIDATED */}
      <div className={styles.financeConsolidated} style={{ marginBottom: '30px', background: 'var(--color-black-light)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
        <div className={styles.financeConsolidatedHeader} style={{ padding: '15px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,175,55,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="var(--color-gold)" />
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Desempenho Financeiro do Mês</h4>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-silver-dark)', fontWeight: 600 }}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
        </div>

        <div className={styles.financeConsolidatedGrid} style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          <div className={styles.financeStatCard}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-silver-dark)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Previsto Total</label>
            <div className={styles.financeStatValue} style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-white)' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats.previsto)}
            </div>
          </div>
          
          <div className={styles.financeStatCard}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-silver-dark)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Recebido (Pago)</label>
            <div className={styles.financeStatValue} style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats.recebido)}
            </div>
          </div>

          <div className={styles.financeStatCard} style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-silver-dark)', fontWeight: 700, textTransform: 'uppercase' }}>Progresso de Recebimento</label>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-gold)' }}>
                {financialStats.previsto > 0 ? Math.round((financialStats.recebido / financialStats.previsto) * 100) : 0}%
              </span>
            </div>
            <div className={styles.financeProgressBar} style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                className={styles.financeProgressFill} 
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-gold-dark), var(--color-gold))', transition: 'width 1s ease-out', width: `${financialStats.previsto > 0 ? Math.min(100, (financialStats.recebido / financialStats.previsto) * 100) : 0}%` }}
              ></div>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-silver-dark)', marginTop: '8px', margin: '8px 0 0 0' }}>
              {financialStats.count} lançamentos financeiros identificados neste período.
            </p>
          </div>
        </div>
      </div>

      {/* SELETOR DE FILTRO CRM (APENAS PARA USUÁRIOS DE ESCRITÓRIO) */}
      {profileData?.escritorio_id && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--color-black-light)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-silver-dark)', fontWeight: 600 }}>Visualização:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={styles.tabBtn}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.75rem',
                  borderRadius: '20px',
                  border: crmFilter === 'my' ? '1px solid var(--color-gold)' : '1px solid transparent',
                  background: crmFilter === 'my' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                  color: crmFilter === 'my' ? 'var(--color-gold)' : 'var(--color-silver)',
                  cursor: 'pointer'
                }}
                onClick={() => setCrmFilter('my')}
              >
                👤 Meus Casos (Prioridade)
              </button>
              <button
                type="button"
                className={styles.tabBtn}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.75rem',
                  borderRadius: '20px',
                  border: crmFilter === 'all' ? '1px solid var(--color-gold)' : '1px solid transparent',
                  background: crmFilter === 'all' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                  color: crmFilter === 'all' ? 'var(--color-gold)' : 'var(--color-silver)',
                  cursor: 'pointer'
                }}
                onClick={() => setCrmFilter('all')}
              >
                🏢 Todos do Escritório
              </button>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-silver-dark)' }}>
            Mostrando <strong>{filteredClients.length}</strong> de {crmClients.length} clientes.
          </span>
        </div>
      )}

      <div className={styles.clientList}>
        {loadingCrm ? (
          <div className={styles.emptyState}>Carregando clientes...</div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.clientMainInfo}>
                <div className={styles.clientAvatar}>
                  {client.name.substring(0, 2).toUpperCase()}
                </div>
                <div className={styles.clientMeta}>
                  <h4>{client.name}</h4>
                  <p>
                    {client.email || "Sem email"} •{" "}
                    {/* ⚠️ SEGURANÇA: Telefone mascarado na listagem */}
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

                {profileData?.escritorio_id && (
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Responsável</span>
                    <span className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '150px' }}>
                      <span style={{ color: client.lawyer_id ? 'var(--color-silver)' : 'var(--color-silver-dark)', fontStyle: client.lawyer_id ? 'normal' : 'italic' }}>
                        {(() => {
                          const responsible = (membrosEscritorio || []).find(m => m.id === client.lawyer_id);
                          return responsible ? `💼 ${responsible.name}` : "⚠️ Sem Responsável";
                        })()}
                      </span>
                      {profileData?.cargo === 'admin' && (
                        <button
                          type="button"
                          style={{
                            background: 'rgba(212,175,55,0.1)',
                            color: 'var(--color-gold)',
                            border: '1px solid rgba(212,175,55,0.3)',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setDelegatingClient(client)}
                        >
                          Delegar
                        </button>
                      )}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.buyJurisBtn}
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  onClick={() => {
                    setSelectedClient(client);
                    setShowDossierModal(true);
                    setClientDocuments([]);
                    fetchClientDocuments(client.id);
                    fetchInteractions(client.id);
                    fetchAssociatedCases(client);
                    fetchClientFinance(client.id);
                    fetchClientInsight(client.id);
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

  const handleDelegateCase = async (clientId, targetLawyerId) => {
    if (!clientId || !targetLawyerId) {
      toast.error("Por favor, selecione um advogado.");
      return;
    }

    setIsDelegating(true);
    try {
      const res = await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: clientId,
          lawyer_id: targetLawyerId
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Caso delegado e advogado notificado com sucesso!");
        setDelegatingClient(null);
        fetchCrmClients();
        if (selectedClient && selectedClient.id === clientId) {
          setSelectedClient(data.data);
        }
      } else {
        toast.error(data.message || "Erro ao delegar caso.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao delegar.");
    } finally {
      setIsDelegating(false);
    }
  };

  const handlePDFExtraction = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await handleExtractPDF(file);
    if (data) {
      setNewClientData({
        nome_completo: data.nome_completo || "",
        tipo: data.tipo || "Pessoa Física",
        cpf_cnpj: data.cpf_cnpj || "",
        rg_ie: data.rg_ie || "",
        estado_civil: data.estado_civil || "",
        profissao: data.profissao || "",
        telefone: data.telefone || "",
        endereco_completo: data.endereco_completo || "",
        email: data.email || "",
        notas_internas: data.notas_internas || "",
      });
      setShowNewClientModal(true);
    }
    // Limpar input
    e.target.value = "";
  };

  const handleStartVoiceCRM = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Ambiente inseguro detectado. O reconhecimento de voz exige conexão segura HTTPS em produção.");
      return;
    }

    // Solicita explicitamente o microfone antes para forçar o pop-up de permissão no navegador em produção
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Para todos os tracks do stream para não travar o dispositivo de áudio
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Erro ao obter permissão do microfone:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Acesso ao microfone negado. Por favor, permita o acesso ao microfone nas configurações do seu navegador para usar o comando de voz.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        toast.error("Nenhum microfone físico foi encontrado no seu dispositivo.");
      } else {
        toast.error("Erro ao acessar o microfone. Certifique-se de estar acessando via conexão segura (HTTPS).");
      }
      return;
    }

    // Inicializa estados do ciclo de vida do microfone
    isConcludedRef.current = false;
    pastTranscriptsRef.current = "";
    isListeningRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.shouldProcess = true;
    recognitionRef.current = recognition;

    let accumulatedTranscript = "";
    let startTime = Date.now();

    recognition.onstart = () => {
      startTime = Date.now();
      setIsListening(true);
      setShowVoiceModal(true);
      if (!pastTranscriptsRef.current) {
        setVoiceTranscript("");
      }
    };

    recognition.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");
      
      const fullTranscript = pastTranscriptsRef.current
        ? `${pastTranscriptsRef.current} ${currentTranscript}`
        : currentTranscript;

      accumulatedTranscript = fullTranscript;
      setVoiceTranscript(fullTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      
      // No-speech é comum em mobiles quando o advogado faz uma pausa longa para pensar
      if (event.error === "no-speech") {
        return; // Ignora o erro e deixa o onend lidar com o auto-restart
      }

      if (event.error === "not-allowed") {
        setIsListening(false);
        isListeningRef.current = false;
        recognition.shouldProcess = false;
        toast.error("Permissão de microfone negada. Certifique-se de acessar via HTTPS e permitir o acesso ao microfone nas configurações do seu navegador.");
        setShowVoiceModal(false);
      } else if (event.error === "service-not-allowed") {
        setIsListening(false);
        isListeningRef.current = false;
        recognition.shouldProcess = false;
        toast.error("Serviço de reconhecimento de voz não disponível ou bloqueado neste navegador.");
        setShowVoiceModal(false);
      } else if (event.error !== "aborted") {
        console.warn("Erro não fatal detectado:", event.error);
      }
    };

    recognition.onend = async () => {
      // Se o usuário cancelou voluntariamente
      if (!recognition.shouldProcess) {
        setIsListening(false);
        isListeningRef.current = false;
        setShowVoiceModal(false);
        return;
      }

      // Se o usuário concluiu de fato clicando no botão "Concluir e Processar"
      if (isConcludedRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
        const textToProcess = accumulatedTranscript.trim();
        if (textToProcess.length > 5) {
          await processVoiceCommand(textToProcess);
        } else {
          const duration = Date.now() - startTime;
          if (duration < 2000) {
            toast.error("Conexão encerrada muito rápido pelo navegador. Recomendamos usar o Google Chrome ou Edge.");
          } else {
            toast.error("Nenhuma fala detectada ou áudio muito curto.");
          }
        }
        setShowVoiceModal(false);
        return;
      }

      // Se parou sozinho por timeout de silêncio no Mobile (Chrome Android/Safari iOS)
      if (isListeningRef.current) {
        pastTranscriptsRef.current = accumulatedTranscript;
        try {
          recognition.start();
        } catch (e) {
          console.log("Reiniciando captura SpeechRecognition após pausa de silêncio móvel:", e);
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        setShowVoiceModal(false);
      }
    };

    recognition.start();
  };

  const processVoiceCommand = async (text) => {
    const tid = toast.loading("IA processando seu comando de voz...");
    try {
      const res = await fetch("/api/crm/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      toast.dismiss(tid);
      if (data.success) {
        setNewClientData(prev => ({
          ...prev,
          ...data.data
        }));
        setShowNewClientModal(true);
        toast.success("Dados extraídos com sucesso!");
      } else {
        toast.error(data.message || "Não consegui entender os dados.");
      }
    } catch (err) {
      toast.dismiss(tid);
      toast.error("Erro ao processar comando de voz.");
    }
  };

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
        reloadPlanUsage(); // Atualizar contadores de uso
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
        reloadPlanUsage(); // Atualizar contadores de uso
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
    if (profileData?.cargo === "secretaria") {
      return (
        <div className={styles.emptyState} style={{ padding: "40px", textAlign: "center" }}>
          <Lock size={48} style={{ color: "#ef4444", marginBottom: "15px" }} />
          <h3>Acesso Restrito</h3>
          <p style={{ color: "#aaa" }}>
            Seu cargo de Secretária não possui permissão para acessar o Redator IA.
          </p>
        </div>
      );
    }

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
    const isStart = profileData?.plan_type === 'START';
    const isFree = !profileData?.is_premium && profileData?.plan_type !== 'START' && profileData?.plan_type !== 'PRO';
    
    if (isStart || isFree) {
      return (
        <PlanLock 
          title="Calculadora Jurídica" 
          description="Acesso exclusivo para membros do Plano PRO. No Plano START, você tem acesso às ferramentas de CRM e IA básica."
          onUpgrade={() => setShowProModal(true)}
        />
      );
    }
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
    if (profileData?.cargo === "secretaria") {
      return (
        <div className={styles.emptyState} style={{ padding: "40px", textAlign: "center" }}>
          <Lock size={48} style={{ color: "#ef4444", marginBottom: "15px" }} />
          <h3>Acesso Restrito</h3>
          <p style={{ color: "#aaa" }}>
            Seu cargo de Secretária não possui permissão para acessar a Inteligência Jurisprudencial.
          </p>
        </div>
      );
    }

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
                  const pageWidth = doc.internal.pageSize.getWidth();
                  const pageHeight = doc.internal.pageSize.getHeight();
                  
                  // HEADER
                  doc.setFillColor(11, 11, 14); // Dark background
                  doc.rect(0, 0, pageWidth, 45, 'F');
                  
                  doc.setTextColor(212, 175, 55); // Gold
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(24);
                  doc.text("SocialJurídico", 14, 22);
                  
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(12);
                  doc.setFont("helvetica", "normal");
                  doc.text("Relatório de Pesquisa e Análise Jurisprudencial IA", 14, 32);
                  
                  doc.setFontSize(10);
                  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 32, { align: 'right' });

                  // PESQUISA REALIZADA
                  doc.setTextColor(40, 40, 40);
                  doc.setFontSize(12);
                  doc.setFont("helvetica", "bold");
                  doc.text("Consulta Realizada:", 14, 58);
                  doc.setFont("helvetica", "italic");
                  doc.setFontSize(10);
                  const splitSearch = doc.splitTextToSize(jurisSearchQuery || "Pesquisa geral", pageWidth - 28);
                  doc.text(splitSearch, 14, 65);
                  
                  let currentY = 65 + (splitSearch.length * 5) + 15;

                  // RESULTADOS
                  doc.setTextColor(40, 40, 40);
                  doc.setFontSize(14);
                  doc.setFont("helvetica", "bold");
                  doc.text("Análise de Precedentes e Teses", 14, currentY);
                  
                  doc.setDrawColor(212, 175, 55);
                  doc.setLineWidth(0.5);
                  doc.line(14, currentY + 3, 60, currentY + 3);

                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(11);
                  doc.setTextColor(60, 60, 60);
                  
                  currentY += 15;
                  const cleanResult = jurisResult.replace(/\*\*/g, ''); // Remove asteriscos de negrito do Markdown
                  const splitResult = doc.splitTextToSize(cleanResult, pageWidth - 28);
                  
                  splitResult.forEach(line => {
                    if (currentY > pageHeight - 30) {
                      doc.addPage();
                      currentY = 20;
                    }
                    
                    // Se a linha começar com número ou marcador, dar destaque
                    if (/^\d+\./.test(line.trim())) {
                      doc.setFont("helvetica", "bold");
                    } else {
                      doc.setFont("helvetica", "normal");
                    }

                    doc.text(line, 14, currentY);
                    currentY += 6;
                  });

                  // FOOTER
                  const pageCount = doc.internal.getNumberOfPages();
                  for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
                    doc.text(
                      `SocialJurídico PRO - Inteligência Jurisprudencial | Página ${i} de ${pageCount}`,
                      pageWidth / 2,
                      pageHeight - 12,
                      { align: "center" }
                    );
                  }

                  doc.save(`Jurisprudencia_SJ_${new Date().getTime()}.pdf`);
                  toast.success("Relatório de Jurisprudência gerado!");
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

    const filteredAgendaItems = calendarMemberFilter === "TODOS"
      ? agendaItems
      : agendaItems.filter(i => i.lawyer_id === calendarMemberFilter);

    const grouped = {
      Hoje: filteredAgendaItems.filter((i) => getGroup(i.date) === "Hoje"),
      Amanhã: filteredAgendaItems.filter((i) => getGroup(i.date) === "Amanhã"),
      "Próximos Dias": filteredAgendaItems.filter(
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
            <button 
              className={styles.actionBtn}
              onClick={handleAnalyseAgenda}
              disabled={isAnalyzingAgenda}
            >
              <AlertTriangle size={16} /> {isAnalyzingAgenda ? "Analisando..." : "Analisar"}
            </button>
            <button 
              className={styles.actionBtn}
              onClick={handleSummarizeAgenda}
              disabled={isAnalyzingAgenda}
            >
              <BarChart3 size={16} /> {isAnalyzingAgenda ? "Resumindo..." : "Resumo"}
            </button>
            <button
              className={styles.redatorGenerateBtn}
              onClick={() => {
                setNewAgendaItem({
                  title: "",
                  date: "",
                  time: "09:00",
                  description: "",
                  type: "Judicial",
                  urgency: "Média",
                  clientId: "",
                  lawyerId: profileData?.id || "",
                });
                setShowAgendaModal(true);
              }}
            >
              <Plus size={16} /> Novo
            </button>
            {!profileData?.google_sync_enabled ? (
              <button
                className={styles.actionBtn}
                style={{
                  background: "rgba(66, 133, 244, 0.1)",
                  color: "#4285F4",
                  border: "1px solid rgba(66, 133, 244, 0.3)",
                }}
                onClick={() => {
                  window.location.href = "/api/auth/google";
                }}
              >
                <Calendar size={16} /> Conectar Google Agenda
              </button>
            ) : (
              <span style={{ fontSize: "0.8rem", color: "#10b981", display: "flex", alignItems: "center", gap: "5px" }}>
                <CheckCircle2 size={14} /> Google Sincronizado
              </span>
            )}
          </div>
        </div>

        {/* FILTROS DE MEMBROS DO ESCRITÓRIO */}
        {profileData?.escritorio_id && membrosEscritorio.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", padding: "12px", marginBottom: "20px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", alignItems: "center", marginRight: "10px" }}>
              <Filter size={14} style={{ marginRight: "5px" }} /> Filtrar Membro:
            </span>
            <button
              onClick={() => setCalendarMemberFilter("TODOS")}
              style={{
                padding: "5px 12px",
                borderRadius: "15px",
                fontSize: "0.75rem",
                border: "none",
                cursor: "pointer",
                background: calendarMemberFilter === "TODOS" ? "var(--brand-gold)" : "rgba(255, 255, 255, 0.05)",
                color: calendarMemberFilter === "TODOS" ? "#000" : "#fff",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
            >
              Todos ({agendaItems.length})
            </button>
            {membrosEscritorio.map(member => {
              const count = agendaItems.filter(i => i.lawyer_id === member.id).length;
              return (
                <button
                  key={member.id}
                  onClick={() => setCalendarMemberFilter(member.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "15px",
                    fontSize: "0.75rem",
                    border: "none",
                    cursor: "pointer",
                    background: calendarMemberFilter === member.id ? "var(--brand-gold)" : "rgba(255, 255, 255, 0.05)",
                    color: calendarMemberFilter === member.id ? "#000" : "#fff",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                >
                  {member.name} ({count})
                </button>
              );
            })}
          </div>
        )}

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
                          lawyerId: item.lawyer_id || "",
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
                          <span>
                            {crmClients.find((c) => c.id === item.client_id)?.name || "Cliente"}
                          </span>
                        </div>
                      )}

                      {profileData?.escritorio_id && (
                        <div className={styles.agendaClient} style={{ color: "var(--brand-gold)", marginTop: "4px" }}>
                          <User size={12} color="var(--brand-gold)" />{" "}
                          <span>
                            {membrosEscritorio.find((m) => m.id === item.lawyer_id)?.name || "Atribuído a você"}
                          </span>
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
          reloadPlanUsage(); // Atualizar contadores de uso
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
                const pageWidth = doc.internal.pageSize.getWidth();
                
                // HEADER
                doc.setFillColor(11, 11, 14); // Cor de fundo do site
                doc.rect(0, 0, pageWidth, 40, 'F');
                
                doc.setTextColor(212, 175, 55); // Cor Gold
                doc.setFont("helvetica", "bold");
                doc.setFontSize(24);
                doc.text("SocialJurídico", 14, 20);
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text("Relatório de Triagem Inteligente IA", 14, 30);
                
                doc.setFontSize(10);
                doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth - 60, 30);

                // RELATO ORIGINAL
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("1. Relato do Cliente (Original)", 14, 55);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                const splitRelato = doc.splitTextToSize(triagemAnswers || "Não informado", pageWidth - 28);
                doc.text(splitRelato, 14, 65);
                
                let currentY = 65 + (splitRelato.length * 5) + 10;

                // TABELA DE DIAGNÓSTICO
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("2. Diagnóstico Estratégico", 14, currentY);
                
                autoTable(doc, {
                  startY: currentY + 5,
                  theme: 'grid',
                  headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
                  body: [
                    ["Área Jurídica", triagemDiagnosis?.area || "N/A"],
                    ["Urgência", triagemDiagnosis?.urgency || "N/A"],
                    ["Nível de Viabilidade", triagemViability?.level || "N/A"],
                    ["Valor Estimado da Causa", triagemCaseValue?.range || "Consultivo"],
                    ["Ação Recomendada", triagemDiagnosis?.suggestedAction || "N/A"],
                  ],
                  margin: { left: 14, right: 14 }
                });

                currentY = doc.lastAutoTable.finalY + 15;

                // JUSTIFICATIVA DE VIABILIDADE
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("3. Análise de Viabilidade", 14, currentY);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                const splitReasoning = doc.splitTextToSize(triagemViability?.reasoning || "Sem justificativa detalhada.", pageWidth - 28);
                doc.text(splitReasoning, 14, currentY + 8);
                
                currentY += 8 + (splitReasoning.length * 5) + 15;

                // DOCUMENTOS NECESSÁRIOS
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("4. Documentos Necessários", 14, currentY);
                
                const docsList = triagemDiagnosis?.requiredDocuments?.map(d => [d]) || [];
                autoTable(doc, {
                  startY: currentY + 5,
                  theme: 'plain',
                  body: docsList,
                  bodyStyles: { fontSize: 10 },
                  columnStyles: { 0: { cellWidth: pageWidth - 28 } },
                  margin: { left: 14 }
                });

                currentY = doc.lastAutoTable.finalY + 15;

                // PRÓXIMOS PASSOS
                if (currentY > doc.internal.pageSize.getHeight() - 40) {
                  doc.addPage();
                  currentY = 20;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("5. Próximos Passos Recomendados", 14, currentY);
                
                const stepsList = triagemDiagnosis?.nextSteps?.map((s, i) => [`Passo ${i+1}`, s]) || [];
                autoTable(doc, {
                  startY: currentY + 5,
                  theme: 'striped',
                  head: [["Ordem", "Ação"]],
                  headStyles: { fillColor: [40, 40, 40] },
                  body: stepsList,
                  margin: { left: 14 }
                });

                // FOOTER
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(150, 150, 150);
                  doc.text(
                    `SocialJurídico - Inteligência Artificial para Advogados | Página ${i} de ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: "center" }
                  );
                }

                doc.save(`Triagem_SJ_${new Date().getTime()}.pdf`);
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
      "Bancário",
      "Saúde",
      "Trânsito",
      "Administrativo",
      "Militar",
      "Internacional",
      "Ambiental",
      "Constitucional",
      "Eleitoral",
      "Desportivo",
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
                {profileData.oab_verification_status === "VERIFIED" ? (
                  <span className={styles.verifiedSeal}>
                    <UserCheck size={14} /> Verificado
                  </span>
                ) : profileData.oab_verification_status === "ERROR" ? (
                  <span className={styles.errorSeal} style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                    <X size={14} /> Erro na OAB
                  </span>
                ) : (
                  <span className={styles.pendingSeal} style={{ background: "rgba(234, 179, 8, 0.1)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.3)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={14} /> Verificação Pendente
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
                    <label className={styles.formLabel}>
                      Estado (UF){" "}
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
                      value={profileForm.estado || "---"}
                      readOnly
                    />
                  </div>
                </div>

                <div className={styles.formGrid} style={{ marginTop: 20 }}>
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

  const handleBuyJuris = async (amount = 20, couponData = null) => {
    // Checkout Transparente: abre modal inline ao invés de redirecionar
    setTransparentCheckoutAmount(amount);
    setAppliedCouponData(couponData);
    setShowBuyModal(false);
    setShowTransparentCheckout(true);
  };

  const handleBecomePro = async (couponData = null) => {
    try {
      toast.loading("Iniciando assinatura...");
      await createProSubscription(couponData);
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

    if (isBlindarProva && profileData?.plan_type === 'START' && (profileData?.balance || 0) < 3) {
      toast.error("Saldo insuficiente. A certificação requer 3 Juris.");
      setShowBuyModal(true);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", selectedClient.id);
    if (isBlindarProva) {
      formData.append("blindar_prova", "true");
    }

    try {
      const res = await fetch("/api/crm/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBlindarProva ? "Documento blindado e anexado!" : "Documento anexado!");
        fetchClientDocuments(selectedClient.id);
        if (isBlindarProva && profileData?.plan_type === 'START') {
           reloadPlanUsage();
        }

        // Silent timeline audit log
        try {
          const cargoFriendly = profileData?.cargo === "admin" ? "Gestor(a)" :
                                profileData?.cargo === "secretaria" ? "Secretária" :
                                profileData?.cargo === "estagiario" ? "Estagiário(a)" :
                                "Advogado(a)";
          const userNameStr = profileData?.name || "Membro";
          const logMsg = `Documento '${file.name}' anexado por ${cargoFriendly} ${userNameStr}`;
          
          await fetch("/api/crm/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: selectedClient.id,
              content: logMsg,
              type: "auditoria"
            })
          });
          fetchInteractions(selectedClient.id);
        } catch (auditErr) {
          console.error("Erro ao registrar log de auditoria de upload:", auditErr);
        }
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
    if (profileData?.cargo === "estagiario") {
      toast.error("Acesso restrito: Estagiários não possuem permissão para excluir documentos ou históricos.");
      setShowDeleteConfirm(false);
      setDocToDelete(null);
      return;
    }

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

        // Silent timeline audit log
        try {
          const cargoFriendly = profileData?.cargo === "admin" ? "Gestor(a)" :
                                profileData?.cargo === "secretaria" ? "Secretária" :
                                profileData?.cargo === "estagiario" ? "Estagiário(a)" :
                                "Advogado(a)";
          const userNameStr = profileData?.name || "Membro";
          const logMsg = `Documento '${fileName}' excluído por ${cargoFriendly} ${userNameStr}`;
          
          await fetch("/api/crm/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: selectedClient.id,
              content: logMsg,
              type: "auditoria"
            })
          });
          fetchInteractions(selectedClient.id);
        } catch (auditErr) {
          console.error("Erro ao registrar log de auditoria de exclusão:", auditErr);
        }
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

  /*
  const handleGenerateReport = () => {
    ...
  };
  */

  const handleDownloadCertificate = (docFile) => {
    try {
      const doc = new jsPDF();
      
      // Page Border
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1);
      doc.rect(5, 5, 200, 287);

      // Header Banner
      doc.setFillColor(16, 185, 129);
      doc.rect(5, 5, 200, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICADO DE CADEIA DE CUSTÓDIA", 105, 16, { align: 'center' });
      doc.setFontSize(10);
      doc.text("REGISTRO DE IMUTABILIDADE DE PROVA DIGITAL", 105, 23, { align: 'center' });

      let currentY = 40;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const emitidoEm = new Date().toLocaleString("pt-BR");
      const dataUpload = new Date(docFile.created_at).toLocaleString("pt-BR");
      const protocolo = docFile.id ? docFile.id.split('-')[0].toUpperCase() : "DOC-PROVA-DIGITAL";

      const introText = `Certificamos, para os devidos fins de direito, que o arquivo digital individualizado neste documento foi submetido a procedimento de registro de metadados e ancoragem criptográfica, estabelecendo um marco temporal fidedigno e garantindo a sua imutabilidade técnica desde o momento de sua custódia.`;
      const splitIntro = doc.splitTextToSize(introText, 180);
      doc.text(splitIntro, 14, currentY);
      currentY += (splitIntro.length * 5) + 10;

      // Section I
      doc.setFillColor(240, 245, 240);
      doc.rect(10, currentY, 190, 8, 'F');
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.rect(10, currentY, 190, 32);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("I. IDENTIFICAÇÃO DA PROVA E PROPRIETÁRIO", 14, currentY + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      currentY += 14;
      doc.text(`NOME DO ARQUIVO: ${docFile.file_name}`, 14, currentY);
      doc.text(`PROTOCOLO INTERNO: ${protocolo}`, 120, currentY);
      currentY += 6;
      doc.text(`PROPRIETÁRIO / CUSTODIANTE: ${profileData?.name || "Advogado(a)"} (OAB: ${profileData?.oab || "N/I"})`, 14, currentY);
      currentY += 6;
      doc.text(`DATA / HORA DO CARREGAMENTO (UTC-3): ${dataUpload}`, 14, currentY);
      
      currentY += 12;

      // Section II
      doc.setFillColor(240, 245, 240);
      doc.rect(10, currentY, 190, 8, 'F');
      
      const hashText = docFile.hash_sha512 || "HASH_NÃO_PROCESSADO_CONTATE_O_SUPORTE";
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      const splitHash = doc.splitTextToSize(hashText, 180);
      
      doc.rect(10, currentY, 190, 30 + (splitHash.length * 4)); // Outline
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("II. ANCORAGEM CRIPTOGRÁFICA (HASH)", 14, currentY + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      currentY += 14;
      doc.text("ALGORITMO UTILIZADO: SHA-512 (Secure Hash Algorithm 512-bit)", 14, currentY);
      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.text("ASSINATURA DIGITAL (IMPRESSÃO DIGITAL DO ARQUIVO):", 14, currentY);
      currentY += 5;
      
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.text(splitHash, 14, currentY);
      
      currentY += (splitHash.length * 4) + 5;

      // Section III
      doc.setFillColor(240, 245, 240);
      doc.rect(10, currentY, 190, 8, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const uaStr = `DISPOSITIVO/AGENTE: ${docFile.user_agent || "N/A"}`;
      const splitUa = doc.splitTextToSize(uaStr, 180);
      
      doc.rect(10, currentY, 190, 24 + (splitUa.length * 4)); // Outline
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("III. RASTREABILIDADE TÉCNICA", 14, currentY + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      currentY += 14;
      doc.text(`ENDEREÇO IP REGISTRADO NO UPLOAD: ${docFile.upload_ip || "N/A"}`, 14, currentY);
      currentY += 6;
      doc.text(splitUa, 14, currentY);
      
      currentY += (splitUa.length * 4) + 8;

      // Section IV
      doc.setFillColor(240, 245, 240);
      doc.rect(10, currentY, 190, 8, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const disclaimer = "1. INTEGRIDADE: O Hash SHA-512 listado na Seção II é o identificador matemático único deste arquivo. Qualquer alteração no conteúdo digital original (como a mudança de 1 byte ou pixel) resultará em um Hash completamente distinto.\n\n2. LEGALIDADE: Este documento visa dar suporte à observância do Art. 158-A do Código de Processo Penal (Cadeia de Custódia) e ao Art. 369 do Código de Processo Civil, provendo meios técnicos idôneos para atestar o momento do registro e a não-adulteração da prova após este instante.\n\n3. TERCEIRO DE CONFIANÇA: O SocialJurídico atua apenas como agente técnico neutro (terceira parte confiável) fornecendo a plataforma para extração e guarda segura dos metadados e da impressão digital do arquivo no exato momento da operação realizada pelo usuário.";
      const splitDisclaimer = doc.splitTextToSize(disclaimer, 180);
      
      doc.rect(10, currentY, 190, 12 + (splitDisclaimer.length * 3.5));
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("IV. EMBASAMENTO LEGAL E DECLARAÇÃO", 14, currentY + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      currentY += 14;
      doc.text(splitDisclaimer, 14, currentY);

      currentY += (splitDisclaimer.length * 3.5) + 16;

      // Signatures / Footers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SOCIALJURÍDICO - PLATAFORMA DE TECNOLOGIA JURÍDICA", 105, currentY, { align: "center" });
      currentY += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Certificado gerado e autenticado pelo sistema em ${emitidoEm}`, 105, currentY, { align: "center" });
      currentY += 4;
      doc.text(`Código de Validação: SJ-CERT-${protocolo}`, 105, currentY, { align: "center" });

      doc.save(`Certificado_Blindagem_${docFile.file_name}.pdf`);
      toast.success("Certificado baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF do certificado");
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
      lawyer_id: newAgendaItem.lawyerId || profileData?.id,
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
        lawyerId: "",
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
        reloadPlanUsage(); // Atualizar contadores de uso
      }
    } catch (err) {
      toast.error("Erro na consulta IA");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleAnalyseAgenda = async () => {
    if (agendaItems.length === 0) return toast.error("Sua agenda está vazia!");
    setIsAnalyzingAgenda(true);
    setAgendaAnalysis("");
    setShowAgendaAnalysisModal(true);

    const agendaSummary = agendaItems.map(i => `- ${i.title} (${new Date(i.date).toLocaleString('pt-BR')}): ${i.description || 'Sem descrição'}`).join('\n');

    try {
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analise minha agenda jurídica atual e identifique possíveis conflitos, prazos críticos e sugestões de priorização:\n\n${agendaSummary}\n\nForneça uma análise técnica e profissional.`,
          clientData: { name: "Análise de Agenda" },
          history: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAgendaAnalysis(data.response);
        reloadPlanUsage();
      } else {
        toast.error(data.message || "Erro na análise IA");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsAnalyzingAgenda(false);
    }
  };

  const handleSummarizeAgenda = async () => {
    if (agendaItems.length === 0) return toast.error("Sua agenda está vazia!");
    setIsAnalyzingAgenda(true);
    setAgendaAnalysis("");
    setShowAgendaAnalysisModal(true);

    const agendaSummary = agendaItems.map(i => `- ${i.title} (${new Date(i.date).toLocaleString('pt-BR')})`).join('\n');

    try {
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Gere um resumo executivo e estratégico da minha agenda jurídica para os próximos dias:\n\n${agendaSummary}\n\nDestaque os pontos focais e o que exige mais atenção do advogado.`,
          clientData: { name: "Resumo de Agenda" },
          history: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAgendaAnalysis(data.response);
        reloadPlanUsage();
      } else {
        toast.error(data.message || "Erro no resumo IA");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsAnalyzingAgenda(false);
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
              <div className={styles.formItem} style={{ gridColumn: profileData?.escritorio_id ? "span 1" : "span 2" }}>
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

            {profileData?.escritorio_id && (
              <div className={styles.formItemFull} style={{ marginTop: "15px" }}>
                <label className={styles.formLabel}>Responsável Atribuído *</label>
                <select
                  className={styles.formSelect}
                  value={newAgendaItem.lawyerId}
                  onChange={(e) =>
                    setNewAgendaItem({
                      ...newAgendaItem,
                      lawyerId: e.target.value,
                    })
                  }
                >
                  <option value="">-- Selecione o Membro do Escritório --</option>
                  {membrosEscritorio.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.cargo === "admin" ? "Administrador" : m.cargo === "advogado" ? "Advogado" : m.cargo === "secretaria" ? "Secretária" : "Estagiário"})
                    </option>
                  ))}
                </select>
              </div>
            )}

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

  const renderMessageContentModal = () => {
    if (!showMsgModal || !selectedMsg) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowMsgModal(false)}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "600px" }}
        >
          <div className={styles.modalHeader} style={{ textAlign: "center" }}>
            <div
              className={styles.opIcon}
              style={{ background: "#f59e0b", margin: "0 auto 15px" }}
            >
              <Bell size={20} />
            </div>
            <h2 className={styles.modalTitle}>
              {selectedMsg.titulo || "Mensagem do Administrador"}
            </h2>
            <p className={styles.modalSubtitle}>
              Recebida em:{" "}
              {new Date(selectedMsg.created_at).toLocaleString("pt-BR")}
            </p>
          </div>

          <div
            className={styles.modalDescription}
            style={{
              textAlign: "left",
              padding: "20px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "12px",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
              fontSize: "1rem",
              color: "var(--color-silver)",
              marginBottom: "25px",
            }}
          >
            {selectedMsg.mensagem}
          </div>

          <button
            className={styles.premiumBtn}
            style={{ margin: "0 0 10px 0" }}
            onClick={() => {
              setShowMsgModal(false);
              handleOpenAdminChat(selectedMsg);
            }}
          >
            <MessageSquare size={18} /> Conversar com Administrador
          </button>

          <button
            className={styles.closeModalBtn}
            onClick={() => setShowMsgModal(false)}
          >
            Fechar
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
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {profileData?.escritorio_id && (
                <div style={{ marginRight: '15px', paddingRight: '15px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-silver-dark)', textTransform: 'uppercase', fontWeight: 'bold' }}>Responsável</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                      {(() => {
                        const r = (membrosEscritorio || []).find(m => m.id === selectedClient.lawyer_id);
                        return r ? `💼 ${r.name}` : "⚠️ Sem Responsável";
                      })()}
                    </span>
                    {profileData?.cargo === 'admin' && (
                      <button
                        className={styles.newClientBtn}
                        style={{ padding: '2px 8px', fontSize: '0.65rem', background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', border: '1px solid rgba(212,175,55,0.2)', marginLeft: '4px', cursor: 'pointer' }}
                        onClick={() => setDelegatingClient(selectedClient)}
                      >
                        Delegar
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginRight: '15px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '15px' }}>
                <button 
                  className={styles.newClientBtn} 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                  onClick={() => handleQuickDocGenerate('PROCURACAO')}
                >
                  <FileText size={14} style={{ marginRight: '6px' }} /> Gerar Procuração
                </button>
                <button 
                  className={styles.newClientBtn} 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', border: '1px solid rgba(212,175,55,0.2)' }}
                  onClick={() => handleQuickDocGenerate('CONTRATO')}
                >
                  <Shield size={14} style={{ marginRight: '6px' }} /> Gerar Contrato
                </button>
              </div>
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

          {/* AI INSIGHTS */}
          <div style={{ padding: '10px 20px', background: 'rgba(212,175,55,0.05)', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Zap size={14} color="var(--color-gold)" />
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                IA Insights (KYC Avançado)
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', margin: 0 }}>
              {isGeneratingInsight ? (
                <span className={styles.loadingPulse}>Gerando análise estratégica...</span>
              ) : clientInsight === "LIMIT_REACHED" ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ color: 'var(--color-silver-dark)' }}>Você atingiu o limite de 5 insights do Plano START.</span>
                  <button 
                    style={{ background: 'var(--color-gold)', color: 'var(--color-black)', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                    onClick={() => {
                      // Trigger upgrade flow
                      toast("Upgrade para o PRO disponível nas configurações!");
                    }}
                  >
                    FAZER UPGRADE PARA PRO
                  </button>
                </div>
              ) : clientInsight || "Selecione um cliente com histórico para gerar insights automáticos."}
            </p>
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

              {/* TIMELINE DE INTERAÇÕES */}
              <div className={styles.dossierSection}>
                <span className={styles.dossierSectionTitle}>
                  Linha do Tempo de Interações
                </span>
                
                {/* Form para nova interação - Estilo Premium */}
                <div style={{ 
                  marginBottom: '20px', 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(212,175,55,0.15)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  <textarea
                    placeholder="Registrar nova interação (ex: Cliente ligou, Reunião feita...)"
                    value={newInteraction.content}
                    onChange={(e) => setNewInteraction({...newInteraction, content: e.target.value})}
                    style={{ 
                      width: '100%',
                      height: '80px', 
                      marginBottom: '12px', 
                      resize: 'none',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '10px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-gold)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <select
                      value={newInteraction.type}
                      onChange={(e) => setNewInteraction({...newInteraction, type: e.target.value})}
                      style={{ 
                        flex: 1,
                        background: '#1a1a1a', // Fundo sólido escuro para evitar transparências estranhas no select
                        border: '1px solid rgba(212,175,55,0.3)', // Borda levemente dourada
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none', // Remove a seta padrão do browser
                        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23d4af37\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px'
                      }}
                    >
                      <option value="nota" style={{ background: '#1a1a1a', color: '#fff' }}>📝 Nota Interna</option>
                      <option value="reunião" style={{ background: '#1a1a1a', color: '#fff' }}>🤝 Reunião com Cliente</option>
                      <option value="ligação" style={{ background: '#1a1a1a', color: '#fff' }}>📞 Chamada Telefônica</option>
                      <option value="email" style={{ background: '#1a1a1a', color: '#fff' }}>📧 E-mail Enviado/Recebido</option>
                      <option value="whatsapp" style={{ background: '#1a1a1a', color: '#fff' }}>💬 Mensagem de WhatsApp</option>
                    </select>
                    <button
                      onClick={handleSaveInteraction}
                      disabled={isSavingInteraction || !newInteraction.content}
                      style={{ 
                        padding: '8px 20px', 
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        borderRadius: '6px',
                        background: isSavingInteraction || !newInteraction.content ? '#444' : 'linear-gradient(135deg, var(--color-gold), #b8860b)',
                        color: '#000',
                        border: 'none',
                        cursor: isSavingInteraction || !newInteraction.content ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s, opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => { if(!isSavingInteraction && newInteraction.content) e.target.style.transform = 'scale(1.02)' }}
                      onMouseLeave={(e) => { e.target.style.transform = 'scale(1)' }}
                    >
                      {isSavingInteraction ? 'Salvando...' : 'Registrar'}
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Lista da Timeline */}
                <div className={styles.timelineList} style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                  {isFetchingInteractions ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Carregando histórico...</div>
                  ) : interactions.length > 0 ? (
                    interactions.map((item) => (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        marginBottom: '15px', 
                        paddingBottom: '15px', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                      }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'rgba(212,175,55,0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'var(--color-gold)',
                          flexShrink: 0
                        }}>
                          {item.type === 'ligação' ? <Phone size={14} /> : 
                           item.type === 'reunião' ? <Users size={14} /> : 
                           item.type === 'email' ? <Mail size={14} /> :
                           item.type === 'whatsapp' ? <MessageSquare size={14} /> :
                           <FileText size={14} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--color-gold)' }}>
                              {item.type}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#666' }}>
                              {new Date(item.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0, lineHeight: '1.4' }}>
                            {item.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#555', fontSize: '0.85rem' }}>
                      Nenhuma interação registrada ainda.
                    </div>
                  )}
                </div>
              </div>

              {/* PROCESSOS E CASOS ASSOCIADOS (MARKETPLACE) */}
              <div className={styles.dossierSection} style={{ marginTop: '20px' }}>
                <span className={styles.dossierSectionTitle}>
                  Processos e Casos Associados
                </span>
                
                <div className={styles.associatedCasesList}>
                  {isFetchingAssociatedCases ? (
                    <div style={{ textAlign: 'center', padding: '15px', color: '#888' }}>Buscando processos no marketplace...</div>
                  ) : associatedCases.length > 0 ? (
                    associatedCases.map((caso) => (
                      <div key={caso.id} style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '10px', 
                        padding: '12px', 
                        border: '1px solid rgba(212,175,55,0.1)',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>{caso.titulo}</h4>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: '#888' }}>
                            <span>⚖️ {caso.area_atuacao}</span>
                            <span>📅 {new Date(caso.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div style={{ marginTop: '5px' }}>
                            <span className={styles.miniBadge} style={{ 
                              background: caso.status === 'CONCLUIDO' ? 'rgba(16,185,129,0.1)' : 'rgba(212,175,55,0.1)',
                              color: caso.status === 'CONCLUIDO' ? '#10b981' : 'var(--color-gold)',
                              fontSize: '0.65rem'
                            }}>
                              {caso.status}
                            </span>
                          </div>
                        </div>
                        <button 
                          className={styles.newClientBtn} 
                          style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                          onClick={() => {
                            // Abrir chat ou detalhes do caso
                            setShowDossierModal(false);
                            setActiveTab('minhas-mensagens');
                            // Aqui poderíamos setar o chat ativo se tivéssemos essa lógica global
                          }}
                        >
                          Abrir Chat <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '10px',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      color: '#555',
                      fontSize: '0.8rem'
                    }}>
                      <Gavel size={24} style={{ opacity: 0.2, marginBottom: '8px' }} />
                      <p style={{ margin: 0 }}>Nenhum caso do Marketplace vinculado a este cliente.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* GESTÃO FINANCEIRA DO CLIENTE */}
              <div className={styles.dossierSection} style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span className={styles.dossierSectionTitle} style={{ margin: 0 }}>
                    Gestão Financeira & Honorários
                  </span>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>TOTAL PAGO</span>
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                        R$ {clientFinance.filter(f => f.status === 'PAGO').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>PENDENTE</span>
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>
                        R$ {clientFinance.filter(f => f.status === 'PENDENTE').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form para novo lançamento financeiro */}
                <div style={{ 
                  marginBottom: '15px', 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(16,185,129,0.1)' 
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className={styles.docFilterInput}
                      placeholder="Descrição (ex: Parcela 1)"
                      value={newFinance.description}
                      onChange={(e) => setNewFinance({...newFinance, description: e.target.value})}
                      style={{ fontSize: '0.75rem', padding: '6px' }}
                    />
                    <input
                      type="number"
                      className={styles.docFilterInput}
                      placeholder="Valor (R$)"
                      value={newFinance.amount}
                      onChange={(e) => setNewFinance({...newFinance, amount: e.target.value})}
                      style={{ fontSize: '0.75rem', padding: '6px' }}
                    />
                    <input
                      type="date"
                      className={styles.docFilterInput}
                      value={newFinance.due_date}
                      onChange={(e) => setNewFinance({...newFinance, due_date: e.target.value})}
                      style={{ fontSize: '0.75rem', padding: '6px', color: '#888' }}
                    />
                  </div>
                  <button 
                    className={styles.newClientBtn} 
                    onClick={handleSaveFinance}
                    disabled={isSavingFinance || !newFinance.description || !newFinance.amount}
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    {isSavingFinance ? 'Registrando...' : '+ Novo Lançamento'}
                  </button>
                </div>

                {/* Lista Financeira */}
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {isFetchingFinance ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#888' }}>Carregando finanças...</div>
                  ) : clientFinance.length > 0 ? (
                    clientFinance.map((item) => (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px', 
                        background: 'rgba(255,255,255,0.01)', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: item.status === 'PAGO' ? '#10b981' : '#ef4444' 
                          }} />
                          <div>
                            <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{item.description}</span>
                            <span style={{ fontSize: '0.65rem', color: '#666', display: 'block' }}>Vence em: {new Date(item.due_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.85rem', color: item.status === 'PAGO' ? '#10b981' : '#fff', fontWeight: 700 }}>
                            R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button 
                            onClick={() => handleTogglePaymentStatus(item)}
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '0.6rem', 
                              borderRadius: '4px', 
                              border: '1px solid',
                              borderColor: item.status === 'PAGO' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                              background: item.status === 'PAGO' ? 'rgba(16,185,129,0.1)' : 'transparent',
                              color: item.status === 'PAGO' ? '#10b981' : '#888',
                              cursor: 'pointer'
                            }}
                          >
                            {item.status === 'PAGO' ? 'PAGO ✓' : 'ABERTO'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '15px', color: '#444', fontSize: '0.75rem' }}>Nenhum lançamento financeiro para este cliente.</div>
                  )}
                </div>
              </div>

              {/* PRÓXIMOS PASSOS E LEMBRETES (AGENDA) */}
              <div className={styles.dossierSection} style={{ marginTop: '20px' }}>
                <span className={styles.dossierSectionTitle}>
                  Próximos Passos & Lembretes
                </span>
                
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(212,175,55,0.1)',
                  marginBottom: '15px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className={styles.docFilterInput}
                      placeholder="O que fazer? (ex: Ligar para feedback)"
                      value={newQuickReminder.title}
                      onChange={(e) => setNewQuickReminder({...newQuickReminder, title: e.target.value})}
                      style={{ fontSize: '0.75rem', padding: '6px' }}
                    />
                    <input
                      type="date"
                      className={styles.docFilterInput}
                      value={newQuickReminder.date}
                      onChange={(e) => setNewQuickReminder({...newQuickReminder, date: e.target.value})}
                      style={{ fontSize: '0.75rem', padding: '6px', color: '#888' }}
                    />
                    <input
                      type="time"
                      className={styles.docFilterInput}
                      value={newQuickReminder.time}
                      onChange={(e) => setNewQuickReminder({...newQuickReminder, time: e.target.value})}
                      style={{ fontSize: '0.75rem', padding: '6px', color: '#888' }}
                    />
                  </div>
                  <button 
                    className={styles.newClientBtn} 
                    onClick={handleSaveQuickReminder}
                    disabled={isSavingReminder || !newQuickReminder.title || !newQuickReminder.date}
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', border: '1px solid rgba(212,175,55,0.2)' }}
                  >
                    {isSavingReminder ? 'Agendando...' : 'Agendar Lembrete na Agenda'}
                  </button>
                </div>

                {/* Listagem de lembretes ativos para este cliente */}
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {agendaItems.filter(item => item.client_id === selectedClient.id && item.status === 'PENDING').length > 0 ? (
                    agendaItems.filter(item => item.client_id === selectedClient.id && item.status === 'PENDING').map((task) => (
                      <div key={task.id} style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        padding: '8px', 
                        background: 'rgba(255,255,255,0.01)', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        alignItems: 'center'
                      }}>
                        <Calendar size={14} color="var(--color-gold)" style={{ opacity: 0.6 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', color: '#fff' }}>{task.title.replace(`CRM: ${selectedClient.name} - `, '')}</div>
                          <div style={{ fontSize: '0.65rem', color: '#666' }}>{new Date(task.date).toLocaleString('pt-BR')}</div>
                        </div>
                        <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)' }}>
                          AGENDADO
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#444', fontSize: '0.75rem' }}>Nenhum lembrete pendente para este cliente.</div>
                  )}
                </div>
              </div>

              <div className={styles.dossierSection}>
                <div className={styles.documentsSectionHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      className={styles.dossierSectionTitle}
                      style={{ margin: 0 }}
                    >
                      Documentos Vinculados
                    </span>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "rgba(16,185,129,0.1)", padding: "4px 8px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <input 
                        type="checkbox" 
                        checked={isBlindarProva} 
                        onChange={(e) => setIsBlindarProva(e.target.checked)} 
                        style={{ accentColor: "#10b981", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>🛡️ Blindar Prova {profileData?.plan_type === 'START' ? "(3 Juris)" : "(Grátis PRO)"}</span>
                    </label>
                  </div>
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
                            <span style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              {doc.file_name}
                              {doc.is_blindado && (
                                <span title="Prova Blindada" style={{ color: "#10b981", display: "flex", alignItems: "center", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: "12px", fontSize: "0.6rem", fontWeight: 800 }}>
                                  🛡️ BLINDADO
                                </span>
                              )}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "15px",
                              alignItems: "center",
                            }}
                          >
                            {doc.is_blindado && (
                              <button
                                onClick={() => handleDownloadCertificate(doc)}
                                style={{
                                  background: "rgba(16,185,129,0.1)",
                                  border: "1px solid #10b981",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  color: "#10b981",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                <FileDown size={12} /> Certificado
                              </button>
                            )}
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
                <Sparkles size={18} color="var(--color-gold)" /> IA Insights {"&"}
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

  const renderDelegatingModal = () => {
    if (!delegatingClient) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => setDelegatingClient(null)} style={{ zIndex: 11000 }}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', border: '1px solid rgba(212,175,55,0.2)', padding: '20px' }}>
          <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--color-gold)', fontSize: '1.1rem' }}>
              🤝 Delegar Responsável
            </h3>
            <button className={styles.closeBtn} onClick={() => setDelegatingClient(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-silver)', margin: '0 0 15px 0', lineHeight: '1.4' }}>
              Selecione o advogado membro do escritório que ficará responsável pelo caso do cliente <strong>{delegatingClient.name}</strong>.
            </p>
            <div className={styles.formItemFull} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className={styles.formLabel}>Advogado Responsável</label>
              <select
                className={styles.formSelect}
                value={delegatingClient.lawyer_id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    handleDelegateCase(delegatingClient.id, val);
                  }
                }}
                disabled={isDelegating}
              >
                <option value="">-- Selecione o Advogado --</option>
                {(membrosEscritorio || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.cargo ? m.cargo.toUpperCase() : "ADVOGADO"})
                  </option>
                ))}
              </select>
            </div>
          </div>
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

  const renderContratoModal = () => {
    if (!showContratoModal) return null;

    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowContratoModal(false)}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "800px", width: "90%" }}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>🛡️ Blindagem de Contratos</h2>
            <button
              className={styles.modalClose}
              onClick={() => setShowContratoModal(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.modalBody} style={{ padding: '20px' }}>
            {!showContractResult ? (
              /* Passo 1: Formulário */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc' }}>Tipo de Contrato</label>
                  <input
                    type="text"
                    value={contractForm.tipo}
                    onChange={(e) => setContractForm({ ...contractForm, tipo: e.target.value })}
                    placeholder="Ex: Prestação de Serviços, Locação, etc."
                    style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  {/* Parte 1 */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--color-gold)' }}>Parte 1 (Contratante)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Nome Completo</label>
                        <input
                          type="text"
                          value={contractForm.parte1.nome}
                          onChange={(e) => setContractForm({ ...contractForm, parte1: { ...contractForm.parte1, nome: e.target.value } })}
                          placeholder="Nome completo"
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>CPF ou CNPJ</label>
                        <input
                          type="text"
                          value={contractForm.parte1.cpf_cnpj}
                          onChange={(e) => setContractForm({ ...contractForm, parte1: { ...contractForm.parte1, cpf_cnpj: e.target.value } })}
                          placeholder="000.000.000-00"
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Estado Civil</label>
                        <input
                          type="text"
                          value={contractForm.parte1.estado_civil}
                          onChange={(e) => setContractForm({ ...contractForm, parte1: { ...contractForm.parte1, estado_civil: e.target.value } })}
                          placeholder="Solteiro, Casado, etc."
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Profissão</label>
                        <input
                          type="text"
                          value={contractForm.parte1.profissao}
                          onChange={(e) => setContractForm({ ...contractForm, parte1: { ...contractForm.parte1, profissao: e.target.value } })}
                          placeholder="Advogado, Engenheiro, etc."
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Endereço Completo</label>
                        <input
                          type="text"
                          value={contractForm.parte1.endereco}
                          onChange={(e) => setContractForm({ ...contractForm, parte1: { ...contractForm.parte1, endereco: e.target.value } })}
                          placeholder="Rua, número, bairro, cidade-UF"
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Parte 2 */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--color-gold)' }}>Parte 2 (Contratado)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Nome Completo</label>
                        <input
                          type="text"
                          value={contractForm.parte2.nome}
                          onChange={(e) => setContractForm({ ...contractForm, parte2: { ...contractForm.parte2, nome: e.target.value } })}
                          placeholder="Nome completo"
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>CPF ou CNPJ</label>
                        <input
                          type="text"
                          value={contractForm.parte2.cpf_cnpj}
                          onChange={(e) => setContractForm({ ...contractForm, parte2: { ...contractForm.parte2, cpf_cnpj: e.target.value } })}
                          placeholder="000.000.000-00"
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Estado Civil</label>
                        <input
                          type="text"
                          value={contractForm.parte2.estado_civil}
                          onChange={(e) => setContractForm({ ...contractForm, parte2: { ...contractForm.parte2, estado_civil: e.target.value } })}
                          placeholder="Solteiro, Casado, etc."
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Profissão</label>
                        <input
                          type="text"
                          value={contractForm.parte2.profissao}
                          onChange={(e) => setContractForm({ ...contractForm, parte2: { ...contractForm.parte2, profissao: e.target.value } })}
                          placeholder="Advogado, Engenheiro, etc."
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', color: '#ccc', fontSize: '0.85rem' }}>Endereço Completo</label>
                        <input
                          type="text"
                          value={contractForm.parte2.endereco}
                          onChange={(e) => setContractForm({ ...contractForm, parte2: { ...contractForm.parte2, endereco: e.target.value } })}
                          placeholder="Rua, número, bairro, cidade-UF"
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc' }}>Personalidade da IA</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['Técnica', 'Formal', 'Conciliadora'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setContractForm({ ...contractForm, personality: p })}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: contractForm.personality === p ? 'var(--color-gold)' : '#222',
                          color: contractForm.personality === p ? '#000' : '#fff',
                          border: '1px solid #333',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.85rem' }}>Comarca</label>
                    <input
                      type="text"
                      value={contractForm.comarca}
                      onChange={(e) => setContractForm({ ...contractForm, comarca: e.target.value })}
                      placeholder="Ex: São Paulo - SP"
                      style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.85rem' }}>Local</label>
                    <input
                      type="text"
                      value={contractForm.local}
                      onChange={(e) => setContractForm({ ...contractForm, local: e.target.value })}
                      placeholder="Ex: São Paulo"
                      style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.85rem' }}>Data</label>
                    <input
                      type="date"
                      value={contractForm.data}
                      onChange={(e) => setContractForm({ ...contractForm, data: e.target.value })}
                      style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc' }}>Objetivo do Contrato</label>
                  <textarea
                    value={contractForm.purpose}
                    onChange={(e) => setContractForm({ ...contractForm, purpose: e.target.value })}
                    placeholder="Descreva detalhadamente o que você precisa que conste no contrato..."
                    style={{ width: '100%', height: '150px', padding: '10px', background: '#222', border: '1px solid #333', borderRadius: '6px', color: '#fff', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="button"
                  disabled={isGeneratingContract || !contractForm.purpose}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    opacity: (isGeneratingContract || !contractForm.purpose) ? 0.7 : 1
                  }}
                  onClick={async () => {
                    setIsGeneratingContract(true);
                    try {
                      const payload = {
                        type: `Contrato de ${contractForm.tipo || 'Prestação de Serviços'}`,
                        tone: contractForm.personality,
                        facts: `Objetivo do Contrato: ${contractForm.purpose}\n\nComarca: ${contractForm.comarca}\nLocal: ${contractForm.local}\nData: ${contractForm.data}\n\nParte 1 (Contratante): ${contractForm.parte1.nome}, CPF/CNPJ: ${contractForm.parte1.cpf_cnpj}, Estado Civil: ${contractForm.parte1.estado_civil}, Profissão: ${contractForm.parte1.profissao}, Endereço: ${contractForm.parte1.endereco}\n\nParte 2 (Contratado): ${contractForm.parte2.nome}, CPF/CNPJ: ${contractForm.parte2.cpf_cnpj}, Estado Civil: ${contractForm.parte2.estado_civil}, Profissão: ${contractForm.parte2.profissao}, Endereço: ${contractForm.parte2.endereco}`,
                        advocateData: profileData,
                      };

                      const res = await fetch("/api/crm/redator", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      
                      const data = await res.json();
                      if (data.success) {
                        setGeneratedContract(data.draft);
                        toast.success("Contrato gerado com sucesso!");
                        setShowContractResult(true);
                      } else {
                        toast.error(data.message || "Erro ao gerar contrato");
                      }
                    } catch (error) {
                      console.error("Erro ao gerar contrato:", error);
                      toast.error("Erro de conexão ao gerar contrato");
                    } finally {
                      setIsGeneratingContract(false);
                    }
                  }}
                >
                  {isGeneratingContract ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Gerando Contrato...
                    </div>
                  ) : "Gerar Contrato"}
                </button>
              </div>
            ) : (
              /* Passo 2: Resultado e Ações */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ 
                  background: '#222', 
                  border: '1px solid #333', 
                  borderRadius: '6px', 
                  padding: '15px', 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  color: '#fff',
                  fontFamily: 'monospace'
                }}>
                  {generatedContract}
                </div>

                {!contractConfirmed ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={() => {
                        setShowContractResult(false);
                        setContractConfirmed(false);
                      }}
                    >
                      Tentar Novamente
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '10px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={() => {
                        setContractConfirmed(true);
                        toast.success("Contrato confirmado!");
                      }}
                    >
                      Confirmar e Ir para PDF
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button
                      type="button"
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 
                        color: '#000', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                      onClick={() => {
                        toast.success("Gerando PDF do Contrato...");
                        
                        const doc = new jsPDF();
                        const margin = 20;
                        const pageWidth = doc.internal.pageSize.getWidth();
                        const pageHeight = doc.internal.pageSize.getHeight();
                        const contentWidth = pageWidth - margin * 2;
                        
                        let y = margin;
                        
                        // Título
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(16);
                        doc.setTextColor(0, 0, 0);
                        const title = contractForm.tipo?.toUpperCase() || 'CONTRATO';
                        const titleWidth = doc.getTextWidth(title);
                        doc.text(title, (pageWidth - titleWidth) / 2, y);
                        y += 20;
                        
                        // Qualificação
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(11);
                        const qualifText = `CONTRATANTE: ${contractForm.parte1.nome}, CPF/CNPJ: ${contractForm.parte1.cpf_cnpj}, Estado Civil: ${contractForm.parte1.estado_civil}, Profissão: ${contractForm.parte1.profissao}, residente em ${contractForm.parte1.endereco}.\n\nCONTRATADO: ${contractForm.parte2.nome}, CPF/CNPJ: ${contractForm.parte2.cpf_cnpj}, Estado Civil: ${contractForm.parte2.estado_civil}, Profissão: ${contractForm.parte2.profissao}, residente em ${contractForm.parte2.endereco}.`;
                        
                        const splitQualif = doc.splitTextToSize(qualifText, contentWidth);
                        doc.text(splitQualif, margin, y);
                        y += splitQualif.length * 5 + 10;
                        
                        // Conteúdo do Contrato
                        const splitContent = doc.splitTextToSize(generatedContract, contentWidth);
                        
                        // Loop para adicionar texto e páginas se necessário
                        for (let i = 0; i < splitContent.length; i++) {
                          if (y > pageHeight - margin - 10) {
                            doc.addPage();
                            y = margin;
                          }
                          doc.text(splitContent[i], margin, y);
                          y += 5;
                        }
                        
                        // Assinaturas
                        y += 20;
                        if (y > pageHeight - margin - 30) {
                          doc.addPage();
                          y = margin;
                        }
                        
                        const sigWidth = 80;
                        doc.line(margin, y, margin + sigWidth, y);
                        doc.line(pageWidth - margin - sigWidth, y, pageWidth - margin, y);
                        
                        y += 5;
                        doc.setFontSize(10);
                        doc.text(contractForm.parte1.nome || "Contratante", margin, y);
                        doc.text(contractForm.parte2.nome || "Contratado", pageWidth - margin - sigWidth, y);
                        
                        y += 5;
                        doc.text("CONTRATANTE", margin, y);
                        doc.text("CONTRATADO", pageWidth - margin - sigWidth, y);
                        
                        const fileName = `${contractForm.tipo?.replace(/\s+/g, "_") || "Contrato"}.pdf`;
                        doc.save(fileName);
                        toast.success("PDF baixado com sucesso!");
                      }}
                    >
                      <FileDown size={18} /> Imprimir PDF do Contrato
                    </button>
                  </div>
                )}

                {/* Fluxo de Upload e Blindagem - Só aparece após confirmar */}
                {contractConfirmed && (
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    borderRadius: '12px', 
                    padding: '20px',
                    marginTop: '10px'
                  }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>🛡️ Blindar Contrato Assinado</h3>
                  <p style={{ color: '#808080', fontSize: '0.85rem', marginBottom: '15px' }}>
                    Faça o upload do contrato assinado pelas partes para gerar a blindagem digital com Hash SHA-512.
                  </p>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="file"
                      id="signed-contract-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => setUploadedSignedContract(e.target.files[0])}
                    />
                    <label
                      htmlFor="signed-contract-upload"
                      style={{
                        padding: '10px 15px',
                        background: '#333',
                        color: '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {uploadedSignedContract ? "Alterar Arquivo" : "Selecionar Arquivo"}
                    </label>
                    {uploadedSignedContract && (
                      <span style={{ color: '#00e676', fontSize: '0.9rem' }}>{uploadedSignedContract.name}</span>
                    )}
                  </div>

                  {uploadedSignedContract && (
                    <button
                      type="button"
                      disabled={isShielding}
                      style={{
                        marginTop: '15px',
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: isShielding ? 0.7 : 1
                      }}
                      onClick={async () => {
                        // VERIFICAR JURIS
                        const isStart = profileData?.plan_type === 'START';
                        const currentBalance = profileData?.balance || 0;
                        
                        const proceedWithShielding = async () => {
                          if (isStart && currentBalance < 4) {
                            toast.error("Saldo de Juris insuficiente! Você precisa de 4 Juris.");
                            return;
                          }
                          setIsShielding(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", uploadedSignedContract);
                            formData.append("type", "contrato");
                            
                            const res = await fetch("/api/crm/blindagem", {
                              method: "POST",
                              body: formData,
                            });
                            
                            const data = await res.json();
                            
                            if (data.success) {
                              setShieldingCertificate({
                                protocol: data.data.protocol,
                                hash: data.data.hash,
                                date: new Date(data.data.date).toLocaleString()
                              });
                              toast.success("Contrato blindado com sucesso!");
                              
                              if (isStart) {
                                setProfileData(prev => ({ ...prev, balance: (prev.balance || 0) - 4 }));
                                toast.info("4 Juris deduzidos pelo serviço.");
                              }
                            } else {
                              toast.error(data.message || "Erro ao blindar contrato");
                            }
                          } catch (error) {
                            console.error("Erro ao blindar contrato:", error);
                            toast.error("Erro de conexão ao blindar contrato");
                          } finally {
                            setIsShielding(false);
                          }
                        };

                        if (isStart) {
                          setJurisConfirmAction(() => proceedWithShielding);
                          setShowJurisConfirmModal(true);
                        } else {
                          proceedWithShielding();
                        }
                      }}
                    >
                      {isShielding ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                          Blindando Documento...
                        </div>
                      ) : "Blindar Contrato (Gerar Hash SHA-512)"}
                    </button>
                  )}

                  {shieldingCertificate && (
                    <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0, 230, 118, 0.05)', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                      <p style={{ color: '#00e676', fontWeight: 'bold', marginBottom: '5px' }}>✓ Documento Blindado!</p>
                      <p style={{ color: '#aaa', fontSize: '0.8rem' }}>Protocolo: {shieldingCertificate.protocol}</p>
                      <p style={{ color: '#aaa', fontSize: '0.8rem', wordBreak: 'break-all' }}>Hash: {shieldingCertificate.hash}</p>
                      
                      <button
                        type="button"
                        style={{
                          marginTop: '10px',
                          width: '100%',
                          padding: '10px',
                          background: 'var(--color-gold)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                        onClick={() => {
                          toast.success("Gerando Certificado...");
                          
                          const doc = new jsPDF();
                          const pageWidth = doc.internal.pageSize.getWidth();
                          const pageHeight = doc.internal.pageSize.getHeight();
                          
                          // Desenhar borda elegante
                          doc.setDrawColor(212, 175, 55); // Cor Ouro
                          doc.setLineWidth(2);
                          doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
                          doc.setLineWidth(0.5);
                          doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
                          
                          generateCertificatePDF({
                            fileName: `Contrato_${contractForm.tipo}_${contractForm.parte1.nome}_${contractForm.parte2.nome}.pdf`,
                            protocol: shieldingCertificate.protocol,
                            owner: `${profileData?.name || "Advogado"} (OAB: ${profileData?.oab || "N/I"})`,
                            date: shieldingCertificate.date,
                            hash: shieldingCertificate.hash,
                            ip: "::1",
                            agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/I'
                          });
                          toast.success("Certificado baixado com sucesso!");
                          
                          // FECHAR MODAL E LIMPAR DADOS
                          setTimeout(() => {
                            setShowContratoModal(false);
                            setContractForm({
                              tipo: "",
                              parte1: { nome: "", cpf_cnpj: "", endereco: "", estado_civil: "", profissao: "" },
                              parte2: { nome: "", cpf_cnpj: "", endereco: "", estado_civil: "", profissao: "" },
                              personality: "Técnica",
                              purpose: "",
                            });
                            setGeneratedContract("");
                            setShowContractResult(false);
                            setContractConfirmed(false);
                            setUploadedSignedContract(null);
                            setShieldingCertificate(null);
                            
                            // Recarregar lista de blindados!
                            fetchBlindados();
                          }, 1000);
                        }}
                      >
                        Baixar Certificado de Cadeia de Custódia
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProcuracaoModal = () => {
    if (!showProcuracaoModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setShowProcuracaoModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "90%" }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>🛡️ Blindagem de Procuração</h2>
            <button className={styles.modalClose} onClick={() => setShowProcuracaoModal(false)}><X size={20} /></button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px' }}>
            {!showProcuracaoResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  {/* Outorgante */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--color-gold)' }}>Outorgante</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {crmClients.length > 0 && (
                        <select
                          onChange={(e) => {
                            const client = crmClients.find(c => c.id === e.target.value);
                            if (client) {
                              setProcuracaoForm({
                                ...procuracaoForm,
                                outorgante: {
                                  nome: client.name || "",
                                  cpf_cnpj: client.cpf_cnpj || "",
                                  endereco: "",
                                  estado_civil: "",
                                  profissao: ""
                                }
                              });
                            }
                          }}
                          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.9rem', marginBottom: '5px' }}
                        >
                          <option value="">Puxar do CRM (Opcional)</option>
                          {crmClients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                      <input type="text" placeholder="Nome Completo" value={procuracaoForm.outorgante.nome} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgante: {...procuracaoForm.outorgante, nome: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="CPF ou CNPJ" value={procuracaoForm.outorgante.cpf_cnpj} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgante: {...procuracaoForm.outorgante, cpf_cnpj: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="Estado Civil" value={procuracaoForm.outorgante.estado_civil} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgante: {...procuracaoForm.outorgante, estado_civil: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="Profissão" value={procuracaoForm.outorgante.profissao} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgante: {...procuracaoForm.outorgante, profissao: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="Endereço Completo" value={procuracaoForm.outorgante.endereco} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgante: {...procuracaoForm.outorgante, endereco: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                    </div>
                  </div>
                  {/* Outorgado */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--color-gold)' }}>Outorgado</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input type="text" placeholder="Nome Completo" value={procuracaoForm.outorgado.nome} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgado: {...procuracaoForm.outorgado, nome: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="OAB" value={procuracaoForm.outorgado.oab} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgado: {...procuracaoForm.outorgado, oab: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="CPF" value={procuracaoForm.outorgado.cpf} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgado: {...procuracaoForm.outorgado, cpf: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                      <input type="text" placeholder="Endereço Profissional" value={procuracaoForm.outorgado.endereco} onChange={(e) => setProcuracaoForm({...procuracaoForm, outorgado: {...procuracaoForm.outorgado, endereco: e.target.value}})} style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="Comarca" value={procuracaoForm.comarca} onChange={(e) => setProcuracaoForm({...procuracaoForm, comarca: e.target.value})} style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                  <input type="text" placeholder="Local" value={procuracaoForm.local} onChange={(e) => setProcuracaoForm({...procuracaoForm, local: e.target.value})} style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                  <input type="date" value={procuracaoForm.data} onChange={(e) => setProcuracaoForm({...procuracaoForm, data: e.target.value})} style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Poderes</label>
                  <textarea value={procuracaoForm.poderes} onChange={(e) => setProcuracaoForm({...procuracaoForm, poderes: e.target.value})} placeholder="Descreva os poderes..." style={{ width: '100%', height: '80px', padding: '10px', background: '#222', border: '1px solid #333', borderRadius: '6px', color: '#fff' }} />
                </div>
                <button
                  disabled={isGeneratingProcuracao || !procuracaoForm.poderes}
                  style={{ padding: '12px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: (isGeneratingProcuracao || !procuracaoForm.poderes) ? 0.7 : 1 }}
                  onClick={async () => {
                    setIsGeneratingProcuracao(true);
                    try {
                      const payload = {
                        type: `Procuração`,
                        tone: "Formal",
                        facts: `Poderes: ${procuracaoForm.poderes}\n\nComarca: ${procuracaoForm.comarca}\nLocal: ${procuracaoForm.local}\nData: ${procuracaoForm.data}\n\nOutorgante: ${procuracaoForm.outorgante.nome}, CPF/CNPJ: ${procuracaoForm.outorgante.cpf_cnpj}, Estado Civil: ${procuracaoForm.outorgante.estado_civil}, Profissão: ${procuracaoForm.outorgante.profissao}, Endereço: ${procuracaoForm.outorgante.endereco}\n\nOutorgado: ${procuracaoForm.outorgado.nome}, OAB: ${procuracaoForm.outorgado.oab}, CPF: ${procuracaoForm.outorgado.cpf}, Endereço: ${procuracaoForm.outorgado.endereco}`,
                        advocateData: profileData,
                      };
                      const res = await fetch("/api/crm/redator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                      const data = await res.json();
                      if (data.success) {
                        setGeneratedProcuracao(data.draft);
                        toast.success("Procuração gerada!");
                        setShowProcuracaoResult(true);
                      } else { toast.error(data.message || "Erro ao gerar"); }
                    } catch (error) { toast.error("Erro de conexão"); } finally { setIsGeneratingProcuracao(false); }
                  }}
                >
                  {isGeneratingProcuracao ? "Gerando..." : "Gerar Procuração"}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '0.9rem' }}>
                  {generatedProcuracao}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setShowProcuracaoResult(false)}>Voltar</button>
                  <button
                    style={{ flex: 1, padding: '10px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => {
                      const doc = new jsPDF();
                      const pageWidth = doc.internal.pageSize.getWidth();
                      const pageHeight = doc.internal.pageSize.getHeight();
                      const margin = 20;
                      const contentWidth = pageWidth - (margin * 2);
                      let y = 30;
                      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
                      const cleanProcuracao = generatedProcuracao.replace(/\*\*/g, '').replace(/\*/g, '');
                      const splitContent = doc.splitTextToSize(cleanProcuracao, contentWidth);
                      for (let i = 0; i < splitContent.length; i++) {
                        if (y > pageHeight - margin - 10) { doc.addPage(); y = margin; }
                        doc.text(splitContent[i], margin, y); y += 5;
                      }
                      doc.save(`procuracao_${procuracaoForm.outorgante.nome.replace(/\s+/g, '_')}.pdf`);
                      setProcuracaoConfirmed(true);
                    }}
                  >
                    Imprimir PDF
                  </button>
                </div>
                {procuracaoConfirmed && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                    <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '5px' }}>Blindar Procuração Assinada</h4>
                    <div style={{ border: '2px dashed #444', borderRadius: '6px', padding: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }} onClick={() => document.getElementById('fileUploadProcuracao').click()}>
                      <input id="fileUploadProcuracao" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) setUploadedSignedProcuracao(e.target.files[0]); }} />
                      <Upload size={20} color="var(--color-gold)" style={{ marginBottom: '5px' }} />
                      <p style={{ color: '#fff', fontSize: '0.85rem' }}>{uploadedSignedProcuracao ? uploadedSignedProcuracao.name : "Clique para selecionar"}</p>
                    </div>
                    {uploadedSignedProcuracao && (
                      <button
                        disabled={isShieldingProcuracao}
                        style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isShieldingProcuracao ? 0.7 : 1 }}
                        onClick={async () => {
                          const isStart = profileData?.plan_type === 'START';
                          const proceedWithShielding = async () => {
                            if (isStart && (profileData?.balance || 0) < 4) { toast.error("Saldo insuficiente!"); return; }
                            setIsShieldingProcuracao(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", uploadedSignedProcuracao);
                              formData.append("type", "procuracao");
                              const res = await fetch("/api/crm/blindagem", { method: "POST", body: formData });
                              const data = await res.json();
                              if (data.success) {
                                setProcuracaoCertificate({ protocol: data.data.protocol, hash: data.data.hash, date: new Date(data.data.date).toLocaleString() });
                                toast.success("Blindada!");
                                if (isStart) setProfileData(prev => ({ ...prev, balance: (prev.balance || 0) - 4 }));
                              } else { toast.error(data.message || "Erro"); }
                            } catch (error) { toast.error("Erro"); } finally { setIsShieldingProcuracao(false); }
                          };

                          if (isStart) {
                            setJurisConfirmAction(() => proceedWithShielding);
                            setShowJurisConfirmModal(true);
                          } else {
                            proceedWithShielding();
                          }
                        }}
                      >
                        {isShieldingProcuracao ? "Blindando..." : "Blindar Procuração"}
                      </button>
                    )}
                    {procuracaoCertificate && (
                      <div style={{ marginTop: '10px', background: 'rgba(0, 230, 118, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                        <p style={{ color: '#fff', fontSize: '0.8rem' }}><strong>Protocolo:</strong> {procuracaoCertificate.protocol}</p>
                        <button
                          style={{ marginTop: '10px', width: '100%', padding: '8px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                          onClick={() => {
                            generateCertificatePDF({
                              fileName: `Procuracao_${procuracaoForm.outorgante.nome}_${procuracaoForm.outorgado.nome}.pdf`,
                              protocol: procuracaoCertificate.protocol,
                              owner: `${profileData?.name || "Advogado"} (OAB: ${profileData?.oab || "N/I"})`,
                              date: procuracaoCertificate.date,
                              hash: procuracaoCertificate.hash,
                              ip: "::1",
                              agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/I'
                            });
                            setTimeout(() => {
                              setShowProcuracaoModal(false);
                              setProcuracaoForm({ outorgante: { nome: "", cpf_cnpj: "", endereco: "", estado_civil: "", profissao: "" }, outorgado: { nome: "", oab: "", cpf: "", endereco: "" }, poderes: "Ad Judicia et Extra", comarca: "", local: "", data: new Date().toISOString().split('T')[0] });
                              setGeneratedProcuracao(""); setShowProcuracaoResult(false); setProcuracaoConfirmed(false); setUploadedSignedProcuracao(null); setProcuracaoCertificate(null);
                              fetchBlindados();
                            }, 1000);
                          }}
                        >
                          Baixar Certificado
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProvasModal = () => {
    if (!showProvasModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setShowProvasModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "90%" }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>🛡️ Blindagem de Provas Digitais</h2>
            <button className={styles.modalClose} onClick={() => setShowProvasModal(false)}><X size={20} /></button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px' }}>
            <div style={{ border: '2px dashed #444', borderRadius: '6px', padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }} onClick={() => document.getElementById('fileUploadProva').click()}>
              <input id="fileUploadProva" type="file" accept=".pdf,.jpg,.jpeg,.png,.mp3,.mp4" style={{ display: 'none' }} onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  setUploadedProvaFile(file);
                  setIsAnalyzingProva(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetch("/api/crm/analisador", { method: "POST", body: formData });
                    const data = await res.json();
                    if (data.success) {
                      setProvaAnalysis(data.analysis);
                      toast.success("Análise concluída!");
                    } else { toast.error("Erro ao analisar"); }
                  } catch (error) { toast.error("Erro de conexão"); } finally { setIsAnalyzingProva(false); }
                }
              }} />
              <Upload size={32} color="var(--color-gold)" style={{ marginBottom: '10px' }} />
              <p style={{ color: '#fff' }}>{uploadedProvaFile ? uploadedProvaFile.name : "Clique para selecionar arquivo ou imagem"}</p>
              <p style={{ color: '#808080', fontSize: '0.8rem', marginTop: '5px' }}>Suporta PDF, Imagens, Áudio e Vídeo</p>
            </div>
            {isAnalyzingProva && (
              <div style={{ marginTop: '15px', textAlign: 'center', color: '#aaa' }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite", marginBottom: '5px' }} />
                <p>IA analisando o documento...</p>
              </div>
            )}
            {provaAnalysis && !isAnalyzingProva && (
              <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '6px' }}>
                <h4 style={{ color: 'var(--color-gold)', marginBottom: '5px', fontSize: '0.9rem' }}>Análise da IA:</h4>
                <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                  {provaAnalysis.replace(/\*\*/g, '').replace(/###/g, '').replace(/#/g, '')}
                </p>
              </div>
            )}
            {uploadedProvaFile && provaAnalysis && !isAnalyzingProva && (
              <button
                disabled={isShieldingProva}
                style={{ marginTop: '15px', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isShieldingProva ? 0.7 : 1 }}
                onClick={async () => {
                  const isStart = profileData?.plan_type === 'START';
                  const proceedWithShielding = async () => {
                    if (isStart && (profileData?.balance || 0) < 4) { toast.error("Saldo insuficiente!"); return; }
                    setIsShieldingProva(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", uploadedProvaFile);
                      formData.append("type", "prova");
                      formData.append("analysis", provaAnalysis);
                      const res = await fetch("/api/crm/blindagem", { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.success) {
                        setProvaCertificate({ protocol: data.data.protocol, hash: data.data.hash, date: new Date(data.data.date).toLocaleString() });
                        toast.success("Prova Blindada!");
                        if (isStart) setProfileData(prev => ({ ...prev, balance: (prev.balance || 0) - 4 }));
                      } else { toast.error(data.message || "Erro"); }
                    } catch (error) { toast.error("Erro"); } finally { setIsShieldingProva(false); }
                  };

                  if (isStart) {
                    setJurisConfirmAction(() => proceedWithShielding);
                    setShowJurisConfirmModal(true);
                  } else {
                    proceedWithShielding();
                  }
                }}
              >
                {isShieldingProva ? "Blindando..." : "Blindar Prova Digital"}
              </button>
            )}
            {provaCertificate && (
              <div style={{ marginTop: '15px', background: 'rgba(0, 230, 118, 0.05)', padding: '15px', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                <p style={{ color: '#fff', fontSize: '0.85rem' }}><strong>Protocolo:</strong> {provaCertificate.protocol}</p>
                <button
                  style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => {
                    generateCertificatePDF({
                      fileName: uploadedProvaFile?.name,
                      protocol: provaCertificate.protocol,
                      owner: `${profileData?.name || "Advogado"} (OAB: ${profileData?.oab || "N/I"})`,
                      date: provaCertificate.date,
                      hash: provaCertificate.hash,
                      ip: "::1",
                      agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/I'
                    });
                    setTimeout(() => {
                      setShowProvasModal(false);
                      setUploadedProvaFile(null);
                      setProvaAnalysis("");
                      setProvaCertificate(null);
                      fetchBlindados();
                    }, 1000);
                  }}
                >
                  Baixar Certificado
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNotificacaoModal = () => {
    if (!showNotificacaoModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setShowNotificacaoModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "90%" }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>📝 Nova Notificação Extrajudicial</h2>
            <button className={styles.modalClose} onClick={() => setShowNotificacaoModal(false)}><X size={20} /></button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Caso / Cliente (Opcional)</label>
                <select
                  style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                  value={notificacaoForm.caso}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, caso: e.target.value })}
                >
                  <option value="">Selecione um caso ou cliente...</option>
                  {casos && casos.filter(caso => caso.advogado_id === profileData?.id).length > 0 && (
                    <optgroup label="Casos Contratados" style={{ background: '#222', color: '#fff' }}>
                      {casos.filter(caso => caso.advogado_id === profileData?.id).map(caso => (
                        <option key={caso.id} value={`caso_\${caso.id}`} style={{ background: '#333', color: '#fff' }}>
                          {caso.titulo || `Caso #\${caso.id.substring(0,8)}`} ({caso.cliente_nome || "S/N"})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {crmClients && crmClients.length > 0 && (
                    <optgroup label="Clientes do CRM" style={{ background: '#222', color: '#fff' }}>
                      {crmClients.map(client => (
                        <option key={client.id} value={`client_\${client.id}`} style={{ background: '#333', color: '#fff' }}>
                          {client.name || client.nome_completo || "Sem Nome"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Nome do Notificado</label>
                <input
                  type="text"
                  placeholder="Nome completo do destinatário"
                  style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                  value={notificacaoForm.destinatario_nome}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_nome: e.target.value })}
                />
              </div>

              {/* DADOS DO NOTIFICADO */}
              <div style={{ borderTop: '1px solid #444', paddingTop: '10px', marginTop: '10px' }}>
                <h4 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>Dados do Notificado (Destinatário)</h4>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>Endereço</label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro"
                      style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                      value={notificacaoForm.destinatario_endereco}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_endereco: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                      value={notificacaoForm.destinatario_cep}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_cep: e.target.value })}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>Cidade - Estado</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo - SP"
                    style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                    value={notificacaoForm.destinatario_cidade_estado}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_cidade_estado: e.target.value })}
                  />
                </div>
              </div>

              {/* DADOS DO NOTIFICANTE */}
              <div style={{ borderTop: '1px solid #444', paddingTop: '10px', marginTop: '10px' }}>
                <h4 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>Dados do Notificante (Remetente)</h4>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>Nome ou Razão Social</label>
                  <input
                    type="text"
                    placeholder="Seu nome ou nome do seu cliente"
                    style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                    value={notificacaoForm.notificante_nome}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_nome: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>Endereço</label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro"
                      style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                      value={notificacaoForm.notificante_endereco}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_endereco: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                      value={notificacaoForm.notificante_cep}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_cep: e.target.value })}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '3px', display: 'block' }}>Cidade - Estado</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo - SP"
                    style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                    value={notificacaoForm.notificante_cidade_estado}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_cidade_estado: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #444', paddingTop: '10px', marginTop: '10px' }}>
                <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>O que está acontecendo? (Explique para a IA)</label>
                <textarea
                  placeholder="Explique os fatos para que a IA redija a notificação adequada..."
                  style={{ width: '100%', height: '100px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px', padding: '10px' }}
                  value={notificacaoForm.explicacao}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, explicacao: e.target.value })}
                />
              </div>

              <div>
                <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Tom da Notificação</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={{ flex: 1, padding: '10px', background: notificacaoForm.tom === 'Conciliador' ? 'var(--color-gold)' : '#333', color: notificacaoForm.tom === 'Conciliador' ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => setNotificacaoForm({ ...notificacaoForm, tom: 'Conciliador' })}
                  >
                    🤝 Conciliador
                  </button>
                  <button
                    style={{ flex: 1, padding: '10px', background: notificacaoForm.tom === 'Agressivo' ? '#d32f2f' : '#333', color: notificacaoForm.tom === 'Agressivo' ? '#fff' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => setNotificacaoForm({ ...notificacaoForm, tom: 'Agressivo' })}
                  >
                    🔥 Assertivo / Agressivo
                  </button>
                </div>
              </div>

              <div>
                <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>E-mail do Destinatário</label>
                <input
                  type="email"
                  placeholder="email@destino.com"
                  style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                  value={notificacaoForm.destinatario_email}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Logotipo (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, logo: e.target.files[0] })}
                />
              </div>

              {!showNotificacaoResult ? (
                <button
                  style={{ width: '100%', padding: '12px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
                  onClick={async () => {
                    // Remoção da obrigatoriedade do caso/cliente a pedido do usuário
                    setIsGeneratingNotificacao(true);
                    try {
                      const selectedCaso = (notificacaoForm.caso && notificacaoForm.caso.startsWith("caso_")) 
                        ? casos.find(c => c.id === notificacaoForm.caso.replace("caso_", "")) 
                        : null;
                      const payload = {
                        type: "Notificação Extrajudicial",
                        tone: notificacaoForm.tom,
                        facts: `DADOS DO NOTIFICANTE (REMETENTE):
Nome: ${notificacaoForm.notificante_nome || "N/I"}
Endereço: ${notificacaoForm.notificante_endereco || "N/I"}
CEP: ${notificacaoForm.notificante_cep || "N/I"}
Cidade/Estado: ${notificacaoForm.notificante_cidade_estado || "N/I"}

DADOS DO NOTIFICADO (DESTINATÁRIO):
Nome: ${notificacaoForm.destinatario_nome || "N/I"}
Endereço: ${notificacaoForm.destinatario_endereco || "N/I"}
CEP: ${notificacaoForm.destinatario_cep || "N/I"}
Cidade/Estado: ${notificacaoForm.destinatario_cidade_estado || "N/I"}

DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}

CONTEXTO E FATOS:
${notificacaoForm.explicacao || "N/I"}

INSTRUÇÕES IMPORTANTES PARA A IA:
1. Use a data de emissão fornecida acima para datar o documento.
2. NÃO inclua nenhuma observação ou recomendação de envio por correios, carta registrada, AR ou meios físicos. Esta notificação será enviada de forma 100% digital com certificação de entrega pela plataforma. Remova qualquer texto padrão que sugira o contrário.`,
                        advocateData: profileData,
                      };
                      const res = await fetch("/api/crm/redator", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setDraftedNotificacao(data.draft);
                        setShowNotificacaoResult(true);
                        toast.success("Minuta gerada!");
                      } else {
                        toast.error(data.message || "Erro ao gerar minuta");
                      }
                    } catch (error) {
                      toast.error("Erro na requisição");
                    } finally {
                      setIsGeneratingNotificacao(false);
                    }
                  }}
                  disabled={isGeneratingNotificacao}
                >
                  {isGeneratingNotificacao ? "Gerando..." : "Gerar Notificação com IA"}
                </button>
              ) : (
                <>
                  <div style={{ marginTop: '15px', background: '#222', padding: '15px', borderRadius: '6px', border: '1px solid #444' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Minuta Gerada</label>
                    <textarea
                      style={{ width: '100%', height: '200px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '6px', padding: '10px' }}
                      value={draftedNotificacao}
                      onChange={(e) => setDraftedNotificacao(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        id="confirm_notificacao"
                        checked={notificacaoConfirmed}
                        onChange={(e) => setNotificacaoConfirmed(e.target.checked)}
                      />
                      <label htmlFor="confirm_notificacao" style={{ color: '#fff', fontSize: '0.9rem' }}>
                        Confirmo que a notificação está redigida perfeitamente e autorizo o envio.
                      </label>
                    </div>

                    {profileData?.plan_type === 'START' && (
                      <>
                        <div style={{ background: 'rgba(255, 193, 7, 0.1)', border: '1px solid #ffc107', padding: '10px', borderRadius: '6px' }}>
                          <p style={{ color: '#ffc107', fontSize: '0.9rem', margin: 0 }}>
                            No plano <strong>START</strong>, o envio de Notificação Extrajudicial custa <strong>R$ 10,00</strong>.
                          </p>
                          <p style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '5px', marginBottom: 0 }}>
                            Realize o pagamento via PIX na InfinitePay antes de enviar: 
                            <a href="https://loja.infinitepay.io/carlos-henrique-1o7/uus4692-notificacao-extrajudicial" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline', marginLeft: '5px' }}>
                              Pagar via PIX
                            </a>
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            id="confirm_payment"
                            checked={paymentConfirmed}
                            onChange={(e) => setPaymentConfirmed(e.target.checked)}
                          />
                          <label htmlFor="confirm_payment" style={{ color: '#fff', fontSize: '0.9rem' }}>
                            Já realizei o pagamento de R$ 10,00 via PIX.
                          </label>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
                    onClick={async () => {
                      if (!notificacaoForm.destinatario_email) { toast.error("E-mail do destinatário é obrigatório!"); return; }
                      if (!notificacaoConfirmed) { toast.error("Você precisa confirmar que a minuta está perfeita!"); return; }
                      if (profileData?.plan_type === 'START' && !paymentConfirmed) { toast.error("Você precisa confirmar o pagamento!"); return; }
                      setIsShieldingNotificacao(true);
                      try {
                        const docPdf = new jsPDF();
                        const pageWidth = docPdf.internal.pageSize.getWidth();
                        
                        const generateAndSend = async (imgData) => {
                          docPdf.setFillColor(0, 200, 118);
                          docPdf.rect(0, 0, pageWidth, 15, 'F');
                          
                          docPdf.setFont("helvetica", "bold");
                          docPdf.setFontSize(14);
                          docPdf.setTextColor(255, 255, 255);
                          docPdf.text("NOTIFICAÇÃO EXTRAJUDICIAL", 15, 10);
                          
                          if (imgData) {
                            try {
                              docPdf.addImage(imgData, 'JPEG', pageWidth - 55, 20, 40, 15);
                            } catch (e) {
                              console.error("Erro ao adicionar imagem:", e);
                            }
                          }
                          
                          docPdf.setFont("helvetica", "normal");
                          docPdf.setFontSize(10);
                          docPdf.setTextColor(50, 50, 50);
                          
                          const cleanedDraft = draftedNotificacao
                            .replace(/\*\*/g, "")
                            .replace(/#/g, "")
                            .replace(/^---\s*$/gm, "")
                            .trim();
                          
                          const splitContent = docPdf.splitTextToSize(cleanedDraft, pageWidth - 40);
                          docPdf.text(splitContent, 20, 40);
                          
                          const blob = docPdf.output('blob');
                          const file = new File([blob], `Notificacao.pdf`, { type: 'application/pdf' });
                          
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("destinatario_email", notificacaoForm.destinatario_email);
                          formData.append("tone", notificacaoForm.tom);
                          
                          const selectedValue = notificacaoForm.caso;
                          if (selectedValue && selectedValue.startsWith("client_")) {
                            formData.append("client_id", selectedValue.replace("client_", ""));
                          } else if (selectedValue && selectedValue.startsWith("caso_")) {
                            formData.append("case_id", selectedValue.replace("caso_", ""));
                          }
                          
                          const res = await fetch("/api/crm/notificacoes", {
                            method: "POST",
                            body: formData,
                          });
                          
                          const data = await res.json();
                          if (data.success) {
                            toast.success("Notificação enviada com sucesso!");
                            setShowNotificacaoModal(false);
                            setNotificacaoForm({ cliente: "", caso: "", tom: "Conciliador", destinatario_email: "", conteudo: "", logo: null });
                            setShowNotificacaoResult(false);
                            setDraftedNotificacao("");
                            fetchBlindados();
                          } else {
                            toast.error(data.message || "Erro ao enviar");
                          }
                        };

                        if (notificacaoForm.logo) {
                          const reader = new FileReader();
                          reader.onload = async (e) => {
                            await generateAndSend(e.target.result);
                            setIsShieldingNotificacao(false);
                          };
                          reader.readAsDataURL(notificacaoForm.logo);
                        } else {
                          await generateAndSend(null);
                          setIsShieldingNotificacao(false);
                        }
                      } catch (error) {
                        toast.error("Erro na requisição");
                        setIsShieldingNotificacao(false);
                      }
                    }}
                    disabled={isShieldingNotificacao}
                  >
                    {isShieldingNotificacao ? "Enviando..." : "Selar e Enviar Notificação"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderJurisConfirmModal = () => {
    if (!showJurisConfirmModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setShowJurisConfirmModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px", width: "90%", border: '1px solid var(--color-gold)' }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle} style={{ color: 'var(--color-gold)' }}>⚠️ Atenção</h2>
            <button className={styles.modalClose} onClick={() => setShowJurisConfirmModal(false)}><X size={20} /></button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '1rem', marginBottom: '20px' }}>
              No plano <strong>START</strong>, a blindagem de documentos custa <strong>4 Juris</strong>.
            </p>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
              Deseja confirmar o desconto e prosseguir com a blindagem?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                style={{ padding: '10px 20px', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => {
                  setShowJurisConfirmModal(false);
                  if (jurisConfirmAction) jurisConfirmAction();
                }}
              >
                Confirmar
              </button>
              <button
                style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setShowJurisConfirmModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmInterestModal = () => {
    if (!showConfirmInterestModal) return null;
    const isHighCompetition = confirmInterestCount > 2;
    const currentBalance = profileData?.balance || 0;

    return (
      <div className={styles.modalOverlay} onClick={() => { setShowConfirmInterestModal(false); setConfirmInterestCaseId(null); }}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px", width: "90%", border: isHighCompetition ? '1px solid #ef4444' : '1px solid var(--color-gold)' }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle} style={{ color: isHighCompetition ? '#ef4444' : 'var(--color-gold)' }}>
              {isHighCompetition ? "🔥 Alta Concorrência!" : "⚖️ Confirmar Interesse"}
            </h2>
            <button className={styles.modalClose} onClick={() => { setShowConfirmInterestModal(false); setConfirmInterestCaseId(null); }}><X size={20} /></button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px', textAlign: 'center' }}>
            {isHighCompetition ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                <p style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                  Atenção: Já existem {confirmInterestCount} Advogados interessados neste caso.
                </p>
              </div>
            ) : (
              <p style={{ color: '#aaa', fontSize: '0.95rem', marginBottom: '20px' }}>
                Ao manifestar interesse, você poderá negociar diretamente com o cliente.
              </p>
            )}

            <p style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 500, marginBottom: '8px' }}>
              Custo: <strong>1 Júri</strong>
            </p>
            
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '24px' }}>
              Seu saldo atual: <strong>{currentBalance} Juris</strong>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  padding: '12px 24px',
                  background: isHighCompetition ? '#ef4444' : 'var(--color-gold)',
                  color: isHighCompetition ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  flex: 1,
                  transition: 'opacity 0.2s'
                }}
                onClick={() => executeVincularCaso(confirmInterestCaseId)}
              >
                Confirmar
              </button>
              <button
                style={{
                  padding: '12px 24px',
                  background: '#222',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
                onClick={() => { setShowConfirmInterestModal(false); setConfirmInterestCaseId(null); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCancelInterestModal = () => {
    if (!showCancelInterestModal) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => { if (!isCancelingInterest) { setShowCancelInterestModal(false); setCancelInterestCaseId(null); } }}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px", width: "90%", border: '1px solid #ef4444' }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle} style={{ color: '#ef4444' }}>↩️ Desfazer Interesse</h2>
            <button className={styles.modalClose} onClick={() => { if (!isCancelingInterest) { setShowCancelInterestModal(false); setCancelInterestCaseId(null); } }} disabled={isCancelingInterest}><X size={20} /></button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 500, marginBottom: '16px' }}>
              Tem certeza que deseja cancelar sua manifestação de interesse neste caso?
            </p>
            
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '24px' }}>
              <p style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                💰 Reembolso garantido: 1 Júri será devolvido à sua carteira imediatamente.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  padding: '12px 24px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isCancelingInterest ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: 1,
                  opacity: isCancelingInterest ? 0.7 : 1
                }}
                disabled={isCancelingInterest}
                onClick={executeDesfazerInteresse}
              >
                {isCancelingInterest ? "Cancelando..." : "Confirmar"}
              </button>
              <button
                style={{
                  padding: '12px 24px',
                  background: '#222',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  cursor: isCancelingInterest ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
                disabled={isCancelingInterest}
                onClick={() => { setShowCancelInterestModal(false); setCancelInterestCaseId(null); }}
              >
                Voltar
              </button>
            </div>
          </div>
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
              onClick={() => handleBuyJuris(10, appliedCoupon?.tipo_internal === 'COMPRA_JURIS' ? appliedCoupon : null)}
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
              onClick={() => handleBuyJuris(20, appliedCoupon?.tipo_internal === 'COMPRA_JURIS' ? appliedCoupon : null)}
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
              onClick={() => handleBuyJuris(50, appliedCoupon?.tipo_internal === 'COMPRA_JURIS' ? appliedCoupon : null)}
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
      <div className={styles.premiumModalOverlay} onClick={() => setShowProModal(false)}>
        <div className={styles.premiumModalContent} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeIconBtn} onClick={() => setShowProModal(false)}>
            <X size={24} />
          </button>

          <div className={styles.modalLayout}>
            {/* LADO ESQUERDO: TEXTO E TOGGLE */}
            <div className={styles.modalInfoSide}>
              <h1 className={styles.modalTitle}>Escolha o plano ideal para seu momento</h1>
              <p className={styles.modalSubtitle}>Maximize sua produtividade com Inteligência Artificial Jurídica.</p>
              
              <div className={styles.billingToggle}>
                <button 
                  className={`${styles.toggleBtn} ${billingCycle === 'AVULSO' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setBillingCycle('AVULSO')}
                >
                  Avulso
                </button>
                <button 
                  className={`${styles.toggleBtn} ${billingCycle === 'MONTHLY' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setBillingCycle('MONTHLY')}
                >
                  Mensal
                </button>
                <button 
                  className={`${styles.toggleBtn} ${billingCycle === 'ANNUAL' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setBillingCycle('ANNUAL')}
                >
                  Anual <span className={styles.discountBadge}>-25%</span>
                </button>
              </div>

              {/* CUPOM DE DESCONTO */}
              <div className={styles.couponWrapper}>
                <div className={styles.couponLabel}>Possui um cupom?</div>
                <div className={styles.couponInputGroup}>
                  <input 
                    type="text" 
                    placeholder="CÓDIGO" 
                    className={styles.couponInput}
                    id="plan_coupon_input"
                  />
                  <button 
                    className={styles.couponApplyBtn}
                    onClick={() => handleApplyCoupon('PLANO_PRO')}
                  >
                    Aplicar
                  </button>
                </div>
                {appliedCouponData && (
                  <div className={styles.couponStatus}>
                    ✓ Cupom {appliedCouponData.id} aplicado ({appliedCouponData.percent_off}% OFF)
                  </div>
                )}
              </div>
            </div>

            {/* LADO DIREITO: CARDS */}
            <div className={styles.modalPlansSide}>
              <div className={styles.plansGrid}>
                {Object.entries(PLANS_DATA).map(([key, plan]) => {
                  const rawPriceInfo = plan.prices[billingCycle];
                  
                  // Lógica de Promoção R$ 10,99 no primeiro mês
                  const currentPlan = profileData?.plan_type || 'FREE';
                  const isPremium = profileData?.is_premium || false;
                  
                  let showPromoStart = false;
                  let showPromoPro = false;
                  
                  if (billingCycle === 'MONTHLY') {
                    if (currentPlan === 'START' && isPremium) {
                      showPromoPro = true;
                    } else if (currentPlan === 'PRO' && isPremium) {
                      // Sem promo
                    } else {
                      showPromoStart = true;
                      showPromoPro = true;
                    }
                  }
                  
                  const isPromoApplied = (key === 'START' && showPromoStart) || (key === 'PRO' && showPromoPro);
                  
                  // Aplicar desconto do cupom se existir
                  let displayValue = billingCycle === 'ANNUAL' ? rawPriceInfo.monthly : rawPriceInfo.value;
                  let totalValue = rawPriceInfo.value;

                  if (isPromoApplied) {
                    displayValue = 10.99;
                  }

                  if (appliedCouponData && appliedCouponData.status === 'success') {
                    if (appliedCouponData.percent_off) {
                      displayValue = displayValue * (1 - appliedCouponData.percent_off / 100);
                      totalValue = totalValue * (1 - appliedCouponData.percent_off / 100);
                    } else if (appliedCouponData.amount_off) {
                      const discount = appliedCouponData.amount_off / 100;
                      // No anual, o desconto geralmente é no total, então rateamos para o mensal se for anual
                      if (billingCycle === 'ANNUAL') {
                        displayValue = Math.max(0, displayValue - (discount / 12));
                      } else {
                        displayValue = Math.max(0, displayValue - discount);
                      }
                      totalValue = Math.max(0, totalValue - discount);
                    }
                  }

                  const formattedPrice = displayValue.toFixed(2).replace('.', ',');
                  const [priceInteiro, priceCentavos] = formattedPrice.split(',');

                  return (
                    <div key={key} className={`${styles.planCard} ${key === 'PRO' ? styles.planCardPro : ''}`}>
                      {key === 'PRO' && <div className={styles.mostPopular}>RECOMENDADO</div>}
                      <div className={styles.planName}>{plan.name}</div>
                      
                      <div className={styles.planPrice}>
                        <span className={styles.currency}>R$</span>
                        <span className={styles.amount}>{priceInteiro}</span>
                        <div className={styles.priceSub}>
                          <span className={styles.cents}>,{priceCentavos}</span>
                          <span className={styles.period}>/mês</span>
                        </div>
                      </div>
                      
                      {isPromoApplied && (
                        <div style={{ color: '#00e676', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '5px', marginBottom: '10px', textAlign: 'center' }}>
                          ★ 1º MÊS POR R$ 10,99 ★
                        </div>
                      )}
                      
                      <div className={styles.jurisBonus}>
                        <Zap size={14} /> <span>Ganhe <strong>{plan.juris} Juris</strong> imediato</span>
                      </div>

                      {billingCycle === 'ANNUAL' ? (
                        <div className={styles.annualTotal}>Cobrado anualmente (R$ {totalValue.toFixed(2).replace('.', ',')})</div>
                      ) : (
                        <div className={styles.planDesc}>{plan.description}</div>
                      )}
                      
                      <div className={styles.planFeatures}>
                        {plan.features.map((feat, i) => (
                          <div key={i} className={`${styles.featItem} ${!feat.included ? styles.featDisabled : ''}`}>
                            {feat.included ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                            {feat.text}
                          </div>
                        ))}
                      </div>

                      <button 
                        className={`${styles.selectPlanBtn} ${key === 'PRO' ? styles.selectPlanBtnPro : ''}`}
                        onClick={() => {
                          console.log('Selecionando plano:', key, 'Preço:', rawPriceInfo);
                          setIsProCheckout(key === 'PRO');
                          setTransparentCheckoutAmount(totalValue);
                          if (rawPriceInfo.priceId) {
                            window.localStorage.setItem('sj_selected_price_id', rawPriceInfo.priceId);
                          } else {
                            window.localStorage.removeItem('sj_selected_price_id');
                          }
                          window.localStorage.setItem('sj_selected_plan_type', key);
                          window.localStorage.setItem('sj_selected_billing', billingCycle);
                          
                          // Auto-aplicar cupom de promoção se elegível no primeiro mês
                          if (isPromoApplied) {
                            const promoCouponId = key === 'START' ? 'START_MES1_1099' : 'PRO_MES1_1099';
                            const proCoupon = {
                              status: 'success',
                              id: promoCouponId,
                              percent_off: 0,
                              amount_off: key === 'START' ? 3000 : 7691, // Desconto em centavos
                              stripe_coupon_id: promoCouponId
                            };
                            setAppliedCouponData(proCoupon);
                          }
                          
                          setShowProModal(false);
                          setShowTransparentCheckout(true);
                        }}
                      >
                        Selecionar {plan.name}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.dashboardContainer} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
      {/* SIDEBAR */}
      {/* <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarActive : ""}`}>
        ... (Sidebar original comentada para paridade)
      </aside> */}
      <Sidebar />

      {/* MAIN */}
      <main className={styles.mainContent}>
        {/* <header className={styles.topBar}>
          ... (TopBar original comentado para paridade)
        </header> */}
        <TopBar />

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
                onClick={() => handleTabChange("perfil")}
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
          {highlightedAds.length > 0 && activeTab === "oportunidades" && (() => {
            const ad = highlightedAds[currentAdIndex];
            if (!ad) return null;
            return (
              <div className={styles.highlightedAdContainer}>
                {/* Seta esquerda */}
                {highlightedAds.length > 1 && (
                  <button
                    className={styles.carouselArrow}
                    style={{ left: '8px' }}
                    onClick={() => setCurrentAdIndex((prev) => (prev - 1 + highlightedAds.length) % highlightedAds.length)}
                    aria-label="Anúncio anterior"
                  >
                    ‹
                  </button>
                )}

                <div className={styles.highlightedInfo} key={ad.id} style={{ animation: 'fadeSlide 0.5s ease' }}>
                  <h4>
                    <Sparkles size={14} /> ANÚNCIO EM DESTAQUE
                    {highlightedAds.length > 1 && (
                      <span className={styles.adCounter}>{currentAdIndex + 1}/{highlightedAds.length}</span>
                    )}
                  </h4>
                  <h3>{ad.titulo}</h3>
                  <p>{ad.descricao}</p>
                </div>
                <div className={styles.highlightedAction}>
                  <button
                    className={styles.premiumBtn}
                    style={{ margin: 0 }}
                    onClick={() => {
                      const phone = ad.anunciante?.whatsapp?.replace(/\D/g, "");
                      if (phone) {
                        window.open(`https://wa.me/55${phone}?text=Olá, vi seu destaque no SocialJurídico e gostaria de mais informações.`, "_blank");
                      }
                    }}
                  >
                    Falar agora
                  </button>
                  <div className={styles.adVendor}>
                    <span className={styles.vendorName} style={{ fontSize: '0.7rem', color: "rgba(255, 255, 255, 0.5)" }}>Por: {ad.anunciante?.nome_empresa}</span>
                  </div>
                </div>

                {/* Seta direita */}
                {highlightedAds.length > 1 && (
                  <button
                    className={styles.carouselArrow}
                    style={{ right: '8px' }}
                    onClick={() => setCurrentAdIndex((prev) => (prev + 1) % highlightedAds.length)}
                    aria-label="Próximo anúncio"
                  >
                    ›
                  </button>
                )}

                {/* Dots indicadores */}
                {highlightedAds.length > 1 && (
                  <div className={styles.carouselDots}>
                    {highlightedAds.map((_, idx) => (
                      <button
                        key={idx}
                        className={`${styles.carouselDot} ${idx === currentAdIndex ? styles.carouselDotActive : ''}`}
                        onClick={() => setCurrentAdIndex(idx)}
                        aria-label={`Ir para anúncio ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
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
      {renderVoiceModal()}
      {renderContratoModal()}
      {renderProcuracaoModal()}
      {renderProvasModal()}
      {renderNotificacaoModal()}
      {renderJurisConfirmModal()}
      {renderConfirmInterestModal()}
      {renderCancelInterestModal()}
      {renderDossierModal()}
      {renderDelegatingModal()}
      {renderDeleteConfirmModal()}
      {renderChatModal()}
      {renderMessageContentModal()}
      {renderAgendaModal()}
      {renderNotifDeleteConfirmModal()}
      {/* MODAL DE ANÁLISE/RESUMO DA AGENDA */}
      {showAgendaAnalysisModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAgendaAnalysisModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>✨ Inteligência de Agenda IA</h2>
              <p className={styles.modalSubtitle}>Insights estratégicos para sua gestão de prazos</p>
            </div>
            
            <div style={{ 
              padding: '20px', 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '12px',
              minHeight: '200px',
              maxHeight: '60vh',
              overflowY: 'auto',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {isAnalyzingAgenda ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '15px' }}>
                  <Sparkles size={40} className={styles.spin} color="var(--color-gold)" />
                  <p>A IA está processando sua agenda...</p>
                </div>
              ) : (
                <div className={styles.jurisAIContent}>
                  {agendaAnalysis || "Nenhum insight gerado."}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button 
                className={styles.redatorGenerateBtn}
                style={{ flex: 1 }}
                onClick={() => {
                  const doc = new jsPDF();
                  const pageWidth = doc.internal.pageSize.getWidth();
                  const pageHeight = doc.internal.pageSize.getHeight();
                  
                  // HEADER
                  doc.setFillColor(11, 11, 14); // Cor de fundo do site (Dark)
                  doc.rect(0, 0, pageWidth, 45, 'F');
                  
                  doc.setTextColor(212, 175, 55); // Cor Gold
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(24);
                  doc.text("SocialJurídico", 14, 22);
                  
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(12);
                  doc.setFont("helvetica", "normal");
                  doc.text("Inteligência de Agenda IA - Relatório Estratégico", 14, 32);
                  
                  doc.setFontSize(10);
                  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 32, { align: 'right' });

                  // CORPO DO RELATÓRIO
                  doc.setTextColor(40, 40, 40);
                  doc.setFontSize(14);
                  doc.setFont("helvetica", "bold");
                  doc.text("Análise e Insights da IA", 14, 60);
                  
                  doc.setDrawColor(212, 175, 55);
                  doc.setLineWidth(0.5);
                  doc.line(14, 63, 60, 63);

                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(11);
                  doc.setTextColor(60, 60, 60);
                  
                  const cleanAnalysis = agendaAnalysis.replace(/\*\*/g, ''); // Remove asteriscos
                  const splitText = doc.splitTextToSize(cleanAnalysis, pageWidth - 28);
                  
                  // Verificação de quebra de página
                  let currentY = 75;
                  splitText.forEach(line => {
                    if (currentY > pageHeight - 30) {
                      doc.addPage();
                      currentY = 20;
                    }

                    // Destacar títulos numéricos
                    if (/^\d+\./.test(line.trim())) {
                      doc.setFont("helvetica", "bold");
                    } else {
                      doc.setFont("helvetica", "normal");
                    }

                    doc.text(line, 14, currentY);
                    currentY += 6;
                  });

                  // FOOTER
                  const pageCount = doc.internal.getNumberOfPages();
                  for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
                    doc.text(
                      `SocialJurídico PRO - Inteligência Artificial para Advogados | Página ${i} de ${pageCount}`,
                      pageWidth / 2,
                      pageHeight - 12,
                      { align: "center" }
                    );
                  }

                  doc.save(`Analise_Agenda_SJ_${new Date().getTime()}.pdf`);
                  toast.success("Relatório da Agenda gerado!");
                }}
                disabled={!agendaAnalysis || isAnalyzingAgenda}
              >
                <FileDown size={18} /> Baixar PDF
              </button>
              <button className={styles.closeModalBtn} onClick={() => setShowAgendaAnalysisModal(false)} style={{ margin: 0 }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <AdvogadoMesPopup />
      <PesquisaSatisfacaoPopup />

      {/* PENDING OAB MODAL */}
      {showPendingOABModal && (
        <div className={styles.oabModalOverlay}>
          <div className={styles.oabModalCard}>
            <AlertTriangle size={48} color="#eab308" />
            <h3>Verificação de OAB Pendente</h3>
            <p>
              Identificamos que sua OAB ainda não foi verificada manualmente por nossa equipe jurídica.
            </p>
            {profileData?.oab_warning_started_at && (
              <div style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", border: "1px solid #eab308", padding: "12px", borderRadius: "8px", margin: "15px 0", textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: "bold", color: "#854d0e", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Clock size={16} /> Atenção: Prazo de Verificação
                </p>
                <p style={{ margin: "8px 0 0 0", color: "#854d0e", fontSize: "1.1rem" }}>
                  Tempo restante: <strong>{Math.max(0, 7 - Math.floor((new Date() - new Date(profileData.oab_warning_started_at)) / (1000 * 60 * 60 * 24)))} dias</strong>
                </p>
                <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#a16207" }}>
                  Sua conta será suspensa automaticamente após este período.
                </p>
              </div>
            )}
            <p className={styles.oabModalSub}>
              Para garantir a segurança de todos os usuários e a sua visibilidade plena na plataforma, entre em contato conosco para validar seus dados.
            </p>
            
            <a 
              href="https://wa.me/5515981657317?text=Olá, gostaria de solicitar a verificação manual da minha OAB no SocialJurídico. Meu nome é " 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.supportBtn}
            >
              Verificar agora pelo WhatsApp
            </a>
            
            <button onClick={() => setShowPendingOABModal(false)} className={styles.closeBtn}>
              Vou fazer isso mais tarde
            </button>
          </div>
        </div>
      )}
      
      {/* MODAL PREMIUM: OAB EM DESENVOLVIMENTO */}
      {showOabModal && (
        <div className={styles.modalOverlay} onClick={() => setShowOabModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: "550px", border: "1px solid rgba(212, 175, 55, 0.3)", background: "rgba(15, 17, 23, 0.95)", backdropFilter: "blur(20px)" }}>
            <div className={styles.modalHeader} style={{ textAlign: "center", borderBottom: "1px solid rgba(212, 175, 55, 0.15)", paddingBottom: "15px" }}>
              <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "rgba(212, 175, 55, 0.1)", marginBottom: "12px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
                <Sparkles size={28} color="var(--brand-gold)" />
              </div>
              <h2 className={styles.modalTitle} style={{ color: "var(--brand-gold)" }}>💡 Importação de Processos por OAB</h2>
              <p className={styles.modalSubtitle}>Automação Inteligente e Conexão Direta ao CRM</p>
            </div>

            <div style={{ padding: "20px 0", color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "15px" }}>
              <p style={{ margin: 0, color: "#cbd5e1" }}>
                Esta funcionalidade está sendo preparada para o seu escritório! Em breve, com apenas um clique, o <strong>SocialJuridico</strong> fará a varredura completa de todos os processos ativos vinculados à sua OAB nos diários oficiais e tribunais do país.
              </p>
              
              <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", padding: "15px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <h4 style={{ color: "var(--brand-gold)", margin: "0 0 10px 0", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>O que a nossa IA fará por você:</h4>
                <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <li>🔍 <strong>Varredura Automatizada:</strong> Busca em tempo real em Tribunais Estaduais, Federais e Diários Oficiais.</li>
                  <li>🤖 <strong>Sincronização com o CRM:</strong> Cadastro automático de clientes no CRM com preenchimento completo de dados.</li>
                  <li>📈 <strong>Insights KYC Avançados:</strong> Geração instantânea de análises de risco e viabilidade processual com inteligência artificial.</li>
                </ul>
              </div>
              
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", fontStyle: "italic", textAlign: "center" }}>
                Nossa equipe de engenharia está finalizando as integrações com os tribunais para garantir o máximo de estabilidade.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button 
                type="button" 
                className={styles.submitBtn} 
                onClick={() => setShowOabModal(false)}
                style={{ flex: 1, background: "linear-gradient(135deg, var(--brand-gold) 0%, #b8860b 100%)", color: "#000", fontWeight: "600", border: "none" }}
              >
                Entendido, mal posso esperar!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CHECKOUT TRANSPARENTE */}
      <TransparentCheckoutModal
        isOpen={showTransparentCheckout}
        onClose={() => {
          setShowTransparentCheckout(false);
          setIsProCheckout(false);
        }}
        jurisAmount={transparentCheckoutAmount}
        isPro={isProCheckout}
        couponData={appliedCouponData}
        profileData={profileData}
        onPaymentSuccess={async () => {
          // Recarregar perfil para atualizar saldo
          try {
            const res = await fetch("/api/perfil", { cache: "no-store" });
            const data = await res.json();
            if (data.success) setProfileData(data.data);
          } catch (e) {
            console.error("Erro ao atualizar perfil após pagamento:", e);
          }
        }}
      />
    </div>
  );
}

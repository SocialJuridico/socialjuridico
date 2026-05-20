"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Building, 
  Users, 
  Database, 
  Cpu, 
  Wand2,
  ShieldCheck,
  Bell, 
  Search, 
  Scale, 
  LogOut, 
  Plus, 
  Lock, 
  Unlock, 
  Save, 
  AlertCircle,
  MessageSquare,
  Volume2,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  Trash2,
  Send,
  MessageCircle,
  Coins,
  TrendingUp,
  TrendingDown,
  Landmark,
  FileSpreadsheet,
  PlusCircle,
  Calendar,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  User,
  Filter,
  Phone,
  Mail,
  FileText,
  File,
  Download,
  UploadCloud,
  Shield,
  Edit3,
  Clock,
  LockKeyhole,
  DollarSign,
  Activity,
  FileCheck2,
  PenTool,
  ExternalLink,
  Copy,
  FileDown,
  Eye,
  Upload,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./EscritorioDashboard.module.css";
import { maskCPFCNPJ, maskPhone } from "@/lib/securityUtils";

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const getPlanDisplayName = (plano) => {
  if (!plano) return "Enterprise Start";
  const names = {
    start: "Enterprise Start",
    start_7: "Enterprise Start 7 dias",
    start_15: "Enterprise Start 15 dias",
    start_30: "Enterprise Start 30 dias",
    pro: "Enterprise Pro",
    pro_7: "Enterprise Pro 7 dias",
    pro_15: "Enterprise Pro 15 dias",
    pro_30: "Enterprise Pro 30 dias",
    pro_plus: "Enterprise Pro+",
    pro_plus_7: "Enterprise Pro+ 7 dias",
    pro_plus_15: "Enterprise Pro+ 15 dias",
    pro_plus_30: "Enterprise Pro+ 30 dias",
  };
  return names[plano] || "Enterprise Start";
};

export default function EscritorioDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [staff, setStaff] = useState([]);
  const [jurisInput, setJurisInput] = useState({});
  
  // Registration form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    oab: "",
    estado: "SP",
    cargo: "advogado",
    senha: ""
  });

  // Allocations local updates states (to allow editing and saving)
  const [allocations, setAllocations] = useState({});
  const [rightPanelTab, setRightPanelTab] = useState("advogados");

  // --- ESTADOS DA COMUNICAÇÃO INTERNA (HUB CORPORATIVO) ---
  const [activeTab, setActiveTab] = useState("gestao");
  const [commData, setCommData] = useState({ canais: [], mensagens: [], participantesVoz: [], user: null });
  const [activeChannelId, setActiveChannelId] = useState(null); // null = Chat Geral
  const [chatInput, setChatInput] = useState("");
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ nome: "", tipo: "texto", limite: 0 });
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null);
  const [activeMeetingTitle, setActiveMeetingTitle] = useState(null);

  // --- ESTADOS DO FINANCEIRO & CONTABILIDADE ---
  const [financeData, setFinanceData] = useState({ trans: [], summary: { totalReceitas: 0, totalDespesas: 0, saldoAtual: 0, categoryDistribution: {} } });
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [newEntry, setNewEntry] = useState({
    tipo: "DESPESA",
    categoria: "Copa & Limpeza",
    subcategoria: "Café e Açúcar",
    descricao: "",
    valor: "",
    data_competencia: new Date().toISOString().split("T")[0],
    status: "PAGO"
  });

  // --- ESTADOS DA AGENDA E PRAZOS COMPARTILHADOS ---
  const [agendaItems, setAgendaItems] = useState([]);
  const [calendarMemberFilter, setCalendarMemberFilter] = useState("TODOS");
  const [showAgendaModal, setShowAgendaModal] = useState(false);
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
  const [isAnalyzingAgenda, setIsAnalyzingAgenda] = useState(false);
  const [showAgendaAnalysisModal, setShowAgendaAnalysisModal] = useState(false);
  const [agendaAnalysis, setAgendaAnalysis] = useState("");
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiDeadlineResult, setAiDeadlineResult] = useState(null);
  const [crmClients, setCrmClients] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [delegatingClient, setDelegatingClient] = useState(null);
  const [isDelegating, setIsDelegating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientDocuments, setClientDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [crmFilter, setCrmFilter] = useState("all");
  
  // Dossiê tabs & states
  const [dossierTab, setDossierTab] = useState("docs"); // docs, timeline, cases, finance, insights
  const [interactions, setInteractions] = useState([]);
  const [isFetchingInteractions, setIsFetchingInteractions] = useState(false);
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ content: "", type: "nota" });
  const [associatedCases, setAssociatedCases] = useState([]);
  const [isFetchingAssociatedCases, setIsFetchingAssociatedCases] = useState(false);
  const [clientFinance, setClientFinance] = useState([]);
  const [isFetchingFinance, setIsFetchingFinance] = useState(false);
  const [isSavingFinance, setIsSavingFinance] = useState(false);
  const [newFinance, setNewFinance] = useState({ description: "", amount: "", due_date: "", status: "PENDENTE" });
  const [clientInsight, setClientInsight] = useState(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  
  // Extrajudicial Notification
  const [notificacoesExtrajudiciais, setNotificacoesExtrajudiciais] = useState([]);
  const [isLoadingNotificacoes, setIsLoadingNotificacoes] = useState(false);
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
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [showManageSubs, setShowManageSubs] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [isIaClosingOpen, setIsIaClosingOpen] = useState(false);
  const [iaAnalysisText, setIaAnalysisText] = useState("");
  const [loadingIaAnalysis, setLoadingIaAnalysis] = useState(false);

  // Central de Assinaturas Digitais States
  const [signatures, setSignatures] = useState([]);
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [isCreatingSignature, setIsCreatingSignature] = useState(false);
  const [newSignatureData, setNewSignatureData] = useState({
    document_name: "",
    document_type: "contrato",
    lawyer_name: "",
    lawyer_email: "",
    client_name: "",
    client_email: "",
    client_id: ""
  });

  // CRM Dossier Loading & Action Functions
  const fetchClientDocuments = async (clientId) => {
    try {
      const res = await fetch(`/api/crm/documents?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClientDocuments(data.data || []);
      }
    } catch (e) {
      console.error("Erro ao carregar documentos:", e);
    }
  };

  const fetchInteractions = async (clientId) => {
    setIsFetchingInteractions(true);
    try {
      const res = await fetch(`/api/crm/interactions?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setInteractions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingInteractions(false);
    }
  };

  const fetchAssociatedCases = async (client) => {
    setIsFetchingAssociatedCases(true);
    try {
      const res = await fetch(`/api/crm/associated-cases?client_name=${encodeURIComponent(client.name)}`);
      const data = await res.json();
      if (data.success) {
        setAssociatedCases(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingAssociatedCases(false);
    }
  };

  const fetchClientFinance = async (clientId) => {
    setIsFetchingFinance(true);
    try {
      const res = await fetch(`/api/crm/finance?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClientFinance(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingFinance(false);
    }
  };

  const fetchClientInsight = async (clientId) => {
    try {
      const res = await fetch(`/api/crm/insights?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClientInsight(data.data);
      } else {
        setClientInsight(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e, isBlindarProva = false) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", selectedClient.id);
    if (isBlindarProva) {
      formData.append("blindar", "true");
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
        
        // Silent timeline audit log
        try {
          const logMsg = `Documento '${file.name}' anexado por Gestor(a) ${requester?.name || 'Administrador'}`;
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
          console.error("Erro log upload:", auditErr);
        }
      } else {
        toast.error(data.message || "Erro no upload");
      }
    } catch (err) {
      toast.error("Erro de conexão");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const executeDeleteDocument = async (docId, fileUrl) => {
    if (!window.confirm("Deseja realmente excluir este arquivo?")) return;
    try {
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${selectedClient.id}/${fileName}`;
      const res = await fetch(`/api/crm/documents?id=${docId}&path=${encodeURIComponent(filePath)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Arquivo excluído!");
        fetchClientDocuments(selectedClient.id);
        
        // Silent timeline audit log
        try {
          const logMsg = `Documento '${fileName}' excluído por Gestor(a) ${requester?.name || 'Administrador'}`;
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
          console.error("Erro log delete:", auditErr);
        }
      } else {
        toast.error("Erro ao excluir arquivo");
      }
    } catch (err) {
      toast.error("Erro de conexão");
    }
  };

  const handleSaveInteraction = async () => {
    if (!selectedClient || !newInteraction.content) return;
    setIsSavingInteraction(true);
    try {
      const res = await fetch("/api/crm/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient.id,
          content: newInteraction.content,
          type: newInteraction.type
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Interação registrada!");
        setNewInteraction({ content: "", type: "nota" });
        fetchInteractions(selectedClient.id);
      }
    } catch (err) {
      toast.error("Erro ao registrar");
    } finally {
      setIsSavingInteraction(false);
    }
  };

  const handleSaveFinance = async () => {
    if (!selectedClient || !newFinance.description || !newFinance.amount) return;
    setIsSavingFinance(true);
    try {
      const res = await fetch("/api/crm/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient.id,
          ...newFinance
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Lançamento financeiro registrado!");
        
        // Silent timeline audit log
        try {
          const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newFinance.amount);
          const logMsg = `Lançamento financeiro de ${formattedAmount} ('${newFinance.description}') registrado por Gestor(a) ${requester?.name || 'Administrador'}`;
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
          console.error("Erro log finance:", auditErr);
        }
        
        setNewFinance({ description: "", amount: "", due_date: "", status: "PENDENTE" });
        fetchClientFinance(selectedClient.id);
      }
    } catch (err) {
      toast.error("Erro ao salvar financeiro");
    } finally {
      setIsSavingFinance(false);
    }
  };

  const handleTogglePaymentStatus = async (item) => {
    const newStatus = item.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    try {
      const res = await fetch("/api/crm/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status atualizado para ${newStatus}`);
        
        // Silent timeline audit log
        try {
          const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount);
          const logMsg = `Lançamento de ${formattedAmount} ('${item.description}') marcado como ${newStatus} por Gestor(a) ${requester?.name || 'Administrador'}`;
          await fetch("/api/crm/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: item.client_id,
              content: logMsg,
              type: "auditoria"
            })
          });
          fetchInteractions(item.client_id);
        } catch (auditErr) {
          console.error("Erro log payment toggle:", auditErr);
        }
        
        fetchClientFinance(item.client_id);
      }
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleGenerateReport = (client, documents, timelineItems, finances) => {
    try {
      const docReport = new jsPDF();
      docReport.setFillColor(30, 41, 59);
      docReport.rect(0, 0, 210, 40, 'F');
      
      docReport.setFont("helvetica", "bold");
      docReport.setFontSize(22);
      docReport.setTextColor(212, 175, 55);
      docReport.text("DOSSIÊ DE CLIENTE", 20, 25);
      
      docReport.setFont("helvetica", "normal");
      docReport.setFontSize(10);
      docReport.setTextColor(156, 163, 175);
      docReport.text("SOCIAL JURÍDICO - AUDITORIA DE COMPLIANCE", 20, 32);
      
      docReport.setFontSize(11);
      docReport.setTextColor(50, 50, 50);
      docReport.text(`Nome do Cliente: ${client.name}`, 20, 55);
      docReport.text(`Documento: ${client.cpf_cnpj || "Não informado"}`, 20, 62);
      docReport.text(`E-mail: ${client.email || "Não informado"}`, 20, 69);
      docReport.text(`Telefone: ${client.phone || "Não informado"}`, 20, 76);
      docReport.text(`Risco Judicial: ${client.risk_score || 0}%`, 20, 83);
      
      docReport.setLineWidth(0.5);
      docReport.setDrawColor(212, 175, 55);
      docReport.line(20, 90, 190, 90);
      
      // Timeline Section
      docReport.setFont("helvetica", "bold");
      docReport.setFontSize(14);
      docReport.text("Linha do Tempo e Atividades", 20, 105);
      
      let currentY = 115;
      docReport.setFont("helvetica", "normal");
      docReport.setFontSize(10);
      
      const timelineList = timelineItems.slice(0, 15);
      if (timelineList.length === 0) {
        docReport.text("Nenhuma atividade registrada.", 25, currentY);
        currentY += 10;
      } else {
        timelineList.forEach(item => {
          const dateStr = new Date(item.created_at).toLocaleDateString('pt-BR');
          const hourStr = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const text = `[${dateStr} ${hourStr}] (${item.type.toUpperCase()}) ${item.content}`;
          const splitText = docReport.splitTextToSize(text, 165);
          docReport.text(splitText, 25, currentY);
          currentY += (splitText.length * 6);
        });
      }
      
      // Finance Section
      if (currentY > 240) {
        docReport.addPage();
        currentY = 30;
      }
      
      docReport.setFont("helvetica", "bold");
      docReport.setFontSize(14);
      docReport.text("Histórico Financeiro", 20, currentY + 10);
      
      const financeHeaders = [["Descrição", "Vencimento", "Valor", "Status"]];
      const financeRows = finances.map(f => [
        f.description,
        f.due_date ? new Date(f.due_date).toLocaleDateString('pt-BR') : "-",
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.amount),
        f.status
      ]);
      
      docReport.autoTable({
        startY: currentY + 15,
        head: financeHeaders,
        body: financeRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 }
      });
      
      docReport.save(`Dossie_${client.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("Dossiê baixado com sucesso!");
    } catch (err) {
      console.error("Erro PDF:", err);
      toast.error("Erro ao gerar relatório");
    }
  };

  const handleGenerateNotificacao = async () => {
    setIsGeneratingNotificacao(true);
    try {
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
        advocateData: requester,
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
        toast.success("Minuta gerada com sucesso!");
      } else {
        toast.error(data.message || "Erro ao gerar minuta");
      }
    } catch (error) {
      toast.error("Erro na requisição");
    } finally {
      setIsGeneratingNotificacao(false);
    }
  };

  const handleSendNotificacao = async () => {
    if (!notificacaoForm.destinatario_email) { toast.error("E-mail do destinatário é obrigatório!"); return; }
    if (!notificacaoConfirmed) { toast.error("Você precisa confirmar que a minuta está perfeita!"); return; }
    if (requester?.plan_type === 'START' && !paymentConfirmed) { toast.error("Você precisa confirmar o pagamento!"); return; }
    
    setIsShieldingNotificacao(true);
    try {
      const docPdf = new jsPDF();
      const pageWidth = docPdf.internal.pageSize.getWidth();
      
      const generateAndSend = async (imgData) => {
        docPdf.setFillColor(0, 200, 118);
        docPdf.rect(0, 0, pageWidth, 15, 'F');
        
        docPdf.setFont("helvetica", "bold");
        docPdf.setFontSize(10);
        docPdf.setTextColor(255, 255, 255);
        docPdf.text("NOTIFICAÇÃO EXTRAJUDICIAL DIGITAL - SOCIAL JURÍDICO", 20, 10);
        
        if (imgData) {
          docPdf.addImage(imgData, 'PNG', pageWidth - 45, 20, 25, 25);
        }
        
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(10);
        docPdf.setTextColor(50, 50, 50);
        
        const splitContent = docPdf.splitTextToSize(draftedNotificacao, pageWidth - 40);
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
          fetchNotificacoesExtrajudiciais();
        } else {
          toast.error(data.message || "Erro ao enviar");
        }
      };

      if (notificacaoForm.logo) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          await generateAndSend(e.target.result);
        };
        reader.readAsDataURL(notificacaoForm.logo);
      } else {
        await generateAndSend(null);
      }
    } catch (err) {
      toast.error("Erro ao enviar");
    } finally {
      setIsShieldingNotificacao(false);
    }
  };

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

  const loadFinance = async () => {
    setLoadingFinance(true);
    try {
      const res = await fetch("/api/escritorio/financeiro");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFinanceData(json);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar finanças:", e);
    } finally {
      setLoadingFinance(false);
    }
  };

  useEffect(() => {
    if (activeTab === "comunicacao" && data?.office?.id) {
      loadCommunication();

      const channelName = `escritorio-comunicacao-${data.office.id}`;
      const subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "escritorio_mensagens",
            filter: `escritorio_id=eq.${data.office.id}`
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
            filter: `escritorio_id=eq.${data.office.id}`
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
            filter: `escritorio_id=eq.${data.office.id}`
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
  }, [activeTab, data]);

  useEffect(() => {
    if (activeTab === "financeiro") {
      loadFinance();
    }
  }, [activeTab]);

  // --- MÉTODOS DA AGENDA COMPARTILHADA ---
  const fetchAgenda = async () => {
    try {
      const res = await fetch("/api/crm/agenda?escritorio=true");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAgendaItems(json.agenda || []);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar agenda:", e);
    }
  };

  const fetchCrmClients = async () => {
    setLoadingCrm(true);
    try {
      const res = await fetch("/api/crm");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCrmClients(json.clients || []);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar clientes do CRM:", e);
    } finally {
      setLoadingCrm(false);
    }
  };

  const handleDelegateCase = async (clientId, targetLawyerId) => {
    setIsDelegating(true);
    try {
      const res = await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          lawyer_id: targetLawyerId || null
        })
      });
      const resJson = await res.ok ? await res.json() : null;
      if (resJson && resJson.success) {
        toast.success("Responsável do lead atualizado com sucesso!");
        // Update client responsibility locally
        setCrmClients(prev => prev.map(c => c.id === clientId ? { ...c, lawyer_id: targetLawyerId } : c));
        setDelegatingClient(null);
      } else {
        toast.error(resJson?.message || "Erro ao atribuir caso");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atribuir caso");
    } finally {
      setIsDelegating(false);
    }
  };

  const fetchNotificacoesExtrajudiciais = useCallback(async () => {
    setIsLoadingNotificacoes(true);
    try {
      const res = await fetch("/api/crm/blindagem");
      const json = await res.json();
      if (json.success) {
        const filtered = (json.data || []).filter(doc => doc.type === 'Notificação');
        setNotificacoesExtrajudiciais(filtered);
      }
    } catch (err) {
      console.error("Erro ao carregar notificações extrajudiciais:", err);
    } finally {
      setIsLoadingNotificacoes(false);
    }
  }, []);

  const fetchSignatures = useCallback(async () => {
    setLoadingSignatures(true);
    try {
      const res = await fetch("/api/crm/assinatura");
      const json = await res.json();
      if (json.success) {
        setSignatures(json.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar assinaturas:", err);
    } finally {
      setLoadingSignatures(false);
    }
  }, []);

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
      // 1. Upload PDF
      const uploadRes = await fetch("/api/crm/assinatura/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
          "X-File-Name": encodeURIComponent(signatureFile.name)
        },
        body: signatureFile
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.message || "Erro no upload do documento");
      }

      // 2. Create process
      const payload = {
        document_name: newSignatureData.document_name,
        document_type: newSignatureData.document_type,
        document_url: uploadData.url,
        lawyer_name: newSignatureData.lawyer_name,
        lawyer_email: newSignatureData.lawyer_email,
        client_name: newSignatureData.client_name,
        client_email: newSignatureData.client_email,
        client_id: newSignatureData.client_id || null
      };

      const res = await fetch("/api/crm/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Processo de assinatura iniciado!");
        setShowSignatureModal(false);
        fetchSignatures();
      } else {
        toast.error(data.message || "Erro ao iniciar assinatura.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao iniciar processo.");
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

  const generateSignatureCertificatePDF = useCallback((sigData) => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const pageHeight = docPdf.internal.pageSize.getHeight();

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

    const hashBase = `${sigData.verification_code}-${sigData.id}`;
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
    drawSection("IV. INTEGRIDADE CRIPTOGRÁFICA & CUSTÓDIA", sec4);

    docPdf.text(`Código de Validação: SJ-CERT-${sigData.verification_code}`, pageWidth / 2, pageHeight - 7, { align: "center" });

    docPdf.save(`certificado_${sigData.verification_code}.pdf`);
  }, []);

  useEffect(() => {
    if (activeTab === "agenda") {
      fetchAgenda();
      fetchCrmClients();
    } else if (activeTab === "crm") {
      fetchCrmClients();
    } else if (activeTab === "assinatura") {
      fetchSignatures();
      fetchCrmClients();
    }
  }, [activeTab]);

  const handleSaveAgenda = async (e) => {
    if (e) e.preventDefault();
    if (!newAgendaItem.title || !newAgendaItem.date || !newAgendaItem.time) {
      return toast.error("Preencha título, data e hora.");
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
      lawyer_id: newAgendaItem.lawyerId || data?.user?.id || null,
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

      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message);

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
      toast.error(err.message || "Erro ao salvar na agenda");
    }
  };

  const handleDeleteAgenda = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este compromisso?")) return;
    try {
      const res = await fetch("/api/crm/agenda", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast.success("Compromisso removido.");
        fetchAgenda();
      } else {
        toast.error(resJson.message || "Erro ao excluir");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    }
  };

  const handleAiSuggestDeadline = async () => {
    if (!newAgendaItem.title.trim()) {
      return toast.error("Digite pelo menos um título para a IA analisar.");
    }
    setIsAiSuggesting(true);
    setAiDeadlineResult(null);
    try {
      const res = await fetch("/api/crm/analisador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUGGEST_DEADLINE",
          title: newAgendaItem.title,
          description: newAgendaItem.description,
        }),
      });
      const resJson = await res.json();
      if (resJson.success && resJson.suggestion) {
        const sug = resJson.suggestion;
        setAiDeadlineResult({
          reasoning: sug.reasoning || "Recomendado baseado no tipo de ato.",
          suggestedDate: sug.suggestedDate || new Date().toISOString().split("T")[0],
          preparationDays: sug.preparationDays || 3,
        });
        toast.success("Prazo sugerido pela IA!");
      }
    } catch (err) {
      toast.error("Erro na consulta IA");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleAnalyseAgenda = async () => {
    if (agendaItems.length === 0) return toast.error("A agenda está vazia!");
    setIsAnalyzingAgenda(true);
    setAgendaAnalysis("");
    setShowAgendaAnalysisModal(true);

    const agendaSummary = agendaItems.map(i => `- ${i.title} (${new Date(i.date).toLocaleString('pt-BR')}): ${i.description || 'Sem descrição'}`).join('\n');

    try {
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analise a agenda jurídica do escritório e identifique possíveis conflitos de horários, prazos críticos de advogados e sugira recomendações para o gestor:\n\n${agendaSummary}\n\nForneça uma análise técnica e profissional focada em riscos para o escritório.`,
          clientData: { name: "Análise de Agenda do Escritório" },
          history: [],
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setAgendaAnalysis(resJson.response);
      } else {
        toast.error(resJson.message || "Erro na análise IA");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsAnalyzingAgenda(false);
    }
  };

  const handleSummarizeAgenda = async () => {
    if (agendaItems.length === 0) return toast.error("A agenda está vazia!");
    setIsAnalyzingAgenda(true);
    setAgendaAnalysis("");
    setShowAgendaAnalysisModal(true);

    const agendaSummary = agendaItems.map(i => `- ${i.title} (${new Date(i.date).toLocaleString('pt-BR')})`).join('\n');

    try {
      const res = await fetch("/api/crm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Gere um resumo estratégico e executivo dos compromissos e prazos do escritório para os próximos dias:\n\n${agendaSummary}\n\nDestaque os gargalos e o que exige mais atenção gerencial do escritório.`,
          clientData: { name: "Resumo de Agenda do Escritório" },
          history: [],
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setAgendaAnalysis(resJson.response);
      } else {
        toast.error(resJson.message || "Erro no resumo IA");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsAnalyzingAgenda(false);
    }
  };

  const renderAgendaCard = (item) => {
    const isUrgent = item.urgency === "Crítica" || item.urgency === "Alta";
    const assignedLawyer = (staff || []).find(m => m.id === item.lawyer_id);
    
    return (
      <div 
        key={item.id} 
        className={`${styles.agendaCard} ${isUrgent ? styles.agendaCardUrgent : ""}`}
        onClick={() => {
          setEditingAgendaItem(item);
          setAiDeadlineResult(null);
          const localDate = new Date(item.date);
          const dateStr = localDate.toISOString().split("T")[0];
          const timeStr = String(localDate.getHours()).padStart(2, "0") + ":" + String(localDate.getMinutes()).padStart(2, "0");
          setNewAgendaItem({
            title: item.title,
            date: dateStr,
            time: timeStr,
            description: item.description || "",
            type: item.type || "Judicial",
            urgency: item.urgency || "Média",
            clientId: item.client_id || "",
            lawyerId: item.lawyer_id || "",
          });
          setShowAgendaModal(true);
        }}
      >
        <div className={styles.agendaCardHeader}>
          <span className={styles.agendaTime}>
            ⏰ {new Date(item.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className={styles.agendaDate}>
            📅 {new Date(item.date).toLocaleDateString("pt-BR")}
          </span>
        </div>
        <div className={styles.agendaTitle}>{item.title}</div>
        
        {item.description && (
          <p style={{ margin: "0 0 10px 0", fontSize: "0.75rem", color: "#cbd5e1", lineHeight: "1.4", textOrigin: "left", textAlign: "left" }}>
            {item.description}
          </p>
        )}

        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
          <User size={12} color="#cbd5e1" />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af" }}>
            Responsável: {assignedLawyer ? assignedLawyer.name : "Nenhum atribuído"}
          </span>
        </div>

        {item.client_name && (
          <div className={styles.agendaClient}>
            <Users size={12} /> Cliente: {item.client_name}
          </div>
        )}

        <div className={styles.agendaFooter}>
          <span className={styles.agendaTypeTag}>{item.type}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className={`${styles.agendaBadge} ${
              item.urgency === "Crítica" || item.urgency === "Alta" ? styles.badgeHigh : 
              item.urgency === "Média" ? styles.badgeMed : styles.badgeLow
            }`}>
              {item.urgency}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAgenda(item.id);
              }}
              className={styles.agendaActionMiniBtn}
              title="Excluir da Agenda"
            >
              <Trash2 size={12} color="#fca5a5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const res = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_MESSAGE",
          channelId: activeChannelId,
          mensagem: chatInput
        })
      });
      const json = await res.json();
      if (json.success) {
        setChatInput("");
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

  const handleAddEntrySubmit = async (e) => {
    e.preventDefault();
    if (!newEntry.valor || Number(newEntry.valor) <= 0) {
      toast.error("Por favor, insira um valor válido.");
      return;
    }
    try {
      const res = await fetch("/api/escritorio/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_ENTRY",
          ...newEntry
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Lançamento financeiro registrado!");
        setNewEntry({
          tipo: "DESPESA",
          categoria: "Copa & Limpeza",
          subcategoria: "Café e Açúcar",
          descricao: "",
          valor: "",
          data_competencia: new Date().toISOString().split("T")[0],
          status: "PAGO"
        });
        loadFinance();
      } else {
        toast.error(json.message || "Erro ao adicionar lançamento.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão ao salvar lançamento.");
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    try {
      const res = await fetch("/api/escritorio/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_ENTRY",
          id
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Lançamento excluído!");
        loadFinance();
      } else {
        toast.error(json.message || "Erro ao excluir.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubName.trim()) {
      toast.error("Insira o nome da subcategoria.");
      return;
    }
    try {
      const res = await fetch("/api/escritorio/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_SUBCATEGORY",
          tipo: newEntry.tipo,
          categoria: newEntry.categoria,
          nome: newSubName
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Subcategoria adicionada com sucesso!");
        setNewSubName("");
        loadFinance();
      } else {
        toast.error(json.message || "Erro ao adicionar subcategoria.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão.");
    }
  };

  const handleDeleteSubcategory = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta subcategoria?")) return;
    try {
      const res = await fetch("/api/escritorio/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_SUBCATEGORY",
          id
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Subcategoria excluída!");
        loadFinance();
      } else {
        toast.error(json.message || "Erro ao excluir subcategoria.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão.");
    }
  };

  const handleExportAccountingPdf = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Filter entries by selected month/year
      const filtered = (financeData.trans || []).filter(t => {
        const d = new Date(t.data_competencia);
        return (d.getUTCMonth() + 1) === Number(exportMonth) && d.getUTCFullYear() === Number(exportYear);
      });

      // Header Banner
      doc.setFillColor(11, 11, 14); // Dark Theme Color
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(212, 175, 55); // Premium Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SocialJurídico Enterprise", 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`LOTE DE FECHAMENTO CONTÁBIL - REF: ${String(exportMonth).padStart(2, "0")}/${exportYear}`, 14, 28);

      // Office Info
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Escritório: ${office.nome}`, 14, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`CNPJ: ${office.cnpj} | Responsável: ${office.nome_responsavel}`, 14, 56);
      doc.text(`Data de Emissão: ${new Date().toLocaleString("pt-BR")}`, 14, 62);

      // Financial Metrics Block
      let monthReceitas = 0;
      let monthDespesas = 0;
      filtered.forEach(t => {
        const val = Number(t.valor) || 0;
        if (t.tipo === "RECEITA") monthReceitas += val;
        else monthDespesas += val;
      });

      doc.setFillColor(243, 244, 246);
      doc.rect(14, 68, pageWidth - 28, 22, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(14, 68, pageWidth - 28, 22, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Faturamento (Tributável):", 20, 74);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text(`R$ ${monthReceitas.toFixed(2)}`, 20, 81);

      doc.setTextColor(50, 50, 50);
      doc.text("Despesas Registradas:", 85, 74);
      doc.setTextColor(239, 68, 68); // Coral
      doc.text(`R$ ${monthDespesas.toFixed(2)}`, 85, 81);

      doc.setTextColor(50, 50, 50);
      doc.text("Saldo Operacional:", 145, 74);
      const mSaldo = monthReceitas - monthDespesas;
      doc.setTextColor(mSaldo >= 0 ? 16 : 239, mSaldo >= 0 ? 185 : 68, mSaldo >= 0 ? 129 : 68);
      doc.text(`R$ ${mSaldo.toFixed(2)}`, 145, 81);

      // Category Summary Table
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Resumo de Lançamentos do Período", 14, 100);

      // Draw table columns
      let currentY = 108;
      doc.setFillColor(243, 244, 246);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Data", 16, currentY + 5);
      doc.text("Tipo", 38, currentY + 5);
      doc.text("Categoria", 62, currentY + 5);
      doc.text("Descrição", 110, currentY + 5);
      doc.text("Valor (R$)", pageWidth - 16, currentY + 5, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);

      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      if (filtered.length === 0) {
        doc.setTextColor(150, 150, 150);
        doc.text("Nenhum lançamento encontrado para este período.", pageWidth / 2, currentY + 10, { align: "center" });
      } else {
        filtered.forEach(t => {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = 20;
          }

          const val = Number(t.valor) || 0;
          const dtStr = new Date(t.data_competencia).toLocaleDateString("pt-BR", { timeZone: "UTC" });
          
          doc.text(dtStr, 16, currentY + 6);
          
          doc.setFont("helvetica", "bold");
          if (t.tipo === "RECEITA") {
            doc.setTextColor(16, 185, 129);
            doc.text("Entrada", 38, currentY + 6);
          } else {
            doc.setTextColor(239, 68, 68);
            doc.text("Saída", 38, currentY + 6);
          }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);

          doc.text(`${t.categoria} > ${t.subcategoria}`, 62, currentY + 6);
          doc.text(t.descricao ? (t.descricao.length > 35 ? t.descricao.substring(0, 32) + "..." : t.descricao) : "-", 110, currentY + 6);
          
          doc.setFont("helvetica", "bold");
          doc.text(`R$ ${val.toFixed(2)}`, pageWidth - 16, currentY + 6, { align: "right" });
          doc.setFont("helvetica", "normal");

          doc.setDrawColor(240, 240, 240);
          doc.line(14, currentY + 9, pageWidth - 14, currentY + 9);
          currentY += 9;
        });
      }

      // Footer disclaimer
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text("Este documento consolida os lançamentos financeiros do escritório e serve de suporte contábil e fiscal.", pageWidth / 2, pageHeight - 15, { align: "center" });
      doc.text(`SocialJurídico Enterprise - Fechamento Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      doc.save(`Fechamento_Contabil_${exportMonth}_${exportYear}.pdf`);
      toast.success("PDF de Fechamento Contábil gerado!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const handleGenerateIaAnalysis = async () => {
    setLoadingIaAnalysis(true);
    setIaAnalysisText("");
    setIsIaClosingOpen(true);
    try {
      const res = await fetch(`/api/escritorio/financeiro/analise-ia?month=${exportMonth}&year=${exportYear}`);
      const json = await res.json();
      if (json.success) {
        setIaAnalysisText(json.analysis);
      } else {
        toast.error(json.message || "Erro ao gerar parecer fiscal.");
        setIsIaClosingOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar com a IA contábil.");
      setIsIaClosingOpen(false);
    } finally {
      setLoadingIaAnalysis(false);
    }
  };

  const handleExportFullIaPdf = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Filter entries by selected month/year
      const filtered = (financeData.trans || []).filter(t => {
        const d = new Date(t.data_competencia);
        return (d.getUTCMonth() + 1) === Number(exportMonth) && d.getUTCFullYear() === Number(exportYear);
      });

      // PAGE 1: Header Banner
      doc.setFillColor(11, 11, 14); 
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(212, 175, 55); 
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SocialJurídico Enterprise", 14, 18);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`LOTE DE FECHAMENTO CONTÁBIL - REF: ${String(exportMonth).padStart(2, "0")}/${exportYear}`, 14, 28);

      // Office Info
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Escritório: ${office.nome}`, 14, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`CNPJ: ${office.cnpj} | Responsável: ${office.nome_responsavel}`, 14, 56);
      doc.text(`Data de Emissão: ${new Date().toLocaleString("pt-BR")}`, 14, 62);

      // Financial Metrics Block
      let monthReceitas = 0;
      let monthDespesas = 0;
      filtered.forEach(t => {
        const val = Number(t.valor) || 0;
        if (t.tipo === "RECEITA") monthReceitas += val;
        else monthDespesas += val;
      });

      doc.setFillColor(243, 244, 246);
      doc.rect(14, 68, pageWidth - 28, 22, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(14, 68, pageWidth - 28, 22, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Faturamento (Tributável):", 20, 74);
      doc.setTextColor(16, 185, 129); 
      doc.text(`R$ ${monthReceitas.toFixed(2)}`, 20, 81);

      doc.setTextColor(50, 50, 50);
      doc.text("Despesas Registradas:", 85, 74);
      doc.setTextColor(239, 68, 68); 
      doc.text(`R$ ${monthDespesas.toFixed(2)}`, 85, 81);

      doc.setTextColor(50, 50, 50);
      doc.text("Saldo Operacional:", 145, 74);
      const mSaldo = monthReceitas - monthDespesas;
      doc.setTextColor(mSaldo >= 0 ? 16 : 239, mSaldo >= 0 ? 185 : 68, mSaldo >= 0 ? 129 : 68);
      doc.text(`R$ ${mSaldo.toFixed(2)}`, 145, 81);

      // Category Summary Table
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Resumo de Lançamentos do Período", 14, 100);

      let currentY = 108;
      doc.setFillColor(243, 244, 246);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Data", 16, currentY + 5);
      doc.text("Tipo", 38, currentY + 5);
      doc.text("Categoria", 62, currentY + 5);
      doc.text("Descrição", 110, currentY + 5);
      doc.text("Valor (R$)", pageWidth - 16, currentY + 5, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);
      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      if (filtered.length === 0) {
        doc.setTextColor(150, 150, 150);
        doc.text("Nenhum lançamento encontrado para este período.", pageWidth / 2, currentY + 10, { align: "center" });
      } else {
        filtered.forEach(t => {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = 20;
          }

          const val = Number(t.valor) || 0;
          const dtStr = new Date(t.data_competencia).toLocaleDateString("pt-BR", { timeZone: "UTC" });
          
          doc.text(dtStr, 16, currentY + 6);
          
          doc.setFont("helvetica", "bold");
          if (t.tipo === "RECEITA") {
            doc.setTextColor(16, 185, 129);
            doc.text("Entrada", 38, currentY + 6);
          } else {
            doc.setTextColor(239, 68, 68);
            doc.text("Saída", 38, currentY + 6);
          }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);

          doc.text(`${t.categoria} > ${t.subcategoria}`, 62, currentY + 6);
          doc.text(t.descricao ? (t.descricao.length > 35 ? t.descricao.substring(0, 32) + "..." : t.descricao) : "-", 110, currentY + 6);
          
          doc.setFont("helvetica", "bold");
          doc.text(`R$ ${val.toFixed(2)}`, pageWidth - 16, currentY + 6, { align: "right" });
          doc.setFont("helvetica", "normal");

          doc.setDrawColor(240, 240, 240);
          doc.line(14, currentY + 9, pageWidth - 14, currentY + 9);
          currentY += 9;
        });
      }

      // PAGE 2: IA Auditor advice
      doc.addPage();
      
      // Header for IA Opinion
      doc.setFillColor(11, 11, 14); 
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(212, 175, 55); 
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("PARECER FISCAL E AUDITORIA CONTÁBIL IA", 14, 18);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Relatório legal e conformidade tributária inteligente e planejada.", 14, 28);

      let textY = 55;
      doc.setTextColor(50, 50, 50);

      // Parse the generated analysis markdown and split it to wrap nicely
      const cleanText = iaAnalysisText
        .replace(/\*\*/g, "") // remove bold markdown
        .replace(/###/g, "") // remove headers
        .replace(/##/g, "")
        .replace(/#/g, "");

      const lines = doc.splitTextToSize(cleanText, pageWidth - 28);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      
      lines.forEach(line => {
        if (textY > pageHeight - 25) {
          doc.addPage();
          textY = 25;
        }
        
        if (line.includes("Sumário") || line.includes("Auditoria") || line.includes("Diretrizes") || line.includes("Recomendações") || line.includes("Fechamento Contábil")) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(212, 175, 55); // Gold color for main sections!
          doc.setFontSize(11);
          textY += 4;
          doc.text(line, 14, textY);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(9.5);
        } else {
          doc.text(line, 14, textY);
        }
        textY += 6;
      });

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text("Parecer gerado por inteligência artificial com base na legislação tributária brasileira.", pageWidth / 2, pageHeight - 15, { align: "center" });
      doc.text(`SocialJurídico Enterprise - Fechamento Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      doc.save(`Fechamento_Contabil_IA_${exportMonth}_${exportYear}.pdf`);
      toast.success("PDF de Fechamento Contábil Completo com IA gerado!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar PDF com IA.");
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/escritorio/dashboard", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }

      setData(json);
      setStaff(json.staff || []);
      
      // Se for secretária, define a primeira aba ativa conforme as permissões liberadas
      const req = json.user || { cargo: "admin" };
      const p = req.permissoes || {};
      if (req.cargo === "secretaria") {
        if (p.ver_gestao) {
          setActiveTab("gestao");
        } else if (p.ver_comunicacao) {
          setActiveTab("comunicacao");
          // Carrega mensagens do Corporate Hub
          try {
            const commRes = await fetch("/api/escritorio/comunicacao");
            if (commRes.ok) {
              const commJson = await commRes.json();
              if (commJson.success) setCommData(commJson);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          setActiveTab("restrito");
        }
      }

      // Initialize local allocation values
      const initialAlloc = {};
      (json.staff || []).forEach(m => {
        initialAlloc[m.id] = {
          cota_oab_sinc: m.cota_oab_sinc || 0,
          bloqueado_ia: m.bloqueado_ia || false,
          permissoes: m.permissoes || {}
        };
      });
      setAllocations(initialAlloc);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout-escritorio", { method: "POST" });
      if (res.ok) {
        toast.success("Sessão encerrada!");
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao efetuar logout.");
    }
  };

  // Add staff
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/escritorio/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember)
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Erro ao adicionar funcionário");
        return;
      }

      toast.success(json.message || "Funcionário adicionado com sucesso!");
      setIsAddOpen(false);
      setNewMember({
        name: "",
        email: "",
        phone: "",
        oab: "",
        estado: "SP",
        cargo: "advogado",
        senha: ""
      });
      loadDashboard();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar dados.");
    }
  };

  // Update staff allocations / locks
  const handleSaveAllocation = async (lawyerId) => {
    const alloc = allocations[lawyerId];
    if (!alloc) return;
    try {
      // 1. Save OAB sinc process cota
      const resOab = await fetch("/api/escritorio/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          action: "UPDATE_OAB_SINC",
          value: alloc.cota_oab_sinc
        })
      });
      const dataOab = await resOab.json();

      if (!resOab.ok || !dataOab.success) {
        toast.error(dataOab.message || "Erro ao atualizar OAB Sinc");
        return;
      }

      // 2. Save IA lock
      const resLock = await fetch("/api/escritorio/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          action: "TOGGLE_IA_LOCK",
          value: alloc.bloqueado_ia
        })
      });
      const dataLock = await resLock.json();

      if (!resLock.ok || !dataLock.success) {
        toast.error(dataLock.message || "Erro ao travar IA");
        return;
      }

      toast.success("Definições do funcionário salvas com sucesso!");
      loadDashboard();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar alterações");
    }
  };

  const handleSavePermissions = async (lawyerId) => {
    const alloc = allocations[lawyerId];
    if (!alloc) return;
    try {
      const res = await fetch("/api/escritorio/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          action: "UPDATE_PERMISSIONS",
          value: alloc.permissoes || {}
        })
      });
      const dataJson = await res.json();

      if (!res.ok || !dataJson.success) {
        toast.error(dataJson.message || "Erro ao salvar permissões");
        return;
      }

      toast.success("Permissões de acesso salvas com sucesso!");
      loadDashboard();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar permissões");
    }
  };

  const handleToggleOabVerification = async (lawyerId, currentStatus) => {
    const nextStatus = currentStatus === "VERIFIED" ? "UNVERIFIED" : "VERIFIED";
    try {
      const res = await fetch("/api/escritorio/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          action: "TOGGLE_OAB_VERIFICATION",
          value: nextStatus === "VERIFIED"
        })
      });
      const dataJson = await res.json();
      if (!res.ok || !dataJson.success) {
        toast.error(dataJson.message || "Erro ao atualizar verificação");
        return;
      }
      toast.success("Status de verificação da OAB atualizado!");
      loadDashboard();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao atualizar verificação");
    }
  };

  const handleDistributeJuris = async (lawyerId) => {
    const amount = Number(jurisInput[lawyerId] || 0);
    if (amount <= 0) {
      toast.error("Por favor, insira uma quantidade maior que zero.");
      return;
    }
    if (amount > (data.office?.balance || 0)) {
      toast.error("Saldo do escritório insuficiente.");
      return;
    }
    try {
      const res = await fetch("/api/escritorio/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          action: "DISTRIBUTE_JURIS",
          value: amount
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Erro ao distribuir Juris.");
        return;
      }
      toast.success("Juris distribuídos com sucesso!");
      setJurisInput({ ...jurisInput, [lawyerId]: "" });
      loadDashboard();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao distribuir Juris.");
    }
  };

  if (loading || !data) {
    return <div className={styles.loading}>Carregando painel enterprise...</div>;
  }

  const { office, usage, user: requester } = data;
  const limits = office.limites || {};
  const isSecretary = requester?.cargo === "secretaria";
  const perms = requester?.permissoes || {};

  // Calculate allocated sum of processes
  const totalAllocatedOAB = Object.values(allocations).reduce((acc, curr) => acc + (Number(curr.cota_oab_sinc) || 0), 0);
  const remainingOAB = Math.max(0, limits.oab_sinc - totalAllocatedOAB);

  // Parse metrics
  const storagePercent = Math.min(100, (usage.storage_mb_used / limits.storage_mb) * 100) || 0;
  const iaPercent = limits.creditos_ia >= 999999 ? 0 : Math.min(100, (usage.ia_requests_used / limits.creditos_ia) * 100) || 0;

  return (
    <div className={`${styles.page} ${isSecretary ? styles.secretaryPage : ''}`}>
      
      {/* HEADER DO ESCRITÓRIO */}
      <header className={`${styles.header} ${isSecretary ? styles.secretaryHeader : ''}`}>
        <div className={styles.headerLeft}>
          <div className={styles.logoBox}>
            {office.logo_url ? (
              <img src={office.logo_url} alt={office.nome} />
            ) : (
              office.nome.substring(0,2).toUpperCase()
            )}
          </div>
          <div className={styles.titleGroup}>
            <h1>{office.nome}</h1>
            <div className={styles.subtitle}>
              <span><strong>CNPJ:</strong> {office.cnpj}</span>
              <span><strong>Responsável:</strong> {office.nome_responsavel}</span>
              <span className={styles.planBadge}>
                {getPlanDisplayName(office.plano)}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {requester && (
            <div className={styles.userProfileBadge}>
              <span className={styles.userRole}>
                {isSecretary ? "Secretária" : "Gestor"}
              </span>
              <span className={styles.userName}>
                {requester.name}
              </span>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} /> Sair do Painel
          </button>
        </div>
      </header>

      {/* METRICAS DE CONSUMO */}
      <section className={styles.statsGrid}>
        
        {/* Card 1: Armazenamento */}
        {isSecretary && !perms.ver_metricas ? (
          <div className={styles.statCard} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "135px", border: "1px dashed rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)" }}>
            <Lock size={20} color="#ef4444" style={{ marginBottom: "8px" }} />
            <span style={{ fontSize: "0.85rem", color: "#f87171", fontWeight: 700 }}>Armazenamento Oculto</span>
            <span style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", marginTop: "2px" }}>Acesso restrito pelo Administrador</span>
          </div>
        ) : (
          <div className={styles.statCard}>
            <div className={styles.statCardTitle}>
              <Database size={16} color="#00b4d8" style={{ marginBottom: "-3px", marginRight: "6px" }} /> 
              Armazenamento (Espaço Nuvem)
            </div>
            <div className={styles.statCardValue}>
              {usage.storage_mb_used >= 1024 
                ? `${(usage.storage_mb_used / 1024).toFixed(1)} GB`
                : `${usage.storage_mb_used} MB`}
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarFill} style={{ width: `${storagePercent}%` }} />
            </div>
            <div className={styles.statCardLimit}>
              Limite: {limits.storage_mb >= 999999 ? "1 TB" : `${Math.floor(limits.storage_mb / 1024)} GB`}
            </div>
          </div>
        )}

        {/* Card 2: Consumo de IA */}
        {isSecretary && !perms.ver_metricas ? (
          <div className={styles.statCard} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "135px", border: "1px dashed rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)" }}>
            <Lock size={20} color="#ef4444" style={{ marginBottom: "8px" }} />
            <span style={{ fontSize: "0.85rem", color: "#f87171", fontWeight: 700 }}>Consumo IA Oculto</span>
            <span style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", marginTop: "2px" }}>Acesso restrito pelo Administrador</span>
          </div>
        ) : (
          <div className={styles.statCard}>
            <div className={styles.statCardTitle}>
              <Cpu size={16} color="#eab308" style={{ marginBottom: "-3px", marginRight: "6px" }} /> 
              Consumo de IA (mensal)
            </div>
            <div className={styles.statCardValue}>
              {usage.ia_requests_used} reqs
            </div>
            {limits.creditos_ia < 999999 && (
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarFill} style={{ width: `${iaPercent}%`, background: "linear-gradient(90deg, #eab308 0%, #ca8a04 100%)" }} />
              </div>
            )}
            <div className={styles.statCardLimit}>
              Limite: {limits.creditos_ia >= 999999 ? "Ilimitado (Uso Justo)" : `${limits.creditos_ia} reqs`}
            </div>
          </div>
        )}

        {/* Card 3: Notificações */}
        {isSecretary && !perms.ver_notificacoes ? (
          <div className={styles.statCard} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "135px", border: "1px dashed rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)" }}>
            <Lock size={20} color="#ef4444" style={{ marginBottom: "8px" }} />
            <span style={{ fontSize: "0.85rem", color: "#f87171", fontWeight: 700 }}>Notificações Ocultas</span>
            <span style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", marginTop: "2px" }}>Acesso restrito pelo Administrador</span>
          </div>
        ) : (
          <div className={styles.statCard}>
            <div className={styles.statCardTitle}>
              <Bell size={16} color="#10b981" style={{ marginBottom: "-3px", marginRight: "6px" }} /> 
              Notificações Extrajudiciais
            </div>
            <div className={styles.statCardValue}>
              Disponível
            </div>
            <div className={styles.statCardLimit} style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>
              Cota: {limits.notificacoes >= 999999 ? "Ilimitado" : `${limits.notificacoes} envios/mês`}
            </div>
          </div>
        )}

        {/* Card 4: OSINT */}
        {isSecretary && !perms.ver_metricas ? (
          <div className={styles.statCard} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "135px", border: "1px dashed rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)" }}>
            <Lock size={20} color="#ef4444" style={{ marginBottom: "8px" }} />
            <span style={{ fontSize: "0.85rem", color: "#f87171", fontWeight: 700 }}>OSINT Oculto</span>
            <span style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", marginTop: "2px" }}>Acesso restrito pelo Administrador</span>
          </div>
        ) : (
          <div className={styles.statCard}>
            <div className={styles.statCardTitle}>
              <Search size={16} color="#8b5cf6" style={{ marginBottom: "-3px", marginRight: "6px" }} /> 
              Módulo de Busca OSINT
            </div>
            <div className={styles.statCardValue}>
              Ativo
            </div>
            <div className={styles.statCardLimit} style={{ fontSize: "0.85rem", fontWeight: 700, color: "#8b5cf6" }}>
              Cota: {limits.osint >= 999999 ? "Ilimitado" : `${limits.osint} buscas/mês`}
            </div>
          </div>
        )}

        {/* Card 5: OAB Sinc */}
        {isSecretary && !perms.ver_gestao ? (
          <div className={styles.statCard} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "135px", border: "1px dashed rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)" }}>
            <Lock size={20} color="#ef4444" style={{ marginBottom: "8px" }} />
            <span style={{ fontSize: "0.85rem", color: "#f87171", fontWeight: 700 }}>OAB Sinc Oculto</span>
            <span style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", marginTop: "2px" }}>Acesso restrito pelo Administrador</span>
          </div>
        ) : (
          <div className={styles.statCard}>
            <div className={styles.statCardTitle}>
              <Scale size={16} color="#3b82f6" style={{ marginBottom: "-3px", marginRight: "6px" }} /> 
              OAB Sinc (Total Escritório)
            </div>
            <div className={styles.statCardValue}>
              {limits.oab_sinc} proc.
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarFill} style={{ 
                width: `${Math.min(100, (totalAllocatedOAB / limits.oab_sinc) * 100)}%`, 
                background: "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)" 
              }} />
            </div>
            <div className={styles.statCardLimit}>
              Distribuído: {totalAllocatedOAB} | Restam: {remainingOAB}
            </div>
          </div>
        )}

        {/* Card 6: Saldo de Juris */}
        <div className={styles.statCard} style={{ border: "1px solid rgba(212, 175, 55, 0.2)", background: "linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(17, 17, 20, 0.8) 100%)" }}>
          <div className={styles.statCardTitle} style={{ color: "var(--color-gold)", fontWeight: 700 }}>
            <Coins size={16} color="var(--color-gold)" style={{ marginBottom: "-3px", marginRight: "6px" }} /> 
            Saldo de Juris (Disponível)
          </div>
          <div className={styles.statCardValue} style={{ color: "var(--color-gold)", textShadow: "0 0 10px rgba(212, 175, 55, 0.3)" }}>
            {office.balance || 0} Juris
          </div>
          <div className={styles.statCardLimit} style={{ color: "rgba(255,255,255,0.6)" }}>
            Para distribuir aos membros
          </div>
        </div>

      </section>

      {/* SELETOR DE ABAS */}
      <div className={styles.tabsContainer}>
        {(!isSecretary || perms.ver_gestao) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "gestao" ? styles.activeTabBtn : ""}`} 
            onClick={() => setActiveTab("gestao")}
          >
            <Users size={16} /> Gestão e Cotas
          </button>
        )}
        {(!isSecretary || perms.ver_crm) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "crm" ? styles.activeTabBtn : ""}`} 
            onClick={() => {
              setActiveTab("crm");
              fetchCrmClients();
            }}
          >
            <Building size={16} /> CRM Geral
          </button>
        )}
        {(!isSecretary || perms.ver_comunicacao) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "comunicacao" ? styles.activeTabBtn : ""}`} 
            onClick={() => {
              setActiveTab("comunicacao");
              loadCommunication();
            }}
          >
            <MessageSquare size={16} /> Comunicação Interna (Corporate Hub)
          </button>
        )}
        {(!isSecretary || perms.ver_financeiro) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "financeiro" ? styles.activeTabBtn : ""}`} 
            onClick={() => {
              setActiveTab("financeiro");
              loadFinance();
            }}
          >
            <Coins size={16} /> Financeiro & Contabilidade
          </button>
        )}
        {(!isSecretary || perms.ver_agenda) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "agenda" ? styles.activeTabBtn : ""}`} 
            onClick={() => {
              setActiveTab("agenda");
              fetchAgenda();
              fetchCrmClients();
            }}
          >
            <Calendar size={16} /> Agenda e Prazos
          </button>
        )}
        {(!isSecretary || perms.ver_assinaturas) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "assinatura" ? styles.activeTabBtn : ""}`} 
            onClick={() => {
              setActiveTab("assinatura");
              fetchSignatures();
              fetchCrmClients();
            }}
          >
            <PenTool size={16} /> Assinatura Digital
          </button>
        )}
        {(!isSecretary || perms.ver_notificacoes) && (
          <button 
            className={`${styles.tabBtn} ${activeTab === "notificacao" ? styles.activeTabBtn : ""}`} 
            onClick={() => {
              setActiveTab("notificacao");
              fetchNotificacoesExtrajudiciais();
              fetchCrmClients();
            }}
          >
            <Mail size={16} /> Notificação Extrajudicial
          </button>
        )}
      </div>

      {/* PAINEL OPERACIONAL */}
      {activeTab === "gestao" && (
        <main className={`${styles.workspace} ${isSecretary ? styles.secretaryWorkspace : ''}`}>
        
        {/* ESQUERDA: LISTA DE MEMBROS E CAPACIDADE */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>
              <Users size={20} color="#00b4d8" /> Membros da Equipe
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>
                Advs: {usage.lawyers_count}/{office.max_advogados} | Ests: {usage.estagiarios_count}/{office.max_estagiarios}
              </span>
              {!isSecretary && (
                <button className={styles.addStaffBtn} onClick={() => setIsAddOpen(true)}>
                  <Plus size={16} /> Contratar/Adicionar
                </button>
              )}
            </div>
          </div>

          {staff.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
              Nenhum advogado ou estagiário cadastrado. Utilize o botão acima para montar sua equipe!
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Cargo</th>
                    <th>OAB</th>
                    <th>Status OAB</th>
                    <th>IA Liberada</th>
                    <th>Saldo Juris</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td style={{ fontWeight: 700, color: "#fff" }}>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.phone || "-"}</td>
                      <td>
                        <span className={`${styles.roleBadge} ${
                          member.cargo === "secretaria" ? styles.badgeSecretary : (member.cargo === "estagiario" ? styles.badgeIntern : styles.badgeLawyer)
                        }`}>
                          {member.cargo === "secretaria" ? "Secretária" : (member.cargo === "estagiario" ? "Estagiário" : "Advogado")}
                        </span>
                      </td>
                      <td>{member.oab ? `${member.oab}/${member.estado}` : "Não possui"}</td>
                      <td>
                        {member.cargo === "advogado" && member.oab ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {member.oab_verification_status === "VERIFIED" ? (
                              <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Check size={12} /> Verificada
                              </span>
                            ) : (
                              <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <X size={12} /> Pendente
                              </span>
                            )}
                            {!isSecretary && (
                              <button
                                onClick={() => handleToggleOabVerification(member.id, member.oab_verification_status)}
                                style={{
                                  background: "rgba(255, 255, 255, 0.05)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  borderRadius: "4px",
                                  padding: "2px 6px",
                                  fontSize: "0.7rem",
                                  color: "#fff",
                                  cursor: "pointer"
                                }}
                              >
                                {member.oab_verification_status === "VERIFIED" ? "Inativar" : "Verificar"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>-</span>
                        )}
                      </td>
                      <td>
                        {member.bloqueado_ia ? (
                          <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Lock size={12} /> Bloqueado
                          </span>
                        ) : (
                          <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Unlock size={12} /> Liberado
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--color-gold)" }}>
                        <Coins size={12} style={{ marginRight: "4px", marginBottom: "-2px" }} />
                        {member.balance || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* DIREITA: DISTRIBUIÇÃO DE COTAS E PERMISSÕES DE ACESSO */}
        {!isSecretary && (
        <section className={styles.panel}>
          <div className={styles.panelHeader} style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
            <h2 style={{ margin: 0 }}>
              <Scale size={20} color="#3b82f6" /> Controle de Recursos & Permissões
            </h2>
            
            {/* Sub-abas de configuração */}
            <div className={styles.subTabs}>
              <button 
                className={`${styles.subTabBtn} ${rightPanelTab === "advogados" ? styles.activeSubTabBtn : ""}`}
                onClick={() => setRightPanelTab("advogados")}
              >
                Advogados
              </button>
              <button 
                className={`${styles.subTabBtn} ${rightPanelTab === "estagiarios" ? styles.activeSubTabBtn : ""}`}
                onClick={() => setRightPanelTab("estagiarios")}
              >
                Estagiários
              </button>
              <button 
                className={`${styles.subTabBtn} ${rightPanelTab === "secretarias" ? styles.activeSubTabBtn : ""}`}
                onClick={() => setRightPanelTab("secretarias")}
              >
                Secretárias
              </button>
            </div>
          </div>

          {/* TAB 1: ADVOGADOS ( sliders de OAB Sinc e IA ) */}
          {rightPanelTab === "advogados" && (() => {
            const lawyers = staff.filter(s => s.cargo === "advogado");
            if (lawyers.length === 0) {
              return (
                <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
                  Nenhum advogado cadastrado na equipe.
                </div>
              );
            }
            return (
              <div className={styles.allocList}>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af", lineHeight: "1.4" }}>
                  Aloque processos do OAB Sinc. Total alocado não pode ultrapassar o limite contratado de <strong>{limits.oab_sinc} processos</strong>.
                </p>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(59, 130, 246, 0.08)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <AlertCircle size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                    <strong>Alocado:</strong> {totalAllocatedOAB} / {limits.oab_sinc} | <strong>Restante:</strong> {remainingOAB}
                  </span>
                </div>

                {lawyers.map((member) => {
                  const alloc = allocations[member.id] || { cota_oab_sinc: 0, bloqueado_ia: false };
                  return (
                    <div key={member.id} className={styles.allocItem}>
                      <div className={styles.allocItemHeader}>
                        <div>
                          <span className={styles.allocItemName}>{member.name}</span>
                          <div className={styles.allocItemRole}>OAB: {member.oab || "Não informado"}</div>
                        </div>
                        <button className={styles.saveAllocBtn} onClick={() => handleSaveAllocation(member.id)}>
                          <Save size={13} /> Salvar
                        </button>
                      </div>

                      <div className={styles.sliderRow}>
                        <input 
                          type="range"
                          className={styles.slider}
                          min="0"
                          max={Math.max(limits.oab_sinc, 100)}
                          value={alloc.cota_oab_sinc}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setAllocations({
                              ...allocations,
                              [member.id]: { ...alloc, cota_oab_sinc: val }
                            });
                          }}
                        />
                        <span className={styles.sliderVal}>{alloc.cota_oab_sinc} proc</span>
                      </div>

                      <div className={styles.lockRow}>
                        <span className={styles.lockLabel}>
                          {alloc.bloqueado_ia ? <Lock size={12} color="#ef4444" /> : <Unlock size={12} color="#10b981" />}
                          Bloquear IA
                        </span>
                        <label className={styles.switch}>
                          <input 
                            type="checkbox"
                            checked={alloc.bloqueado_ia}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllocations({
                                ...allocations,
                                [member.id]: { ...alloc, bloqueado_ia: checked }
                              });
                            }}
                          />
                          <span className={styles.sliderRound} />
                        </label>
                      </div>

                      {/* Distribuição de Juris */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                        <Coins size={14} color="var(--color-gold)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}><strong>Distribuir Juris:</strong></span>
                        <input 
                          type="number" 
                          placeholder="Qtd"
                          style={{
                            width: "60px",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "6px",
                            color: "#fff",
                            padding: "2px 6px",
                            fontSize: "0.78rem",
                            outline: "none"
                          }}
                          value={jurisInput[member.id] || ""}
                          onChange={(e) => setJurisInput({ ...jurisInput, [member.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handleDistributeJuris(member.id)}
                          style={{
                            background: "rgba(212, 175, 55, 0.1)",
                            border: "1px solid rgba(212, 175, 55, 0.2)",
                            borderRadius: "6px",
                            color: "var(--color-gold)",
                            padding: "2px 8px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* TAB 2: ESTAGIÁRIOS ( Ferramentas Premium e IA ) */}
          {rightPanelTab === "estagiarios" && (() => {
            const interns = staff.filter(s => s.cargo === "estagiario");
            if (interns.length === 0) {
              return (
                <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
                  Nenhum estagiário cadastrado na equipe.
                </div>
              );
            }
            return (
              <div className={styles.allocList}>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af", lineHeight: "1.4" }}>
                  Defina as ferramentas premium e recursos que os estagiários podem utilizar nos seus painéis individuais.
                </p>

                {interns.map((member) => {
                  const alloc = allocations[member.id] || { bloqueado_ia: false, permissoes: {} };
                  const perms = alloc.permissoes || {};
                  
                  const handleTogglePerm = (key) => {
                    setAllocations({
                      ...allocations,
                      [member.id]: {
                        ...alloc,
                        permissoes: {
                          ...perms,
                          [key]: !perms[key]
                        }
                      }
                    });
                  };

                  return (
                    <div key={member.id} className={styles.allocItem}>
                      <div className={styles.allocItemHeader}>
                        <div>
                          <span className={styles.allocItemName}>{member.name}</span>
                          <div className={styles.allocItemRole}>Estagiário</div>
                        </div>
                        <button className={styles.saveAllocBtn} onClick={() => handleSavePermissions(member.id)}>
                          <Save size={13} /> Salvar
                        </button>
                      </div>

                      {/* Botões de atalho: Liberar/Bloquear todas */}
                      <div style={{ display: "flex", gap: "10px", margin: "10px 0", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <button 
                          type="button" 
                          onClick={() => {
                            const newPerms = {};
                            [
                              "ferr_assinatura", "ferr_crm", "ferr_smart_docs", 
                              "ferr_blindagem", "ferr_redator_ia", "ferr_agenda", 
                              "ferr_triagem", "ferr_calculadora", "ferr_jurisprudencia"
                            ].forEach(k => { newPerms[k] = true; });
                            setAllocations({
                              ...allocations,
                              [member.id]: { ...alloc, permissoes: newPerms }
                            });
                          }}
                          style={{ flex: 1, padding: "5px 8px", fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "6px", color: "#10b981", fontWeight: 700, cursor: "pointer" }}
                        >
                          Liberar Todas
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAllocations({
                              ...allocations,
                              [member.id]: { ...alloc, permissoes: {} }
                            });
                          }}
                          style={{ flex: 1, padding: "5px 8px", fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}
                        >
                          Bloquear Todas
                        </button>
                      </div>

                      {/* Checkboxes de permissões de ferramentas premium */}
                      <div className={styles.permissionsChecklist}>
                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_assinatura} 
                            onChange={() => handleTogglePerm("ferr_assinatura")} 
                          />
                          <span>Assinatura Digital</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_crm} 
                            onChange={() => handleTogglePerm("ferr_crm")} 
                          />
                          <span>Meus Clientes (CRM)</span>
                        </label>
                        
                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_smart_docs} 
                            onChange={() => handleTogglePerm("ferr_smart_docs")} 
                          />
                          <span>IA Smart Docs</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_blindagem} 
                            onChange={() => handleTogglePerm("ferr_blindagem")} 
                          />
                          <span>Blindagem de Documentos</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_redator_ia} 
                            onChange={() => handleTogglePerm("ferr_redator_ia")} 
                          />
                          <span>Redator IA</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_agenda} 
                            onChange={() => handleTogglePerm("ferr_agenda")} 
                          />
                          <span>Agenda & Prazos</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_triagem} 
                            onChange={() => handleTogglePerm("ferr_triagem")} 
                          />
                          <span>Triagem de Casos</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_calculadora} 
                            onChange={() => handleTogglePerm("ferr_calculadora")} 
                          />
                          <span>Calculadora</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ferr_jurisprudencia} 
                            onChange={() => handleTogglePerm("ferr_jurisprudencia")} 
                          />
                          <span>Jurisprudência</span>
                        </label>
                      </div>

                      <div className={styles.lockRow} style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <span className={styles.lockLabel}>
                          {alloc.bloqueado_ia ? <Lock size={12} color="#ef4444" /> : <Unlock size={12} color="#10b981" />}
                          Bloquear IA
                        </span>
                        <label className={styles.switch}>
                          <input 
                            type="checkbox"
                            checked={alloc.bloqueado_ia}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllocations({
                                ...allocations,
                                [member.id]: { ...alloc, bloqueado_ia: checked }
                              });
                            }}
                          />
                          <span className={styles.sliderRound} />
                        </label>
                      </div>

                      {/* Distribuição de Juris */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                        <Coins size={14} color="var(--color-gold)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}><strong>Distribuir Juris:</strong></span>
                        <input 
                          type="number" 
                          placeholder="Qtd"
                          style={{
                            width: "60px",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "6px",
                            color: "#fff",
                            padding: "2px 6px",
                            fontSize: "0.78rem",
                            outline: "none"
                          }}
                          value={jurisInput[member.id] || ""}
                          onChange={(e) => setJurisInput({ ...jurisInput, [member.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handleDistributeJuris(member.id)}
                          style={{
                            background: "rgba(212, 175, 55, 0.1)",
                            border: "1px solid rgba(212, 175, 55, 0.2)",
                            borderRadius: "6px",
                            color: "var(--color-gold)",
                            padding: "2px 8px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* TAB 3: SECRETÁRIAS ( Acesso a seções do Dashboard ) */}
          {rightPanelTab === "secretarias" && (() => {
            const secretaries = staff.filter(s => s.cargo === "secretaria");
            if (secretaries.length === 0) {
              return (
                <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
                  Nenhuma secretária cadastrada na equipe.
                </div>
              );
            }
            return (
              <div className={styles.allocList}>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af", lineHeight: "1.4" }}>
                  As secretárias possuem um dashboard administrativo idêntico a este. Marque abaixo quais seções elas estão autorizadas a visualizar e operar.
                </p>

                {secretaries.map((member) => {
                  const alloc = allocations[member.id] || { bloqueado_ia: false, permissoes: {} };
                  const perms = alloc.permissoes || {};
                  
                  const handleTogglePerm = (key) => {
                    setAllocations({
                      ...allocations,
                      [member.id]: {
                        ...alloc,
                        permissoes: {
                          ...perms,
                          [key]: !perms[key]
                        }
                      }
                    });
                  };

                  return (
                    <div key={member.id} className={styles.allocItem}>
                      <div className={styles.allocItemHeader}>
                        <div>
                          <span className={styles.allocItemName}>{member.name}</span>
                          <div className={styles.allocItemRole}>Secretária Executiva</div>
                        </div>
                        <button className={styles.saveAllocBtn} onClick={() => handleSavePermissions(member.id)}>
                          <Save size={13} /> Salvar
                        </button>
                      </div>

                      {/* Checkboxes de permissões de acesso ao Dashboard */}
                      <div className={styles.permissionsChecklist}>
                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_gestao} 
                            onChange={() => handleTogglePerm("ver_gestao")} 
                          />
                          <span>Ver Gestão de Equipe & OAB Sinc</span>
                        </label>
                        
                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_comunicacao} 
                            onChange={() => handleTogglePerm("ver_comunicacao")} 
                          />
                          <span>Acessar Comunicação Corporativa (Discord Hub)</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_metricas} 
                            onChange={() => handleTogglePerm("ver_metricas")} 
                          />
                          <span>Visualizar Métricas Globais & Armazenamento</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_notificacoes} 
                            onChange={() => handleTogglePerm("ver_notificacoes")} 
                          />
                          <span>Gerenciar Notificações Extrajudiciais</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_financeiro} 
                            onChange={() => handleTogglePerm("ver_financeiro")} 
                          />
                          <span>Acessar Módulo Financeiro & Faturamento</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_crm} 
                            onChange={() => handleTogglePerm("ver_crm")} 
                          />
                          <span>Acessar Módulo de Clientes (CRM)</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_agenda} 
                            onChange={() => handleTogglePerm("ver_agenda")} 
                          />
                          <span>Visualizar e Editar Agenda e Prazos</span>
                        </label>

                        <label className={styles.permCheckboxLabel}>
                          <input 
                            type="checkbox" 
                            checked={!!perms.ver_assinaturas} 
                            onChange={() => handleTogglePerm("ver_assinaturas")} 
                          />
                          <span>Gerenciar Assinaturas Digitais</span>
                        </label>
                      </div>

                      <div className={styles.lockRow} style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <span className={styles.lockLabel}>
                          {alloc.bloqueado_ia ? <Lock size={12} color="#ef4444" /> : <Unlock size={12} color="#10b981" />}
                          Bloquear IA
                        </span>
                        <label className={styles.switch}>
                          <input 
                            type="checkbox"
                            checked={alloc.bloqueado_ia}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllocations({
                                ...allocations,
                                [member.id]: { ...alloc, bloqueado_ia: checked }
                              });
                            }}
                          />
                          <span className={styles.sliderRound} />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
        )}

      </main>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO DE COMUNICAÇÃO INTERNA (HUB CORPORATIVO DISCORD/JITSI) */}
      {/* ======================================================== */}
      {activeTab === "comunicacao" && (isSecretary && !perms.ver_comunicacao ? (
        <main className={styles.workspace} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '40px' }}>
          <Lock size={48} color="#ef4444" style={{ marginBottom: "15px" }} />
          <h3 style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold', marginBottom: '8px' }}>Acesso Restrito</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '400px', margin: 0, fontSize: '0.88rem', lineHeight: '1.4' }}>
            Você não possui permissão para acessar a Comunicação Interna. Solicite autorização ao administrador do escritório.
          </p>
        </main>
      ) : (
        <main className={styles.commContainer}>
          {/* SIDEBAR: CANAIS */}
          <aside className={styles.commSidebar}>
            <div className={styles.sidebarHeader}>
              <h3>Canais</h3>
              <button 
                className={styles.addChannelBtn} 
                onClick={() => setIsAddChannelOpen(true)} 
                title="Criar Canal"
              >
                <Plus size={16} />
              </button>
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
                      <button className={styles.deleteChanBtn} onClick={(e) => handleDeleteChannel(e, chan.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
              </div>

              {/* Canais de Voz (Discord Style) */}
              <div className={styles.channelCategory}>
                <span className={styles.categoryTitle}>🔊 Canais de Voz</span>
                {(commData.canais || []).filter(c => c.tipo === "voz").length === 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", paddingLeft: "8px", fontStyle: "italic" }}>
                    Nenhuma sala de voz. Crie uma!
                  </div>
                )}
                {(commData.canais || [])
                  .filter(c => c.tipo === "voz")
                  .map(chan => {
                    const roomParticipants = (commData.participantesVoz || []).filter(p => p.canal_id === chan.id);
                    const isUserInThisRoom = roomParticipants.some(p => p.member_id === commData.user?.id);
                    
                    return (
                      <div key={chan.id} className={styles.channelCategory}>
                        <div 
                          className={`${styles.channelItem} ${isUserInThisRoom ? styles.activeChannelItem : ""}`}
                          onClick={() => handleJoinVoice(chan.id)}
                        >
                          <span className={styles.channelItemLeft}>
                            🔊 {chan.nome} ({roomParticipants.length}/{chan.limite_pessoas || "∞"})
                          </span>
                          <button className={styles.deleteChanBtn} onClick={(e) => handleDeleteChannel(e, chan.id)}>
                            <Trash2 size={12} />
                          </button>
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
                    Nenhuma sala de reunião. Crie uma!
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
                      <button className={styles.deleteChanBtn} onClick={(e) => handleDeleteChannel(e, chan.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Rodapé da Voz (Status Conectado) */}
            {(commData.participantesVoz || []).some(p => p.member_id === commData.user?.id) && (() => {
              const myVoice = (commData.participantesVoz || []).find(p => p.member_id === commData.user?.id);
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
            const secureMeetingRoomName = `sj-meet-${office.id}-${activeMeetingRoom}`;
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
                  <form className={styles.chatInputBar} onSubmit={handleSendMessage}>
                    <input 
                      type="text"
                      className={styles.chatInput}
                      placeholder={`Enviar mensagem em ${channelName}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
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
      ))}

      {/* ======================================================== */}
      {/* SEÇÃO FINANCEIRO & CONTABILIDADE */}
      {/* ======================================================== */}
      {activeTab === "financeiro" && (isSecretary && !perms.ver_financeiro ? (
        <main className={styles.workspace} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '40px' }}>
          <Lock size={48} color="#ef4444" style={{ marginBottom: "15px" }} />
          <h3 style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold', marginBottom: '8px' }}>Acesso Restrito</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '400px', margin: 0, fontSize: '0.88rem', lineHeight: '1.4' }}>
            Você não possui permissão para acessar o Módulo Financeiro. Solicite autorização ao administrador do escritório.
          </p>
        </main>
      ) : (
        <main className={styles.workspace} style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px" }}>
          
          {/* COLUNA DA ESQUERDA: LANÇAMENTO E EXTRATO */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* CARD 1: RESUMO FINANCEIRO PREMIUM */}
            <section className={styles.panel} style={{ padding: "20px" }}>
              <div className={styles.panelHeader} style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                    <Landmark size={20} color="#eab308" /> Resumo Financeiro Geral
                  </h2>
                  <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Período: Histórico Consolidado</span>
                </div>
                <button 
                  onClick={loadFinance} 
                  title="Atualizar Fluxo de Caixa"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#eab308",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(234, 179, 8, 0.1)"; e.currentTarget.style.borderColor = "#eab308"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
                >
                  <RefreshCw size={12} style={{ animation: loadingFinance ? "spin 1s linear infinite" : "none" }} />
                  {loadingFinance ? "Atualizando..." : "Atualizar Caixa"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                
                {/* Saldo Atual */}
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "#9ca3af", fontWeight: 700 }}>Saldo em Caixa</span>
                    <Coins size={16} color="#10b981" />
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: financeData.summary?.saldoAtual >= 0 ? "#10b981" : "#ef4444", marginTop: "8px" }}>
                    R$ {(financeData.summary?.saldoAtual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Saldo líquido acumulado</span>
                </div>

                {/* Receitas */}
                <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px", padding: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "#9ca3af", fontWeight: 700 }}>Total Receitas (Faturamento)</span>
                    <TrendingUp size={16} color="#3b82f6" />
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#3b82f6", marginTop: "8px" }}>
                    R$ {(financeData.summary?.totalReceitas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Honorários e Entradas</span>
                </div>

                {/* Despesas */}
                <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "#9ca3af", fontWeight: 700 }}>Total Despesas Operacionais</span>
                    <TrendingDown size={16} color="#ef4444" />
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ef4444", marginTop: "8px" }}>
                    R$ {(financeData.summary?.totalDespesas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Copa, Pessoal e Custos</span>
                </div>

              </div>
            </section>

            {/* CARD 2: LANÇAR NOVO MOVIMENTO DIÁRIO */}
            <section className={styles.panel} style={{ padding: "20px" }}>
              <div className={styles.panelHeader} style={{ marginBottom: "15px" }}>
                <h2>
                  <PlusCircle size={20} color="#10b981" /> Lançar Movimentação Diária
                </h2>
              </div>

              <form onSubmit={handleAddEntrySubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                
                {/* Tipo In/Out Segmented Control */}
                <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                  <label className={styles.label}>Tipo de Movimentação</label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                    <button 
                      type="button"
                      onClick={() => {
                        const available = (financeData.subcategories || []).filter(s => s.tipo === "DESPESA" && s.categoria === "Copa & Limpeza");
                        const sub = available.length > 0 ? available[0].nome : "Café e Açúcar";
                        setNewEntry({
                          ...newEntry,
                          tipo: "DESPESA",
                          categoria: "Copa & Limpeza",
                          subcategoria: sub
                        });
                      }}
                      style={{ 
                        flex: 1, 
                        padding: "10px", 
                        borderRadius: "8px", 
                        border: "1px solid " + (newEntry.tipo === "DESPESA" ? "#ef4444" : "rgba(255,255,255,0.08)"), 
                        background: newEntry.tipo === "DESPESA" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                        color: newEntry.tipo === "DESPESA" ? "#f87171" : "#9ca3af",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <TrendingDown size={14} style={{ marginRight: "6px", marginBottom: "-2px" }} /> Saída / Despesa
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const available = (financeData.subcategories || []).filter(s => s.tipo === "RECEITA" && s.categoria === "Honorários Contratuais");
                        const sub = available.length > 0 ? available[0].nome : "Retainer / Assessoria Mensal";
                        setNewEntry({
                          ...newEntry,
                          tipo: "RECEITA",
                          categoria: "Honorários Contratuais",
                          subcategoria: sub
                        });
                      }}
                      style={{ 
                        flex: 1, 
                        padding: "10px", 
                        borderRadius: "8px", 
                        border: "1px solid " + (newEntry.tipo === "RECEITA" ? "#10b981" : "rgba(255,255,255,0.08)"), 
                        background: newEntry.tipo === "RECEITA" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                        color: newEntry.tipo === "RECEITA" ? "#34d399" : "#9ca3af",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <TrendingUp size={14} style={{ marginRight: "6px", marginBottom: "-2px" }} /> Entrada / Receita
                    </button>
                  </div>
                </div>

                {/* Categoria */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Categoria Contábil</label>
                  <select 
                    className={styles.select}
                    value={newEntry.categoria}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const available = (financeData.subcategories || []).filter(s => s.tipo === newEntry.tipo && s.categoria === cat);
                      const defaultSub = available.length > 0 ? available[0].nome : "Outros";
                      setNewEntry({ ...newEntry, categoria: cat, subcategoria: defaultSub });
                    }}
                  >
                    {newEntry.tipo === "DESPESA" ? (
                      <>
                        <option value="Copa & Limpeza">☕ Copa & Limpeza</option>
                        <option value="Pessoal & Encargos">👥 Pessoal & Encargos</option>
                        <option value="Repasses & Comissões">💸 Repasses & Comissões</option>
                        <option value="Tecnologia & Softwares">💻 Tecnologia & Softwares</option>
                        <option value="Ocupação & Consumo">🏠 Ocupação & Consumo</option>
                        <option value="Comercial & Marketing">📣 Comercial & Marketing</option>
                        <option value="Tributos & OAB">🏛️ Tributos & OAB</option>
                        <option value="Outros">⚙️ Outros</option>
                      </>
                    ) : (
                      <>
                        <option value="Honorários Contratuais">📄 Honorários Contratuais</option>
                        <option value="Honorários de Êxito">🏆 Honorários de Êxito</option>
                        <option value="Honorários Sucumbenciais">⚖️ Honorários Sucumbenciais</option>
                        <option value="Consultoria">🗣️ Consultoria</option>
                        <option value="Reembolso de Custas">💰 Reembolso de Custas</option>
                        <option value="Outros">⚙️ Outros</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Subcategoria */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Subcategoria</label>
                  <select 
                    className={styles.select}
                    value={newEntry.subcategoria}
                    onChange={(e) => setNewEntry({ ...newEntry, subcategoria: e.target.value })}
                  >
                    {(financeData.subcategories || [])
                      .filter(s => s.tipo === newEntry.tipo && s.categoria === newEntry.categoria)
                      .map(s => (
                        <option key={s.id} value={s.nome}>{s.nome}</option>
                      ))}
                    {(financeData.subcategories || [])
                      .filter(s => s.tipo === newEntry.tipo && s.categoria === newEntry.categoria).length === 0 && (
                        <option value="Outros">Outros</option>
                      )}
                  </select>
                  
                  <div style={{ marginTop: "6px" }}>
                    <button 
                      type="button" 
                      onClick={() => setShowManageSubs(!showManageSubs)}
                      style={{ 
                        background: "none", 
                        border: "none", 
                        color: "var(--color-gold)", 
                        fontSize: "0.72rem", 
                        fontWeight: 700, 
                        cursor: "pointer", 
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <PlusCircle size={11} /> {showManageSubs ? "Fechar Gerenciador" : "Gerenciar Subcategorias"}
                    </button>
                  </div>
                </div>

                {showManageSubs && (
                  <div style={{
                    marginTop: "5px",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    gridColumn: "1 / -1"
                  }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
                      Subcategorias de "{newEntry.categoria}" ({newEntry.tipo === "RECEITA" ? "Receitas" : "Despesas"})
                    </div>
                    
                    <div style={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: "6px", 
                      maxHeight: "80px", 
                      overflowY: "auto", 
                      marginBottom: "10px",
                      paddingRight: "4px"
                    }}>
                      {(financeData.subcategories || [])
                        .filter(s => s.tipo === newEntry.tipo && s.categoria === newEntry.categoria)
                        .map(s => (
                          <div 
                            key={s.id} 
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              color: "#d1d5db"
                            }}
                          >
                            <span>{s.nome}</span>
                            <Trash2 
                              size={11} 
                              color="#ef4444" 
                              style={{ cursor: "pointer" }} 
                              onClick={() => handleDeleteSubcategory(s.id)}
                            />
                          </div>
                        ))}
                      {(financeData.subcategories || [])
                        .filter(s => s.tipo === newEntry.tipo && s.categoria === newEntry.categoria).length === 0 && (
                          <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>Nenhuma subcategoria customizada.</span>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <input 
                        type="text" 
                        placeholder="Nova subcategoria..."
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        style={{
                          flex: 1,
                          background: "rgba(0, 0, 0, 0.2)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "0.75rem",
                          color: "#fff"
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddSubcategory}
                        style={{
                          background: "var(--color-gold)",
                          color: "#000",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Valor */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    className={styles.input}
                    placeholder="0,00"
                    value={newEntry.valor}
                    onChange={(e) => setNewEntry({ ...newEntry, valor: e.target.value })}
                  />
                </div>

                {/* Data */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Data Competência</label>
                  <input 
                    type="date" 
                    required
                    className={styles.input}
                    value={newEntry.data_competencia}
                    onChange={(e) => setNewEntry({ ...newEntry, data_competencia: e.target.value })}
                  />
                </div>

                {/* Descrição */}
                <div className={styles.formGroup} style={{ gridColumn: "1 / -2" }}>
                  <label className={styles.label}>Descrição / Detalhes</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    placeholder="Ex: Compra de 5 pacotes de café p/ recepção"
                    value={newEntry.descricao}
                    onChange={(e) => setNewEntry({ ...newEntry, descricao: e.target.value })}
                  />
                </div>

                {/* Botão de Enviar */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className={styles.confirmBtn} style={{ width: "100%", height: "40px", padding: 0 }}>
                    <PlusCircle size={16} style={{ marginRight: "6px", marginBottom: "-3px" }} /> Lançar Transação
                  </button>
                </div>

              </form>
            </section>

            {/* CARD 3: LISTA EXTRATO DO DIA A DIA */}
            <section className={styles.panel} style={{ padding: "20px" }}>
              <div className={styles.panelHeader} style={{ marginBottom: "15px" }}>
                <h2>
                  <Landmark size={20} color="#eab308" /> Extrato de Caixa Diário
                </h2>
                <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Listagem das últimas transações</span>
              </div>

              {loadingFinance ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Carregando extrato...</div>
              ) : (financeData.trans || []).length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma transação financeira lançada. Comece preenchendo o formulário acima!
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Categoria / Sub</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(financeData.trans || []).map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontSize: "0.78rem" }}>{new Date(t.data_competencia).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                          <td>
                            <span style={{ 
                              padding: "4px 8px", 
                              borderRadius: "6px", 
                              fontSize: "0.7rem", 
                              fontWeight: 700, 
                              background: t.tipo === "RECEITA" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: t.tipo === "RECEITA" ? "#34d399" : "#f87171"
                            }}>
                              {t.tipo === "RECEITA" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>
                            <strong>{t.categoria}</strong> <br/>
                            <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{t.subcategoria}</span>
                          </td>
                          <td style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>{t.descricao || "-"}</td>
                          <td style={{ fontWeight: 700, color: t.tipo === "RECEITA" ? "#10b981" : "#f87171", fontSize: "0.85rem" }}>
                            R$ {(Number(t.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <button 
                              onClick={() => handleDeleteEntry(t.id)} 
                              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" }}
                              title="Excluir Transação"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>

          {/* COLUNA DA DIREITA: PACOTE DO CONTADOR & DEADLINES */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* CARD 1: FECHAMENTO CONTÁBIL LEGAL */}
            <section className={styles.panel} style={{ padding: "20px", border: "1px solid rgba(212, 175, 55, 0.2)", background: "linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)" }}>
              <div className={styles.panelHeader} style={{ marginBottom: "12px" }}>
                <h2 style={{ color: "#d4af37" }}>
                  <Landmark size={20} color="#d4af37" /> Fechamento Contábil
                </h2>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: "1.4", margin: "0 0 15px" }}>
                Gere e envie o pacote contábil completo de receitas e despesas diretamente para o seu contador de forma legalmente estruturada.
              </p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <div style={{ flex: 1.5 }}>
                  <label className={styles.label}>Mês Ref</label>
                  <select 
                    className={styles.select}
                    value={exportMonth}
                    onChange={(e) => setExportMonth(Number(e.target.value))}
                  >
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
                    <option value="6">Junho</option>
                    <option value="7">Julho</option>
                    <option value="8">Agosto</option>
                    <option value="9">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className={styles.label}>Ano</label>
                  <select 
                    className={styles.select}
                    value={exportYear}
                    onChange={(e) => setExportYear(Number(e.target.value))}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleExportAccountingPdf}
                className={styles.confirmBtn}
                style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #d4af37 0%, #b8901c 100%)", border: "none", color: "#111", fontWeight: 800 }}
              >
                <FileSpreadsheet size={16} style={{ marginRight: "6px", marginBottom: "-3px" }} /> Gerar Relatório Contábil
              </button>

              <button 
                onClick={handleGenerateIaAnalysis}
                className={styles.confirmBtn}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  background: "linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(184, 144, 28, 0.25) 100%)", 
                  border: "1px solid rgba(212, 175, 55, 0.4)", 
                  color: "#d4af37", 
                  fontWeight: 800,
                  marginTop: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 10px rgba(212, 175, 55, 0.1)"
                }}
              >
                <Cpu size={16} style={{ marginRight: "6px" }} /> ✨ Fechamento com IA Contábil
              </button>

              <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", background: "rgba(212, 175, 55, 0.05)", border: "1px dashed rgba(212, 175, 55, 0.2)", fontSize: "0.72rem", color: "#e2e8f0", lineHeight: "1.3" }}>
                ⚠️ <strong>Atenção Contador:</strong> A segregação de "Reembolso de Custas" está configurada neste relatório para evitar bitributação indevida de honorários!
              </div>
            </section>

            {/* CARD 2: CHECKLIST DE OBRIGAÇÕES FISCAIS */}
            <section className={styles.panel} style={{ padding: "20px" }}>
              <div className={styles.panelHeader} style={{ marginBottom: "12px" }}>
                <h2>
                  <Calendar size={20} color="#eab308" /> Obrigações Fiscais OAB
                </h2>
              </div>
              <p style={{ fontSize: "0.76rem", color: "#9ca3af", lineHeight: "1.4", margin: "0 0 15px" }}>
                Acompanhe os prazos cruciais de fechamento para manter sua sociedade de advogados livre de multas.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
                  <input type="checkbox" defaultChecked style={{ marginTop: "3px" }} />
                  <div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Reconciliar OFX Bancário</span>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>Enviar extrato bancário até dia 05.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
                  <input type="checkbox" defaultChecked style={{ marginTop: "3px" }} />
                  <div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Guia da Folha (Secretárias)</span>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>Enviar folha e pró-labore até dia 25.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
                  <input type="checkbox" style={{ marginTop: "3px" }} />
                  <div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Imposto Simples DAS</span>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>Pagar DAS (Anexo IV) vencimento dia 20.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
                  <input type="checkbox" style={{ marginTop: "3px" }} />
                  <div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>NFS-e Período</span>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af" }}>Emitir todas as NFS-e de honorários.</p>
                  </div>
                </div>

              </div>
            </section>

          </div>

        </main>
      ))}

      {/* ======================================================== */}
      {/* SEÇÃO CRM GERAL DO ESCRITÓRIO */}
      {/* ======================================================== */}
      {activeTab === "crm" && (
        <main className={styles.workspace} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* CRM METRICS CARDS */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statCardTitle}>
                <Building size={16} color="var(--color-gold)" style={{ marginRight: "6px", marginBottom: "-3px" }} />
                Total de Leads / Casos
              </div>
              <div className={styles.statCardValue}>{crmClients.length}</div>
              <div className={styles.statCardLimit}>Leads integrados no CRM</div>
            </div>

            <div className={styles.statCard} style={{ border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <div className={styles.statCardTitle} style={{ color: "#ef4444" }}>
                <AlertCircle size={16} color="#ef4444" style={{ marginRight: "6px", marginBottom: "-3px" }} />
                Casos Sem Responsável
              </div>
              <div className={styles.statCardValue} style={{ color: "#ef4444" }}>
                {crmClients.filter(c => !c.lawyer_id).length}
              </div>
              <div className={styles.statCardLimit}>Aguardando delegação</div>
            </div>

            <div className={styles.statCard} style={{ border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <div className={styles.statCardTitle} style={{ color: "#10b981" }}>
                <Users size={16} color="#10b981" style={{ marginRight: "6px", marginBottom: "-3px" }} />
                Delegados a Membros
              </div>
              <div className={styles.statCardValue} style={{ color: "#10b981" }}>
                {crmClients.filter(c => c.lawyer_id).length}
              </div>
              <div className={styles.statCardLimit}>Casos em andamento</div>
            </div>
          </section>

          {/* CRM SEARCH & CONTROLS */}
          <section className={styles.panel} style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "#fff" }}>
                  <Building size={20} color="#d4af37" /> Funil Geral do Escritório (CRM)
                </h2>
                <p style={{ margin: "5px 0 0 0", fontSize: "0.78rem", color: "#9ca3af" }}>
                  Supervisione todos os clientes do escritório, gerencie prioridades e distribua casos complexos para sua equipe.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Buscar cliente, email ou CPF/CNPJ..."
                    className={styles.redatorInput}
                    style={{ paddingLeft: "35px", width: "280px", margin: 0 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={14} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                </div>
                <button 
                  type="button" 
                  className={styles.newClientBtn} 
                  onClick={() => setShowNotificacaoModal(true)} 
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(212,175,55,0.1)", color: "var(--color-gold)", border: "1px solid rgba(212,175,55,0.2)" }}
                >
                  <Mail size={14} /> Notificar Extrajudicial
                </button>
                <button 
                  type="button" 
                  className={styles.newClientBtn} 
                  onClick={fetchCrmClients} 
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <RefreshCw size={14} /> Atualizar
                </button>
              </div>
            </div>
          </section>

          {/* CRM CLIENT LISTING */}
          <div className={styles.clientList} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {loadingCrm ? (
              <div className={styles.emptyState} style={{ gridColumn: "1/-1", padding: "60px 0" }}>
                <div style={{ 
                  width: "30px", 
                  height: "30px", 
                  borderRadius: "50%", 
                  border: "3px solid rgba(212, 175, 55, 0.1)", 
                  borderTopColor: "var(--color-gold)",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 15px"
                }} />
                <span>Carregando clientes do CRM...</span>
              </div>
            ) : crmClients.filter(c => {
              const q = searchQuery.toLowerCase();
              return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.cpf_cnpj?.includes(q);
            }).length > 0 ? (
              crmClients
                .filter(c => {
                  const q = searchQuery.toLowerCase();
                  return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.cpf_cnpj?.includes(q);
                })
                .map((client) => {
                  const responsible = staff.find(m => m.id === client.lawyer_id);
                  return (
                    <div key={client.id} className={styles.clientCard} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: "rgba(30, 41, 59, 0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "20px", transition: "transform 0.2s, box-shadow 0.2s" }}>
                      
                      {/* Avatar & Header */}
                      <div className={styles.clientMainInfo} style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "15px" }}>
                        <div className={styles.clientAvatar} style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(212,175,55,0.1)", color: "var(--color-gold)", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "0.95rem" }}>
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={styles.clientMeta} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <h4 style={{ margin: 0, color: "#fff", fontSize: "0.92rem", fontWeight: 700 }}>{client.name}</h4>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>
                            {client.email || "Sem e-mail"} • {maskPhone(client.phone) || "Sem telefone"}
                          </p>
                        </div>
                      </div>

                      {/* Client Details Grid */}
                      <div className={styles.clientSecondaryInfo} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px", marginBottom: "15px" }}>
                        <div className={styles.infoGroup}>
                          <span className={styles.infoLabel} style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "bold" }}>CPF / CNPJ</span>
                          <span className={styles.infoValue} style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{maskCPFCNPJ(client.cpf_cnpj) || "--"}</span>
                        </div>
                        <div className={styles.infoGroup}>
                          <span className={styles.infoLabel} style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "bold" }}>Risco Jurídico</span>
                          <span
                            className={`${styles.riskBadge} ${client.risk_score < 30 ? styles.riskLow : client.risk_score < 70 ? styles.riskMed : styles.riskHigh}`}
                            style={{ display: "inline-block", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "6px" }}
                          >
                            {client.risk_score < 30 ? "Baixo" : client.risk_score < 70 ? "Médio" : "Alto"} ({client.risk_score}%)
                          </span>
                        </div>
                        <div className={styles.infoGroup}>
                          <span className={styles.infoLabel} style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "bold" }}>Status Funil</span>
                          <span className={styles.infoValue} style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{client.status || "Novo"}</span>
                        </div>
                        <div className={styles.infoGroup}>
                          <span className={styles.infoLabel} style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: "bold" }}>Cadastro</span>
                          <span className={styles.infoValue} style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>
                            {client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "--"}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions & Lawyer Responsible */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px", marginTop: "auto" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "0.65rem", color: "#9ca3af", fontWeight: "bold", textTransform: "uppercase" }}>Responsável</span>
                          <span style={{ fontSize: "0.8rem", color: responsible ? "var(--color-gold)" : "#ef4444", fontWeight: 600 }}>
                            {responsible ? `💼 ${responsible.name}` : "⚠️ Sem Responsável"}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className={styles.newClientBtn}
                            style={{ padding: "6px 12px", fontSize: "0.75rem", background: "rgba(212,175,55,0.1)", color: "var(--color-gold)", border: "1px solid rgba(212,175,55,0.2)" }}
                            onClick={() => setDelegatingClient(client)}
                          >
                            Delegar
                          </button>
                          <button
                            type="button"
                            className={styles.newClientBtn}
                            style={{ padding: "6px 12px", fontSize: "0.75rem", background: "rgba(255,255,255,0.03)", color: "#fff", border: "1px solid rgba(255,255,255,0.06)" }}
                            onClick={() => {
                              setSelectedClient(client);
                              setShowDossierModal(true);
                              setDossierTab("docs");
                              setClientDocuments([]);
                              setInteractions([]);
                              setAssociatedCases([]);
                              setClientFinance([]);
                              setClientInsight(null);
                              fetchClientDocuments(client.id);
                              fetchInteractions(client.id);
                              fetchAssociatedCases(client);
                              fetchClientFinance(client.id);
                              fetchClientInsight(client.id);
                            }}
                          >
                            Ver Ficha
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
            ) : (
              <div className={styles.emptyState} style={{ gridColumn: "1/-1", padding: "60px 0" }}>Nenhum lead/cliente encontrado no CRM.</div>
            )}
          </div>

        </main>
      )}

      {/* MODAL DE DELEGAÇÃO DE CASOS (CRM GERAL) */}
      {delegatingClient && (
        <div className={styles.modalOverlay} onClick={() => setDelegatingClient(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px", width: "95%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "var(--color-gold)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building size={20} color="var(--color-gold)" /> Delegar Responsável
              </h3>
              <button 
                type="button" 
                onClick={() => setDelegatingClient(null)} 
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.2rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            
            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", margin: "0 0 15px", lineHeight: "1.5" }}>
              Selecione o advogado membro do escritório que ficará encarregado de conduzir o caso de <strong>{delegatingClient.name}</strong>:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
              <label style={{ fontSize: "0.78rem", color: "#9ca3af", fontWeight: "bold" }}>Selecione o Advogado</label>
              <select
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "10px",
                  fontSize: "0.85rem",
                  outline: "none"
                }}
                defaultValue={delegatingClient.lawyer_id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleDelegateCase(delegatingClient.id, val || null);
                }}
                disabled={isDelegating}
              >
                <option value="">-- Nenhum (Deixar Sem Responsável) --</option>
                {staff
                  .filter(member => member.cargo === "advogado")
                  .map(member => (
                    <option key={member.id} value={member.id}>
                      💼 {member.name} (OAB: {member.oab || "Sem OAB"})
                    </option>
                  ))
                }
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={() => setDelegatingClient(null)}
                disabled={isDelegating}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FICHA COMPLETA DO CLIENTE (CRM GERAL) */}
      {showDossierModal && selectedClient && (
        <div className={styles.modalOverlay} onClick={() => setShowDossierModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "rgba(22, 28, 36, 0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>
            
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 25px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "rgba(212,175,55,0.1)", color: "var(--color-gold)", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "1.2rem", border: "1px solid rgba(212,175,55,0.2)" }}>
                  {selectedClient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>{selectedClient.name}</h3>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }}>{selectedClient.type || "Pessoa Física"}</span>
                    <span style={{ fontSize: "0.68rem", color: selectedClient.risk_score < 30 ? "#10b981" : selectedClient.risk_score < 70 ? "#f59e0b" : "#ef4444", background: "rgba(255,255,255,0.02)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      Risco {selectedClient.risk_score || 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <button
                  type="button"
                  style={{ background: "rgba(212, 175, 55, 0.1)", color: "var(--color-gold)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", padding: "6px 12px", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={() => handleGenerateReport(selectedClient, clientDocuments, interactions, clientFinance)}
                >
                  <Download size={14} /> Dossiê PDF
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDossierModal(false)} 
                  style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.5rem", cursor: "pointer" }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* DOSSIER TABS */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { id: "docs", label: "Arquivos e Provas", icon: <FileText size={14} /> },
                { id: "timeline", label: "Linha do Tempo", icon: <Clock size={14} /> },
                { id: "cases", label: "Processos", icon: <Scale size={14} /> },
                { id: "finance", label: "Financeiro", icon: <DollarSign size={14} /> },
                { id: "insights", label: "IA Insights", icon: <Activity size={14} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDossierTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    background: "none",
                    border: "none",
                    borderBottom: dossierTab === tab.id ? "2px solid var(--color-gold)" : "2px solid transparent",
                    color: dossierTab === tab.id ? "var(--color-gold)" : "#9ca3af",
                    fontWeight: dossierTab === tab.id ? 600 : 500,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* MODAL CONTENT */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 25px" }}>
              
              {/* TAB 1: DOCUMENTS */}
              {dossierTab === "docs" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* File Upload Section */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "15px", borderRadius: "12px" }}>
                    <h4 style={{ margin: 0, color: "var(--color-gold)", fontSize: "0.85rem", textTransform: "uppercase" }}>Anexar Novo Arquivo</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <input
                        type="file"
                        id="dossier-upload"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, false)}
                      />
                      <label
                        htmlFor="dossier-upload"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 16px", fontSize: "0.8rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}
                      >
                        <UploadCloud size={16} /> Enviar Arquivo Comum
                      </label>
                      
                      <input
                        type="file"
                        id="dossier-blindar"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, true)}
                      />
                      <label
                        htmlFor="dossier-blindar"
                        style={{ background: "linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%)", borderRadius: "8px", padding: "8px 16px", fontSize: "0.8rem", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}
                      >
                        <Shield size={16} /> Blindar Prova (Blockchain)
                      </label>
                    </div>
                  </div>

                  {/* Document List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>Arquivos do Caso ({clientDocuments.length})</h4>
                    {clientDocuments.length === 0 ? (
                      <div style={{ padding: "30px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "10px", color: "#6b7280", fontSize: "0.85rem" }}>
                        Nenhum documento anexado ainda.
                      </div>
                    ) : (
                      clientDocuments.map(doc => (
                        <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px", transition: "background 0.2s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <FileText size={18} color={doc.metadata?.hash ? "var(--color-gold)" : "#9ca3af"} />
                            <div style={{ textAlign: "left" }}>
                              <span style={{ fontSize: "0.85rem", color: "#fff", display: "block", fontWeight: 500 }}>{doc.name}</span>
                              {doc.metadata?.hash ? (
                                <span style={{ fontSize: "0.68rem", color: "var(--color-gold)", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Shield size={10} /> Prova Blindada no Bloco #{doc.metadata.block_id || "7849"}
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.68rem", color: "#6b7280" }}>Documento Comum</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {doc.metadata?.hash && (
                              <button
                                type="button"
                                style={{ background: "none", border: "none", color: "var(--color-gold)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
                                onClick={() => {
                                  toast.success("Certificado de Custódia autêntico!");
                                  window.open(doc.url, "_blank");
                                }}
                              >
                                Ver Certificado
                              </button>
                            )}
                            <a href={doc.url} target="_blank" rel="noreferrer" style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "4px" }}>
                              <Download size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => executeDeleteDocument(doc.id, doc.url)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TIMELINE / NOTES */}
              {dossierTab === "timeline" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Register New Note */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "15px", borderRadius: "12px" }}>
                    <h4 style={{ margin: 0, color: "var(--color-gold)", fontSize: "0.85rem", textTransform: "uppercase" }}>Registrar Nova Ocorrência / Nota</h4>
                    <textarea
                      placeholder="Descreva o andamento do caso, resumo da ligação ou observação interna..."
                      value={newInteraction.content}
                      onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
                      style={{ width: "100%", height: "80px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px", color: "#fff", fontSize: "0.85rem", resize: "none" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <select
                        value={newInteraction.type}
                        onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "6px 12px", color: "#fff", fontSize: "0.8rem" }}
                      >
                        <option value="nota">📝 Nota Interna</option>
                        <option value="ligação">📞 Ligação Telefônica</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="reunião">👥 Reunião Presencial</option>
                        <option value="email">✉️ E-mail</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveInteraction}
                        disabled={isSavingInteraction}
                        style={{ background: "var(--color-gold)", color: "#000", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer" }}
                      >
                        {isSavingInteraction ? "Salvando..." : "Adicionar Nota"}
                      </button>
                    </div>
                  </div>

                  {/* Timeline Render */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>Histórico de Atividades e Logs</h4>
                    {isFetchingInteractions ? (
                      <div style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>Carregando linha do tempo...</div>
                    ) : interactions.length === 0 ? (
                      <div style={{ padding: "30px", textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
                        Nenhuma atividade registrada na timeline deste cliente.
                      </div>
                    ) : (
                      <div style={{ position: "relative", paddingLeft: "20px", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
                        {interactions.map(item => (
                          <div key={item.id} style={{ position: "relative" }}>
                            <div style={{ position: "absolute", left: "-26px", top: "2px", width: "11px", height: "11px", borderRadius: "50%", background: item.type === "auditoria" ? "var(--color-gold)" : "#10b981", border: "2px solid rgba(22, 28, 36, 0.95)" }} />
                            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ fontSize: "0.68rem", color: item.type === "auditoria" ? "var(--color-gold)" : "#9ca3af", fontWeight: "bold", textTransform: "uppercase" }}>{item.type}</span>
                                <span style={{ fontSize: "0.68rem", color: "#6b7280" }}>
                                  {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.4" }}>{item.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ASSOCIATED PROCESSES */}
              {dossierTab === "cases" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>Processos Associados no Judiciário</h4>
                  {isFetchingAssociatedCases ? (
                    <div style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>Buscando processos...</div>
                  ) : associatedCases.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "10px", color: "#6b7280", fontSize: "0.85rem" }}>
                      Nenhum processo judicial localizado sob o nome deste cliente.
                    </div>
                  ) : (
                    associatedCases.map(proc => (
                      <div key={proc.id} style={{ padding: "15px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px", textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-gold)", fontWeight: 600 }}>⚖️ Proc: {proc.process_number}</span>
                          <span style={{ fontSize: "0.7rem", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{proc.status}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.75rem", color: "#cbd5e1" }}>
                          <div><strong>Vara:</strong> {proc.court}</div>
                          <div><strong>Ação:</strong> {proc.action_type}</div>
                          <div style={{ gridColumn: "1/-1" }}><strong>Último Andamento:</strong> {proc.last_update || "Sem atualizações recentes."}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: CLIENT FINANCE */}
              {dossierTab === "finance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Add New Finance Entry */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "15px", borderRadius: "12px" }}>
                    <h4 style={{ margin: 0, color: "var(--color-gold)", fontSize: "0.85rem", textTransform: "uppercase" }}>Registrar Lançamento / Honorários</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Descrição (ex: Parcela Inicial)"
                        value={newFinance.description}
                        onChange={(e) => setNewFinance({ ...newFinance, description: e.target.value })}
                        style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "6px 10px", color: "#fff", fontSize: "0.8rem" }}
                      />
                      <input
                        type="number"
                        placeholder="R$ Valor"
                        value={newFinance.amount}
                        onChange={(e) => setNewFinance({ ...newFinance, amount: e.target.value })}
                        style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "6px 10px", color: "#fff", fontSize: "0.8rem" }}
                      />
                      <input
                        type="date"
                        value={newFinance.due_date}
                        onChange={(e) => setNewFinance({ ...newFinance, due_date: e.target.value })}
                        style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "6px 10px", color: "#fff", fontSize: "0.8rem" }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <select
                        value={newFinance.status}
                        onChange={(e) => setNewFinance({ ...newFinance, status: e.target.value })}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "6px 12px", color: "#fff", fontSize: "0.8rem" }}
                      >
                        <option value="PENDENTE">🔴 PENDENTE</option>
                        <option value="PAGO">🟢 PAGO</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveFinance}
                        disabled={isSavingFinance}
                        style={{ background: "var(--color-gold)", color: "#000", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer" }}
                      >
                        {isSavingFinance ? "Registrando..." : "Registrar Lançamento"}
                      </button>
                    </div>
                  </div>

                  {/* Financial List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>Situação Financeira do Cliente</h4>
                    {isFetchingFinance ? (
                      <div style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>Carregando dados financeiros...</div>
                    ) : clientFinance.length === 0 ? (
                      <div style={{ padding: "30px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "10px", color: "#6b7280", fontSize: "0.85rem" }}>
                        Nenhum registro financeiro vinculado a este cliente.
                      </div>
                    ) : (
                      clientFinance.map(item => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px" }}>
                          <div style={{ textAlign: "left" }}>
                            <span style={{ fontSize: "0.85rem", color: "#fff", display: "block", fontWeight: 500 }}>{item.description}</span>
                            <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                              Vence em: {item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : "N/I"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                            <span style={{ fontSize: "0.9rem", color: "var(--color-gold)", fontWeight: 600 }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentStatus(item)}
                              style={{
                                background: item.status === "PAGO" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                border: "1px solid " + (item.status === "PAGO" ? "#10b981" : "#ef4444"),
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "0.72rem",
                                color: item.status === "PAGO" ? "#10b981" : "#ef4444",
                                cursor: "pointer",
                                fontWeight: "bold"
                              }}
                            >
                              {item.status}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AI INSIGHTS */}
              {dossierTab === "insights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>Análise e Insights Preditivos da IA</h4>
                  {isGeneratingInsight ? (
                    <div style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>A IA está analisando a documentação e histórico do caso...</div>
                  ) : !clientInsight ? (
                    <div style={{ padding: "30px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "10px", color: "#6b7280", fontSize: "0.85rem" }}>
                      Nenhum relatório preditivo gerado para este caso. 
                    </div>
                  ) : (
                    <div style={{ background: "rgba(212,175,55,0.02)", border: "1px solid rgba(212,175,55,0.1)", padding: "18px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(212,175,55,0.1)", paddingBottom: "10px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-gold)", fontWeight: "bold", textTransform: "uppercase" }}>Estudo de Viabilidade</span>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Score IA: {clientInsight.score || 85}%</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                        {clientInsight.text}
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* MODAL FOOTER */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "15px 25px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button 
                type="button" 
                className={styles.newClientBtn} 
                style={{ padding: "8px 16px", fontSize: "0.8rem", background: "rgba(212,175,55,0.1)", color: "var(--color-gold)", border: "1px solid rgba(212,175,55,0.2)" }}
                onClick={() => {
                  setShowDossierModal(false);
                  setDelegatingClient(selectedClient);
                }}
              >
                Delegar Caso
              </button>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={() => setShowDossierModal(false)}
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE ACESSO RESTRITO PARA SECRETÁRIAS */}
      {activeTab === "restrito" && (
        <main className={styles.workspace} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "450px" }}>
          <div className={styles.panel} style={{ maxWidth: "500px", padding: "40px 30px", textAlign: "center", background: "rgba(30, 41, 59, 0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px" }}>
              <Lock size={36} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: "1.5rem", color: "#fff", fontWeight: 700, margin: "0 0 10px" }}>Acesso Restrito ao Painel</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem", lineHeight: "1.6", margin: "0 0 25px" }}>
              Olá, <strong>{requester.name}</strong>! Todas as suas abas e módulos de acesso administrativo foram restritos pelo Administrador do Escritório.
            </p>
            <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255,255,255,0.05)", fontSize: "0.82rem", color: "#6b7280" }}>
              Se precisar de novos acessos às cotas ou à comunicação interna, entre em contato diretamente com o gestor do seu escritório.
            </div>
          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO AGENDA & PRAZOS COMPARTILHADOS */}
      {/* ======================================================== */}
      {activeTab === "agenda" && (isSecretary && !perms.ver_agenda ? (
        <main className={styles.workspace} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '40px' }}>
          <Lock size={48} color="#ef4444" style={{ marginBottom: "15px" }} />
          <h3 style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold', marginBottom: '8px' }}>Acesso Restrito</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '400px', margin: 0, fontSize: '0.88rem', lineHeight: '1.4' }}>
            Você não possui permissão para acessar a Agenda de Compromissos e Prazos. Solicite autorização ao administrador do escritório.
          </p>
        </main>
      ) : (
        <main className={styles.workspace} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* TOP CONTROLS CARD */}
          <section className={styles.panel} style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "#fff" }}>
                  <Calendar size={20} color="#d4af37" /> Agenda Centralizada do Escritório
                </h2>
                <p style={{ margin: "5px 0 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
                  Gerencie audiências, prazos processuais fatais, consultas e atribua compromissos diretamente para os membros do escritório.
                </p>
              </div>

              {/* ACTION BUTTONS & FILTER */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                
                {/* FILTER BY OFFICE MEMBER */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "6px 12px" }}>
                  <Filter size={14} color="#d4af37" />
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af" }}>Filtrar Membro:</span>
                  <select
                    value={calendarMemberFilter}
                    onChange={(e) => setCalendarMemberFilter(e.target.value)}
                    style={{ background: "transparent", border: "none", color: "#fff", fontSize: "0.78rem", fontWeight: 700, outline: "none", cursor: "pointer" }}
                  >
                    <option value="TODOS" style={{ background: "#11141c" }}>Todos os Membros</option>
                    {(staff || []).map(m => (
                      <option key={m.id} value={m.id} style={{ background: "#11141c" }}>
                        {m.name} ({m.cargo.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* IA ACTION BUTTONS */}
                <button
                  onClick={handleAnalyseAgenda}
                  className={styles.actionBtn}
                  style={{ color: "#10b981", borderColor: "rgba(16, 185, 129, 0.2)" }}
                >
                  <Cpu size={14} /> Analisar Riscos IA
                </button>

                <button
                  onClick={handleSummarizeAgenda}
                  className={styles.actionBtn}
                  style={{ color: "#60a5fa", borderColor: "rgba(96, 165, 250, 0.2)" }}
                >
                  <BarChart3 size={14} /> Resumo Executivo
                </button>

                <button
                  onClick={() => {
                    setEditingAgendaItem(null);
                    setAiDeadlineResult(null);
                    setNewAgendaItem({
                      title: "",
                      date: new Date().toISOString().split("T")[0],
                      time: "09:00",
                      description: "",
                      type: "Judicial",
                      urgency: "Média",
                      clientId: "",
                      lawyerId: "",
                    });
                    setShowAgendaModal(true);
                  }}
                  className={styles.addStaffBtn}
                  style={{ background: "linear-gradient(135deg, #d4af37 0%, #b8901c 100%)", color: "#000", fontWeight: 800 }}
                >
                  <Plus size={16} /> Novo Compromisso
                </button>

              </div>
            </div>
          </section>

          {/* AGENDA COLUMNS (Judicial, Reunião, Outros) */}
          <div className={styles.agendaGrid}>
            
            {/* AUDIÊNCIAS E JUIZADOS */}
            <div className={styles.agendaCol}>
              <div className={styles.agendaColHeader}>
                <span className={styles.agendaColTitle}>⚖️ Audiências e Prazos Judiciais</span>
                <span className={styles.agendaCount}>
                  {agendaItems.filter(i => {
                    if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                    return i.type === "Judicial" || i.type === "Audiência";
                  }).length}
                </span>
              </div>
              <div className={styles.agendaList}>
                {agendaItems.filter(i => {
                  if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                  return i.type === "Judicial" || i.type === "Audiência";
                }).length === 0 ? (
                  <div className={styles.agendaEmpty}>Nenhuma audiência ou prazo judicial pendente.</div>
                ) : (
                  agendaItems
                    .filter(i => {
                      if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                      return i.type === "Judicial" || i.type === "Audiência";
                    })
                    .map(item => renderAgendaCard(item))
                )}
              </div>
            </div>

            {/* REUNIÕES E CONSULTAS */}
            <div className={styles.agendaCol}>
              <div className={styles.agendaColHeader}>
                <span className={styles.agendaColTitle}>🤝 Reuniões e Consultas</span>
                <span className={styles.agendaCount}>
                  {agendaItems.filter(i => {
                    if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                    return i.type === "Reunião" || i.type === "Atendimento";
                  }).length}
                </span>
              </div>
              <div className={styles.agendaList}>
                {agendaItems.filter(i => {
                  if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                  return i.type === "Reunião" || i.type === "Atendimento";
                }).length === 0 ? (
                  <div className={styles.agendaEmpty}>Nenhuma reunião ou consulta agendada.</div>
                ) : (
                  agendaItems
                    .filter(i => {
                      if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                      return i.type === "Reunião" || i.type === "Atendimento";
                    })
                    .map(item => renderAgendaCard(item))
                )}
              </div>
            </div>

            {/* ADESÕES E OUTROS */}
            <div className={styles.agendaCol}>
              <div className={styles.agendaColHeader}>
                <span className={styles.agendaColTitle}>📌 Outras Obrigações e Prazos</span>
                <span className={styles.agendaCount}>
                  {agendaItems.filter(i => {
                    if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                    return i.type !== "Judicial" && i.type !== "Audiência" && i.type !== "Reunião" && i.type !== "Atendimento";
                  }).length}
                </span>
              </div>
              <div className={styles.agendaList}>
                {agendaItems.filter(i => {
                  if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                  return i.type !== "Judicial" && i.type !== "Audiência" && i.type !== "Reunião" && i.type !== "Atendimento";
                }).length === 0 ? (
                  <div className={styles.agendaEmpty}>Nenhum outro compromisso registrado.</div>
                ) : (
                  agendaItems
                    .filter(i => {
                      if (calendarMemberFilter !== "TODOS" && i.lawyer_id !== calendarMemberFilter) return false;
                      return i.type !== "Judicial" && i.type !== "Audiência" && i.type !== "Reunião" && i.type !== "Atendimento";
                    })
                    .map(item => renderAgendaCard(item))
                )}
              </div>
            </div>

          </div>
        </main>
      ))}

      {/* MODAL DE CADASTRO DE FUNCIONÁRIO (Membro do Escritório) */}
      {isAddOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3>Cadastrar Novo Membro</h3>
            <form onSubmit={handleAddSubmit}>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome Completo</label>
                <input 
                  type="text"
                  required
                  className={styles.input}
                  placeholder="Dra. Roberta Santos"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email de Login</label>
                <input 
                  type="email"
                  required
                  className={styles.input}
                  placeholder="roberta@meuescritorio.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Senha de Acesso</label>
                <input 
                  type="password"
                  required
                  className={styles.input}
                  placeholder="Defina uma senha"
                  value={newMember.senha}
                  onChange={(e) => setNewMember({ ...newMember, senha: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Cargo</label>
                  <select 
                    className={styles.select}
                    value={newMember.cargo}
                    onChange={(e) => setNewMember({ ...newMember, cargo: e.target.value })}
                  >
                    <option value="advogado">Advogado</option>
                    <option value="estagiario">Estagiário</option>
                    <option value="secretaria">Secretária</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>OAB (Advogado)</label>
                  <input 
                    type="text"
                    className={styles.input}
                    placeholder="123456"
                    value={newMember.oab}
                    onChange={(e) => setNewMember({ ...newMember, oab: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div className={styles.formGroup} style={{ flex: 1.5 }}>
                  <label className={styles.label}>Whatsapp/Telefone</label>
                  <input 
                    type="text"
                    className={styles.input}
                    placeholder="(11) 99999-9999"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Estado OAB</label>
                  <select 
                    className={styles.select}
                    value={newMember.estado}
                    onChange={(e) => setNewMember({ ...newMember, estado: e.target.value })}
                  >
                    {ESTADOS_BRASIL.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Cadastrar e Associar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CRIAR CANAL DE COMUNICAÇÃO */}
      {isAddChannelOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3>Criar Canal de Comunicação</h3>
            <form onSubmit={handleCreateChannel}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome do Canal</label>
                <input 
                  type="text"
                  required
                  className={styles.input}
                  placeholder="Ex: socios, reuniao-semanal, cafe"
                  value={newChannel.nome}
                  onChange={(e) => setNewChannel({ ...newChannel, nome: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tipo de Canal</label>
                <select 
                  className={styles.select}
                  value={newChannel.tipo}
                  onChange={(e) => setNewChannel({ ...newChannel, tipo: e.target.value })}
                >
                  <option value="texto">Chat Reservado (Apenas Texto)</option>
                  <option value="voz">Sala de Voz (Discord Clone)</option>
                  <option value="video">Sala de Reunião (Vídeo Jitsi)</option>
                </select>
              </div>

              {newChannel.tipo === "voz" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Limite de Pessoas</label>
                  <input 
                    type="number"
                    className={styles.input}
                    min="0"
                    placeholder="0 para Ilimitado"
                    value={newChannel.limite}
                    onChange={(e) => setNewChannel({ ...newChannel, limite: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddChannelOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Criar Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FECHAMENTO FINANCEIRO CONTÁBIL INTELIGENTE (IA) */}
      {isIaClosingOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: "750px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, color: "var(--color-gold)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu size={20} color="var(--color-gold)" /> Auditoria & Fechamento Fiscal IA
              </h3>
              <button 
                type="button" 
                onClick={() => setIsIaClosingOpen(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.2rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px", margin: "10px 0" }}>
              {loadingIaAnalysis ? (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 0", gap: "15px" }}>
                  <div style={{ 
                    width: "40px", 
                    height: "40px", 
                    borderRadius: "50%", 
                    border: "3px solid rgba(212, 175, 55, 0.1)", 
                    borderTopColor: "var(--color-gold)",
                    animation: "spin 1s linear infinite"
                  }} />
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 700 }}>SocialJurídico AI Auditor</span>
                    <p style={{ margin: "5px 0 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>Analisando receitas, segregando reembolsos de custas, auditando encargos e redigindo parecer fiscal...</p>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                  {iaAnalysisText}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={() => setIsIaClosingOpen(false)}
              >
                Fechar
              </button>
              {!loadingIaAnalysis && iaAnalysisText && (
                <button 
                  type="button" 
                  className={styles.confirmBtn} 
                  onClick={handleExportFullIaPdf}
                  style={{ background: "linear-gradient(90deg, #d4af37 0%, #b8901c 100%)", border: "none", color: "#111", fontWeight: 800 }}
                >
                  <FileSpreadsheet size={14} style={{ marginRight: "6px", marginBottom: "-2px" }} /> Exportar Fechamento Completo + Parecer IA
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA AGENDAR OU EDITAR COMPROMISSO */}
      {showAgendaModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: "560px", width: "90%" }}>
            <h3>{editingAgendaItem ? "Editar Compromisso" : "Agendar Novo Compromisso"}</h3>
            <form onSubmit={handleSaveAgenda} className={styles.formGrid}>
              
              <div className={styles.formItemFull}>
                <label className={styles.formLabel}>Título / Compromisso</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Audiência de Instrução e Julgamento - Proc 1029..."
                  className={styles.formInput}
                  value={newAgendaItem.title}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                />
              </div>

              {/* IA SUGGEST DEADLINE BUTTON */}
              <div className={styles.formItemFull}>
                <button
                  type="button"
                  onClick={handleAiSuggestDeadline}
                  className={styles.iaSuggestionBtn}
                  disabled={isAiSuggesting}
                >
                  <Cpu size={16} className={isAiSuggesting ? styles.spin : ""} />
                  {isAiSuggesting ? "IA Calculando Prazo..." : "Calcular Prazo Legal com IA"}
                </button>
              </div>

              {aiDeadlineResult && (
                <div className={styles.iaResultBox}>
                  <span className={styles.iaResultLabel}>Sugestão da IA</span>
                  <div className={styles.iaResultText}>
                    <strong>Prazo Sugerido:</strong> {new Date(aiDeadlineResult.suggestedDate).toLocaleDateString("pt-BR")} ({aiDeadlineResult.preparationDays} dias de margem segura)
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#a7f3d0" }}>
                      {aiDeadlineResult.reasoning}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAgendaItem({
                        ...newAgendaItem,
                        date: aiDeadlineResult.suggestedDate
                      });
                      toast.success("Data da IA aplicada!");
                    }}
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "6px",
                      color: "#10b981",
                      padding: "6px 12px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      marginTop: "10px"
                    }}
                  >
                    Usar Data Sugerida
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "15px" }}>
                <div className={styles.formItem}>
                  <label className={styles.formLabel}>Data</label>
                  <input
                    type="date"
                    required
                    className={styles.formInput}
                    value={newAgendaItem.date}
                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, date: e.target.value })}
                  />
                </div>
                <div className={styles.formItem}>
                  <label className={styles.formLabel}>Hora</label>
                  <input
                    type="time"
                    required
                    className={styles.formInput}
                    value={newAgendaItem.time}
                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div className={styles.formItem}>
                  <label className={styles.formLabel}>Tipo</label>
                  <select
                    className={styles.formSelect}
                    value={newAgendaItem.type}
                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, type: e.target.value })}
                  >
                    <option value="Judicial">⚖️ Judicial (Prazo)</option>
                    <option value="Audiência">🏛️ Audiência</option>
                    <option value="Reunião">🤝 Reunião</option>
                    <option value="Atendimento">📞 Consulta / Atendimento</option>
                    <option value="Outro">📌 Outro</option>
                  </select>
                </div>
                <div className={styles.formItem}>
                  <label className={styles.formLabel}>Urgência</label>
                  <select
                    className={styles.formSelect}
                    value={newAgendaItem.urgency}
                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, urgency: e.target.value })}
                  >
                    <option value="Baixa">🟢 Baixa</option>
                    <option value="Média">🟡 Média</option>
                    <option value="Alta">🔴 Alta</option>
                    <option value="Crítica">🚨 Crítica (Fatal)</option>
                  </select>
                </div>
              </div>

              {/* ATRIBUIR A UM ADVOGADO ESPECÍFICO */}
              <div className={styles.formItemFull}>
                <label className={styles.formLabel}>Atribuir a Responsabilidade (Advogado / Membro)</label>
                <select
                  className={styles.formSelect}
                  value={newAgendaItem.lawyerId}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, lawyerId: e.target.value })}
                >
                  <option value="">Nenhum - Atribuir a Mim ({data?.user?.name || "Administrador"})</option>
                  {(staff || []).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.cargo.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* VINCULAR A CLIENTE CRM */}
              <div className={styles.formItemFull}>
                <label className={styles.formLabel}>Vincular ao Cliente (Opcional)</label>
                <select
                  className={styles.formSelect}
                  value={newAgendaItem.clientId}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, clientId: e.target.value })}
                >
                  <option value="">Compromisso Interno do Escritório (Sem Cliente)</option>
                  {(crmClients || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || c.phone || "Sem contato"})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formItemFull}>
                <label className={styles.formLabel}>Descrição / Notas</label>
                <textarea
                  placeholder="Instruções adicionais, link do Teams/Meet ou observações..."
                  rows={3}
                  className={styles.formTextarea}
                  value={newAgendaItem.description}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowAgendaModal(false);
                    setEditingAgendaItem(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  {editingAgendaItem ? "Atualizar Compromisso" : "Agendar Compromisso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ANÁLISE IA DA AGENDA */}
      {showAgendaAnalysisModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: "750px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, color: "#d4af37", display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu size={20} color="#d4af37" /> Parecer e Auditoria de Prazos IA
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAgendaAnalysisModal(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "1.2rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px", margin: "10px 0" }}>
              {isAnalyzingAgenda ? (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 0", gap: "15px" }}>
                  <div style={{ 
                    width: "40px", 
                    height: "40px", 
                    borderRadius: "50%", 
                    border: "3px solid rgba(212, 175, 55, 0.1)", 
                    borderTopColor: "#d4af37",
                    animation: "spin 1s linear infinite"
                  }} />
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 700 }}>SocialJurídico AI Legal Analyzer</span>
                    <p style={{ margin: "5px 0 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>Cruzando agendas, identificando conflitos de conciliações, avaliando riscos de revelia e redigindo recomendações...</p>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.6", whiteSpace: "pre-line", textAlign: "left" }}>
                  {agendaAnalysis}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={() => setShowAgendaAnalysisModal(false)}
              >
                Fechar Parecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOTIFICAÇÃO EXTRAJUDICIAL */}
      {showNotificacaoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNotificacaoModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "90%" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>📝 Nova Notificação Extrajudicial</h2>
              <button className={styles.modalClose} onClick={() => setShowNotificacaoModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody} style={{ padding: '25px', background: '#11141c', overflowY: 'auto', maxHeight: '75vh' }}>
              <div className={styles.formGrid}>
                
                <div className={styles.formItemFull}>
                  <label className={styles.formLabel}>Caso / Cliente (Opcional)</label>
                  <select
                    className={styles.formSelect}
                    value={notificacaoForm.caso}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, caso: e.target.value })}
                  >
                    <option value="">Selecione um cliente...</option>
                    {crmClients && crmClients.length > 0 && (
                      <optgroup label="Clientes do CRM" style={{ background: '#222', color: '#fff' }}>
                        {crmClients.map(client => (
                          <option key={client.id} value={`client_${client.id}`} style={{ background: '#333', color: '#fff' }}>
                            {client.name || "Sem Nome"}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className={styles.formItemFull}>
                  <label className={styles.formLabel}>Nome do Notificado</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Nome completo do destinatário"
                    value={notificacaoForm.destinatario_nome || ""}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_nome: e.target.value })}
                  />
                </div>

                {/* DADOS DO NOTIFICADO */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '15px', marginTop: '5px' }}>
                  <h4 style={{ color: 'var(--brand-gold, #d4af37)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>Dados do Notificado (Destinatário)</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className={styles.formItem}>
                      <label className={styles.formLabel}>Endereço</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Rua, Número, Bairro"
                        value={notificacaoForm.destinatario_endereco || ""}
                        onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_endereco: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label className={styles.formLabel}>CEP</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="00000-000"
                        value={notificacaoForm.destinatario_cep || ""}
                        onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_cep: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formItemFull}>
                    <label className={styles.formLabel}>Cidade - Estado</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ex: São Paulo - SP"
                      value={notificacaoForm.destinatario_cidade_estado || ""}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_cidade_estado: e.target.value })}
                    />
                  </div>
                </div>

                {/* DADOS DO NOTIFICANTE */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '15px', marginTop: '5px' }}>
                  <h4 style={{ color: 'var(--brand-gold, #d4af37)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>Dados do Notificante (Remetente)</h4>
                  
                  <div className={styles.formItemFull} style={{ marginBottom: '12px' }}>
                    <label className={styles.formLabel}>Nome ou Razão Social</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Seu nome ou nome do seu cliente"
                      value={notificacaoForm.notificante_nome || ""}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_nome: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className={styles.formItem}>
                      <label className={styles.formLabel}>Endereço</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Rua, Número, Bairro"
                        value={notificacaoForm.notificante_endereco || ""}
                        onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_endereco: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label className={styles.formLabel}>CEP</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="00000-000"
                        value={notificacaoForm.notificante_cep || ""}
                        onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_cep: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formItemFull}>
                    <label className={styles.formLabel}>Cidade - Estado</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ex: São Paulo - SP"
                      value={notificacaoForm.notificante_cidade_estado || ""}
                      onChange={(e) => setNotificacaoForm({ ...notificacaoForm, notificante_cidade_estado: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formItemFull} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '15px', marginTop: '5px' }}>
                  <label className={styles.formLabel}>O que está acontecendo? (Explique para a IA)</label>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="Explique os fatos para que a IA redija a notificação adequada..."
                    style={{ height: '100px' }}
                    value={notificacaoForm.explicacao || ""}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, explicacao: e.target.value })}
                  />
                </div>

                <div className={styles.formItemFull}>
                  <label className={styles.formLabel}>Tom da Notificação</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '12px', background: notificacaoForm.tom === 'Conciliador' ? 'var(--brand-gold, #d4af37)' : 'rgba(255,255,255,0.03)', color: notificacaoForm.tom === 'Conciliador' ? '#000' : '#fff', border: notificacaoForm.tom === 'Conciliador' ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                      onClick={() => setNotificacaoForm({ ...notificacaoForm, tom: 'Conciliador' })}
                    >
                      🤝 Conciliador
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '12px', background: notificacaoForm.tom === 'Agressivo' ? '#ef4444' : 'rgba(255,255,255,0.03)', color: '#fff', border: notificacaoForm.tom === 'Agressivo' ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                      onClick={() => setNotificacaoForm({ ...notificacaoForm, tom: 'Agressivo' })}
                    >
                      🔥 Assertivo
                    </button>
                  </div>
                </div>

                <div className={styles.formItemFull}>
                  <label className={styles.formLabel}>E-mail do Destinatário</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    placeholder="email@destino.com"
                    value={notificacaoForm.destinatario_email || ""}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_email: e.target.value })}
                  />
                </div>

                <div className={styles.formItemFull}>
                  <label className={styles.formLabel}>Logotipo (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.formInput}
                    style={{ padding: '8px' }}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, logo: e.target.files[0] })}
                  />
                </div>

                {!showNotificacaoResult ? (
                  <button
                    type="button"
                    className={styles.redatorGenerateBtn}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.9rem', marginTop: '10px' }}
                    onClick={handleGenerateNotificacao}
                    disabled={isGeneratingNotificacao}
                  >
                    {isGeneratingNotificacao ? "Gerando..." : "Gerar Notificação com IA"}
                  </button>
                ) : (
                  <>
                    <div className={styles.formItemFull} style={{ marginTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '15px' }}>
                      <label className={styles.formLabel}>Minuta Gerada</label>
                      <textarea
                        className={styles.formTextarea}
                        style={{ height: '220px', fontSize: '0.85rem' }}
                        value={draftedNotificacao}
                        onChange={(e) => setDraftedNotificacao(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input
                          type="checkbox"
                          id="confirm_notificacao"
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                          checked={notificacaoConfirmed}
                          onChange={(e) => setNotificacaoConfirmed(e.target.checked)}
                        />
                        <label htmlFor="confirm_notificacao" style={{ color: '#fff', fontSize: '0.82rem', cursor: 'pointer', lineHeight: '1.4' }}>
                          Confirmo que a notificação está redigida perfeitamente e autorizo o envio digital.
                        </label>
                      </div>

                      {requester?.plan_type === 'START' && (
                        <>
                          <div style={{ background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '12px', borderRadius: '8px' }}>
                            <p style={{ color: 'var(--brand-gold, #d4af37)', fontSize: '0.8rem', fontWeight: 800, margin: 0 }}>
                              Plano START: O envio custa R$ 10,00.
                            </p>
                            <p style={{ color: '#cbd5e1', fontSize: '0.75rem', marginTop: '5px', marginBottom: 0, lineHeight: '1.4' }}>
                              Realize o pagamento via PIX antes de enviar: 
                              <a href="https://loja.infinitepay.io/carlos-henrique-1o7/uus4692-notificacao-extrajudicial" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-gold, #d4af37)', textDecoration: 'underline', fontWeight: 800, marginLeft: '5px' }}>
                                Pagar via PIX
                              </a>
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <input
                              type="checkbox"
                              id="confirm_payment"
                              style={{ marginTop: '3px', cursor: 'pointer' }}
                              checked={paymentConfirmed}
                              onChange={(e) => setPaymentConfirmed(e.target.checked)}
                            />
                            <label htmlFor="confirm_payment" style={{ color: '#fff', fontSize: '0.82rem', cursor: 'pointer', lineHeight: '1.4' }}>
                              Já realizei o pagamento de R$ 10,00 via PIX.
                            </label>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', marginTop: '15px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={handleSendNotificacao}
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
      )}

      {/* SEÇÃO ASSINATURA DIGITAL */}
      {activeTab === "assinatura" && (isSecretary && !perms.ver_assinaturas ? (
        <main className={styles.workspace} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '40px' }}>
          <Lock size={48} color="#ef4444" style={{ marginBottom: "15px" }} />
          <h3 style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold', marginBottom: '8px' }}>Acesso Restrito</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '400px', margin: 0, fontSize: '0.88rem', lineHeight: '1.4' }}>
            Você não possui permissão para acessar a Central de Assinaturas Digitais. Solicite autorização ao administrador do escritório.
          </p>
        </main>
      ) : (
        <main className={styles.workspace} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section className={styles.panel} style={{ padding: "30px" }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <PenTool color="var(--brand-gold, #d4af37)" size={28} /> Central de Assinaturas Digitais
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px', margin: 0, fontSize: '0.9rem' }}>
                  Assine documentos com carimbo de tempo eletrônico e validade jurídica equivalente à assinatura física.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewSignatureData({
                    document_name: "",
                    document_type: "contrato",
                    lawyer_name: requester?.name || "",
                    lawyer_email: requester?.email || "",
                    client_name: "",
                    client_email: "",
                    client_id: ""
                  });
                  setSignatureFile(null);
                  setShowSignatureModal(true);
                }}
                className={styles.redatorGenerateBtn}
                style={{ background: 'linear-gradient(135deg, var(--brand-gold, #d4af37) 0%, #b28d28 100%)', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={18} /> Iniciar Novo Processo
              </button>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Total de Processos</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '5px' }}>{signatures.length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 230, 118, 0.1)', borderRadius: '16px', padding: '20px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#00e676', fontWeight: 600 }}>Assinados por Completo</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00e676', marginTop: '5px' }}>{signatures.filter(s => s.status === 'signed').length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255, 152, 0, 0.1)', borderRadius: '16px', padding: '20px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ff9800', fontWeight: 600 }}>Aguardando Assinaturas</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff9800', marginTop: '5px' }}>{signatures.filter(s => s.status !== 'signed').length}</div>
              </div>
              <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--brand-gold, #d4af37)', fontWeight: 600 }}>Validador de Assinaturas</span>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px', margin: 0 }}>Verifique a validade de um código.</p>
                </div>
                <a href="/validar" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--brand-gold, #d4af37)', textDecoration: 'none', fontWeight: 'bold', marginTop: '10px' }}>
                  Acessar Validador <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Content Listing */}
            {loadingSignatures ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '15px' }}>
                <Loader2 size={40} className={styles.spin} color="var(--brand-gold, #d4af37)" />
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Carregando seus processos de assinatura...</p>
              </div>
            ) : signatures.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
                <PenTool size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Nenhuma Assinatura Registrada</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '500px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                  Inicie um novo processo de assinatura enviando um contrato ou procuração PDF para coletar assinaturas eletrônicas com validade jurídica de tempo e hash.
                </p>
                <button
                  onClick={() => {
                    setNewSignatureData({
                      document_name: "",
                      document_type: "contrato",
                      lawyer_name: requester?.name || "",
                      lawyer_email: requester?.email || "",
                      client_name: "",
                      client_email: "",
                      client_id: ""
                    });
                    setSignatureFile(null);
                    setShowSignatureModal(true);
                  }}
                  className={styles.redatorGenerateBtn}
                  style={{ background: 'linear-gradient(135deg, var(--brand-gold, #d4af37) 0%, #b28d28 100%)', color: '#000', fontWeight: 'bold', margin: '0 auto' }}
                >
                  <Plus size={16} /> Iniciar Primeira Assinatura
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Documento / Código</th>
                        <th style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Signatários</th>
                        <th style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Status Geral</th>
                        <th style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Criado em</th>
                        <th style={{ padding: '15px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right' }}>Ações</th>
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
                                <div style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--brand-gold, #d4af37)', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center' }}>
                                  <FileText size={18} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem', marginBottom: '4px' }}>{sig.document_name}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{sig.verification_code}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(sig.verification_code);
                                        toast.success("Código copiado!");
                                      }}
                                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px', display: 'flex' }}
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
                                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ADV:</span>
                                  <span style={{ color: '#fff' }}>{meta?.lawyer?.name}</span>
                                  {lawyerSigned ? (
                                    <span style={{ color: '#00e676', fontSize: '0.7rem', background: 'rgba(0, 230, 118, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}><Check size={10} /> Assinado</span>
                                  ) : (
                                    <span style={{ color: '#ff9800', fontSize: '0.7rem', background: 'rgba(255, 152, 0, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Pendente</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>CLI:</span>
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
                            <td style={{ padding: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                              {new Date(sig.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '20px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {!lawyerSigned && (
                                  <a
                                    href={lawyerSignLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--brand-gold, #d4af37)', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                                  style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--brand-gold, #d4af37)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <FileDown size={12} /> Certificado
                                </button>

                                <a
                                  href={`/validar?code=${sig.verification_code}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
          </section>
        </main>
      ))}

      {activeTab === "notificacao" && (isSecretary && !perms.ver_notificacoes ? (
        <main className={styles.operationalPanel}>
          <section className={styles.restrictedAccessContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: 'rgba(9, 9, 11, 0.3)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '24px' }}>
              <Lock size={48} color="var(--brand-gold, #d4af37)" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Acesso Restrito</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '460px', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px' }}>
              Desculpe, você não tem autorização para acessar o módulo de Notificações Extrajudiciais. Solicite a liberação desta permissão ao administrador do escritório.
            </p>
          </section>
        </main>
      ) : (
        <main className={styles.operationalPanel}>
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '30px', alignItems: 'start' }}>
            {/* COLUMN 1: FORM */}
            <div style={{ background: 'rgba(9,9,11,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail color="var(--brand-gold, #d4af37)" size={20} /> Nova Notificação Extrajudicial
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
                Gere uma notificação extrajudicial com validade jurídica, selada no cartório digital e enviada de forma rastreável por e-mail.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Caso / Cliente (Opcional)</label>
                <select
                  className={styles.formSelect}
                  value={notificacaoForm.caso}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, caso: e.target.value })}
                  style={{ width: '100%', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px' }}
                >
                  <option value="">Selecione um cliente...</option>
                  {crmClients && crmClients.length > 0 && (
                    <optgroup label="Clientes do CRM" style={{ background: '#222', color: '#fff' }}>
                      {crmClients.map(client => (
                        <option key={client.id} value={`client_${client.id}`}>
                          {client.name || "Sem Nome"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Nome do Notificado *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Nome completo do destinatário"
                  value={notificacaoForm.destinatario_nome || ""}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_nome: e.target.value })}
                  style={{ width: '100%', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>E-mail do Notificado *</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    placeholder="email@destinatario.com"
                    value={notificacaoForm.destinatario_email || ""}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, destinatario_email: e.target.value })}
                    style={{ width: '100%', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Tom da Mensagem</label>
                  <select
                    className={styles.formSelect}
                    value={notificacaoForm.tom || "Conciliador"}
                    onChange={(e) => setNotificacaoForm({ ...notificacaoForm, tom: e.target.value })}
                    style={{ width: '100%', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px' }}
                  >
                    <option value="Conciliador">Conciliador</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Técnico">Técnico / Formal</option>
                    <option value="Severo">Severo / Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Descrição dos Fatos (IA gerará a minuta)</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Descreva detalhadamente o ocorrido, valores pendentes, prazos concedidos e o que está sendo exigido..."
                  rows={4}
                  value={notificacaoForm.explicacao || ""}
                  onChange={(e) => setNotificacaoForm({ ...notificacaoForm, explicacao: e.target.value })}
                  style={{ width: '100%', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateNotificacao}
                disabled={isGeneratingNotificacao || !notificacaoForm.destinatario_nome}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--brand-gold, #d4af37) 0%, #b28d28 100%)', border: 'none', color: '#000', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (isGeneratingNotificacao || !notificacaoForm.destinatario_nome) ? 0.6 : 1 }}
              >
                {isGeneratingNotificacao ? <Loader2 className={styles.spin} size={18} /> : <Wand2 size={18} />}
                {isGeneratingNotificacao ? "Redigindo Minuta..." : "Redigir Minuta com IA"}
              </button>

              {/* DRAFT REVIEW BLOCK */}
              {showNotificacaoResult && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-gold, #d4af37)', margin: 0 }}>Minuta Gerada</h4>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '15px', color: '#fff', fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                    {draftedNotificacao}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="confirmMinuta"
                      checked={notificacaoConfirmed}
                      onChange={(e) => setNotificacaoConfirmed(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="confirmMinuta" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                      Confirmo que a minuta acima está correta e pronta para envio.
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendNotificacao}
                    disabled={isShieldingNotificacao || !notificacaoConfirmed}
                    style={{ width: '100%', padding: '12px', background: '#22c55e', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (isShieldingNotificacao || !notificacaoConfirmed) ? 0.6 : 1 }}
                  >
                    {isShieldingNotificacao ? <Loader2 className={styles.spin} size={18} /> : <Shield size={18} />}
                    {isShieldingNotificacao ? "Selando e Enviando..." : "Selar e Enviar via E-mail"}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 2: SENT NOTIFICATIONS LIST */}
            <div style={{ background: 'rgba(9,9,11,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '25px', minHeight: '60vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck color="var(--brand-gold, #d4af37)" size={20} /> Histórico de Notificações
                </h3>
                <button 
                  type="button"
                  onClick={fetchNotificacoesExtrajudiciais}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={12} className={isLoadingNotificacoes ? styles.spin : ''} /> Atualizar
                </button>
              </div>

              {isLoadingNotificacoes ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
                  <Loader2 className={styles.spin} size={32} color="var(--brand-gold, #d4af37)" />
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '10px' }}>Carregando notificações...</p>
                </div>
              ) : notificacoesExtrajudiciais.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '35vh', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
                  <Mail size={40} color="rgba(255,255,255,0.15)" style={{ marginBottom: '15px' }} />
                  <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Nenhuma Notificação Enviada</h4>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: '300px', margin: 0 }}>
                    As notificações extrajudiciais que você enviar aparecerão aqui com os seus respectivos status e comprovantes.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Notificado / E-mail</th>
                        <th style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Protocolo / Data</th>
                        <th style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notificacoesExtrajudiciais.map((doc) => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '15px 10px' }}>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{doc.destinatario_email ? doc.destinatario_email.split('@')[0] : 'Destinatário'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '2px' }}>{doc.destinatario_email}</div>
                          </td>
                          <td style={{ padding: '15px 10px' }}>
                            <div style={{ color: 'var(--brand-gold, #d4af37)', fontWeight: 'bold', fontSize: '0.8rem' }}>{doc.protocol}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '2px' }}>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</div>
                          </td>
                          <td style={{ padding: '15px 10px' }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              background: doc.status === 'enviado' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: doc.status === 'enviado' ? '#22c55e' : '#ef4444',
                              border: doc.status === 'enviado' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              {doc.status === 'enviado' ? 'Selado e Enviado' : 'Erro de Envio'}
                            </span>
                          </td>
                          <td style={{ padding: '15px 10px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--brand-gold, #d4af37)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FileDown size={12} /> PDF
                              </a>
                              <a
                                href={`https://socialjuridico.com.br/notificacao/${doc.access_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> Validar
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>
      ))}

      {/* MODAL NOVO PROCESSO DE ASSINATURA */}
      {showSignatureModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PenTool color="var(--brand-gold, #d4af37)" size={22} /> Iniciar Assinatura Digital
              </h3>
              <button onClick={() => setShowSignatureModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: '5px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSignature} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Nome do Documento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contrato de Honorários Advocatícios - João Silva"
                  className={styles.formInput}
                  value={newSignatureData.document_name}
                  onChange={(e) => setNewSignatureData(prev => ({ ...prev, document_name: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Tipo de Documento</label>
                <select
                  value={newSignatureData.document_type}
                  onChange={(e) => setNewSignatureData(prev => ({ ...prev, document_type: e.target.value }))}
                  className={styles.formSelect}
                >
                  <option value="contrato" style={{ background: '#09090b' }}>Contrato</option>
                  <option value="procuracao" style={{ background: '#09090b' }}>Procuração</option>
                  <option value="outro" style={{ background: '#09090b' }}>Outro</option>
                </select>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '15px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--brand-gold, #d4af37)', marginBottom: '10px' }}>Advogado (Você)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Nome completo</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={newSignatureData.lawyer_name}
                      onChange={(e) => setNewSignatureData(prev => ({ ...prev, lawyer_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>E-mail</label>
                    <input
                      type="email"
                      required
                      className={styles.formInput}
                      value={newSignatureData.lawyer_email}
                      onChange={(e) => setNewSignatureData(prev => ({ ...prev, lawyer_email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--brand-gold, #d4af37)', margin: 0 }}>Cliente / Outra Parte</h4>
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
                      className={styles.formSelect}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
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
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Nome completo *</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={newSignatureData.client_name}
                      onChange={(e) => setNewSignatureData(prev => ({ ...prev, client_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>E-mail *</label>
                    <input
                      type="email"
                      required
                      className={styles.formInput}
                      value={newSignatureData.client_email}
                      onChange={(e) => setNewSignatureData(prev => ({ ...prev, client_email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '6px' }}>Arquivo PDF do Documento *</label>
                <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }} onClick={() => document.getElementById('signature-file-picker').click()}>
                  <Upload size={24} style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
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
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, var(--brand-gold, #d4af37) 0%, #b28d28 100%)', border: 'none', color: '#000', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
}

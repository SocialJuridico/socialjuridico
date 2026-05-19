"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building, 
  Users, 
  Database, 
  Cpu, 
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
  X
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./EscritorioDashboard.module.css";

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
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [showManageSubs, setShowManageSubs] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [isIaClosingOpen, setIsIaClosingOpen] = useState(false);
  const [iaAnalysisText, setIaAnalysisText] = useState("");
  const [loadingIaAnalysis, setLoadingIaAnalysis] = useState(false);

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
    if (activeTab === "comunicacao") {
      loadCommunication();
      const interval = setInterval(loadCommunication, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "financeiro") {
      loadFinance();
    }
  }, [activeTab]);

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
      {activeTab === "comunicacao" && (
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
      )}

      {/* ======================================================== */}
      {/* SEÇÃO FINANCEIRO & CONTABILIDADE */}
      {/* ======================================================== */}
      {activeTab === "financeiro" && (
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

    </div>
  );
}

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
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
  
  // UI States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showTransparentCheckout, setShowTransparentCheckout] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAnunciosSubmenu, setShowAnunciosSubmenu] = useState(false);

  // CRM & Docs
  const [crmClients, setCrmClients] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [isBlindarProva, setIsBlindarProva] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Document Generation States
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    tipo: "",
    parte1: { nome: "", cpf_cnpj: "", endereco: "", estado_civil: "", profissao: "" },
    parte2: { nome: "", cpf_cnpj: "", endereco: "", estado_civil: "", profissao: "" },
    personality: "Técnica",
    purpose: "",
    comarca: "",
    local: "",
    data: new Date().toISOString().split('T')[0],
  });
  const [showProcuracaoModal, setShowProcuracaoModal] = useState(false);
  const [procuracaoForm, setProcuracaoForm] = useState({
    outorgante: { nome: "", cpf_cnpj: "", endereco: "", estado_civil: "", profissao: "" },
    outorgado: { nome: "", oab: "", cpf: "", endereco: "" },
    poderes: "Ad Judicia et Extra",
    comarca: "",
    local: "",
    data: new Date().toISOString().split('T')[0],
  });
  const [agendaItems, setAgendaItems] = useState([]);

  // CRM Timeline States
  const [interactions, setInteractions] = useState([]);
  const [isFetchingInteractions, setIsFetchingInteractions] = useState(false);
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ content: "", type: "nota" });
  
  const [clientInsight, setClientInsight] = useState("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // Associated Cases States
  const [associatedCases, setAssociatedCases] = useState([]);
  const [isFetchingAssociatedCases, setIsFetchingAssociatedCases] = useState(false);

  // CRM Finance States
  const [clientFinance, setClientFinance] = useState([]);
  const [allFinanceRecords, setAllFinanceRecords] = useState([]);
  const [isFetchingFinance, setIsFetchingFinance] = useState(false);
  const [isFetchingAllFinance, setIsFetchingAllFinance] = useState(false);
  const [isSavingFinance, setIsSavingFinance] = useState(false);
  const [newFinance, setNewFinance] = useState({ description: "", amount: "", due_date: "", status: "PENDENTE" });

  // CRM Agenda / Reminders States
  const [newQuickReminder, setNewQuickReminder] = useState({ title: "", date: "", time: "09:00" });
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // Ads States
  const [highlightedAds, setHighlightedAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [anunciosData, setAnunciosData] = useState([]);
  const [loadingAnuncios, setLoadingAnuncios] = useState(false);
  const [activeAnuncioTab, setActiveAnuncioTab] = useState("PREPOSTOS");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/perfil");
      const data = await res.json();
      if (data.success) {
        setProfileData(data.data);
        setUserName(data.data.name);
      }
    } catch (e) {
      console.error("Erro ao buscar perfil:", e);
    }
  }, []);

  const fetchNotificacoes = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setNotificacoes(data.data || []);
    } catch (e) {
      console.error("Erro ao buscar notificações:", e);
    }
  }, []);

  // Computed Values
  const unreadMessagesCount = useMemo(() => {
    return notificacoes.filter((n) => !n.lida).length;
  }, [notificacoes]);

  const isPro = useMemo(() => profileData?.plan_type === 'PRO', [profileData]);
  const isPremium = useMemo(() => profileData?.is_premium || profileData?.plan_type === 'START', [profileData]);

  const financialStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyRecords = allFinanceRecords.filter(f => {
      if (!f.due_date) return false;
      // Parsing robusto para evitar problemas de fuso horário com ISO strings
      const parts = f.due_date.split('-'); // Esperado: YYYY-MM-DD
      if (parts.length < 2) return false;
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months são 0-index
      return month === currentMonth && year === currentYear;
    });

    const previsto = monthlyRecords.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const recebido = monthlyRecords
      .filter(f => f.status === 'PAGO')
      .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    return { previsto, recebido, count: monthlyRecords.length };
  }, [allFinanceRecords]);

  // --- ACTIONS ---

  const PRO_TABS = [
    "crm",
    "docs",
    "redator",
    "agenda",
    "calculadora",
    "juris",
    "triagem",
    "blindagem",
    "assinatura",
  ];

  const fetchIndicacoes = useCallback(async () => {
    // Implementação será movida para cá depois
  }, []);

  const fetchAnuncios = useCallback(async (categoria) => {
    console.log(`[DashboardContext] Fetching anuncios for: ${categoria}`);
    setLoadingAnuncios(true);
    try {
      const res = await fetch(`/api/anuncios?categoria=${categoria.toUpperCase()}`);
      const data = await res.json();
      console.log(`[DashboardContext] Anuncios data received:`, data);
      if (data.success) {
        setAnunciosData(data.data || []);
        setActiveAnuncioTab(categoria.toUpperCase());
      }
    } catch (err) {
      console.error("[DashboardContext] Error fetching anuncios:", err);
    } finally {
      setLoadingAnuncios(false);
    }
  }, []);

  const fetchHighlightedAd = useCallback(async () => {
    try {
      const res = await fetch("/api/anuncios?destaque=true");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setHighlightedAds(data.data);
      }
    } catch (err) {
       console.error(err);
    }
  }, []);

  const handleTabChange = useCallback(async (tab) => {
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
    
    if (tab === "crm") {
      fetchCrmClients();
      fetchAllFinance();
    }
    
    if (tab === "indicacoes") {
      fetchIndicacoes();
    }
    
    const planType = profileData?.plan_type || 'FREE';
    const restrictedToPro = ["calculadora", "juris"];

    if (PRO_TABS.includes(tab)) {
      if (!profileData?.is_premium) {
        setShowProModal(true);
        return;
      }
      
      if (planType === 'START' && restrictedToPro.includes(tab)) {
         toast.error("Esta ferramenta é exclusiva para o plano PRO.");
         setShowProModal(true);
         return;
      }
    }
    
    if (tab.startsWith("anuncios-")) {
       const cat = tab.split("-")[1];
       fetchAnuncios(cat);
    }

    if (tab === "minhas-mensagens" && unreadMessagesCount > 0) {
      try {
        await fetch("/api/notificacoes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lida: true })
        });
        fetchNotificacoes();
      } catch (e) {
        console.error("Erro ao marcar lidas:", e);
      }
    }

    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [profileData, unreadMessagesCount, fetchIndicacoes, fetchAnuncios, fetchNotificacoes]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
      toast.error("Erro ao sair");
    }
  }, []);

  // Auto-rotate highlighted ads every 10 seconds
  useEffect(() => {
    if (highlightedAds.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % highlightedAds.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [highlightedAds.length]);


  const fetchCrmClients = useCallback(async () => {
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
  }, []);

  const fetchInteractions = useCallback(async (clientId) => {
    if (!clientId) return;
    setIsFetchingInteractions(true);
    try {
      const res = await fetch(`/api/crm/interactions?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setInteractions(data.data);
      }
    } catch (err) {
      console.error("Erro ao buscar interações:", err);
    } finally {
      setIsFetchingInteractions(false);
    }
  }, []);

  const fetchClientInsight = useCallback(async (clientId) => {
    if (!clientId) return;
    setIsGeneratingInsight(true);
    setClientInsight("");
    try {
      const res = await fetch(`/api/crm/insights?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClientInsight(data.insight);
      } else if (data.limitReached) {
        setClientInsight("LIMIT_REACHED");
      }
    } catch (err) {
      console.error("Erro ao buscar insights:", err);
    } finally {
      setIsGeneratingInsight(false);
    }
  }, []);

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
      toast.error("Erro ao salvar interação");
    } finally {
      setIsSavingInteraction(false);
    }
  };

  const fetchAssociatedCases = useCallback(async (client) => {
    if (!client || (!client.email && !client.cpf_cnpj)) return;
    setIsFetchingAssociatedCases(true);
    try {
      const res = await fetch(`/api/crm/client-cases?email=${client.email || ''}&cpf_cnpj=${client.cpf_cnpj || ''}`);
      const data = await res.json();
      if (data.success) {
        setAssociatedCases(data.data);
      }
    } catch (err) {
      console.error("Erro ao buscar casos associados:", err);
    } finally {
      setIsFetchingAssociatedCases(false);
    }
  }, []);

  const fetchClientFinance = useCallback(async (clientId) => {
    if (!clientId) return;
    setIsFetchingFinance(true);
    try {
      const res = await fetch(`/api/crm/finance?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClientFinance(data.data);
      }
    } catch (err) {
      console.error("Erro ao buscar financeiro:", err);
    } finally {
      setIsFetchingFinance(false);
    }
  }, []);

  const fetchAllFinance = useCallback(async () => {
    setIsFetchingAllFinance(true);
    try {
      const res = await fetch("/api/crm/finance");
      const data = await res.json();
      if (data.success) {
        setAllFinanceRecords(data.data || []);
      }
    } catch (err) {
      console.error("Erro ao buscar finanças globais:", err);
    } finally {
      setIsFetchingAllFinance(false);
    }
  }, []);

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
        setNewFinance({ description: "", amount: "", due_date: "", status: "PENDENTE" });
        fetchClientFinance(selectedClient.id);
        fetchAllFinance();
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
        fetchClientFinance(item.client_id);
        fetchAllFinance();
      }
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/agenda");
      const data = await res.json();
      if (data.success) setAgendaItems(data.data || []);
    } catch (err) {
      console.error("Erro ao buscar agenda:", err);
    }
  }, []);

  const handleSaveQuickReminder = async () => {
    if (!selectedClient || !newQuickReminder.title || !newQuickReminder.date) return;
    
    setIsSavingReminder(true);
    const dateObj = new Date(`${newQuickReminder.date}T${newQuickReminder.time}`);
    
    try {
      const res = await fetch("/api/crm/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `CRM: ${selectedClient.name} - ${newQuickReminder.title}`,
          date: dateObj.toISOString(),
          description: `Follow-up agendado pelo CRM para o cliente ${selectedClient.name}`,
          type: "Outro",
          urgency: "Média",
          client_id: selectedClient.id,
          status: "PENDING",
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Lembrete adicionado à sua agenda!");
        setNewQuickReminder({ title: "", date: "", time: "09:00" });
        fetchAgenda(); // Atualiza a agenda global
      }
    } catch (err) {
      toast.error("Erro ao salvar lembrete");
    } finally {
      setIsSavingReminder(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProfile();
    fetchNotificacoes();
    fetchHighlightedAd();
    fetchAgenda();
    fetchCrmClients();
    fetchAllFinance();
  }, [fetchProfile, fetchNotificacoes, fetchHighlightedAd, fetchAgenda, fetchCrmClients, fetchAllFinance]);

  const fetchClientDocuments = useCallback(async (clientId) => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/crm/documents?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) setClientDocuments(data.data);
    } catch (e) {
      console.error("Erro docs:", e);
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
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
            fetchProfile();
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
  }, [selectedClient, isBlindarProva, profileData, fetchClientDocuments, fetchProfile, setShowBuyModal]);

  const handleQuickDocGenerate = (type) => {
    if (!selectedClient) return;

    const clientInfo = {
      nome: selectedClient.name || "",
      cpf_cnpj: selectedClient.cpf_cnpj || "",
      endereco: selectedClient.address || "",
      estado_civil: selectedClient.civil_status || "",
      profissao: selectedClient.profession || ""
    };

    if (type === 'PROCURACAO') {
      setProcuracaoForm(prev => ({
        ...prev,
        outorgante: clientInfo,
        outorgado: {
          nome: profileData?.name || "",
          oab: profileData?.oab || "",
          cpf: "", 
          endereco: "" 
        }
      }));
      setShowProcuracaoModal(true);
    } else if (type === 'CONTRATO') {
      setContractForm(prev => ({
        ...prev,
        parte1: clientInfo,
        parte2: {
          nome: profileData?.name || "",
          cpf_cnpj: "",
          endereco: "",
          estado_civil: "",
          profissao: "Advogado(a)"
        }
      }));
      setShowContratoModal(true);
    }
    
    setShowDossierModal(false);
    toast.success("Dados importados do CRM com sucesso!");
  };

  const handleGenerateReport = useCallback(() => {
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

      // --- IA INSIGHTS (KYC) ---
      let finalY = 45;
      if (clientInsight) {
        doc.setFillColor(252, 251, 247);
        doc.rect(14, finalY, 182, 25, 'F');
        doc.setDrawColor(212, 175, 55);
        doc.rect(14, finalY, 182, 25);
        
        doc.setFontSize(12);
        doc.setTextColor(184, 134, 11);
        doc.setFont("helvetica", "bold");
        doc.text("IA Insights (KYC Avancado)", 20, finalY + 8);
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.setFont("helvetica", "italic");
        const splitInsight = doc.splitTextToSize(clientInsight, 170);
        doc.text(splitInsight, 20, finalY + 15);
        finalY += 35;
      }

      // Dados do Cliente (Seção)
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Dados Pessoais & Contato", 14, finalY);

      const personalData = [
        ["Nome", selectedClient.name],
        ["Tipo", selectedClient.type || "Pessoa Fisica"],
        ["CPF/CNPJ", selectedClient.cpf_cnpj || "---"],
        ["RG/IE", selectedClient.rg || "---"],
        ["Estado Civil", selectedClient.civil_status || "---"],
        ["Profissao", selectedClient.profession || "---"],
        ["Email", selectedClient.email || "---"],
        ["Telefone", selectedClient.phone || "---"],
        ["Endereco", selectedClient.address || "---"],
      ];

      autoTable(doc, {
        startY: finalY + 5,
        head: [["Campo", "Valor"]],
        body: personalData,
        theme: "striped",
        headStyles: { fillColor: [212, 175, 55] },
      });

      finalY = doc.lastAutoTable.finalY + 15;

      // Financeiro
      if (clientFinance.length > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
        doc.setFontSize(16);
        doc.text("Historico Financeiro", 14, finalY);

        const financeRows = clientFinance.map(f => [
          f.description,
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.amount),
          f.due_date ? new Date(f.due_date).toLocaleDateString('pt-BR') : '---',
          f.status
        ]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [["Descricao", "Valor", "Vencimento", "Status"]],
          body: financeRows,
          theme: "grid",
          headStyles: { fillColor: [16, 185, 129] }, // Verde Esmeralda
        });
        finalY = doc.lastAutoTable.finalY + 15;
      }

      // Timeline
      if (interactions.length > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
        doc.setFontSize(16);
        doc.text("Historico de Interacoes (Timeline)", 14, finalY);
        
        const interactionRows = interactions.map(item => [
          new Date(item.created_at).toLocaleString('pt-BR'),
          item.type.toUpperCase(),
          item.content
        ]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [["Data/Hora", "Tipo", "Descricao"]],
          body: interactionRows,
          theme: "grid",
          headStyles: { fillColor: [40, 40, 40] },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { cellWidth: 'auto' }
          }
        });
        finalY = doc.lastAutoTable.finalY + 15;
      }

      // Documentos
      if (clientDocuments.length > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
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
          headStyles: { fillColor: [100, 100, 100] },
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
  }, [selectedClient, clientInsight, clientFinance, interactions, clientDocuments]);

  const value = {
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
    refreshProfile: fetchProfile,
    refreshNotificacoes: fetchNotificacoes,
    highlightedAds, setHighlightedAds,
    currentAdIndex, setCurrentAdIndex,
    anunciosData, setAnunciosData,
    loadingAnuncios, setLoadingAnuncios,
    activeAnuncioTab, setActiveAnuncioTab,
    fetchAnuncios,
    fetchHighlightedAd,
    // CRM Core
    crmClients, setCrmClients,
    loadingCrm, setLoadingCrm,
    selectedClient, setSelectedClient,
    showDossierModal, setShowDossierModal,
    clientDocuments, setClientDocuments,
    isUploading, setIsUploading,
    isGeneratingReport, setIsGeneratingReport,
    isExtractingPDF, setIsExtractingPDF,
    fetchCrmClients,
    // CRM Timeline
    interactions, setInteractions,
    isFetchingInteractions, setIsFetchingInteractions,
    newInteraction, setNewInteraction,
    isSavingInteraction, setIsSavingInteraction,
    clientFinance, setClientFinance,
    isFetchingFinance, setIsFetchingFinance,
    isSavingFinance, setIsSavingFinance,
    newFinance, setNewFinance,
    newQuickReminder, setNewQuickReminder,
    isSavingReminder, setIsSavingReminder,
    associatedCases, setAssociatedCases,
    isFetchingAssociatedCases, setIsFetchingAssociatedCases,
    agendaItems, setAgendaItems,
    fetchInteractions,
    handleSaveInteraction,
    fetchClientInsight,
    clientInsight, setClientInsight,
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
    handleExtractPDF: async (file) => {
      setIsExtractingPDF(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/crm/extract-pdf", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Dados extraídos com sucesso!");
          return data.data;
        } else {
          toast.error(data.message || "Erro ao extrair dados");
          return null;
        }
      } catch (error) {
        toast.error("Erro na conexão com o servidor");
        return null;
      } finally {
        setIsExtractingPDF(false);
      }
    },
    handleQuickDocGenerate,
    handleGenerateReport,
    // Doc Gen
    showContratoModal, setShowContratoModal,
    contractForm, setContractForm,
    showProcuracaoModal, setShowProcuracaoModal,
    procuracaoForm, setProcuracaoForm,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

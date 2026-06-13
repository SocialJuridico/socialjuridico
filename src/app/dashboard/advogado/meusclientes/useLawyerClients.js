"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_FORM = {
  name: "",
  type: "Pessoa Física",
  cpfCnpj: "",
  rg: "",
  civilStatus: "",
  profession: "",
  phone: "",
  address: "",
  email: "",
  notes: "",
  status: "Ativo",
};

const EMPTY_FINANCE = {
  description: "",
  amount: "",
  dueDate: new Date().toISOString().slice(0, 10),
  status: "PENDENTE",
};

const EMPTY_USAGE = {
  crmClients: { used: 0, limit: 0, remaining: 0 },
  aiCapture: {
    planType: "FREE",
    used: 0,
    limit: 0,
    remaining: 0,
    jurisCost: 0,
    balance: 0,
    canUse: false,
    limitReached: false,
    insufficientJuris: false,
    monthly: true,
  },
};

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function mapExtracted(data = {}) {
  return {
    name: data.nome_completo || "",
    type: data.tipo || "Pessoa Física",
    cpfCnpj: data.cpf_cnpj || "",
    rg: data.rg_ie || "",
    civilStatus: data.estado_civil || "",
    profession: data.profissao || "",
    phone: data.telefone || "",
    address: data.endereco_completo || "",
    email: data.email || "",
    notes: data.notas_internas || "",
    status: "Ativo",
  };
}

export function useLawyerClients() {
  const router = useRouter();
  const session = useLawyerSession();
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [permissions, setPermissions] = useState({
    canDelegate: false,
    canUseAiCapture: false,
  });
  const [plan, setPlan] = useState({ type: "FREE", maxClients: 0 });
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    highRisk: 0,
    expected: 0,
    received: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    scope: "all",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const pdfInputRef = useRef(null);

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceStage, setVoiceStage] = useState("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef(null);
  const latestTranscriptRef = useRef("");
  const finalTranscriptRef = useRef("");
  const finishVoiceRef = useRef(false);
  const processingVoiceRef = useRef(false);

  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossier, setDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState("overview");
  const [interactionForm, setInteractionForm] = useState({
    type: "nota",
    content: "",
  });
  const [financeForm, setFinanceForm] = useState(EMPTY_FINANCE);
  const [dossierAction, setDossierAction] = useState("");
  const documentInputRef = useRef(null);
  const [protectDocument, setProtectDocument] = useState(false);
  const [insight, setInsight] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(filters.search.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      try {
        recognitionRef.current?.abort?.();
      } catch {
        // O reconhecimento pode já ter sido finalizado pelo navegador.
      }
    },
    [],
  );

  const mergeAiUsage = useCallback((nextUsage) => {
    if (!nextUsage) return;
    setUsage((current) => {
      const currentAi = current.aiCapture || EMPTY_USAGE.aiCapture;
      const used = Number(nextUsage.used ?? currentAi.used ?? 0);
      const limit = Number(nextUsage.limit ?? currentAi.limit ?? 0);
      const jurisCost = Number(
        nextUsage.jurisCost ?? currentAi.jurisCost ?? nextUsage.jurisCharged ?? 0,
      );
      const balance = Number(nextUsage.balance ?? currentAi.balance ?? 0);
      const remaining = Math.max(
        Number(nextUsage.remaining ?? limit - used),
        0,
      );
      return {
        ...current,
        aiCapture: {
          ...currentAi,
          ...nextUsage,
          used,
          limit,
          remaining,
          jurisCost,
          balance,
          limitReached: limit > 0 && remaining === 0,
          insufficientJuris: jurisCost > 0 && balance < jurisCost,
          canUse:
            limit > 0 && remaining > 0 && (jurisCost === 0 || balance >= jurisCost),
        },
      };
    });
  }, []);

  const load = useCallback(
    async (targetPage = 1) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pagination.pageSize),
        status: filters.status,
        scope: filters.scope,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      try {
        const response = await fetch(`/api/advogado/clientes?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await readJson(response);
        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/meusclientes")}`,
          );
          return;
        }
        if (response.status === 403 && data?.upgradeRequired) {
          session.openPlansModal();
          throw new Error(data.message);
        }
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível carregar os clientes.");
        }
        setItems(data.data || []);
        setMembers(data.members || []);
        setPermissions(data.permissions || {});
        setPlan(data.plan || { type: "FREE", maxClients: 0 });
        setUsage(data.usage || EMPTY_USAGE);
        setMetrics(data.metrics || {});
        setPagination(data.pagination || {});
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[Clientes] Falha ao carregar:", loadError);
        setError(loadError.message || "Não foi possível carregar os clientes.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, [
      debouncedSearch,
      filters.scope,
      filters.status,
      pagination.pageSize,
      router,
      session.openPlansModal,
    ],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  function resetForm() {
    setFormOpen(false);
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }

  function openCreate(prefill = null) {
    setEditingClient(null);
    setForm(prefill || EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(client) {
    setDossierOpen(false);
    setEditingClient(client);
    setForm({
      name: client.name || "",
      type: client.type || "Pessoa Física",
      cpfCnpj: client.cpfCnpj || "",
      rg: client.rg || "",
      civilStatus: client.civilStatus || "",
      profession: client.profession || "",
      phone: client.phone || "",
      address: client.address || "",
      email: client.email || "",
      notes: client.notes || "",
      status: client.status || "Ativo",
    });
    setFieldErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    if (!saving) resetForm();
  }

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function openDossier(clientId) {
    setDossierOpen(true);
    setDossierLoading(true);
    setActiveDossierTab("overview");
    setInsight("");
    try {
      const response = await fetch(`/api/advogado/clientes/${clientId}`, {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar o dossiê.");
      }
      setDossier(data.data);
    } catch (dossierError) {
      toast.error(dossierError.message || "Não foi possível carregar o dossiê.");
      setDossierOpen(false);
    } finally {
      setDossierLoading(false);
    }
  }

  async function saveClient(event) {
    event?.preventDefault();
    if (saving) return;
    const editedId = editingClient?.id || null;
    setSaving(true);
    try {
      const response = await fetch(
        editedId ? `/api/advogado/clientes/${editedId}` : "/api/advogado/clientes",
        {
          method: editedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, requestId: createRequestId() }),
        },
      );
      const data = await readJson(response);
      if (response.status === 403 && data?.quotaExceeded) {
        session.openPlansModal();
      }
      if (!response.ok || !data?.success) {
        if (data?.errors) setFieldErrors(data.errors);
        throw new Error(data?.message || "Não foi possível salvar o cliente.");
      }
      toast.success(data.message || "Cliente salvo.");
      resetForm();
      await load(1);
      if (editedId) await openDossier(editedId);
    } catch (saveError) {
      toast.error(saveError.message || "Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshDossier() {
    if (dossier?.client?.id) await openDossier(dossier.client.id);
  }

  async function delegateClient(clientId, lawyerId) {
    setDossierAction("delegate");
    try {
      const response = await fetch(`/api/advogado/clientes/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delegate",
          lawyerId,
          requestId: createRequestId(),
        }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível delegar o cliente.");
      }
      toast.success(data.message);
      await load(pagination.page);
      await openDossier(clientId);
    } catch (delegateError) {
      toast.error(delegateError.message || "Não foi possível delegar o cliente.");
    } finally {
      setDossierAction("");
    }
  }

  async function addInteraction(event) {
    event?.preventDefault();
    if (!dossier?.client?.id || !interactionForm.content.trim()) return;
    setDossierAction("interaction");
    try {
      const response = await fetch(
        `/api/advogado/clientes/${dossier.client.id}/interacoes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...interactionForm,
            requestId: createRequestId(),
          }),
        },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message);
      setDossier((current) => ({
        ...current,
        interactions: [data.data, ...(current.interactions || [])],
      }));
      setInteractionForm({ type: "nota", content: "" });
      toast.success(data.message);
    } catch (actionError) {
      toast.error(actionError.message || "Erro ao registrar interação.");
    } finally {
      setDossierAction("");
    }
  }

  async function addFinance(event) {
    event?.preventDefault();
    if (!dossier?.client?.id) return;
    setDossierAction("finance");
    try {
      const response = await fetch(
        `/api/advogado/clientes/${dossier.client.id}/financeiro`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...financeForm, requestId: createRequestId() }),
        },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message);
      setDossier((current) => ({
        ...current,
        finance: [...(current.finance || []), data.data],
      }));
      setFinanceForm(EMPTY_FINANCE);
      toast.success(data.message);
      await load(pagination.page);
    } catch (actionError) {
      toast.error(actionError.message || "Erro ao salvar lançamento.");
    } finally {
      setDossierAction("");
    }
  }

  async function toggleFinance(item) {
    if (!dossier?.client?.id) return;
    const status = item.status === "PAGO" ? "PENDENTE" : "PAGO";
    setDossierAction(item.id);
    try {
      const response = await fetch(
        `/api/advogado/clientes/${dossier.client.id}/financeiro`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            financeId: item.id,
            status,
            requestId: createRequestId(),
          }),
        },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message);
      setDossier((current) => ({
        ...current,
        finance: current.finance.map((finance) =>
          finance.id === item.id ? data.data : finance,
        ),
      }));
      toast.success(data.message);
      await load(pagination.page);
    } catch (actionError) {
      toast.error(actionError.message || "Erro ao atualizar pagamento.");
    } finally {
      setDossierAction("");
    }
  }

  async function uploadDocument(file) {
    if (!file || !dossier?.client?.id) return;
    setDossierAction("document");
    const body = new FormData();
    body.append("file", file);
    body.append("protect", String(protectDocument));
    body.append("requestId", createRequestId());
    try {
      const response = await fetch(
        `/api/advogado/clientes/${dossier.client.id}/documentos`,
        { method: "POST", body },
      );
      const data = await readJson(response);
      if (response.status === 402 && data?.insufficientCredits) {
        session.openPlansModal();
      }
      if (!response.ok || !data?.success) throw new Error(data?.message);
      setDossier((current) => ({
        ...current,
        documents: [data.data, ...(current.documents || [])],
      }));
      setProtectDocument(false);
      toast.success(data.message);
    } catch (actionError) {
      toast.error(actionError.message || "Erro ao anexar documento.");
    } finally {
      setDossierAction("");
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  async function deleteDocument(documentId) {
    if (!dossier?.client?.id) return;
    setDossierAction(documentId);
    try {
      const response = await fetch(
        `/api/advogado/clientes/${dossier.client.id}/documentos`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            requestId: createRequestId(),
          }),
        },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message);
      setDossier((current) => ({
        ...current,
        documents: current.documents.filter((item) => item.id !== documentId),
      }));
      toast.success(data.message);
    } catch (actionError) {
      toast.error(actionError.message || "Erro ao excluir documento.");
    } finally {
      setDossierAction("");
    }
  }

  async function generateInsight() {
    if (!dossier?.client?.id) return;
    setDossierAction("insight");
    try {
      const response = await fetch(
        `/api/advogado/clientes/${dossier.client.id}/insight`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: createRequestId() }),
        },
      );
      const data = await readJson(response);
      if (response.status === 403 && data?.limitReached) session.openPlansModal();
      if (!response.ok || !data?.success) throw new Error(data?.message);
      setInsight(data.insight);
      toast.success("Insight KYC atualizado.");
    } catch (actionError) {
      toast.error(actionError.message || "Erro ao gerar insight.");
    } finally {
      setDossierAction("");
    }
  }

  function explainAiBlock() {
    const policy = usage.aiCapture || EMPTY_USAGE.aiCapture;
    if (policy.planType === "FREE") {
      session.openPlansModal();
      return "O cadastro inteligente está disponível nos planos START e PRO.";
    }
    if (policy.limitReached) {
      return `Você utilizou os ${policy.limit} cadastros inteligentes disponíveis neste mês.`;
    }
    if (policy.insufficientJuris) {
      return `O plano START utiliza ${policy.jurisCost} Juris por processamento. Seu saldo atual é ${policy.balance}.`;
    }
    return "O cadastro inteligente não está disponível agora.";
  }

  function openPdfCapture() {
    const policy = usage.aiCapture || EMPTY_USAGE.aiCapture;
    if (!policy.canUse) {
      toast.error(explainAiBlock());
      return;
    }
    pdfInputRef.current?.click();
  }

  async function extractFromFile(file) {
    if (!file) return;
    const policy = usage.aiCapture || EMPTY_USAGE.aiCapture;
    if (!policy.canUse) {
      toast.error(explainAiBlock());
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      return;
    }
    setExtracting(true);
    try {
      const response = await fetch("/api/crm/extract-pdf", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
          "X-Request-Id": createRequestId(),
        },
        body: file,
      });
      const data = await readJson(response);
      if (data?.usage) mergeAiUsage(data.usage);
      if (response.status === 403 && data?.upgradeRequired) session.openPlansModal();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível extrair os dados.");
      }
      await session.refreshProfile?.();
      openCreate(mapExtracted(data.data));
      toast.success(`${data.message} Revise os dados antes de salvar.`);
    } catch (extractError) {
      toast.error(extractError.message || "Erro ao extrair dados.");
      await load(pagination.page);
    } finally {
      setExtracting(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  function openVoiceCapture() {
    setVoiceTranscript("");
    latestTranscriptRef.current = "";
    finalTranscriptRef.current = "";
    finishVoiceRef.current = false;
    processingVoiceRef.current = false;
    setVoiceStage("idle");
    setVoiceModalOpen(true);
  }

  function cancelVoiceCapture() {
    finishVoiceRef.current = false;
    processingVoiceRef.current = false;
    try {
      recognitionRef.current?.abort?.();
    } catch {
      // O navegador pode já ter encerrado o reconhecimento.
    }
    recognitionRef.current = null;
    setVoiceStage("idle");
    setVoiceModalOpen(false);
  }

  const processVoiceTranscript = useCallback(
    async (text) => {
      const transcript = String(text || "").trim();
      if (processingVoiceRef.current || transcript.length < 5) {
        if (transcript.length < 5) {
          setVoiceStage("idle");
          toast.error("Fale os dados do cliente antes de concluir.");
        }
        return;
      }

      processingVoiceRef.current = true;
      setVoiceStage("processing");
      try {
        const response = await fetch("/api/crm/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript, requestId: createRequestId() }),
        });
        const data = await readJson(response);
        if (data?.usage) mergeAiUsage(data.usage);
        if (response.status === 403 && data?.upgradeRequired) session.openPlansModal();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível processar a fala.");
        }

        await session.refreshProfile?.();
        setVoiceModalOpen(false);
        setVoiceStage("idle");
        openCreate(mapExtracted(data.data));
        toast.success(`${data.message} Revise os dados antes de salvar.`);
      } catch (voiceError) {
        toast.error(voiceError.message || "Erro ao processar o comando.");
        setVoiceStage("idle");
        await load(pagination.page);
      } finally {
        processingVoiceRef.current = false;
        finishVoiceRef.current = false;
      }
    }, [
      load,
      mergeAiUsage,
      pagination.page,
      session.openPlansModal,
      session.refreshProfile,
    ],
  );

  function beginVoiceCapture() {
    const policy = usage.aiCapture || EMPTY_USAGE.aiCapture;
    if (!policy.canUse) {
      toast.error(explainAiBlock());
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    latestTranscriptRef.current = "";
    finalTranscriptRef.current = "";
    finishVoiceRef.current = false;

    recognition.onstart = () => setVoiceStage("listening");
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = finalTranscriptRef.current;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const chunk = event.results[index]?.[0]?.transcript || "";
        if (event.results[index].isFinal) finalText += ` ${chunk}`;
        else interim += ` ${chunk}`;
      }
      finalTranscriptRef.current = finalText.trim();
      latestTranscriptRef.current = `${finalText} ${interim}`.trim();
      setVoiceTranscript(latestTranscriptRef.current);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error("Não foi possível utilizar o microfone.");
      }
      if (!finishVoiceRef.current) setVoiceStage("idle");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (finishVoiceRef.current) {
        void processVoiceTranscript(latestTranscriptRef.current);
      } else if (!processingVoiceRef.current) {
        setVoiceStage("idle");
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceStage("idle");
      toast.error("Não foi possível iniciar o microfone.");
    }
  }

  function finishVoiceCapture() {
    const transcript = latestTranscriptRef.current.trim();
    if (transcript.length < 5) {
      toast.error("Fale os dados do cliente antes de concluir.");
      return;
    }
    finishVoiceRef.current = true;
    setVoiceStage("processing");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        void processVoiceTranscript(transcript);
      }
    } else {
      void processVoiceTranscript(transcript);
    }
  }

  async function generateReport() {
    if (!dossier?.client) return;
    setDossierAction("report");
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;
      const doc = new jsPDF();
      const client = dossier.client;
      doc.setFontSize(20);
      doc.text("Social Jurídico — Dossiê do Cliente", 14, 20);
      doc.setFontSize(9);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 28);
      autoTable(doc, {
        startY: 36,
        head: [["Campo", "Valor"]],
        body: [
          ["Nome", client.name],
          ["Tipo", client.type],
          ["CPF/CNPJ", client.cpfCnpj || "—"],
          ["E-mail", client.email || "—"],
          ["Telefone", client.phone || "—"],
          ["Profissão", client.profession || "—"],
          ["Responsável", client.lawyerName || "—"],
          ["Status", client.status],
        ],
      });
      let startY = doc.lastAutoTable.finalY + 10;
      if (insight) {
        const lines = doc.splitTextToSize(`Insight KYC: ${insight}`, 180);
        doc.text(lines, 14, startY);
        startY += lines.length * 5 + 8;
      }
      if (dossier.finance?.length) {
        autoTable(doc, {
          startY,
          head: [["Financeiro", "Valor", "Vencimento", "Status"]],
          body: dossier.finance.map((item) => [
            item.description,
            Number(item.amount).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
            item.due_date || "—",
            item.status,
          ]),
        });
        startY = doc.lastAutoTable.finalY + 10;
      }
      if (dossier.interactions?.length) {
        autoTable(doc, {
          startY,
          head: [["Data", "Tipo", "Interação"]],
          body: dossier.interactions.map((item) => [
            new Date(item.created_at).toLocaleString("pt-BR"),
            item.type,
            item.content,
          ]),
        });
      }
      doc.save(`dossie-${client.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Dossiê exportado.");
    } catch (reportError) {
      console.error(reportError);
      toast.error("Não foi possível gerar o relatório.");
    } finally {
      setDossierAction("");
    }
  }

  const currentRange = useMemo(() => {
    if (!pagination.total) return "0 clientes";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.pageSize);
    return `${start}–${end} de ${pagination.total}`;
  }, [pagination]);

  return {
    ...session,
    items,
    members,
    permissions,
    plan,
    usage,
    metrics,
    pagination,
    filters,
    setFilters,
    loading,
    error,
    load,
    reload: () => load(pagination.page),
    currentRange,
    formOpen,
    editingClient,
    form,
    fieldErrors,
    openCreate,
    openEdit,
    closeForm,
    updateForm,
    saveClient,
    saving,
    pdfInputRef,
    extracting,
    openPdfCapture,
    extractFromFile,
    voiceModalOpen,
    voiceStage,
    voiceTranscript,
    openVoiceCapture,
    beginVoiceCapture,
    finishVoiceCapture,
    cancelVoiceCapture,
    dossierOpen,
    setDossierOpen,
    dossier,
    dossierLoading,
    openDossier,
    activeDossierTab,
    setActiveDossierTab,
    refreshDossier,
    delegateClient,
    dossierAction,
    interactionForm,
    setInteractionForm,
    addInteraction,
    financeForm,
    setFinanceForm,
    addFinance,
    toggleFinance,
    documentInputRef,
    protectDocument,
    setProtectDocument,
    uploadDocument,
    deleteDocument,
    insight,
    generateInsight,
    generateReport,
  };
}

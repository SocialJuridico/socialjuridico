"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLawyerSession } from "../../LawyerSessionContext";

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

const EMPTY_MANUAL_PARTY = {
  nome: "",
  tipo: "pessoa_fisica",
  documento: "",
  email: "",
  telefone: "",
  observacoes: "",
};

export function formatCnj(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 20) return value || "";
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const normalized = String(value);
  if (/^\d{14}$/.test(normalized)) {
    return `${normalized.slice(6, 8)}/${normalized.slice(4, 6)}/${normalized.slice(0, 4)}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalized;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeParty(item = {}) {
  return {
    nome: item.nome || item.name || item.razao_social || "",
    tipo: item.tipo || item.type || "nao_informado",
    documento: item.documento || item.cpf_cnpj || item.document || "",
    email: item.email || "",
    telefone: item.telefone || item.phone || "",
    observacoes: item.observacoes || item.notes || "",
    raw: item,
  };
}

export function useLawyerProcesses() {
  const session = useLawyerSession();
  const { openPlansModal } = session;
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState({ canUse: true });
  const [cnj, setCnj] = useState("");
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folder, setFolder] = useState(null);
  const [clientMode, setClientMode] = useState("manual");
  const [selectedPartyIndex, setSelectedPartyIndex] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [manualClient, setManualClient] = useState(EMPTY_MANUAL_PARTY);
  const [opposingParty, setOpposingParty] = useState({
    ...EMPTY_MANUAL_PARTY,
    tipo: "pessoa_juridica",
  });
  const [deleting, setDeleting] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/advogado/processos?page=${page}&pageSize=12`, {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (response.status === 403 && data?.upgradeRequired) {
        setPermissions({ canUse: false });
        openPlansModal();
        throw new Error(data.message);
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar os processos.");
      }
      setPermissions({ canUse: true });
      setItems(data.data || []);
      setPagination(data.pagination || { page, pageSize: 12, total: 0, totalPages: 1 });
    } catch (loadError) {
      setError(loadError.message || "Não foi possível carregar os processos.");
    } finally {
      setLoading(false);
    }
  }, [openPlansModal]);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const response = await fetch("/api/advogado/clientes?page=1&pageSize=30&status=all&scope=all", {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (response.ok && data?.success) setClients(data.data || []);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([load(1), loadClients()]);
  }, [load, loadClients]);

  const previewData = preview?.data || null;
  const parties = useMemo(
    () => (Array.isArray(previewData?.partes) ? previewData.partes.map(normalizeParty) : []),
    [previewData],
  );
  const warnings = Array.isArray(previewData?.avisos) ? previewData.avisos : [];
  const movements = Array.isArray(previewData?.ultimas_movimentacoes)
    ? previewData.ultimas_movimentacoes
    : [];
  const subjects = Array.isArray(previewData?.capa?.assuntos) ? previewData.capa.assuntos : [];

  function updateManualClient(field, value) {
    setManualClient((current) => ({ ...current, [field]: value }));
  }

  function updateOpposingParty(field, value) {
    setOpposingParty((current) => ({ ...current, [field]: value }));
  }

  function resetImportState() {
    setPreview(null);
    setClientMode("manual");
    setSelectedPartyIndex("");
    setSelectedClientId("");
    setManualClient(EMPTY_MANUAL_PARTY);
    setOpposingParty({ ...EMPTY_MANUAL_PARTY, tipo: "pessoa_juridica" });
  }

  async function searchProcess(event) {
    event?.preventDefault();
    const numero = String(cnj || "").replace(/\D/g, "");
    if (numero.length !== 20) {
      toast.error("Informe um número CNJ válido com 20 dígitos.");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch("/api/advogado/processos/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroProcesso: numero, requestId: createRequestId() }),
      });
      const data = await readJson(response);
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
        throw new Error(data.message);
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível buscar o processo.");
      }

      setPreview(data);
      const incomingParties = Array.isArray(data.data?.partes) ? data.data.partes : [];
      setClientMode(incomingParties.length ? "party" : "manual");
      setSelectedPartyIndex(incomingParties.length ? "0" : "");
      toast.success("Processo encontrado. Revise antes de importar.");
    } catch (searchError) {
      toast.error(searchError.message || "Não foi possível buscar o processo.");
    } finally {
      setSearching(false);
    }
  }

  function buildDownloadPayload() {
    const numeroProcesso = previewData?.numero_cnj || cnj;
    const payload = { numeroProcesso, requestId: createRequestId() };

    if (clientMode === "existing") {
      payload.clientId = selectedClientId;
    } else if (clientMode === "party") {
      payload.selectedParty = parties[Number(selectedPartyIndex)] || null;
    } else {
      payload.cliente = manualClient;
    }

    if (opposingParty.nome.trim()) {
      payload.parteContraria = opposingParty;
    }

    return payload;
  }

  function validateBeforeImport() {
    if (clientMode === "existing" && !selectedClientId) {
      return "Selecione um cliente do CRM.";
    }
    if (clientMode === "party" && !parties[Number(selectedPartyIndex)]?.nome) {
      return "Selecione qual parte será o cliente.";
    }
    if (clientMode === "manual" && manualClient.nome.trim().length < 2) {
      return "Informe o nome do cliente.";
    }
    return "";
  }

  async function importProcess() {
    const validationMessage = validateBeforeImport();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/advogado/processos/baixar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildDownloadPayload()),
      });
      const data = await readJson(response);
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
        throw new Error(data.message);
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível importar o processo.");
      }

      toast.success(data.message || "Processo importado com sucesso para o CRM.");
      resetImportState();
      setCnj("");
      await Promise.all([load(1), loadClients()]);
      if (data.data?.processo?.id) await openFolder(data.data.processo.id);
    } catch (saveError) {
      toast.error(saveError.message || "Não foi possível importar o processo.");
    } finally {
      setSaving(false);
    }
  }

  const openFolder = useCallback(async (processId) => {
    setFolderOpen(true);
    setFolderLoading(true);
    setFolder(null);
    try {
      const response = await fetch(`/api/advogado/processos/${processId}`, { cache: "no-store" });
      const data = await readJson(response);
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
        throw new Error(data.message);
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível abrir a pasta do processo.");
      }
      setFolder(data.data);
    } catch (folderError) {
      toast.error(folderError.message || "Não foi possível abrir a pasta do processo.");
      setFolderOpen(false);
    } finally {
      setFolderLoading(false);
    }
  }, [openPlansModal]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const openId = params.get("open");
      if (openId) {
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("open");
        const newSearch = newParams.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
        window.history.replaceState(null, "", newUrl);

        void openFolder(openId);
      }
    }
  }, [openFolder]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [processIdToDelete, setProcessIdToDelete] = useState(null);

  const requestDeleteProcess = useCallback((processId) => {
    setProcessIdToDelete(processId);
    setDeleteConfirmOpen(true);
  }, []);

  const cancelDeleteProcess = useCallback(() => {
    setProcessIdToDelete(null);
    setDeleteConfirmOpen(false);
  }, []);

  const confirmDeleteProcess = useCallback(async () => {
    if (!processIdToDelete) return false;
    setDeleting(true);
    try {
      const response = await fetch(`/api/advogado/processos/${processIdToDelete}`, {
        method: "DELETE",
      });
      const data = await readJson(response);
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
        throw new Error(data.message);
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível excluir o processo.");
      }
      toast.success(data.message || "Processo excluído com sucesso.");
      
      if (folder?.process?.id === processIdToDelete) {
        setFolderOpen(false);
        setFolder(null);
      }

      setItems((prev) => prev.filter((item) => item.id !== processIdToDelete));
      await load(pagination.page);
      setDeleteConfirmOpen(false);
      setProcessIdToDelete(null);
      return true;
    } catch (err) {
      toast.error(err.message || "Não foi possível excluir o processo.");
      return false;
    } finally {
      setDeleting(false);
    }
  }, [processIdToDelete, load, pagination.page, folder, openPlansModal]);

  const generateSummary = useCallback(async (processId) => {
    if (!processId) return;
    setGeneratingSummary(true);
    try {
      const response = await fetch(`/api/advogado/processos/${processId}/resumo`, {
        method: "POST",
      });
      const data = await readJson(response);
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
        throw new Error(data.message);
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível gerar o resumo.");
      }
      
      toast.success("Resumo gerado com sucesso!");
      
      setFolder((prev) => {
        if (prev && prev.process && prev.process.id === processId) {
          return {
            ...prev,
            process: {
              ...prev.process,
              resumoIa: data.resumoIa,
            },
          };
        }
        return prev;
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === processId ? { ...item, resumoIa: data.resumoIa } : item
        )
      );
    } catch (err) {
      toast.error(err.message || "Erro ao gerar o resumo do processo.");
    } finally {
      setGeneratingSummary(false);
    }
  }, [openPlansModal]);

  return {
    items,
    clients,
    pagination,
    loading,
    clientsLoading,
    error,
    cnj,
    setCnj,
    searching,
    permissions,
    preview,
    previewData,
    parties,
    warnings,
    movements,
    subjects,
    saving,
    clientMode,
    setClientMode,
    selectedPartyIndex,
    setSelectedPartyIndex,
    selectedClientId,
    setSelectedClientId,
    manualClient,
    updateManualClient,
    opposingParty,
    updateOpposingParty,
    searchProcess,
    importProcess,
    resetImportState,
    load,
    folderOpen,
    setFolderOpen,
    folderLoading,
    folder,
    openFolder,
    deleting,
    deleteConfirmOpen,
    requestDeleteProcess,
    cancelDeleteProcess,
    confirmDeleteProcess,
    generatingSummary,
    generateSummary,
  };
}

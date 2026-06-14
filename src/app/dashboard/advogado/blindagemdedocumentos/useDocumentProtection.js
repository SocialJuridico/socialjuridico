"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";
import { downloadDocumentProtectionCertificate } from "./documentProtectionCertificate";

const EMPTY_USAGE = {
  usedStorageMb: 0,
  storageLimitMb: 0,
  remainingStorageMb: 0,
  percentage: 0,
};

const EMPTY_PAGINATION = {
  page: 1,
  pageSize: 18,
  total: 0,
  totalPages: 1,
};

const LEGACY_SOURCE_BY_TYPE = Object.freeze({
  Contrato: "contratos",
  "Procuração": "procuracoes",
  "Prova Digital": "provas",
  "Notificação": "notificacoes",
});

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

function mapLegacyDocument(row) {
  const source = LEGACY_SOURCE_BY_TYPE[row.type];
  return {
    id: row.id,
    source,
    legacy: true,
    protocol: row.protocol || null,
    fileName: row.file_name || "Documento legado",
    fileUrl: source
      ? `/api/advogado/blindagemdedocumentos/${row.id}/arquivo?legacySource=${source}`
      : row.file_url || null,
    documentType: row.type || "Outros",
    protected: true,
    hash: row.hash_sha512 || null,
    hashAlgorithm: row.hash_sha512 ? "SHA-512" : null,
    fileSizeBytes: Number(row.file_size_bytes || 0),
    clientId: row.client_id || null,
    clientName: row.client_name || null,
    lawyerId: row.lawyer_id || null,
    lawyerName: row.lawyer_name || "Advogado responsável",
    uploadIp: row.upload_ip || null,
    userAgent: row.user_agent || null,
    canDelete: false,
    createdAt: row.created_at,
    protectedAt: row.created_at,
  };
}

export function formatProtectionSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "Tamanho não informado";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function useDocumentProtection() {
  const router = useRouter();
  const session = useLawyerSession();
  const { openJurisModal, openPlansModal, refreshProfile } = session;
  const [items, setItems] = useState([]);
  const [legacyItems, setLegacyItems] = useState([]);
  const [legacyLoaded, setLegacyLoaded] = useState(false);
  const [collection, setCollection] = useState("current");
  const [clients, setClients] = useState([]);
  const [plan, setPlan] = useState({
    type: "FREE",
    balance: 0,
    protectCost: 0,
    included: false,
  });
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [metrics, setMetrics] = useState({ protected: 0, linked: 0, legacy: 0 });
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [legacyPage, setLegacyPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", type: "all" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [error, setError] = useState("");
  const [legacyError, setLegacyError] = useState("");
  const abortRef = useRef(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFileState] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedType, setSelectedType] = useState("Outros");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const uploadRequestIdRef = useRef("");

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
    },
    [],
  );

  const loadCurrent = useCallback(
    async (targetPage = 1) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pagination.pageSize),
        type: filters.type,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      try {
        const response = await fetch(
          `/api/advogado/blindagemdedocumentos?${params}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readJson(response);
        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/blindagemdedocumentos")}`,
          );
          return;
        }
        if (response.status === 403 && data?.upgradeRequired) {
          openPlansModal();
          throw new Error(data.message);
        }
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível carregar os documentos blindados.",
          );
        }

        setItems(data.data || []);
        setClients(data.clients || []);
        setPlan(
          data.plan || {
            type: "FREE",
            balance: 0,
            protectCost: 0,
            included: false,
          },
        );
        setUsage(data.usage || EMPTY_USAGE);
        setMetrics(data.metrics || {});
        setPagination(data.pagination || EMPTY_PAGINATION);
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[Blindagem] Falha ao carregar:", loadError);
        setError(
          loadError.message || "Não foi possível carregar os documentos blindados.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, [debouncedSearch, filters.type, openPlansModal, pagination.pageSize, router],
  );

  const loadLegacy = useCallback(async (force = false) => {
    if (legacyLoaded && !force) return;
    setLegacyLoading(true);
    setLegacyError("");
    try {
      const response = await fetch("/api/crm/blindagem", { cache: "no-store" });
      const data = await readJson(response);
      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/blindagemdedocumentos")}`,
        );
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar os registros legados.",
        );
      }
      const mapped = (data.data || [])
        .map(mapLegacyDocument)
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        );
      setLegacyItems(mapped);
      setLegacyLoaded(true);
      setMetrics((current) => ({ ...current, legacy: mapped.length }));
    } catch (loadError) {
      console.error("[Blindagem/Legado] Falha ao carregar:", loadError);
      setLegacyError(
        loadError.message || "Não foi possível carregar os registros legados.",
      );
    } finally {
      setLegacyLoading(false);
    }
  }, [legacyLoaded, router]);

  useEffect(() => {
    if (collection === "current") void loadCurrent(1);
  }, [collection, loadCurrent]);

  useEffect(() => {
    if (collection === "legacy") void loadLegacy();
  }, [collection, loadLegacy]);

  useEffect(() => {
    if (collection === "legacy") setLegacyPage(1);
  }, [collection, debouncedSearch, filters.type]);

  const resetUploadState = useCallback(() => {
    setUploadOpen(false);
    setSelectedFileState(null);
    setSelectedClientId("");
    setSelectedType("Outros");
    uploadRequestIdRef.current = "";
  }, []);

  const openUpload = useCallback(() => {
    resetUploadState();
    uploadRequestIdRef.current = createRequestId();
    setUploadOpen(true);
  }, [resetUploadState]);

  const closeUpload = useCallback(() => {
    if (uploading) return;
    resetUploadState();
  }, [resetUploadState, uploading]);

  const setSelectedFile = useCallback((file) => {
    setSelectedFileState(file || null);
    uploadRequestIdRef.current = file ? createRequestId() : "";
  }, []);

  const uploadDocument = useCallback(
    async (event) => {
      event?.preventDefault();
      if (!selectedFile || uploading) return;
      if (plan.type === "START" && plan.balance < plan.protectCost) {
        openJurisModal();
        toast.error(
          `A blindagem requer ${plan.protectCost || 3} Juris. Seu saldo atual é ${plan.balance || 0}.`,
        );
        return;
      }

      if (!uploadRequestIdRef.current) {
        uploadRequestIdRef.current = createRequestId();
      }
      setUploading(true);
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("clientId", selectedClientId);
      body.append("type", selectedType);
      body.append("requestId", uploadRequestIdRef.current);

      try {
        const response = await fetch("/api/advogado/blindagemdedocumentos", {
          method: "POST",
          body,
        });
        const data = await readJson(response);
        if (response.status === 402 && data?.insufficientJuris) openJurisModal();
        if (response.status === 403 && data?.upgradeRequired) openPlansModal();
        if (response.status === 409 && data?.alreadyProtected) {
          toast.error(data.message || "Este conteúdo já foi blindado.");
          resetUploadState();
          await Promise.all([loadCurrent(1), refreshProfile?.()]);
          return;
        }
        if (!response.ok || !data?.success) {
          if (data?.refunded || data?.code === "OPERATION_REFUNDED") {
            uploadRequestIdRef.current = createRequestId();
          }
          throw new Error(data?.message || "Não foi possível blindar o documento.");
        }

        toast.success(data.message || "Documento blindado.");
        resetUploadState();
        setCollection("current");
        await Promise.all([loadCurrent(1), refreshProfile?.()]);
      } catch (uploadError) {
        toast.error(uploadError.message || "Não foi possível blindar o documento.");
        await loadCurrent(pagination.page);
      } finally {
        setUploading(false);
      }
    }, [
      loadCurrent,
      openJurisModal,
      openPlansModal,
      pagination.page,
      plan.balance,
      plan.protectCost,
      plan.type,
      refreshProfile,
      resetUploadState,
      selectedClientId,
      selectedFile,
      selectedType,
      uploading,
    ],
  );

  const deleteDocument = useCallback(
    async (document) => {
      if (!document?.id || !document.canDelete || deletingId) return;
      const confirmed = window.confirm(
        `Excluir definitivamente o documento blindado “${document.fileName}”?`,
      );
      if (!confirmed) return;

      setDeletingId(document.id);
      try {
        const response = await fetch(
          `/api/advogado/blindagemdedocumentos/${document.id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: createRequestId() }),
          },
        );
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível excluir o documento.");
        }
        toast.success(data.message || "Documento excluído.");
        await Promise.all([
          loadCurrent(
            items.length === 1 && pagination.page > 1
              ? pagination.page - 1
              : pagination.page,
          ),
          refreshProfile?.(),
        ]);
      } catch (deleteError) {
        toast.error(deleteError.message || "Não foi possível excluir o documento.");
      } finally {
        setDeletingId("");
      }
    }, [deletingId, items.length, loadCurrent, pagination.page, refreshProfile],
  );

  const openDocument = useCallback((document) => {
    if (!document?.fileUrl) return;
    window.open(document.fileUrl, "_blank", "noopener,noreferrer");
  }, []);

  const copyHash = useCallback(async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast.success("Hash SHA-512 copiado.");
    } catch {
      toast.error("Não foi possível copiar o hash.");
    }
  }, []);

  const downloadCertificate = useCallback(async (document) => {
    if (!document?.id || certificateId) return;
    setCertificateId(document.id);
    try {
      await downloadDocumentProtectionCertificate(document);
      toast.success("Certificado de blindagem gerado.");
    } catch (certificateError) {
      toast.error(
        certificateError.message || "Não foi possível gerar o certificado.",
      );
    } finally {
      setCertificateId("");
    }
  }, [certificateId]);

  const filteredLegacyItems = useMemo(() => {
    const search = debouncedSearch.toLocaleLowerCase("pt-BR");
    return legacyItems.filter((document) => {
      if (filters.type !== "all" && document.documentType !== filters.type) {
        return false;
      }
      if (!search) return true;
      return [
        document.fileName,
        document.documentType,
        document.protocol,
        document.hash,
        document.clientName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search);
    });
  }, [debouncedSearch, filters.type, legacyItems]);

  const legacyPagination = useMemo(() => ({
    page: legacyPage,
    pageSize: pagination.pageSize || 18,
    total: filteredLegacyItems.length,
    totalPages: Math.max(
      1,
      Math.ceil(filteredLegacyItems.length / (pagination.pageSize || 18)),
    ),
  }), [filteredLegacyItems.length, legacyPage, pagination.pageSize]);

  const visibleLegacyItems = useMemo(() => {
    const from = (legacyPagination.page - 1) * legacyPagination.pageSize;
    return filteredLegacyItems.slice(from, from + legacyPagination.pageSize);
  }, [filteredLegacyItems, legacyPagination]);

  const activeItems = collection === "legacy" ? visibleLegacyItems : items;
  const activePagination = collection === "legacy" ? legacyPagination : pagination;
  const activeLoading = collection === "legacy" ? legacyLoading : loading;
  const activeError = collection === "legacy" ? legacyError : error;

  const load = useCallback(
    async (targetPage = 1) => {
      if (collection === "legacy") {
        setLegacyPage(targetPage);
        if (!legacyLoaded) await loadLegacy();
        return;
      }
      await loadCurrent(targetPage);
    },
    [collection, legacyLoaded, loadCurrent, loadLegacy],
  );

  const reload = useCallback(() => {
    if (collection === "legacy") return loadLegacy(true);
    return loadCurrent(pagination.page);
  }, [collection, loadCurrent, loadLegacy, pagination.page]);

  const currentRange = useMemo(() => {
    if (!activePagination.total) return "0 documentos";
    const start = (activePagination.page - 1) * activePagination.pageSize + 1;
    const end = Math.min(
      activePagination.total,
      activePagination.page * activePagination.pageSize,
    );
    return `${start}–${end} de ${activePagination.total}`;
  }, [activePagination]);

  return {
    ...session,
    collection,
    setCollection,
    items: activeItems,
    clients,
    plan,
    usage,
    metrics,
    pagination: activePagination,
    filters,
    setFilters,
    loading: activeLoading,
    error: activeError,
    load,
    reload,
    currentRange,
    uploadOpen,
    openUpload,
    closeUpload,
    selectedFile,
    setSelectedFile,
    selectedClientId,
    setSelectedClientId,
    selectedType,
    setSelectedType,
    uploading,
    uploadDocument,
    deletingId,
    deleteDocument,
    openDocument,
    copyHash,
    certificateId,
    downloadCertificate,
  };
}

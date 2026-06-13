"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_USAGE = {
  usedStorageMb: 0,
  storageLimitMb: 0,
  remainingStorageMb: 0,
  percentage: 0,
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
  const [clients, setClients] = useState([]);
  const [plan, setPlan] = useState({
    type: "FREE",
    balance: 0,
    protectCost: 0,
    included: false,
  });
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [metrics, setMetrics] = useState({ protected: 0, linked: 0, legacy: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 18,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({ search: "", type: "all" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFileState] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedType, setSelectedType] = useState("Outros");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const fileInputRef = useRef(null);
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
        setPagination(data.pagination || {});
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

  useEffect(() => {
    void load(1);
  }, [load]);

  const resetUploadState = useCallback(() => {
    setUploadOpen(false);
    setSelectedFileState(null);
    setSelectedClientId("");
    setSelectedType("Outros");
    uploadRequestIdRef.current = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (!file && fileInputRef.current) fileInputRef.current.value = "";
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
        if (response.status === 402 && data?.insufficientJuris) {
          openJurisModal();
        }
        if (response.status === 403 && data?.upgradeRequired) {
          openPlansModal();
        }
        if (response.status === 409 && data?.alreadyProtected) {
          toast.error(data.message || "Este conteúdo já foi blindado.");
          resetUploadState();
          await Promise.all([load(1), refreshProfile?.()]);
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
        await Promise.all([load(1), refreshProfile?.()]);
      } catch (uploadError) {
        toast.error(uploadError.message || "Não foi possível blindar o documento.");
        await load(pagination.page);
      } finally {
        setUploading(false);
      }
    }, [
      load,
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
          load(
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
    }, [deletingId, items.length, load, pagination.page, refreshProfile],
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

  const currentRange = useMemo(() => {
    if (!pagination.total) return "0 documentos";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.pageSize);
    return `${start}–${end} de ${pagination.total}`;
  }, [pagination]);

  return {
    ...session,
    items,
    clients,
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
    fileInputRef,
  };
}

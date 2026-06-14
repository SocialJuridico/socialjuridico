"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";

export const DOCUMENT_TYPES = [
  "Petição Inicial",
  "Contestação",
  "Contrato de Honorários",
  "Procuração",
  "Procuração Ad Judicia",
  "Procuração Ad Judicia et Extra",
  "Parecer Jurídico",
  "Recurso",
  "Embargos",
  "Manifestação",
  "Notificação Extrajudicial",
];

export const TONES = ["Formal", "Agressivo", "Conciliador", "Técnico"];

const EMPTY_CONFIG = {
  type: "Petição Inicial",
  tone: "Formal",
  clientId: "",
  clientName: "",
  facts: "",
};

const EMPTY_USAGE = {
  used: 0,
  limit: 0,
  remaining: 0,
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

function buildFileName(type, clientName) {
  const safeType = String(type || "minuta").replace(/\s+/g, "_");
  const safeClient = String(clientName || "Minuta").replace(/\s+/g, "_");
  return `${safeType}_${safeClient}.pdf`;
}

export function useRedatorIa() {
  const router = useRouter();
  const session = useLawyerSession();
  const { openPlansModal, refreshProfile } = session;
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [draft, setDraft] = useState("");
  const [clients, setClients] = useState([]);
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [plan, setPlan] = useState({ type: "FREE" });
  const [permissions, setPermissions] = useState({
    canUse: false,
    permissionDenied: false,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(createRequestId());

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === config.clientId) || null,
    [clients, config.clientId],
  );

  const updateConfig = useCallback((patch) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/advogado/redator-ia", {
        cache: "no-store",
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/redator-ia")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
      }
      if (response.status === 403 && data?.permissionDenied) {
        setPermissions({
          canUse: false,
          permissionDenied: true,
        });
        setPlan(data.plan || { type: "FREE" });
        setUsage(data.usage || EMPTY_USAGE);
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar o Redator IA.");
      }

      setClients(data.clients || []);
      setUsage(data.usage || EMPTY_USAGE);
      setPlan(data.plan || { type: "FREE" });
      setPermissions(data.permissions || { canUse: false });
    } catch (loadError) {
      console.error("[RedatorIA] Falha ao carregar:", loadError);
      setError(loadError.message || "Não foi possível carregar o Redator IA.");
    } finally {
      setLoading(false);
    }
  }, [openPlansModal, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectClient = useCallback(
    (clientId) => {
      const client = clients.find((item) => item.id === clientId);
      updateConfig({
        clientId,
        clientName: client?.name || "",
      });
    },
    [clients, updateConfig],
  );

  const generateDraft = useCallback(async () => {
    if (!config.type || !config.facts.trim()) {
      toast.error("Preencha o tipo de peça e os fatos.");
      return;
    }
    if (config.facts.trim().length < 40) {
      toast.error("Descreva os fatos com um pouco mais de contexto.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/advogado/redator-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          ...config,
        }),
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/redator-ia")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível gerar a minuta.");
      }

      setDraft(data.draft || "");
      setUsage(data.usage || usage);
      requestIdRef.current = createRequestId();
      await refreshProfile();
      toast.success("Minuta gerada com sucesso.");
    } catch (generateError) {
      console.error("[RedatorIA] Falha ao gerar:", generateError);
      toast.error(generateError.message || "Erro de conexão ao gerar minuta.");
    } finally {
      setGenerating(false);
    }
  }, [config, openPlansModal, refreshProfile, router, usage]);

  const copyDraft = useCallback(async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    toast.success("Minuta copiada.");
  }, [draft]);

  const downloadPdf = useCallback(() => {
    if (!draft) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(draft, contentWidth);
    let cursor = margin;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    lines.forEach((line) => {
      if (cursor > pageHeight - margin) {
        doc.addPage();
        cursor = margin;
      }
      doc.text(line, margin, cursor);
      cursor += 7;
    });

    doc.save(buildFileName(config.type, config.clientName));
    toast.success("PDF gerado.");
  }, [config.clientName, config.type, draft]);

  const clearDraft = useCallback(() => {
    setDraft("");
    requestIdRef.current = createRequestId();
  }, []);

  return {
    profileData: session.profileData,
    loadingProfile: session.loadingProfile,
    sessionError: session.sessionError,
    clients,
    selectedClient,
    config,
    updateConfig,
    selectClient,
    draft,
    usage,
    plan,
    permissions,
    loading,
    error,
    generating,
    generateDraft,
    copyDraft,
    downloadPdf,
    clearDraft,
    reload: load,
  };
}

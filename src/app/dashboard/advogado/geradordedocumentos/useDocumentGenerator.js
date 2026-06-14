"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";
import {
  buildDocumentFileName,
  buildGenerationPayload,
  composeGeneratedDocument,
  createEmptyContract,
  createEmptyPowerOfAttorney,
  validateDocumentForm,
} from "./documentGeneratorUtils";

const EMPTY_USAGE = Object.freeze({
  used: 0,
  limit: 0,
  remaining: 0,
  percentage: 0,
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

function writePdf(documentText, fileName) {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lines = doc.splitTextToSize(String(documentText || ""), contentWidth);
  let cursor = margin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  lines.forEach((line, index) => {
    if (cursor > pageHeight - margin) {
      doc.addPage();
      cursor = margin;
    }
    if (index === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(line, pageWidth / 2, cursor, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      cursor += 10;
      return;
    }
    doc.text(line, margin, cursor);
    cursor += line ? 6 : 4;
  });

  doc.save(fileName);
}

export function useDocumentGenerator() {
  const router = useRouter();
  const session = useLawyerSession();
  const { openPlansModal, refreshProfile } = session;
  const [mode, setMode] = useState("contract");
  const [contract, setContract] = useState(() => createEmptyContract());
  const [powerOfAttorney, setPowerOfAttorney] = useState(() =>
    createEmptyPowerOfAttorney(session.profileData),
  );
  const [documentText, setDocumentText] = useState("");
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

  useEffect(() => {
    if (!session.profileData) return;
    setPowerOfAttorney((current) => ({
      ...current,
      attorney: {
        ...current.attorney,
        name: current.attorney.name || session.profileData.name || "",
        oab: current.attorney.oab || session.profileData.oab || "",
      },
    }));
  }, [session.profileData]);

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
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/geradordedocumentos")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
      }
      if (response.status === 403 && data?.permissionDenied) {
        setPermissions({ canUse: false, permissionDenied: true });
        setUsage(data.usage || EMPTY_USAGE);
        setPlan(data.plan || { type: "FREE" });
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar o Gerador de Documentos.",
        );
      }

      setUsage(data.usage || EMPTY_USAGE);
      setPlan(data.plan || { type: "FREE" });
      setPermissions(data.permissions || { canUse: false });
    } catch (loadError) {
      console.error("[GeradorDocumentos] Falha ao carregar:", loadError);
      setError(
        loadError.message || "Não foi possível carregar o Gerador de Documentos.",
      );
    } finally {
      setLoading(false);
    }
  }, [openPlansModal, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateContract = useCallback((patch) => {
    setContract((current) => ({ ...current, ...patch }));
  }, []);

  const updateContractParty = useCallback((party, patch) => {
    setContract((current) => ({
      ...current,
      [party]: { ...current[party], ...patch },
    }));
  }, []);

  const updatePowerOfAttorney = useCallback((patch) => {
    setPowerOfAttorney((current) => ({ ...current, ...patch }));
  }, []);

  const updatePowerParty = useCallback((party, patch) => {
    setPowerOfAttorney((current) => ({
      ...current,
      [party]: { ...current[party], ...patch },
    }));
  }, []);

  const changeMode = useCallback((nextMode) => {
    setMode(nextMode);
    setDocumentText("");
    requestIdRef.current = createRequestId();
  }, []);

  const generateDocument = useCallback(async () => {
    const validationError = validateDocumentForm(
      mode,
      contract,
      powerOfAttorney,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setGenerating(true);
    try {
      const payload = buildGenerationPayload(mode, contract, powerOfAttorney);
      const response = await fetch("/api/advogado/redator-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          clientId: "",
          clientName: "",
          ...payload,
        }),
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/geradordedocumentos")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) openPlansModal();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível gerar o documento.");
      }

      setDocumentText(
        composeGeneratedDocument(
          mode,
          data.draft,
          contract,
          powerOfAttorney,
        ),
      );
      setUsage(data.usage || usage);
      requestIdRef.current = createRequestId();
      await refreshProfile();
      toast.success("Documento gerado com sucesso.");
    } catch (generateError) {
      console.error("[GeradorDocumentos] Falha na geração:", generateError);
      toast.error(
        generateError.message || "Erro de conexão ao gerar o documento.",
      );
    } finally {
      setGenerating(false);
    }
  }, [
    contract,
    mode,
    openPlansModal,
    powerOfAttorney,
    refreshProfile,
    router,
    usage,
  ]);

  const copyDocument = useCallback(async () => {
    if (!documentText) return;
    await navigator.clipboard.writeText(documentText);
    toast.success("Documento copiado.");
  }, [documentText]);

  const downloadPdf = useCallback(() => {
    if (!documentText) return;
    writePdf(documentText, buildDocumentFileName(mode, contract));
    toast.success("PDF gerado.");
  }, [contract, documentText, mode]);

  const clearDocument = useCallback(() => {
    setDocumentText("");
    requestIdRef.current = createRequestId();
  }, []);

  return {
    ...session,
    mode,
    changeMode,
    contract,
    updateContract,
    updateContractParty,
    powerOfAttorney,
    updatePowerOfAttorney,
    updatePowerParty,
    documentText,
    usage,
    plan,
    permissions,
    loading,
    generating,
    error,
    reload: load,
    generateDocument,
    copyDocument,
    downloadPdf,
    clearDocument,
  };
}

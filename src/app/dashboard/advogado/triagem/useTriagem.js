"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";

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

function writeWrapped(doc, text, x, y, width, lineHeight = 6) {
  const lines = doc.splitTextToSize(String(text || "Não informado"), width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function writeList(doc, title, items, x, y, width) {
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  doc.setFont("helvetica", "normal");
  let cursor = y + 8;
  (items?.length ? items : ["Não informado"]).forEach((item, index) => {
    cursor = writeWrapped(doc, `${index + 1}. ${item}`, x, cursor, width, 5) + 4;
  });
  return cursor;
}

export function useTriagem() {
  const router = useRouter();
  const session = useLawyerSession();
  const { openPlansModal, refreshProfile } = session;
  const [report, setReport] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [plan, setPlan] = useState({ type: "FREE" });
  const [permissions, setPermissions] = useState({ canUse: false });
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(createRequestId());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/advogado/triagem", {
        cache: "no-store",
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/triagem")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) openPlansModal();
      if (response.status === 403 && data?.permissionDenied) {
        setPermissions({ canUse: false, permissionDenied: true });
        setUsage(data.usage || EMPTY_USAGE);
        setPlan(data.plan || { type: "FREE" });
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar a Triagem IA.");
      }

      setUsage(data.usage || EMPTY_USAGE);
      setPlan(data.plan || { type: "FREE" });
      setPermissions(data.permissions || { canUse: false });
    } catch (loadError) {
      console.error("[TriagemIA] Falha ao carregar:", loadError);
      setError(loadError.message || "Não foi possível carregar a Triagem IA.");
    } finally {
      setLoading(false);
    }
  }, [openPlansModal, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const analyze = useCallback(async () => {
    if (report.trim().length < 60) {
      toast.error("Inclua mais detalhes do relato para uma triagem útil.");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/advogado/triagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          report,
        }),
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/triagem")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) openPlansModal();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível processar a triagem.");
      }

      setDiagnosis(data.diagnosis);
      setUsage(data.usage || usage);
      requestIdRef.current = createRequestId();
      await refreshProfile();
      toast.success("Triagem concluída.");
    } catch (analysisError) {
      console.error("[TriagemIA] Falha ao analisar:", analysisError);
      toast.error(analysisError.message || "Erro de conexão ao analisar relato.");
    } finally {
      setAnalyzing(false);
    }
  }, [openPlansModal, refreshProfile, report, router, usage]);

  const reset = useCallback(() => {
    setReport("");
    setDiagnosis(null);
    requestIdRef.current = createRequestId();
  }, []);

  const downloadPdf = useCallback(() => {
    if (!diagnosis) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const width = pageWidth - margin * 2;
    let y = 20;

    function ensureSpace(size = 32) {
      if (y + size <= pageHeight - 18) return;
      doc.addPage();
      y = 18;
    }

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, 36, "F");
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SocialJurídico", margin, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Relatório de Triagem Inteligente IA", margin, 28);

    doc.setTextColor(0, 0, 0);
    y = 50;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("1. Resumo Executivo", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = writeWrapped(doc, diagnosis.executiveSummary, margin, y, width) + 8;

    ensureSpace();
    doc.setFont("helvetica", "bold");
    doc.text("2. Diagnóstico", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const rows = [
      ["Área", diagnosis.area],
      ["Urgência", diagnosis.urgency],
      ["Complexidade", diagnosis.estimatedComplexity],
      ["Risco", diagnosis.riskLevel],
      ["Viabilidade", diagnosis.viability?.level],
      ["Valor estimado", diagnosis.estimatedValue?.range],
    ];
    rows.forEach(([label, value]) => {
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, margin, y);
      doc.setFont("helvetica", "normal");
      y = writeWrapped(doc, value, margin + 34, y, width - 34, 5) + 3;
    });

    ensureSpace();
    y = writeList(doc, "3. Ação Recomendada", [diagnosis.suggestedAction], margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "4. Documentos Necessários", diagnosis.requiredDocuments, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "5. Próximos Passos", diagnosis.nextSteps, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "6. Riscos", diagnosis.viability?.risks, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "7. Oportunidades", diagnosis.viability?.opportunities, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "8. Perguntas Pendentes", diagnosis.missingInformation, margin, y, width) + 6;

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Minuta analítica gerada por IA e sujeita à revisão profissional | Página ${page} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }

    doc.save(`Triagem_SJ_${Date.now()}.pdf`);
    toast.success("Relatório gerado.");
  }, [diagnosis]);

  return {
    profileData: session.profileData,
    loadingProfile: session.loadingProfile,
    sessionError: session.sessionError,
    report,
    setReport,
    diagnosis,
    usage,
    plan,
    permissions,
    loading,
    analyzing,
    error,
    load,
    analyze,
    reset,
    downloadPdf,
  };
}

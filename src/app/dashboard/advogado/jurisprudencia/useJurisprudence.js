"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_FILTERS = {
  query: "",
  area: "Geral",
  court: "Todos",
  perspective: "Autor/Requerente",
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
    const text = typeof item === "string" ? item : item?.summary || item?.title || "";
    cursor = writeWrapped(doc, `${index + 1}. ${text}`, x, cursor, width, 5) + 4;
  });
  return cursor;
}

export function useJurisprudence() {
  const router = useRouter();
  const session = useLawyerSession();
  const { openPlansModal } = session;
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [analysis, setAnalysis] = useState(null);
  const [permissions, setPermissions] = useState({ canUse: false });
  const [plan, setPlan] = useState({ type: "FREE" });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(createRequestId());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/advogado/jurisprudencia", {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/jurisprudencia")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) openPlansModal();
      if (response.status === 403 && data?.permissionDenied) {
        setPermissions({ canUse: false, permissionDenied: true });
        setPlan(data.plan || { type: "FREE" });
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar a Jurisprudência IA.");
      }
      setPermissions(data.permissions || { canUse: false });
      setPlan(data.plan || { type: "FREE" });
    } catch (loadError) {
      console.error("[JurisprudenciaIA] Falha ao carregar:", loadError);
      setError(loadError.message || "Não foi possível carregar a Jurisprudência IA.");
    } finally {
      setLoading(false);
    }
  }, [openPlansModal, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  const search = useCallback(async () => {
    if (filters.query.trim().length < 12) {
      toast.error("Descreva melhor a tese, fato ou tema pesquisado.");
      return;
    }

    setSearching(true);
    setAnalysis(null);
    try {
      const response = await fetch("/api/advogado/jurisprudencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          ...filters,
        }),
      });
      const data = await readJson(response);
      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/jurisprudencia")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) openPlansModal();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível analisar jurisprudência.");
      }
      setAnalysis(data.analysis);
      requestIdRef.current = createRequestId();
      toast.success("Análise jurisprudencial concluída.");
    } catch (searchError) {
      console.error("[JurisprudenciaIA] Falha na pesquisa:", searchError);
      toast.error(searchError.message || "Erro de conexão com a Jurisprudência IA.");
    } finally {
      setSearching(false);
    }
  }, [filters, openPlansModal, router]);

  function reset() {
    setAnalysis(null);
    requestIdRef.current = createRequestId();
  }

  function downloadPdf() {
    if (!analysis) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const width = pageWidth - margin * 2;
    let y = 20;

    function ensureSpace(size = 35) {
      if (y + size <= pageHeight - 18) return;
      doc.addPage();
      y = 18;
    }

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, 38, "F");
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SocialJurídico", margin, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Relatório de Jurisprudência IA", margin, 29);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    y = 52;
    doc.setFont("helvetica", "bold");
    doc.text("Tema pesquisado", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    y = writeWrapped(doc, filters.query, margin, y, width) + 8;

    ensureSpace();
    y = writeList(doc, "Teses identificadas", analysis.theses, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "Precedentes orientativos", analysis.precedents, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "Riscos e distinções", analysis.risks, margin, y, width) + 6;
    ensureSpace();
    y = writeList(doc, "Termos de pesquisa", analysis.searchTerms, margin, y, width) + 6;

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Análise gerada por IA e sujeita à conferência em bases oficiais | Página ${page} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }
    doc.save(`Jurisprudencia_SJ_${Date.now()}.pdf`);
    toast.success("Relatório gerado.");
  }

  return {
    ...session,
    filters,
    analysis,
    permissions,
    plan,
    loading,
    searching,
    error,
    updateFilter,
    search,
    reset,
    load,
    downloadPdf,
  };
}

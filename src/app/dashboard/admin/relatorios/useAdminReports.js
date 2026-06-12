"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { generateAdminUsageReport } from "./reportExportService";

export const DEFAULT_REPORT_OPTIONS = {
  period: 7,
  includeLawyers: true,
  includeClients: true,
  includeDbTotals: true,
  includeSatisfaction: true,
  includePremiumUsage: true,
};

function buildQuery(options) {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  return params.toString();
}

async function readResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = new Error(
      payload?.message || "Não foi possível carregar os relatórios.",
    );
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function useAdminReports() {
  const router = useRouter();
  const requestSequence = useRef(0);
  const [options, setOptions] = useState(DEFAULT_REPORT_OPTIONS);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [auditAvailable, setAuditAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => buildQuery(options), [options]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const response = await fetch(`/api/admin/reports/usage?${query}`, {
          cache: "no-store",
        });
        const payload = await readResponse(response);

        if (requestId !== requestSequence.current) return;

        setReport(payload.data?.report || null);
        setHistory(payload.data?.history || []);
        setAuditAvailable(payload.data?.auditAvailable !== false);
      } catch (loadError) {
        if (requestId !== requestSequence.current) return;

        if ([401, 403].includes(loadError.status)) {
          toast.error("Acesso restrito à administração.");
          router.replace("/dashboard/cliente");
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os relatórios.";
        setError(message);
        toast.error(message);
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [query, router],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const updateOption = useCallback((name, value) => {
    setOptions((current) => {
      if (
        name === "includeLawyers" &&
        value === false &&
        !current.includeClients
      ) {
        toast.error("Mantenha pelo menos um público selecionado.");
        return current;
      }

      if (
        name === "includeClients" &&
        value === false &&
        !current.includeLawyers
      ) {
        toast.error("Mantenha pelo menos um público selecionado.");
        return current;
      }

      const next = { ...current, [name]: value };

      if (name === "includeLawyers" && value === false) {
        next.includePremiumUsage = false;
      }

      return next;
    });
  }, []);

  const generate = useCallback(async () => {
    if (generating) return;

    setGenerating(true);
    const toastId = toast.loading("Preparando relatório auditável...");

    try {
      const result = await generateAdminUsageReport({
        options,
        onRenderStart(exportAuditAvailable) {
          toast.loading("Renderizando documento PDF...", { id: toastId });
          if (!exportAuditAvailable) setAuditAvailable(false);
        },
      });

      toast.success(
        result.auditAvailable
          ? "PDF gerado e emissão registrada."
          : "PDF gerado sem registro de auditoria.",
        { id: toastId },
      );

      await load({ silent: true });
    } catch (generateError) {
      console.error("[Admin Reports] Erro na exportação:", generateError);
      toast.error(
        generateError instanceof Error
          ? generateError.message
          : "Não foi possível gerar o PDF.",
        { id: toastId },
      );
    } finally {
      setGenerating(false);
    }
  }, [generating, load, options]);

  return {
    options,
    report,
    history,
    auditAvailable,
    loading,
    refreshing,
    generating,
    error,
    updateOption,
    reload: load,
    generate,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";
import { getSafeExternalUrl } from "./opportunityUtils";

const INITIAL_FILTERS = {
  categoria: "",
  estado: "",
  cidade: "",
  urgencia: "",
  scoreMin: "",
};

function readJson(response) {
  return response.json().catch(() => null);
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) =>
    value.toString(16).padStart(2, "0"),
  );
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function useRadarOpportunities(enabled) {
  const router = useRouter();
  const session = useLawyerSession();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 9,
  });
  const [isDemo, setIsDemo] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingAccess, setPendingAccess] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "9",
      });
      if (appliedFilters.categoria) {
        params.set("categoria", appliedFilters.categoria);
      }
      if (appliedFilters.estado) params.set("estado", appliedFilters.estado);
      if (appliedFilters.cidade) params.set("cidade", appliedFilters.cidade);
      if (appliedFilters.urgencia) {
        params.set("urgencia", appliedFilters.urgencia);
      }
      if (appliedFilters.scoreMin) {
        params.set("score_min", appliedFilters.scoreMin);
      }

      const response = await fetch(`/api/radar?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          "/login?redirectTo=/dashboard/advogado/oportunidade",
        );
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar o Radar Jurídico.",
        );
      }

      setItems(data.data || []);
      setPagination(
        data.pagination || { page: 1, pages: 1, total: 0, limit: 9 },
      );
      setIsDemo(Boolean(data.is_demo));
      setPlan(data.plan || session.profileData?.plan_type || "FREE");
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[Radar] Falha ao carregar:", loadError);
      setError(
        loadError.message || "Não foi possível carregar o Radar Jurídico.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [appliedFilters, enabled, page, router, session.profileData?.plan_type]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({
      categoria: filters.categoria.trim().slice(0, 100),
      estado: filters.estado.trim().toUpperCase().slice(0, 2),
      cidade: filters.cidade.trim().slice(0, 100),
      urgencia: filters.urgencia,
      scoreMin: filters.scoreMin,
    });
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
  }

  function requestAccess(item) {
    if (isDemo) {
      session.openPlansModal();
      return;
    }

    const existingUrl = getSafeExternalUrl(item.url_original);
    if (item.clicado && existingUrl) {
      window.open(existingUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (plan === "START") {
      setPendingAccess(item);
      return;
    }

    void executeAccess(item);
  }

  async function executeAccess(item) {
    if (!item?.id || busyId) return;
    setBusyId(item.id);

    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;

    try {
      const response = await fetch("/api/radar/clique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          radar_oportunidade_id: item.id,
          request_id: createRequestId(),
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        popup?.close();
        if (response.status === 402 || response.status === 403) {
          session.openPlansModal();
        }
        throw new Error(
          data?.message || "Não foi possível liberar o acesso.",
        );
      }

      const url = getSafeExternalUrl(data.data?.url);
      if (!url) {
        popup?.close();
        throw new Error("A publicação original possui um link inválido.");
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, clicado: true, url_original: url }
            : entry,
        ),
      );
      session.setProfileData((current) =>
        current
          ? {
              ...current,
              balance: data.data?.newBalance ?? current.balance,
            }
          : current,
      );

      setPendingAccess(null);
      toast.success(data.message || "Acesso liberado.");
      if (popup) popup.location.replace(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (accessError) {
      popup?.close();
      console.error("[Radar] Falha no acesso:", accessError);
      toast.error(
        accessError.message || "Não foi possível liberar o acesso.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function openReport(item) {
    setReportTarget(item);
    setReportReason("");
  }

  const closeReport = useCallback(() => {
    if (reporting) return;
    setReportTarget(null);
    setReportReason("");
  }, [reporting]);

  async function submitReport() {
    const reason = reportReason.trim();
    if (!reportTarget?.id || reason.length < 10 || reason.length > 500) {
      toast.error("Informe um motivo entre 10 e 500 caracteres.");
      return;
    }

    const targetId = reportTarget.id;
    setReporting(true);
    try {
      const response = await fetch("/api/radar/reportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          radar_oportunidade_id: targetId,
          motivo: reason,
        }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível registrar o reporte.",
        );
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === targetId ? { ...entry, reportado: true } : entry,
        ),
      );
      setReportTarget(null);
      setReportReason("");
      toast.success(data.message || "Oportunidade sinalizada.");
    } catch (reportError) {
      console.error("[Radar] Falha no reporte:", reportError);
      toast.error(
        reportError.message || "Não foi possível registrar o reporte.",
      );
    } finally {
      setReporting(false);
    }
  }

  return {
    filters,
    updateFilter,
    applyFilters,
    clearFilters,
    items,
    pagination,
    page,
    setPage,
    isDemo,
    plan,
    loading,
    error,
    reload: load,
    pendingAccess,
    setPendingAccess,
    busyId,
    requestAccess,
    executeAccess,
    reportTarget,
    reportReason,
    setReportReason,
    reporting,
    openReport,
    closeReport,
    submitReport,
  };
}

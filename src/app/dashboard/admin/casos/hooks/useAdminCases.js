"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CASE_STAGES, CASE_VIEWS } from "../config/caseManagement";

const EMPTY_SUMMARY = {
  total: 0,
  critical: 0,
  needsAction: 0,
  restricted: 0,
  withInterest: 0,
  hired: 0,
  waitingClient: 0,
  conversionRate: 0,
  interestRate: 0,
  byStage: {},
  countAlta: 0,
  countMedia: 0,
  countOraculo: 0,
  countLegado: 0,
};

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

function matchesSearch(caseItem, searchTerm) {
  if (!searchTerm) return true;

  const term = searchTerm.toLowerCase();
  return [
    caseItem.title,
    caseItem.area,
    caseItem.city,
    caseItem.state,
    caseItem.client?.name,
    caseItem.client?.maskedEmail,
    caseItem.hiredLawyer?.name,
    caseItem.hiredLawyer?.oab,
  ].some((value) => String(value || "").toLowerCase().includes(term));
}

function calculateCaseSummary(items) {
  const summary = items.reduce(
    (current, caseItem) => {
      current.total += 1;
      current.byStage[caseItem.stage] =
        (current.byStage[caseItem.stage] || 0) + 1;
      if (caseItem.alert?.severity === "HIGH") current.critical += 1;
      if (caseItem.alert) current.needsAction += 1;
      if (caseItem.privacyAttention === "RESTRICTED") current.restricted += 1;
      if ((caseItem.interestSummary?.total || 0) > 0) current.withInterest += 1;
      return current;
    },
    {
      ...EMPTY_SUMMARY,
      byStage: {},
    },
  );

  summary.hired = summary.byStage.HIRED || 0;
  summary.waitingClient = summary.byStage.WAITING_CLIENT || 0;
  summary.conversionRate = summary.total
    ? Number(((summary.hired / summary.total) * 100).toFixed(1))
    : 0;
  summary.interestRate = summary.total
    ? Number(((summary.withInterest / summary.total) * 100).toFixed(1))
    : 0;

  return summary;
}

function calculateFunnelSummary(events) {
  const summary = events.reduce(
    (current, event) => {
      current.sent += 1;
      if (event.openedAt) current.opened += 1;
      if (event.clickedAt) current.clicked += 1;
      if (event.loggedInAt) current.loggedIn += 1;
      if (event.viewedInterestsAt) current.viewedInterests += 1;
      if (event.respondedAt) current.responded += 1;
      if (event.alert) current.stalled += 1;
      return current;
    },
    {
      sent: 0,
      opened: 0,
      clicked: 0,
      loggedIn: 0,
      viewedInterests: 0,
      responded: 0,
      stalled: 0,
    },
  );

  const rate = (value) =>
    summary.sent ? Number(((value / summary.sent) * 100).toFixed(1)) : 0;

  return {
    ...summary,
    openRate: rate(summary.opened),
    clickRate: rate(summary.clicked),
    loginRate: rate(summary.loggedIn),
    interestViewRate: rate(summary.viewedInterests),
    responseRate: rate(summary.responded),
  };
}

export function useAdminCases() {
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [governanceAvailable, setGovernanceAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState(CASE_VIEWS.PIPELINE);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [intentFilter, setIntentFilter] = useState("ALL");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [sensitiveDetail, setSensitiveDetail] = useState(null);
  const [loadingSensitiveDetail, setLoadingSensitiveDetail] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditLoadedForCaseId, setAuditLoadedForCaseId] = useState(null);
  const [actionName, setActionName] = useState("");
  const [funnelEvents, setFunnelEvents] = useState([]);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [funnelLoaded, setFunnelLoaded] = useState(false);
  const [funnelTypeFilter, setFunnelTypeFilter] = useState("ALL");
  const [funnelAlertsOnly, setFunnelAlertsOnly] = useState(false);

  const loadCases = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/casos", { cache: "no-store" });
      const payload = await readJson(response);
      const nextCases = payload.data?.cases || [];

      setCases(nextCases);
      setSummary(payload.data?.summary || EMPTY_SUMMARY);
      setGovernanceAvailable(payload.data?.governanceAvailable !== false);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Erro ao carregar casos.";
      setLoadError(message);
      toast.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const loadFunnel = useCallback(async ({ force = false } = {}) => {
    if (funnelLoaded && !force) return;

    setLoadingFunnel(true);
    try {
      const response = await fetch("/api/admin/funnel", { cache: "no-store" });
      const payload = await readJson(response);
      setFunnelEvents(payload.data?.events || []);
      setFunnelLoaded(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar o funil de comunicação.",
      );
    } finally {
      setLoadingFunnel(false);
    }
  }, [funnelLoaded]);

  useEffect(() => {
    if (view === CASE_VIEWS.EMAIL_FUNNEL) loadFunnel();
  }, [loadFunnel, view]);

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return cases.filter((caseItem) => {
      if (stageFilter !== "ALL" && caseItem.stage !== stageFilter) return false;
      if (
        riskFilter !== "ALL" &&
        caseItem.privacyAttention !== riskFilter
      ) {
        return false;
      }
      if (intentFilter !== "ALL" && caseItem.intentTier !== intentFilter) {
        return false;
      }
      if (alertsOnly && !caseItem.alert) return false;
      return matchesSearch(caseItem, normalizedSearch);
    });
  }, [alertsOnly, cases, intentFilter, riskFilter, searchTerm, stageFilter]);

  const pipelineSummary = useMemo(
    () => calculateCaseSummary(filteredCases),
    [filteredCases],
  );

  const casesByStage = useMemo(() => {
    const map = Object.fromEntries(CASE_STAGES.map((stage) => [stage.value, []]));

    for (const caseItem of filteredCases) {
      if (!map[caseItem.stage]) map[caseItem.stage] = [];
      map[caseItem.stage].push(caseItem);
    }

    return map;
  }, [filteredCases]);

  const selectedCase = useMemo(
    () => cases.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  const filteredFunnelEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return funnelEvents.filter((event) => {
      if (
        funnelTypeFilter !== "ALL" &&
        event.emailType !== funnelTypeFilter
      ) {
        return false;
      }

      if (funnelAlertsOnly && !event.alert) return false;
      if (!normalizedSearch) return true;

      return [
        event.caseTitle,
        event.recipientName,
        event.maskedEmail,
        event.emailType,
      ].some((value) =>
        String(value || "").toLowerCase().includes(normalizedSearch),
      );
    });
  }, [funnelAlertsOnly, funnelEvents, funnelTypeFilter, searchTerm]);

  const funnelSummary = useMemo(
    () => calculateFunnelSummary(filteredFunnelEvents),
    [filteredFunnelEvents],
  );

  const openCase = useCallback((caseItem) => {
    setSelectedCaseId(caseItem.id);
    setSensitiveDetail(null);
    setAuditLogs([]);
    setAuditLoadedForCaseId(null);
  }, []);

  const closeCase = useCallback(() => {
    if (actionName || loadingSensitiveDetail || loadingAudit) return;
    setSelectedCaseId(null);
    setSensitiveDetail(null);
    setAuditLogs([]);
    setAuditLoadedForCaseId(null);
  }, [actionName, loadingAudit, loadingSensitiveDetail]);

  const refreshAfterAction = useCallback(async (caseId) => {
    await loadCases({ silent: true });
    setSelectedCaseId(caseId);
    setAuditLoadedForCaseId(null);
  }, [loadCases]);

  const loadAudit = useCallback(async ({ force = false } = {}) => {
    if (!selectedCaseId) return;
    if (auditLoadedForCaseId === selectedCaseId && !force) return;

    setLoadingAudit(true);
    try {
      const response = await fetch("/api/admin/casos/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });
      const payload = await readJson(response);
      setAuditLogs(payload.data || []);
      setAuditLoadedForCaseId(selectedCaseId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar a trilha de auditoria.",
      );
    } finally {
      setLoadingAudit(false);
    }
  }, [auditLoadedForCaseId, selectedCaseId]);

  const updateGovernance = useCallback(async ({
    operationalStage,
    riskLevel,
    nextActionAt,
  }) => {
    if (!selectedCaseId) return;

    setActionName("UPDATE_GOVERNANCE");
    const toastId = toast.loading("Atualizando governança...");

    try {
      const response = await fetch("/api/admin/casos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          action: "UPDATE_GOVERNANCE",
          operationalStage,
          riskLevel,
          nextActionAt: nextActionAt || null,
        }),
      });
      const payload = await readJson(response);
      await refreshAfterAction(selectedCaseId);
      toast.success(payload.message || "Governança atualizada.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar governança.",
        { id: toastId },
      );
    } finally {
      setActionName("");
    }
  }, [refreshAfterAction, selectedCaseId]);

  const notifyClient = useCallback(async () => {
    if (!selectedCaseId) return;

    setActionName("NOTIFY_CLIENT");
    const toastId = toast.loading("Notificando cliente...");

    try {
      const response = await fetch("/api/admin/casos/notify-client-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });
      const payload = await readJson(response);
      await Promise.all([
        refreshAfterAction(selectedCaseId),
        loadFunnel({ force: true }),
      ]);
      toast.success(payload.message || "Cliente notificado.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao notificar cliente.",
        { id: toastId },
      );
    } finally {
      setActionName("");
    }
  }, [loadFunnel, refreshAfterAction, selectedCaseId]);

  const archiveCase = useCallback(async (reason) => {
    if (!selectedCaseId) return;

    setActionName("ARCHIVE");
    const toastId = toast.loading("Arquivando caso...");

    try {
      const response = await fetch("/api/admin/casos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          action: "ARCHIVE",
          reason,
        }),
      });
      const payload = await readJson(response);
      await refreshAfterAction(selectedCaseId);
      toast.success(payload.message || "Caso arquivado.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao arquivar caso.",
        { id: toastId },
      );
    } finally {
      setActionName("");
    }
  }, [refreshAfterAction, selectedCaseId]);

  const restoreCase = useCallback(async () => {
    if (!selectedCaseId) return;

    setActionName("RESTORE");
    const toastId = toast.loading("Restaurando caso...");

    try {
      const response = await fetch("/api/admin/casos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          action: "RESTORE",
        }),
      });
      const payload = await readJson(response);
      await refreshAfterAction(selectedCaseId);
      toast.success(payload.message || "Caso restaurado.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao restaurar caso.",
        { id: toastId },
      );
    } finally {
      setActionName("");
    }
  }, [refreshAfterAction, selectedCaseId]);

  const setLegalHold = useCallback(async ({ legalHold, reason }) => {
    if (!selectedCaseId) return;

    setActionName("LEGAL_HOLD");
    const toastId = toast.loading(
      legalHold
        ? "Ativando preservação jurídica..."
        : "Desativando preservação jurídica...",
    );

    try {
      const response = await fetch("/api/admin/casos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          action: "SET_LEGAL_HOLD",
          legalHold,
          reason,
        }),
      });
      const payload = await readJson(response);
      await refreshAfterAction(selectedCaseId);
      toast.success(payload.message || "Preservação jurídica atualizada.", {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar preservação jurídica.",
        { id: toastId },
      );
    } finally {
      setActionName("");
    }
  }, [refreshAfterAction, selectedCaseId]);

  const unlockSensitiveDetail = useCallback(async ({ purpose, justification }) => {
    if (!selectedCaseId) return;

    setLoadingSensitiveDetail(true);
    const toastId = toast.loading("Registrando finalidade e liberando dados...");

    try {
      const response = await fetch("/api/admin/casos/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          purpose,
          justification,
        }),
      });
      const payload = await readJson(response);
      setSensitiveDetail(payload.data);
      toast.success("Acesso sensível registrado e liberado.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao liberar detalhes sensíveis.",
        { id: toastId },
      );
    } finally {
      setLoadingSensitiveDetail(false);
    }
  }, [selectedCaseId]);

  return {
    cases,
    filteredCases,
    casesByStage,
    summary,
    pipelineSummary,
    governanceAvailable,
    loading,
    loadError,
    view,
    searchTerm,
    stageFilter,
    riskFilter,
    intentFilter,
    alertsOnly,
    selectedCase,
    sensitiveDetail,
    loadingSensitiveDetail,
    auditLogs,
    loadingAudit,
    actionName,
    funnelEvents: filteredFunnelEvents,
    funnelSummary,
    loadingFunnel,
    funnelTypeFilter,
    funnelAlertsOnly,
    setView,
    setSearchTerm,
    setStageFilter,
    setRiskFilter,
    setIntentFilter,
    setAlertsOnly,
    setFunnelTypeFilter,
    setFunnelAlertsOnly,
    loadCases,
    loadFunnel,
    loadAudit,
    openCase,
    closeCase,
    updateGovernance,
    notifyClient,
    archiveCase,
    restoreCase,
    setLegalHold,
    unlockSensitiveDetail,
  };
}

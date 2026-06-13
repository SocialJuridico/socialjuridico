"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useDeletionRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);
  const [auditAvailable, setAuditAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadRequests = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/admin/solicitacoes-exclusao", {
          cache: "no-store",
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          if ([401, 403].includes(response.status)) {
            router.replace("/dashboard/cliente");
            return;
          }

          throw new Error(
            data?.message || "Não foi possível carregar as solicitações.",
          );
        }

        setRequests(data.data || []);
        setSummary(data.summary || null);
        setRecentAudit(data.recentAudit || []);
        setAuditAvailable(data.auditAvailable !== false);
      } catch (error) {
        console.error("[Admin/LGPD] Falha ao carregar:", error);
        setLoadError(error.message || "Não foi possível carregar as solicitações.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (typeFilter !== "all" && item.profile_type !== typeFilter) return false;

      if (!term) return true;
      return [
        item.display_name,
        item.email_masked,
        item.reason_preview,
        item.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(term));
    });
  }, [requests, search, statusFilter, typeFilter]);

  const ensureGovernance = useCallback(() => {
    if (auditAvailable) return true;
    toast.error(
      "Execute a migração de governança antes de consultar dados protegidos.",
    );
    return false;
  }, [auditAvailable]);

  const openAccess = useCallback(
    (item) => {
      if (!ensureGovernance()) return;
      setModal({
        screen: "access",
        item,
        purpose: "ANALISE_LGPD",
        justification: "",
      });
    },
    [ensureGovernance],
  );

  const closeModal = useCallback(() => {
    if (busy) return;
    setModal(null);
  }, [busy]);

  const accessDetails = useCallback(async () => {
    if (modal?.screen !== "access") return;

    const justification = String(modal.justification || "").trim();
    if (justification.length < 15) {
      toast.error("Informe uma justificativa com pelo menos 15 caracteres.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        "/api/admin/solicitacoes-exclusao/details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: modal.item.id,
            purpose: modal.purpose,
            justification,
          }),
        },
      );
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível abrir os detalhes.");
      }

      setModal({
        screen: "details",
        item: modal.item,
        details: data.data,
        accessPurpose: modal.purpose,
        accessJustification: justification,
      });
      await loadRequests({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível abrir os detalhes.");
    } finally {
      setBusy(false);
    }
  }, [loadRequests, modal]);

  const refreshDetails = useCallback(async (item, purpose, justification) => {
    const response = await fetch(
      "/api/admin/solicitacoes-exclusao/details",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          purpose,
          justification,
        }),
      },
    );
    const data = await readJson(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Não foi possível atualizar os detalhes.");
    }
    return data.data;
  }, []);

  const openDecision = useCallback((action) => {
    setModal((current) => {
      if (current?.screen !== "details") return current;
      return {
        ...current,
        screen: "decision",
        action,
        reason: "",
        legalBasis: "",
      };
    });
  }, []);

  const backToDetails = useCallback(() => {
    setModal((current) => {
      if (!current?.details) return current;
      return {
        screen: "details",
        item: current.item,
        details: current.details,
        accessPurpose: current.accessPurpose,
        accessJustification: current.accessJustification,
      };
    });
  }, []);

  const submitDecision = useCallback(async () => {
    if (modal?.screen !== "decision") return;

    setBusy(true);
    try {
      const currentRequest = modal.details.request;
      const response = await fetch("/api/admin/solicitacoes-exclusao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentRequest.id,
          action: modal.action,
          reason: modal.reason,
          legal_basis: modal.legalBasis || null,
          updated_at: currentRequest.updated_at,
          version: currentRequest.version,
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível atualizar o pedido.");
      }

      toast.success(data.message || "Solicitação atualizada.");
      const details = await refreshDetails(
        modal.item,
        modal.accessPurpose,
        "Atualização dos detalhes após decisão administrativa registrada.",
      );
      setModal({
        screen: "details",
        item: { ...modal.item, ...data.data },
        details,
        accessPurpose: modal.accessPurpose,
        accessJustification: modal.accessJustification,
      });
      await loadRequests({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível atualizar o pedido.");
    } finally {
      setBusy(false);
    }
  }, [loadRequests, modal, refreshDetails]);

  const openProcess = useCallback(() => {
    setModal((current) => {
      if (current?.screen !== "details") return current;
      return {
        ...current,
        screen: "process",
        confirmation: "",
        processJustification: "",
        acknowledgeRetention: false,
      };
    });
  }, []);

  const submitProcess = useCallback(async () => {
    if (modal?.screen !== "process") return;

    setBusy(true);
    try {
      const currentRequest = modal.details.request;
      const response = await fetch(
        "/api/admin/solicitacoes-exclusao/process",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentRequest.id,
            justification: modal.processJustification,
            confirmation: modal.confirmation,
            acknowledge_retention: modal.acknowledgeRetention,
            updated_at: currentRequest.updated_at,
            version: currentRequest.version,
          }),
        },
      );
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        const blockerMessage = Array.isArray(data?.blockers)
          ? data.blockers.map((item) => item.message).join(" ")
          : null;
        throw new Error(
          blockerMessage ||
            data?.message ||
            "Não foi possível processar a exclusão.",
        );
      }

      toast.success(data.message || "Exclusão concluída.");
      setModal(null);
      await loadRequests({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível processar a exclusão.");
    } finally {
      setBusy(false);
    }
  }, [loadRequests, modal]);

  return {
    requests,
    filtered,
    summary,
    recentAudit,
    auditAvailable,
    loading,
    loadError,
    search,
    statusFilter,
    typeFilter,
    modal,
    busy,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    setModal,
    loadRequests,
    openAccess,
    closeModal,
    accessDetails,
    openDecision,
    backToDetails,
    submitDecision,
    openProcess,
    submitProcess,
  };
}

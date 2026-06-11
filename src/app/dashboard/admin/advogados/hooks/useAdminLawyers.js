"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { exportLawyersCsv } from "../utils/exportLawyersCsv";
import { getInactiveDays, getPlanType } from "../utils/lawyerFormatters";
import { generateLawyersReport } from "../services/lawyersReportService";

export function useAdminLawyers() {
  const router = useRouter();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [oabFilter, setOabFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [inactivityFilter, setInactivityFilter] = useState("ALL");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadLawyers = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [lawyersResponse, adminResponse] = await Promise.all([
        fetch("/api/admin/advogados", { cache: "no-store" }),
        fetch("/api/admin/me", { cache: "no-store" }),
      ]);

      const [lawyersData, adminData] = await Promise.all([
        lawyersResponse.json().catch(() => null),
        adminResponse.json().catch(() => null),
      ]);

      if (lawyersResponse.status === 401 || lawyersResponse.status === 403) {
        toast.error("Acesso restrito à área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      if (!lawyersResponse.ok || !lawyersData?.success) {
        throw new Error(
          lawyersData?.message || "Não foi possível carregar os advogados.",
        );
      }

      setLawyers(lawyersData.data || []);

      if (adminResponse.ok && adminData?.success) {
        setGoogleConnected(Boolean(adminData.data?.google_sync_enabled));
      }
    } catch (error) {
      console.error("[Admin/Advogados] Erro ao carregar:", error);
      setLoadError(error.message || "Erro ao carregar advogados.");
      toast.error("Erro ao carregar advogados.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadLawyers();
  }, [loadLawyers]);

  const filteredLawyers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();

    return lawyers.filter((lawyer) => {
      if (term) {
        const searchable = `${lawyer.name || ""} ${lawyer.email || ""} ${lawyer.phone || ""} ${lawyer.oab || ""}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      if (planFilter !== "ALL" && getPlanType(lawyer) !== planFilter) {
        return false;
      }

      const oabStatus = lawyer.oab_verification_status || "PENDING";
      if (oabFilter !== "ALL" && oabStatus !== oabFilter) return false;

      if (dateFilter !== "ALL") {
        if (!lawyer.created_at) return false;
        const createdAt = new Date(lawyer.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;
        const diffDays = Math.floor((now - createdAt) / 86_400_000);
        if (
          dateFilter === "TODAY" &&
          createdAt.toDateString() !== now.toDateString()
        ) {
          return false;
        }
        if (dateFilter === "7DAYS" && diffDays > 7) return false;
        if (dateFilter === "30DAYS" && diffDays > 30) return false;
      }

      if (inactivityFilter === "NEVER") return !lawyer.last_sign_in_at;
      if (inactivityFilter !== "ALL") {
        const days = getInactiveDays(lawyer);
        if (days === null) return false;
        if (inactivityFilter === "7DAYS" && days < 7) return false;
        if (inactivityFilter === "15DAYS" && days < 15) return false;
        if (inactivityFilter === "30DAYS" && days < 30) return false;
      }

      return true;
    });
  }, [lawyers, search, planFilter, oabFilter, dateFilter, inactivityFilter]);

  const summary = useMemo(
    () => ({
      total: lawyers.length,
      visible: filteredLawyers.length,
      verified: lawyers.filter(
        (item) => item.oab_verification_status === "VERIFIED",
      ).length,
      pending: lawyers.filter(
        (item) =>
          !item.oab_verification_status ||
          item.oab_verification_status === "PENDING",
      ).length,
      errors: lawyers.filter(
        (item) => item.oab_verification_status === "ERROR",
      ).length,
      start: lawyers.filter((item) => getPlanType(item) === "START").length,
      pro: lawyers.filter((item) => getPlanType(item) === "PRO").length,
      neverAccessed: lawyers.filter((item) => !item.last_sign_in_at).length,
      inactive30: lawyers.filter((item) => {
        const days = getInactiveDays(item);
        return days !== null && days >= 30;
      }).length,
    }),
    [lawyers, filteredLawyers.length],
  );

  const updateLocalLawyer = useCallback((lawyerId, action, value) => {
    setLawyers((current) =>
      current.map((lawyer) => {
        if (lawyer.id !== lawyerId) return lawyer;

        if (action === "GIVE_PRO" || action === "GIVE_PLAN") {
          const days = Number(value?.days || 30);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
          return {
            ...lawyer,
            is_premium: true,
            plan_type: value?.planType || "PRO",
            premium_expires_at: expiresAt.toISOString(),
            plan_expired: false,
            plan_inconsistent: false,
          };
        }
        if (action === "REMOVE_PRO") {
          return {
            ...lawyer,
            is_premium: false,
            plan_type: "FREE",
            premium_expires_at: null,
            plan_expired: false,
            plan_inconsistent: false,
          };
        }
        if (action === "ADD_JURIS") {
          return {
            ...lawyer,
            balance: (lawyer.balance || 0) + Number(value || 0),
          };
        }
        if (action === "REMOVE_JURIS") {
          return {
            ...lawyer,
            balance: Math.max(0, (lawyer.balance || 0) - Number(value || 0)),
          };
        }
        if (action === "SET_OAB_STATUS") {
          return { ...lawyer, oab_verification_status: value };
        }
        if (action === "UPDATE_OAB") {
          return { ...lawyer, oab: value.oab, estado: value.estado };
        }

        return lawyer;
      }),
    );
  }, []);

  const performAction = useCallback(
    async (lawyer, action, value = null) => {
      setBusyId(lawyer.id);

      try {
        const response = await fetch("/api/admin/advogados", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lawyerId: lawyer.id, action, value }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Falha ao atualizar advogado.");
        }

        updateLocalLawyer(lawyer.id, action, value);
        setModal(null);
        toast.success(data.message || "Advogado atualizado com sucesso.");
        return true;
      } catch (error) {
        console.error("[Admin/Advogados] Erro ao atualizar:", error);
        toast.error(error.message || "Erro ao atualizar advogado.");
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [updateLocalLawyer],
  );

  const confirmDelete = useCallback(async () => {
    const lawyer = modal?.lawyer;
    if (!lawyer) return;

    setBusyId(lawyer.id);

    try {
      const response = await fetch(`/api/admin/advogados?id=${lawyer.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Falha ao excluir advogado.");
      }

      setLawyers((current) =>
        current.filter((item) => item.id !== lawyer.id),
      );
      toast.success(data.message || "Advogado excluído com sucesso.");
      setModal(null);
    } catch (error) {
      console.error("[Admin/Advogados] Erro ao excluir:", error);
      toast.error(error.message || "Erro ao excluir advogado.");
    } finally {
      setBusyId(null);
    }
  }, [modal]);

  const confirmReset = useCallback(async () => {
    const lawyer = modal?.lawyer;
    if (!lawyer) return;

    setBusyId(lawyer.id);

    try {
      const response = await fetch(`/api/admin/advogados?id=${lawyer.id}`, {
        method: "PATCH",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Falha ao enviar o link de redefinição.",
        );
      }

      toast.success(
        data.message || "Link de redefinição enviado ao advogado.",
      );
      setModal(null);
    } catch (error) {
      console.error(
        "[Admin/Advogados] Erro ao enviar redefinição:",
        error,
      );
      toast.error(
        error.message || "Erro ao enviar o link de redefinição.",
      );
    } finally {
      setBusyId(null);
    }
  }, [modal]);

  const exportCsv = useCallback(() => {
    if (!filteredLawyers.length) {
      return toast.error("Não há advogados para exportar.");
    }

    exportLawyersCsv(filteredLawyers);
    toast.success("CSV de advogados exportado com sucesso.");
  }, [filteredLawyers]);

  const generatePdf = useCallback(async () => {
    if (!filteredLawyers.length) {
      return toast.error("Não há advogados para o relatório.");
    }

    setGeneratingPdf(true);
    const toastId = toast.loading("Gerando relatório PDF...");

    try {
      await generateLawyersReport(filteredLawyers);
      toast.success("Relatório gerado com sucesso.", { id: toastId });
    } catch (error) {
      console.error("[Admin/Advogados] Erro no PDF:", error);
      toast.error("Não foi possível gerar o relatório.", { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  }, [filteredLawyers]);

  const syncGoogle = useCallback(async () => {
    setSyncing(true);

    try {
      const response = await fetch("/api/admin/google-contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ADVOGADOS" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        if (data?.message === "google_not_connected") {
          setGoogleConnected(false);
        }
        throw new Error(data?.message || "Falha ao sincronizar contatos.");
      }

      toast.success(data.message || "Sincronização concluída.");
    } catch (error) {
      toast.error(error.message || "Erro ao sincronizar contatos.");
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    lawyers,
    filteredLawyers,
    summary,
    loading,
    loadError,
    filters: { search, planFilter, oabFilter, dateFilter, inactivityFilter },
    googleConnected,
    syncing,
    generatingPdf,
    modal,
    busyId,
    setSearch,
    setPlanFilter,
    setOabFilter,
    setDateFilter,
    setInactivityFilter,
    setModal,
    loadLawyers,
    performAction,
    confirmDelete,
    confirmReset,
    exportCsv,
    generatePdf,
    connectGoogle: () => {
      window.location.href = "/api/auth/google-contacts";
    },
    syncGoogle,
  };
}

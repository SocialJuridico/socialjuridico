"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { exportClientsCsv } from "../utils/exportClientsCsv";
import { getInactiveDays } from "../utils/clientFormatters";

export function useAdminClients() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [inactivityFilter, setInactivityFilter] = useState("ALL");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actionState, setActionState] = useState({
    deletingId: null,
    resettingId: null,
    modal: null,
  });

  const loadClients = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [clientsResponse, adminResponse] = await Promise.all([
        fetch("/api/admin/clientes", { cache: "no-store" }),
        fetch("/api/admin/me", { cache: "no-store" }),
      ]);

      const [clientsData, adminData] = await Promise.all([
        clientsResponse.json().catch(() => null),
        adminResponse.json().catch(() => null),
      ]);

      if (clientsResponse.status === 401 || clientsResponse.status === 403) {
        toast.error("Acesso restrito à área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      if (!clientsResponse.ok || !clientsData?.success) {
        throw new Error(
          clientsData?.message || "Não foi possível carregar os clientes.",
        );
      }

      setClients(clientsData.data || []);

      if (adminResponse.ok && adminData?.success) {
        setGoogleConnected(Boolean(adminData.data?.google_sync_enabled));
      }
    } catch (error) {
      console.error("[Admin/Clientes] Erro ao carregar:", error);
      setLoadError(error.message || "Erro ao carregar clientes.");
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clients.filter((client) => {
      if (term) {
        const searchable = `${client.name || ""} ${client.email || ""} ${
          client.phone || ""
        }`.toLowerCase();

        if (!searchable.includes(term)) return false;
      }

      if (inactivityFilter === "ALL") return true;
      if (inactivityFilter === "NEVER") return !client.last_sign_in_at;

      const inactiveDays = getInactiveDays(client);

      if (inactiveDays === null) return false;
      if (inactivityFilter === "7DAYS") return inactiveDays >= 7;
      if (inactivityFilter === "15DAYS") return inactiveDays >= 15;
      if (inactivityFilter === "30DAYS") return inactiveDays >= 30;

      return true;
    });
  }, [clients, search, inactivityFilter]);

  const summary = useMemo(() => {
    const neverAccessed = clients.filter((client) => !client.last_sign_in_at).length;
    const inactive30 = clients.filter((client) => {
      const days = getInactiveDays(client);
      return days !== null && days >= 30;
    }).length;
    const withoutPhone = clients.filter((client) => !client.phone).length;

    return {
      total: clients.length,
      visible: filteredClients.length,
      neverAccessed,
      inactive30,
      withoutPhone,
    };
  }, [clients, filteredClients.length]);

  const openAction = useCallback((type, client) => {
    setActionState((current) => ({
      ...current,
      modal: { type, client },
    }));
  }, []);

  const closeAction = useCallback(() => {
    setActionState((current) => ({ ...current, modal: null }));
  }, []);

  const confirmDelete = useCallback(async () => {
    const client = actionState.modal?.client;
    if (!client) return;

    setActionState((current) => ({ ...current, deletingId: client.id }));

    try {
      const response = await fetch(`/api/admin/clientes?id=${client.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Falha ao excluir cliente.");
      }

      setClients((current) => current.filter((item) => item.id !== client.id));
      toast.success(data.message || "Cliente excluído com sucesso.");
      closeAction();
    } catch (error) {
      console.error("[Admin/Clientes] Erro ao excluir:", error);
      toast.error(error.message || "Erro ao excluir cliente.");
    } finally {
      setActionState((current) => ({ ...current, deletingId: null }));
    }
  }, [actionState.modal, closeAction]);

  const confirmReset = useCallback(async () => {
    const client = actionState.modal?.client;
    if (!client) return;

    setActionState((current) => ({ ...current, resettingId: client.id }));

    try {
      const response = await fetch(`/api/admin/clientes?id=${client.id}`, {
        method: "PATCH",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Falha ao enviar o link de redefinição.",
        );
      }

      toast.success(
        data.message || "Link de redefinição enviado ao cliente.",
      );
      closeAction();
    } catch (error) {
      console.error(
        "[Admin/Clientes] Erro ao enviar redefinição:",
        error,
      );
      toast.error(
        error.message || "Erro ao enviar o link de redefinição.",
      );
    } finally {
      setActionState((current) => ({ ...current, resettingId: null }));
    }
  }, [actionState.modal, closeAction]);

  const exportCsv = useCallback(() => {
    if (!filteredClients.length) {
      toast.error("Não há clientes para exportar.");
      return;
    }

    exportClientsCsv(filteredClients);
    toast.success("CSV de clientes exportado com sucesso.");
  }, [filteredClients]);

  const connectGoogle = useCallback(() => {
    window.location.href = "/api/auth/google-contacts";
  }, []);

  const syncGoogle = useCallback(async () => {
    setSyncing(true);

    try {
      const response = await fetch("/api/admin/google-contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CLIENTES" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        if (data?.message === "google_not_connected") {
          setGoogleConnected(false);
          throw new Error("Sua conta do Google não está conectada.");
        }

        throw new Error(data?.message || "Falha ao sincronizar contatos.");
      }

      toast.success(data.message || "Sincronização concluída.");
    } catch (error) {
      console.error("[Admin/Clientes] Erro na sincronização:", error);
      toast.error(error.message || "Erro ao sincronizar contatos.");
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    clients,
    filteredClients,
    summary,
    loading,
    loadError,
    search,
    inactivityFilter,
    googleConnected,
    syncing,
    actionState,
    setSearch,
    setInactivityFilter,
    loadClients,
    openAction,
    closeAction,
    confirmDelete,
    confirmReset,
    exportCsv,
    connectGoogle,
    syncGoogle,
  };
}

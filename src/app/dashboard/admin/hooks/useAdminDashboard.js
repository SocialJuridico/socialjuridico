"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const initialStats = {
  totalClientes: 0,
  totalAdvogados: 0,
  totalCasos: 0,
  totalNotificacoes: 0,
  totalRadarPendente: 0,
};

export function useAdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        toast.error("Acesso restrito: área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar o dashboard.",
        );
      }

      setAdmin(data.data?.admin || null);
      setStats({
        ...initialStats,
        ...(data.data?.stats || {}),
      });
    } catch (error) {
      console.error("[Admin Dashboard] Erro ao carregar:", error);
      setLoadError(
        error.message || "Erro ao carregar dashboard administrativo.",
      );
      toast.error("Erro ao carregar dashboard administrativo.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const logout = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Falha ao encerrar a sessão.");
      }

      window.location.href = "/login";
    } catch (error) {
      console.error("[Admin Dashboard] Erro no logout:", error);
      toast.error("Não foi possível encerrar a sessão.");
    }
  }, []);

  return {
    admin,
    stats,
    loading,
    loadError,
    reload: loadDashboard,
    logout,
  };
}

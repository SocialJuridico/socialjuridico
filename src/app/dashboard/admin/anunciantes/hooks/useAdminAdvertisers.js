"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { EMPTY_SUMMARY } from "../config";

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

export function useAdminAdvertisers() {
  const [advertisers, setAdvertisers] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadAdvertisers = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      const response = await fetch("/api/admin/anunciantes", {
        cache: "no-store",
      });
      const payload = await readJson(response);

      setAdvertisers(payload.data?.advertisers || []);
      setSummary(payload.data?.summary || EMPTY_SUMMARY);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar anunciantes.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdvertisers();
  }, [loadAdvertisers]);

  const mutate = useCallback(
    async (action, payload = {}, successMessage) => {
      setBusyAction(`${action}:${payload.id || "new"}`);

      try {
        const response = await fetch("/api/admin/anunciantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const data = await readJson(response);

        toast.success(successMessage || data.message || "Operação concluída.");
        await loadAdvertisers({ silent: true });
        return data;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a operação.",
        );
        throw error;
      } finally {
        setBusyAction("");
      }
    },
    [loadAdvertisers],
  );

  return {
    advertisers,
    summary,
    loading,
    refreshing,
    busyAction,
    loadError,
    loadAdvertisers,
    mutate,
  };
}

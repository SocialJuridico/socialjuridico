"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { EMPTY_SUMMARY } from "./config";

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = new Error(
      payload?.message || "Não foi possível concluir a operação.",
    );
    error.code = payload?.code || null;
    throw error;
  }

  return payload;
}

export function useAdminAffiliates() {
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [policy, setPolicy] = useState({
    defaultCommissionJuris: 35,
    automaticEligibilityRequiresConfirmedPaidSubscription: true,
    manualOverrideRequiresJustification: true,
    cashWithdrawalsSupported: false,
  });
  const [schema, setSchema] = useState({ governanceAvailable: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadAffiliates = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      const response = await fetch("/api/admin/indicacoes", {
        cache: "no-store",
      });
      const payload = await readJson(response);

      setReferrals(payload.data?.referrals || []);
      setSummary(payload.data?.summary || EMPTY_SUMMARY);
      setPolicy((current) => ({
        ...current,
        ...(payload.data?.policy || {}),
      }));
      setSchema(
        payload.data?.schema || {
          governanceAvailable: false,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar os afiliados.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAffiliates();
  }, [loadAffiliates]);

  const mutate = useCallback(
    async (action, payload = {}) => {
      setBusyAction(`${action}:${payload.referralId || "unknown"}`);

      try {
        const response = await fetch("/api/admin/indicacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const data = await readJson(response);

        toast.success(data.message || "Operação concluída.");
        await loadAffiliates({ silent: true });
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
    [loadAffiliates],
  );

  return {
    referrals,
    summary,
    policy,
    schema,
    loading,
    refreshing,
    busyAction,
    loadError,
    loadAffiliates,
    mutate,
  };
}

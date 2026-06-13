"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabase";
import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_DATA = {
  referralUrl: "",
  shareText: "",
  referrals: [],
  summary: {
    total: 0,
    registered: 0,
    awaitingCredit: 0,
    commissioned: 0,
    creditedJuris: 0,
  },
  policy: {
    defaultCommissionJuris: 35,
    rewardType: "FIXED_JURIS",
    requiresProfessionalRegistration: true,
    requiresConfirmedPaidSubscription: true,
    validationTimeLabel: "após validação administrativa",
    cashWithdrawalsSupported: false,
  },
  schema: {
    governanceAvailable: true,
    resultLimit: 500,
    truncated: false,
  },
};

function readJson(response) {
  return response.json().catch(() => null);
}

function normalizeReferralData(value) {
  const payload = value && typeof value === "object" ? value : {};

  return {
    ...EMPTY_DATA,
    ...payload,
    referrals: Array.isArray(payload.referrals) ? payload.referrals : [],
    summary: { ...EMPTY_DATA.summary, ...(payload.summary || {}) },
    policy: { ...EMPTY_DATA.policy, ...(payload.policy || {}) },
    schema: { ...EMPTY_DATA.schema, ...(payload.schema || {}) },
  };
}

async function writeClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Clipboard indisponível.");
}

export function useIndiqueGanhe() {
  const session = useLawyerSession();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const abortRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/advogado/indicacoes/dashboard", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await readJson(response);

      if (response.status === 401) {
        window.location.href =
          "/login?redirectTo=/dashboard/advogado/indiqueganhe";
        return;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || "Não foi possível carregar suas indicações.",
        );
      }

      setData(normalizeReferralData(payload.data));
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[IndiqueGanhe] Falha ao carregar:", loadError);
      setError(
        loadError.message || "Não foi possível carregar suas indicações.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    const userId = session.profileData?.id;
    if (!userId) return undefined;

    let channel;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (cancelled || !authSession?.access_token) return;
      supabase.realtime.setAuth(authSession.access_token);

      channel = supabase
        .channel(`lawyer-referrals-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "indicacoes",
            filter: `indicador_id=eq.${userId}`,
          },
          () => {
            window.clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = window.setTimeout(() => {
              void Promise.all([load(), session.refreshProfile()]);
            }, 450);
          },
        )
        .subscribe();
    }

    void subscribe();
    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load, session.profileData?.id, session.refreshProfile]);

  const filteredReferrals = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return data.referrals.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" || item.status?.code === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        item.referred?.name
          ?.toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch) ||
        item.referred?.maskedEmail
          ?.toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [data.referrals, search, statusFilter]);

  const statusOptions = useMemo(() => {
    const options = new Map();
    for (const item of data.referrals) {
      if (item.status?.code && !options.has(item.status.code)) {
        options.set(item.status.code, item.status.label);
      }
    }
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [data.referrals]);

  const copyLink = useCallback(async () => {
    if (!data.referralUrl) return;

    try {
      await writeClipboard(data.referralUrl);
      toast.success("Link de indicação copiado.");
    } catch {
      toast.error("Não foi possível copiar o link neste navegador.");
    }
  }, [data.referralUrl]);

  const share = useCallback(async () => {
    if (!data.referralUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Social Jurídico — Indicação profissional",
          text: data.shareText,
          url: data.referralUrl,
        });
        return;
      }

      await writeClipboard(data.referralUrl);
      toast.success("Link copiado para você compartilhar.");
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        toast.error("Não foi possível compartilhar agora.");
      }
    }
  }, [data.referralUrl, data.shareText]);

  const whatsappUrl = useMemo(
    () =>
      data.shareText
        ? `https://wa.me/?text=${encodeURIComponent(data.shareText)}`
        : "",
    [data.shareText],
  );

  return {
    ...session,
    data,
    loading,
    error,
    reload: load,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    statusOptions,
    filteredReferrals,
    copyLink,
    share,
    whatsappUrl,
  };
}

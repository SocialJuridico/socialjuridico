"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabase";
import { useLawyerSession } from "../LawyerSessionContext";

const INITIAL_FILTERS = {
  search: "",
  status: "ACTIVE",
};

const EMPTY_SUMMARY = {
  total: 0,
  active: 0,
  hired: 0,
  inProgress: 0,
  closed: 0,
  cancelled: 0,
  chatReady: 0,
  unread: 0,
};

const EMPTY_PAGINATION = {
  page: 1,
  pages: 1,
  total: 0,
  limit: 10,
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
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function useLawyerCases() {
  const router = useRouter();
  const session = useLawyerSession();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [busyCaseId, setBusyCaseId] = useState(null);
  const abortRef = useRef(null);
  const realtimeTimerRef = useRef(null);

  const loadCases = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status: appliedFilters.status,
      });
      if (appliedFilters.search) params.set("q", appliedFilters.search);

      const response = await fetch(`/api/advogado/meus-casos?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace("/login?redirectTo=/dashboard/advogado/meuscasos");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar seus casos.");
      }

      setCases(data.data || []);
      setSummary(data.summary || EMPTY_SUMMARY);
      setPagination(data.pagination || EMPTY_PAGINATION);
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[MeusCasos] Falha ao carregar:", loadError);
      setError(loadError.message || "Não foi possível carregar seus casos.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [appliedFilters, page, router]);

  useEffect(() => {
    void loadCases();
    return () => abortRef.current?.abort();
  }, [loadCases]);

  useEffect(() => {
    const lawyerId = session.profileData?.id;
    if (!lawyerId) return undefined;

    const channel = supabase
      .channel(`lawyer-cases-${lawyerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "casos",
          filter: `advogado_id=eq.${lawyerId}`,
        },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => void loadCases(), 500);
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadCases, session.profileData?.id]);

  useEffect(() => {
    if (!selectedCase) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !busyCaseId) setSelectedCase(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busyCaseId, selectedCase]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({
      search: filters.search.trim().slice(0, 120),
      status: filters.status,
    });
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
  }

  async function openChat(caseItem) {
    if (!caseItem?.id || busyCaseId) return;

    if (caseItem.chatStarted || caseItem.canOpenChat) {
      router.push(caseItem.chatHref || `/chat/${caseItem.id}`);
      return;
    }

    if (!caseItem.canStartChat) {
      toast.error("Este atendimento não pode ser iniciado no status atual.");
      return;
    }

    setBusyCaseId(caseItem.id);

    try {
      const response = await fetch("/api/casos/chat-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseItem.id,
          requestId: createRequestId(),
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível abrir o atendimento.");
      }

      session.setProfileData((current) =>
        current
          ? {
              ...current,
              balance: data.newBalance ?? current.balance,
            }
          : current,
      );
      setCases((current) =>
        current.map((item) =>
          item.id === caseItem.id
            ? {
                ...item,
                chatStarted: true,
                canStartChat: false,
                canOpenChat: true,
              }
            : item,
        ),
      );
      toast.success(data.message || "Atendimento aberto sem cobrança adicional.");
      router.push(caseItem.chatHref || `/chat/${caseItem.id}`);
    } catch (openError) {
      console.error("[MeusCasos] Falha ao abrir atendimento:", openError);
      toast.error(openError.message || "Não foi possível abrir o atendimento.");
    } finally {
      setBusyCaseId(null);
    }
  }

  const hasFilters = useMemo(
    () => Boolean(appliedFilters.search || appliedFilters.status !== "ACTIVE"),
    [appliedFilters],
  );

  return {
    ...session,
    filters,
    appliedFilters,
    updateFilter,
    applyFilters,
    clearFilters,
    hasFilters,
    cases,
    summary,
    pagination,
    page,
    setPage,
    loading,
    error,
    reload: loadCases,
    selectedCase,
    setSelectedCase,
    busyCaseId,
    openChat,
  };
}

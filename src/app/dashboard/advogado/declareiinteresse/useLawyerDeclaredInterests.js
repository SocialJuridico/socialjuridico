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
  pending: 0,
  negotiating: 0,
  hired: 0,
  declined: 0,
};

const EMPTY_PAGINATION = { page: 1, pages: 1, total: 0, limit: 10 };

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

export function useLawyerDeclaredInterests() {
  const router = useRouter();
  const session = useLawyerSession();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [interests, setInterests] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInterest, setSelectedInterest] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busyInterestId, setBusyInterestId] = useState(null);
  const abortRef = useRef(null);
  const realtimeTimerRef = useRef(null);

  const loadInterests = useCallback(async () => {
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

      const response = await fetch(`/api/advogado/interesses?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace("/login?redirectTo=/dashboard/advogado/declareiinteresse");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar seus interesses.");
      }

      setInterests(data.data || []);
      setSummary(data.summary || EMPTY_SUMMARY);
      setPagination(data.pagination || EMPTY_PAGINATION);
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[DeclareiInteresse] Falha ao carregar:", loadError);
      setError(loadError.message || "Não foi possível carregar seus interesses.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [appliedFilters, page, router]);

  useEffect(() => {
    void loadInterests();
    return () => abortRef.current?.abort();
  }, [loadInterests]);

  useEffect(() => {
    const lawyerId = session.profileData?.id;
    if (!lawyerId) return undefined;

    const channel = supabase
      .channel(`lawyer-declared-interests-${lawyerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_interests",
          filter: `lawyer_id=eq.${lawyerId}`,
        },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => void loadInterests(), 500);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "casos" },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => void loadInterests(), 700);
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadInterests, session.profileData?.id]);

  useEffect(() => {
    if (!selectedInterest && !cancelTarget) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key !== "Escape" || busyInterestId) return;
      setSelectedInterest(null);
      setCancelTarget(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busyInterestId, cancelTarget, selectedInterest]);

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

  async function cancelInterest(item) {
    if (!item?.id || busyInterestId) return;
    setBusyInterestId(item.id);

    try {
      const response = await fetch("/api/advogado/interesses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interestId: item.id,
          requestId: createRequestId(),
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível desfazer interesse.");
      }

      session.setProfileData((current) =>
        current
          ? {
              ...current,
              balance: data.data?.newBalance ?? current.balance,
            }
          : current,
      );
      setInterests((current) => current.filter((interest) => interest.id !== item.id));
      setCancelTarget(null);
      toast.success(data.message || "Interesse desfeito com segurança.");
      void loadInterests();
    } catch (mutationError) {
      console.error("[DeclareiInteresse] Falha ao cancelar:", mutationError);
      toast.error(mutationError.message || "Não foi possível desfazer interesse.");
    } finally {
      setBusyInterestId(null);
    }
  }

  function openNegotiation(item) {
    if (!item?.caseId || !item?.id) return;
    router.push(`/chat/${item.caseId}?interest=${item.id}`);
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
    interests,
    summary,
    pagination,
    page,
    setPage,
    loading,
    error,
    reload: loadInterests,
    selectedInterest,
    setSelectedInterest,
    cancelTarget,
    setCancelTarget,
    busyInterestId,
    cancelInterest,
    openNegotiation,
  };
}

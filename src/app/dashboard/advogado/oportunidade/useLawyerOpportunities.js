"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabase";
import { useLawyerSession } from "../LawyerSessionContext";

const INITIAL_FILTERS = {
  search: "",
  area: "",
  state: "",
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
  const hex = [...bytes].map((value) =>
    value.toString(16).padStart(2, "0"),
  );
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function useLawyerOpportunities() {
  const router = useRouter();
  const session = useLawyerSession();
  const [activeFeed, setActiveFeed] = useState("platform");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [cases, setCases] = useState([]);
  const [areas, setAreas] = useState([]);
  const [summary, setSummary] = useState({ available: 0, negotiating: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 12,
  });
  const [notices, setNotices] = useState([]);
  const [banners, setBanners] = useState([]);
  const [radarCount, setRadarCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [supportLoading, setSupportLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [pendingInterest, setPendingInterest] = useState(null);
  const [busyCaseId, setBusyCaseId] = useState(null);
  const abortRef = useRef(null);
  const realtimeTimerRef = useRef(null);

  const loadOpportunities = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
      });
      if (appliedFilters.search) params.set("q", appliedFilters.search);
      if (appliedFilters.area) params.set("area", appliedFilters.area);
      if (appliedFilters.state) params.set("state", appliedFilters.state);

      const response = await fetch(`/api/advogado/oportunidades?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          "/login?redirectTo=/dashboard/advogado/oportunidade",
        );
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar as oportunidades.",
        );
      }

      setCases(data.data || []);
      setAreas(data.filters?.areas || []);
      setSummary(data.summary || { available: 0, negotiating: 0 });
      setPagination(
        data.pagination || { page: 1, pages: 1, total: 0, limit: 12 },
      );
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[Oportunidades] Falha ao carregar:", loadError);
      setError(
        loadError.message || "Não foi possível carregar as oportunidades.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [appliedFilters, page, router]);

  const loadSupportContent = useCallback(async () => {
    setSupportLoading(true);
    const requests = await Promise.allSettled([
      fetch("/api/avisos", { cache: "no-store" }).then(readJson),
      fetch("/api/banners", { cache: "no-store" }).then(readJson),
      fetch("/api/radar?count_only=true", { cache: "no-store" }).then(
        readJson,
      ),
    ]);

    const [noticeResult, bannerResult, radarResult] = requests;
    if (
      noticeResult.status === "fulfilled" &&
      noticeResult.value?.success
    ) {
      setNotices(noticeResult.value.data || []);
    }
    if (
      bannerResult.status === "fulfilled" &&
      bannerResult.value?.success
    ) {
      setBanners(bannerResult.value.banners || []);
    }
    if (radarResult.status === "fulfilled" && radarResult.value?.success) {
      setRadarCount(radarResult.value.count || 0);
    }
    setSupportLoading(false);
  }, []);

  useEffect(() => {
    void loadOpportunities();
    return () => abortRef.current?.abort();
  }, [loadOpportunities]);

  useEffect(() => {
    void loadSupportContent();
  }, [loadSupportContent]);

  useEffect(() => {
    const channel = supabase
      .channel("lawyer-opportunities-route")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "casos" },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => {
            void loadOpportunities();
          }, 500);
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadOpportunities]);

  useEffect(() => {
    if (!selectedCase && !pendingInterest) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key !== "Escape" || busyCaseId) return;
      setSelectedCase(null);
      setPendingInterest(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busyCaseId, pendingInterest, selectedCase]);

  const bannerGroups = useMemo(() => {
    const grouped = { left: [], right: [] };
    banners.forEach((banner) => {
      const side = banner.position === "right" ? "right" : "left";
      grouped[side].push(banner);
    });
    return grouped;
  }, [banners]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({
      search: filters.search.trim().slice(0, 120),
      area: filters.area,
      state: filters.state.trim().toUpperCase().slice(0, 2),
    });
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
  }

  async function manifestInterest(caseItem) {
    if (!caseItem?.id || busyCaseId) return;

    if ((session.profileData?.balance || 0) < 1) {
      toast.error(
        "Você precisa de pelo menos 1 Juri para manifestar interesse.",
      );
      session.openPlansModal();
      return;
    }

    setBusyCaseId(caseItem.id);
    try {
      const response = await fetch(
        "/api/advogado/oportunidades/interesse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseItem.id,
            requestId: createRequestId(),
          }),
        },
      );
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        if (response.status === 402) {
          session.openPlansModal();
        }
        throw new Error(
          data?.message || "Não foi possível manifestar interesse.",
        );
      }

      setCases((current) =>
        current.filter((item) => item.id !== caseItem.id),
      );
      setSummary((current) => ({
        ...current,
        available: Math.max(0, current.available - 1),
      }));
      session.setProfileData((current) =>
        current
          ? {
              ...current,
              balance: data.data?.newBalance ?? current.balance,
            }
          : current,
      );

      setPendingInterest(null);
      setSelectedCase(null);
      toast.success(data.message || "Interesse manifestado com sucesso.");
    } catch (mutationError) {
      console.error("[Oportunidades] Falha no interesse:", mutationError);
      toast.error(
        mutationError.message || "Não foi possível manifestar interesse.",
      );
    } finally {
      setBusyCaseId(null);
    }
  }

  return {
    ...session,
    activeFeed,
    setActiveFeed,
    filters,
    updateFilter,
    applyFilters,
    clearFilters,
    cases,
    areas,
    summary,
    pagination,
    page,
    setPage,
    notices,
    bannerGroups,
    radarCount,
    loading,
    supportLoading,
    error,
    reload: loadOpportunities,
    selectedCase,
    setSelectedCase,
    pendingInterest,
    setPendingInterest,
    busyCaseId,
    manifestInterest,
  };
}

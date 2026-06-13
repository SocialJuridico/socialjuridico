"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_SUMMARY = {
  total: 0,
  featured: 0,
  prepostos: 0,
  diligencias: 0,
  outros: 0,
  advertisers: 0,
};

const EMPTY_PAGINATION = {
  page: 1,
  pages: 1,
  total: 0,
  limit: 12,
};

const VALID_CATEGORIES = new Set([
  "ALL",
  "PREPOSTOS",
  "DILIGENCIAS",
  "OUTROS",
]);

function initialCategory(searchParams) {
  const value = String(searchParams.get("categoria") || "ALL").toUpperCase();
  return VALID_CATEGORIES.has(value) ? value : "ALL";
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useLawyerServiceAds() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useLawyerSession();
  const categoryFromUrl = initialCategory(searchParams);
  const [filters, setFilters] = useState({
    search: "",
    category: categoryFromUrl,
    featured: "ALL",
    sort: "RELEVANCE",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    category: categoryFromUrl,
    featured: "ALL",
    sort: "RELEVANCE",
  });
  const [page, setPage] = useState(1);
  const [ads, setAds] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAd, setSelectedAd] = useState(null);
  const [busyContactId, setBusyContactId] = useState(null);
  const abortRef = useRef(null);

  const loadAds = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        categoria: appliedFilters.category,
        destaque: appliedFilters.featured,
        ordem: appliedFilters.sort,
      });
      if (appliedFilters.search) params.set("q", appliedFilters.search);

      const response = await fetch(
        `/api/advogado/anuncios-servicos?${params.toString()}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/anuncioseservicos")}`,
        );
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar os anúncios e serviços.",
        );
      }

      setAds(data.data || []);
      setSummary(data.summary || EMPTY_SUMMARY);
      setPagination(data.pagination || EMPTY_PAGINATION);
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[AnúnciosServiços] Falha ao carregar:", loadError);
      setError(
        loadError.message || "Não foi possível carregar os anúncios e serviços.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [appliedFilters, page, router]);

  useEffect(() => {
    void loadAds();
    return () => abortRef.current?.abort();
  }, [loadAds]);

  useEffect(() => {
    setFilters((current) =>
      current.category === categoryFromUrl
        ? current
        : { ...current, category: categoryFromUrl },
    );
    setAppliedFilters((current) =>
      current.category === categoryFromUrl
        ? current
        : { ...current, category: categoryFromUrl },
    );
    setPage(1);
  }, [categoryFromUrl]);

  useEffect(() => {
    if (!selectedAd) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key === "Escape" && !busyContactId) setSelectedAd(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busyContactId, selectedAd]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({
      search: filters.search.trim().slice(0, 120),
      category: filters.category,
      featured: filters.featured,
      sort: filters.sort,
    });
  }

  function selectCategory(category) {
    if (!VALID_CATEGORIES.has(category)) return;
    setFilters((current) => ({ ...current, category }));
    setAppliedFilters((current) => ({ ...current, category }));
    setPage(1);
  }

  function clearFilters() {
    const cleared = {
      search: "",
      category: "ALL",
      featured: "ALL",
      sort: "RELEVANCE",
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setPage(1);
  }

  async function openDetails(ad) {
    if (!ad?.id) return;
    setSelectedAd(ad);

    fetch(`/api/advogado/anuncios-servicos/${ad.id}/visualizacao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: createRequestId() }),
    }).catch((auditError) => {
      console.error(
        "[AnúnciosServiços] Auditoria de visualização pendente:",
        auditError,
      );
    });
  }

  async function openContact(ad) {
    if (!ad?.id || busyContactId) return;

    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      try {
        popup.document.title = "Abrindo contato seguro...";
        popup.document.body.textContent = "Abrindo o WhatsApp do parceiro...";
      } catch {
        // A janela continuará disponível para receber o redirecionamento seguro.
      }
    }

    setBusyContactId(ad.id);

    try {
      const response = await fetch(
        `/api/advogado/anuncios-servicos/${ad.id}/contato`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: createRequestId() }),
        },
      );
      const data = await readJson(response);

      if (!response.ok || !data?.success || !data?.data?.url) {
        throw new Error(
          data?.message || "Não foi possível abrir o contato do parceiro.",
        );
      }

      if (popup && !popup.closed) {
        popup.location.replace(data.data.url);
      } else {
        window.location.assign(data.data.url);
      }
    } catch (contactError) {
      if (popup && !popup.closed) popup.close();
      toast.error(
        contactError.message || "Não foi possível abrir o contato do parceiro.",
      );
    } finally {
      setBusyContactId(null);
    }
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        appliedFilters.search ||
          appliedFilters.category !== "ALL" ||
          appliedFilters.featured !== "ALL" ||
          appliedFilters.sort !== "RELEVANCE",
      ),
    [appliedFilters],
  );

  return {
    ...session,
    filters,
    appliedFilters,
    updateFilter,
    applyFilters,
    selectCategory,
    clearFilters,
    hasFilters,
    ads,
    summary,
    pagination,
    page,
    setPage,
    loading,
    error,
    reload: loadAds,
    selectedAd,
    setSelectedAd,
    busyContactId,
    openDetails,
    openContact,
  };
}

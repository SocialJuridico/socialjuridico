"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { calculateReviewSummary } from "../utils/reviewFormatters";

export function useAdminReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [commentFilter, setCommentFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/avaliacoes", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        toast.error(data?.message || "Acesso restrito à área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar as avaliações.");
      }

      setReviews(data.data || []);
    } catch (error) {
      console.error("[Admin/Avaliações] Erro ao carregar:", error);
      setLoadError(error.message || "Erro ao carregar avaliações.");
      toast.error(error.message || "Erro ao carregar avaliações.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reviews.filter((review) => {
      if (term) {
        const searchable = `${review.advogado_nome || ""} ${
          review.cliente_nome || ""
        } ${review.caso_titulo || ""} ${review.justificativa || ""}`.toLowerCase();

        if (!searchable.includes(term)) return false;
      }

      const rating = Number(review.nota || 0);
      if (ratingFilter === "POSITIVE" && rating < 4) return false;
      if (ratingFilter === "NEUTRAL" && rating !== 3) return false;
      if (ratingFilter === "NEGATIVE" && rating > 2) return false;

      const hasComment = Boolean(review.justificativa?.trim());
      if (commentFilter === "WITH_COMMENT" && !hasComment) return false;
      if (commentFilter === "WITHOUT_COMMENT" && hasComment) return false;

      return true;
    });
  }, [reviews, search, ratingFilter, commentFilter]);

  const summary = useMemo(
    () => ({
      ...calculateReviewSummary(reviews),
      visible: filteredReviews.length,
    }),
    [reviews, filteredReviews.length],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setRatingFilter("ALL");
    setCommentFilter("ALL");
  }, []);

  const toggleExpanded = useCallback((reviewId) => {
    setExpandedId((current) => (current === reviewId ? null : reviewId));
  }, []);

  return {
    reviews,
    filteredReviews,
    loading,
    loadError,
    search,
    ratingFilter,
    commentFilter,
    expandedId,
    summary,
    setSearch,
    setRatingFilter,
    setCommentFilter,
    loadReviews,
    clearFilters,
    toggleExpanded,
  };
}

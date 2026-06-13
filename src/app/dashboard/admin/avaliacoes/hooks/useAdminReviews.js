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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [moderationModal, setModerationModal] = useState(null);
  const [moderationBusy, setModerationBusy] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
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
    void loadReviews();
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

      if (statusFilter !== "ALL" && review.status !== statusFilter) return false;

      return true;
    });
  }, [reviews, search, ratingFilter, commentFilter, statusFilter]);

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
    setStatusFilter("ALL");
  }, []);

  const toggleExpanded = useCallback((reviewId) => {
    setExpandedId((current) => (current === reviewId ? null : reviewId));
  }, []);

  const openModeration = useCallback((review, nextStatus) => {
    setModerationModal({ review, nextStatus, reason: "" });
  }, []);

  const closeModeration = useCallback(() => {
    if (!moderationBusy) setModerationModal(null);
  }, [moderationBusy]);

  const setModerationReason = useCallback((reason) => {
    setModerationModal((current) =>
      current ? { ...current, reason: reason.slice(0, 2000) } : current,
    );
  }, []);

  const submitModeration = useCallback(async () => {
    if (!moderationModal) return;
    setModerationBusy(true);

    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: moderationModal.review.id,
          status: moderationModal.nextStatus,
          reason: moderationModal.reason,
          version: moderationModal.review.version,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível moderar a avaliação.");
      }

      setReviews((current) =>
        current.map((review) =>
          review.id === moderationModal.review.id
            ? {
                ...review,
                status: data.data.status,
                version: data.data.version,
                moderated_at: data.data.moderated_at || review.moderated_at,
                moderation_reason:
                  data.data.moderation_reason || moderationModal.reason || null,
              }
            : review,
        ),
      );
      setModerationModal(null);
      toast.success(data.message || "Avaliação moderada com sucesso.");
    } catch (error) {
      toast.error(error.message || "Não foi possível moderar a avaliação.");
    } finally {
      setModerationBusy(false);
    }
  }, [moderationModal]);

  return {
    reviews,
    filteredReviews,
    loading,
    loadError,
    search,
    ratingFilter,
    commentFilter,
    statusFilter,
    expandedId,
    summary,
    moderationModal,
    moderationBusy,
    setSearch,
    setRatingFilter,
    setCommentFilter,
    setStatusFilter,
    loadReviews,
    clearFilters,
    toggleExpanded,
    openModeration,
    closeModeration,
    setModerationReason,
    submitModeration,
  };
}

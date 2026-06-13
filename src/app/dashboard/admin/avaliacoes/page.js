"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import GovernedReviewsList from "./components/GovernedReviewsList";
import ReviewModerationModal from "./components/ReviewModerationModal";
import ReviewsFilters from "./components/ReviewsFilters";
import ReviewsHeader from "./components/ReviewsHeader";
import ReviewsSummary from "./components/ReviewsSummary";
import { useAdminReviews } from "./hooks/useAdminReviews";
import styles from "./Avaliacoes.module.css";

export default function AdminAvaliacoesPage() {
  const state = useAdminReviews();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando avaliações</h1>
        <p>Preparando os dados de reputação dos advogados.</p>
      </main>
    );
  }

  if (state.loadError && state.summary.total === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}><AlertTriangle size={28} /></span>
        <h1>Não foi possível carregar as avaliações</h1>
        <p>{state.loadError}</p>
        <button type="button" className={styles.goldButton} onClick={state.loadReviews}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ReviewsHeader
        total={state.summary.total}
        visible={state.summary.visible}
        onReload={state.loadReviews}
      />

      {state.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} />
          <div><strong>Dados parcialmente indisponíveis</strong><p>{state.loadError}</p></div>
          <button type="button" onClick={state.loadReviews}>Atualizar</button>
        </div>
      )}

      <ReviewsSummary
        summary={state.summary}
        activeFilter={state.ratingFilter}
        onFilter={state.setRatingFilter}
      />

      <ReviewsFilters
        search={state.search}
        ratingFilter={state.ratingFilter}
        commentFilter={state.commentFilter}
        statusFilter={state.statusFilter}
        visibleCount={state.summary.visible}
        onSearch={state.setSearch}
        onRatingFilter={state.setRatingFilter}
        onCommentFilter={state.setCommentFilter}
        onStatusFilter={state.setStatusFilter}
        onClear={state.clearFilters}
      />

      <GovernedReviewsList state={state} />
      <ReviewModerationModal state={state} />
    </main>
  );
}

import { ChevronDown, ChevronUp, MessageSquareText, Star, UserRound } from "lucide-react";

import ReviewGovernancePanel, { ReviewStatus } from "./ReviewGovernancePanel";
import { formatDate, getRatingLabel, getRatingTone } from "../utils/reviewFormatters";
import styles from "../Avaliacoes.module.css";
import governance from "../ReviewGovernance.module.css";

function RatingStars({ rating }) {
  const value = Number(rating || 0);
  return (
    <span className={styles.starsRow} aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= value ? styles.starActive : styles.starInactive}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function GovernedReviewsList({ state }) {
  if (!state.filteredReviews.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}><UserRound size={28} /></span>
        <h2>Nenhuma avaliação encontrada</h2>
        <p>Ajuste os filtros ou aguarde novas avaliações dos clientes.</p>
      </div>
    );
  }

  return (
    <section className={styles.list} aria-label="Lista de avaliações">
      {state.filteredReviews.map((review) => {
        const expanded = state.expandedId === review.id;
        const tone = getRatingTone(review.nota);

        return (
          <article key={review.id} className={styles.reviewCard}>
            <button
              type="button"
              className={styles.reviewHeader}
              onClick={() => state.toggleExpanded(review.id)}
              aria-expanded={expanded}
            >
              <span className={styles.ratingBlock}>
                <RatingStars rating={review.nota} />
                <span className={`${styles.ratingBadge} ${styles[`rating_${tone}`]}`}>
                  {review.nota}/5 · {getRatingLabel(review.nota)}
                </span>
                <ReviewStatus status={review.status} />
              </span>

              <span className={styles.reviewInfo}>
                <strong>{review.advogado_nome || "Advogado"}</strong>
                <span>Cliente: {review.cliente_nome || "Cliente"}</span>
                <small>{review.caso_titulo || "Caso não identificado"}</small>
              </span>

              <span className={styles.reviewMeta}>
                <time>{formatDate(review.created_at)}</time>
                <span className={styles.expandIcon}>
                  {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </span>
              </span>
            </button>

            {expanded && (
              <div className={styles.reviewDetails}>
                <div className={governance.detailsHeader}>
                  <span className={styles.detailTitle}>
                    <MessageSquareText size={16} /> Justificativa do cliente
                  </span>
                  <ReviewStatus status={review.status} />
                </div>

                {review.justificativa?.trim() ? (
                  <blockquote>{review.justificativa.trim()}</blockquote>
                ) : (
                  <p className={styles.noComment}>Sem justificativa textual.</p>
                )}

                <dl className={styles.reviewIds}>
                  <div><dt>ID da avaliação</dt><dd>{review.id}</dd></div>
                  <div><dt>ID do caso</dt><dd>{review.caso_id || "—"}</dd></div>
                  <div><dt>ID do advogado</dt><dd>{review.advogado_id || "—"}</dd></div>
                  <div><dt>Versão</dt><dd>{review.version || 1}</dd></div>
                </dl>

                <ReviewGovernancePanel
                  review={review}
                  onModerate={state.openModeration}
                  moderationBusy={state.moderationBusy}
                />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

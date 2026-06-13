import { Eye, EyeOff, ShieldAlert } from "lucide-react";

import { formatDate } from "../utils/reviewFormatters";
import styles from "../ReviewGovernance.module.css";

export function ReviewStatus({ status }) {
  const normalized = status || "PUBLISHED";
  const meta = {
    PUBLISHED: ["Publicada", styles.statusPublished, Eye],
    HIDDEN: ["Oculta", styles.statusHidden, EyeOff],
    INVALID: ["Inválida", styles.statusInvalid, ShieldAlert],
  }[normalized] || [normalized, styles.statusInvalid, ShieldAlert];
  const Icon = meta[2];

  return (
    <span className={`${styles.statusBadge} ${meta[1]}`}>
      <Icon size={11} aria-hidden="true" />
      {meta[0]}
    </span>
  );
}

export default function ReviewGovernancePanel({
  review,
  onModerate,
  moderationBusy,
}) {
  return (
    <div className={styles.moderationPanel}>
      <strong>Governança da publicação</strong>
      <p>
        Ocultar remove a avaliação da média pública sem apagar o registro.
        Restaurar recalcula a reputação na mesma transação.
      </p>

      {(review.moderated_at || review.moderation_reason) && (
        <div className={styles.moderationMeta}>
          {review.moderated_at && (
            <span>Moderada em {formatDate(review.moderated_at)}</span>
          )}
          {review.moderation_reason && (
            <span>Motivo: {review.moderation_reason}</span>
          )}
        </div>
      )}

      <div className={styles.moderationActions}>
        {review.status === "PUBLISHED" && (
          <button
            type="button"
            className={styles.hideButton}
            onClick={() => onModerate(review, "HIDDEN")}
            disabled={moderationBusy}
          >
            <EyeOff size={14} aria-hidden="true" />
            Ocultar avaliação
          </button>
        )}

        {review.status === "HIDDEN" && (
          <button
            type="button"
            className={styles.restoreButton}
            onClick={() => onModerate(review, "PUBLISHED")}
            disabled={moderationBusy}
          >
            <Eye size={14} aria-hidden="true" />
            Restaurar avaliação
          </button>
        )}

        {review.status === "INVALID" && (
          <span className={`${styles.statusBadge} ${styles.statusInvalid}`}>
            Registro histórico bloqueado para publicação
          </span>
        )}
      </div>
    </div>
  );
}

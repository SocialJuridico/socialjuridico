import {
  Archive,
  CalendarDays,
  RotateCcw,
  Star,
} from "lucide-react";

import { AD_STATUS_LABELS, CATEGORY_LABELS, formatDate } from "../config";
import styles from "../AnunciantesAdmin.module.css";

export default function AdvertiserAdRow({
  ad,
  advertiserActive,
  busyAction,
  onToggleFeatured,
  onArchive,
  onRestore,
}) {
  const archived = ad.status === "ARQUIVADO";
  const busy =
    busyAction.endsWith(`:${ad.id}`) ||
    busyAction === `TOGGLE_FEATURED:${ad.id}`;

  return (
    <article className={styles.adCard} data-archived={archived ? "true" : "false"}>
      <div className={styles.adCardHeader}>
        <div>
          <span className={styles.categoryBadge}>
            {CATEGORY_LABELS[ad.category] || ad.category || "Outros"}
          </span>
          <h4>{ad.title}</h4>
        </div>

        <div className={styles.adBadgeGroup}>
          {ad.featured && !archived && (
            <span className={styles.featuredBadge}>
              <Star size={12} fill="currentColor" aria-hidden="true" />
              Destaque
            </span>
          )}
          <span className={styles.adStatusBadge} data-status={ad.status}>
            {AD_STATUS_LABELS[ad.status] || ad.status}
          </span>
        </div>
      </div>

      <p>{ad.description || "Descrição não informada."}</p>

      <footer className={styles.adCardFooter}>
        <span>
          <CalendarDays size={13} aria-hidden="true" />
          {formatDate(ad.createdAt)}
        </span>

        <div className={styles.adActions}>
          {!archived && (
            <button
              type="button"
              className={ad.featured ? styles.goldButton : styles.secondaryButton}
              onClick={() => onToggleFeatured(ad)}
              disabled={busy || !advertiserActive}
            >
              <Star size={14} aria-hidden="true" />
              {ad.featured ? "Remover destaque" : "Dar destaque"}
            </button>
          )}

          {archived ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onRestore(ad)}
              disabled={busy || !advertiserActive}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Restaurar
            </button>
          ) : (
            <button
              type="button"
              className={styles.dangerOutlineButton}
              onClick={() => onArchive(ad)}
              disabled={busy}
            >
              <Archive size={14} aria-hidden="true" />
              Arquivar
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

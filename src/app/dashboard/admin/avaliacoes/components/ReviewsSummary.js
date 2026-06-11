import { MessageSquareText, Minus, Star, ThumbsDown, ThumbsUp } from "lucide-react";

import styles from "../Avaliacoes.module.css";

const cards = [
  { key: "total", label: "Total de avaliações", icon: Star, filter: "ALL" },
  { key: "positive", label: "Positivas (4–5)", icon: ThumbsUp, filter: "POSITIVE" },
  { key: "neutral", label: "Neutras (3)", icon: Minus, filter: "NEUTRAL" },
  { key: "negative", label: "Negativas (0–2)", icon: ThumbsDown, filter: "NEGATIVE" },
  { key: "withComment", label: "Com justificativa", icon: MessageSquareText, filter: null },
];

export default function ReviewsSummary({ summary, activeFilter, onFilter }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo das avaliações">
      {cards.map(({ key, label, icon: Icon, filter }) => {
        const clickable = filter !== null;
        const active = clickable && activeFilter === filter;

        return (
          <button
            key={key}
            type="button"
            className={`${styles.summaryCard} ${active ? styles.summaryCardActive : ""}`}
            onClick={() => clickable && onFilter(filter)}
            disabled={!clickable}
            aria-pressed={clickable ? active : undefined}
          >
            <span className={styles.summaryIcon}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className={styles.summaryContent}>
              <strong>{summary[key] ?? 0}</strong>
              <span>{label}</span>
            </span>
          </button>
        );
      })}

      <article className={styles.summaryCard}>
        <span className={styles.summaryIcon}>
          <Star size={18} aria-hidden="true" />
        </span>
        <span className={styles.summaryContent}>
          <strong>{summary.average ?? "—"}</strong>
          <span>Média geral</span>
        </span>
      </article>
    </section>
  );
}

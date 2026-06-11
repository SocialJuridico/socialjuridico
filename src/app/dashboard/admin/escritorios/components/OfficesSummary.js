import { Building2, Crown, Scale, Users, Zap } from "lucide-react";

import styles from "../EscritoriosAdmin.module.css";

const cards = [
  { key: "total", label: "Total de escritórios", icon: Building2, filter: "ALL" },
  { key: "start", label: "Enterprise Start", icon: Zap, filter: "start" },
  { key: "pro", label: "Enterprise Pro", icon: Scale, filter: "pro" },
  { key: "proPlus", label: "Enterprise Pro+", icon: Crown, filter: "pro_plus" },
  { key: "lawyerCapacity", label: "Capacidade de advogados", icon: Users, filter: null },
  { key: "internCapacity", label: "Capacidade de estagiários", icon: Users, filter: null },
];

export default function OfficesSummary({ summary, activeFilter, onFilter }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo dos escritórios">
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
              <strong>{summary[key] || 0}</strong>
              <span>{label}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

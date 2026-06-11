import { AlertTriangle, Bot, Eye, ListChecks } from "lucide-react";

import styles from "../page.module.css";

const cards = [
  { key: "total", label: "Total no filtro", icon: ListChecks },
  { key: "visible", label: "Visíveis na página", icon: Eye },
  { key: "automatic", label: "Captura automática", icon: Bot },
  { key: "reported", label: "Sinalizadas", icon: AlertTriangle },
];

export default function RadarSummary({ summary }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo do Radar">
      {cards.map(({ key, label, icon: Icon }) => (
        <article key={key} className={styles.summaryCard}>
          <span className={styles.summaryIcon}><Icon size={18} aria-hidden="true" /></span>
          <div><strong>{summary[key] || 0}</strong><span>{label}</span></div>
        </article>
      ))}
    </section>
  );
}

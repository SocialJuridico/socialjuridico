import {
  AlertTriangle,
  BriefcaseBusiness,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";
import styles from "../CasosAdmin.module.css";

const cards = [
  {
    key: "total",
    label: "Casos monitorados",
    icon: BriefcaseBusiness,
    getValue: (summary) => summary.total,
    getMeta: (summary) => `${summary.interestRate}% receberam interesse`,
  },
  {
    key: "needsAction",
    label: "Precisam de ação",
    icon: AlertTriangle,
    getValue: (summary) => summary.needsAction,
    getMeta: (summary) => `${summary.critical} alertas críticos`,
  },
  {
    key: "waitingClient",
    label: "Aguardando cliente",
    icon: UserRoundCheck,
    getValue: (summary) => summary.waitingClient,
    getMeta: () => "Principal ponto de abandono",
  },
  {
    key: "conversionRate",
    label: "Conversão em contratação",
    icon: ShieldAlert,
    getValue: (summary) => `${summary.conversionRate}%`,
    getMeta: (summary) => `${summary.hired} casos contratados`,
  },
];

export default function CasesSummary({ summary }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo operacional dos casos">
      {cards.map(({ key, label, icon: Icon, getValue, getMeta }) => (
        <article key={key} className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className={styles.summaryContent}>
            <strong>{getValue(summary)}</strong>
            <span>{label}</span>
            <small>{getMeta(summary)}</small>
          </span>
        </article>
      ))}
    </section>
  );
}

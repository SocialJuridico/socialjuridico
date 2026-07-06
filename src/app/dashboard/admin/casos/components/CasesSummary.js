import {
  AlertTriangle,
  Archive,
  BriefcaseBusiness,
  ShieldAlert,
  Sparkles,
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

// Distribuição por intenção de fechamento da triagem (ver
// triagemCliente.md seção 5). LEGADO cobre casos publicados antes da
// triagem existir (intencao_fechamento null).
const intentCards = [
  {
    key: "countAlta",
    label: "Alta intenção",
    icon: BriefcaseBusiness,
    getValue: (summary) => summary.countAlta || 0,
  },
  {
    key: "countMedia",
    label: "Média intenção",
    icon: BriefcaseBusiness,
    getValue: (summary) => summary.countMedia || 0,
  },
  {
    key: "countOraculo",
    label: "Oráculos (dúvidas)",
    icon: Sparkles,
    getValue: (summary) => summary.countOraculo || 0,
  },
  {
    key: "countLegado",
    label: "Sem triagem",
    icon: Archive,
    getValue: (summary) => summary.countLegado || 0,
  },
];

export default function CasesSummary({ summary }) {
  return (
    <>
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

      <section
        className={styles.summaryGrid}
        aria-label="Distribuição por intenção de fechamento"
      >
        {intentCards.map(({ key, label, icon: Icon, getValue }) => (
          <article key={key} className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className={styles.summaryContent}>
              <strong>{getValue(summary)}</strong>
              <span>{label}</span>
            </span>
          </article>
        ))}
      </section>
    </>
  );
}

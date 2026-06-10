import {
  AlertTriangle,
  BadgeCheck,
  Crown,
  UserRoundX,
  Users,
  Zap,
} from "lucide-react";

import styles from "../AdvogadosAdmin.module.css";

const cards = [
  {
    key: "total",
    label: "Total de advogados",
    icon: Users,
    filter: { type: "ALL", value: "ALL" },
  },
  {
    key: "verified",
    label: "OAB verificadas",
    icon: BadgeCheck,
    filter: { type: "OAB", value: "VERIFIED" },
  },
  {
    key: "pending",
    label: "OAB pendentes",
    icon: AlertTriangle,
    filter: { type: "OAB", value: "PENDING" },
  },
  {
    key: "errors",
    label: "OAB com erro",
    icon: AlertTriangle,
    filter: { type: "OAB", value: "ERROR" },
  },
  {
    key: "start",
    label: "Plano START",
    icon: Zap,
    filter: { type: "PLAN", value: "START" },
  },
  {
    key: "pro",
    label: "Plano PRO",
    icon: Crown,
    filter: { type: "PLAN", value: "PRO" },
  },
  {
    key: "neverAccessed",
    label: "Nunca acessaram",
    icon: UserRoundX,
    filter: { type: "INACTIVITY", value: "NEVER" },
  },
  {
    key: "inactive30",
    label: "Inativos há 30+ dias",
    icon: UserRoundX,
    filter: { type: "INACTIVITY", value: "30DAYS" },
  },
];

export default function LawyersSummary({
  summary,
  activeSummaryKey,
  onFilter,
}) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo dos advogados">
      {cards.map(({ key, label, icon: Icon, filter }) => {
        const active = activeSummaryKey === key;

        return (
          <button
            key={key}
            type="button"
            className={styles.summaryCard}
            onClick={() => onFilter(key, filter)}
            aria-pressed={active}
            title={`Filtrar por: ${label}`}
            style={{
              color: "inherit",
              cursor: "pointer",
              font: "inherit",
              textAlign: "left",
              borderColor: active
                ? "rgba(212, 175, 55, 0.62)"
                : undefined,
              background: active
                ? "rgba(212, 175, 55, 0.075)"
                : undefined,
              boxShadow: active
                ? "0 0 0 2px rgba(212, 175, 55, 0.08)"
                : undefined,
            }}
          >
            <span className={styles.summaryIcon}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>{summary[key] || 0}</strong>
              <span>{label}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}

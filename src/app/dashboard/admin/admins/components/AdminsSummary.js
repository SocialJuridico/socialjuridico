import { ShieldCheck, UserCheck, UserRound, Users } from "lucide-react";

import styles from "../AdminsAdmin.module.css";

const cards = [
  { key: "total", label: "Total de administradores", icon: Users },
  { key: "visible", label: "Visíveis na consulta", icon: ShieldCheck },
  { key: "active", label: "Já acessaram", icon: UserCheck },
  { key: "neverAccessed", label: "Nunca acessaram", icon: UserRound },
];

export default function AdminsSummary({ summary }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo dos administradores">
      {cards.map(({ key, label, icon: Icon }) => (
        <article key={key} className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{summary[key] || 0}</strong>
            <span>{label}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

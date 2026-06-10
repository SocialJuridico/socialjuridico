import {
  PhoneOff,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";

import styles from "../ClientesAdmin.module.css";

const cards = [
  { key: "total", label: "Total de clientes", icon: Users },
  { key: "neverAccessed", label: "Nunca acessaram", icon: UserRoundX },
  { key: "inactive30", label: "Inativos há 30+ dias", icon: UserRoundCheck },
  { key: "withoutPhone", label: "Sem telefone", icon: PhoneOff },
];

export default function ClientsSummary({ summary }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo dos clientes">
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

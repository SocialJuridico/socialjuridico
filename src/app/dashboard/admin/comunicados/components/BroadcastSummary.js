import { ShieldCheck, Scale, UserRound, Users } from "lucide-react";
import styles from "../ComunicadosAdmin.module.css";

const cards = [
  { key: "clients", label: "Clientes disponíveis", icon: UserRound },
  { key: "lawyers", label: "Advogados disponíveis", icon: Scale },
  { key: "admins", label: "Administradores", icon: ShieldCheck },
  { key: "total", label: "Alcance total", icon: Users },
];

export default function BroadcastSummary({ counts }) {
  return (
    <section className={styles.summaryGrid} aria-label="Públicos disponíveis">
      {cards.map(({ key, label, icon: Icon }) => (
        <article key={key} className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className={styles.summaryContent}>
            <strong>{counts[key] ?? 0}</strong>
            <span>{label}</span>
          </span>
        </article>
      ))}
    </section>
  );
}

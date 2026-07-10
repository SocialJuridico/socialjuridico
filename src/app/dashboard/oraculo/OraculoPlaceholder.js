import { Construction } from "lucide-react";

import styles from "./OraculoStudentDashboard.module.css";

// Placeholder honesto para rotas do dashboard ainda não implementadas (fase 2+).
export default function OraculoPlaceholder({ kicker, title, description, phase }) {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{kicker}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.emptyState}>
          <Construction size={28} aria-hidden="true" />
          <p>Esta área está roteada e aguarda implementação.</p>
          <small>{phase || "Entra em uma próxima fase do Dashboard do Oráculo."}</small>
        </div>
      </section>
    </main>
  );
}

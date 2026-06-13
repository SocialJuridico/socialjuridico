import { RefreshCw } from "lucide-react";

import styles from "./Oportunidade.module.css";

export default function LawyerOpportunitiesLoading() {
  return (
    <main className={styles.routeFallback} aria-live="polite">
      <div className={styles.routeFallbackCard}>
        <RefreshCw size={30} className={styles.spinner} aria-hidden="true" />
        <h1>Carregando oportunidades</h1>
        <p>Preparando sua central profissional e validando a sessão.</p>
      </div>
    </main>
  );
}

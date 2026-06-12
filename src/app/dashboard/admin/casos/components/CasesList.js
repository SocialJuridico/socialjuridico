import { BriefcaseBusiness } from "lucide-react";
import CaseCard from "./CaseCard";
import styles from "../CasosAdmin.module.css";

export default function CasesList({ cases, onOpen }) {
  if (!cases.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <BriefcaseBusiness size={24} aria-hidden="true" />
        </span>
        <h2>Nenhum caso encontrado</h2>
        <p>Ajuste os filtros ou aguarde novos casos entrarem no fluxo.</p>
      </div>
    );
  }

  return (
    <section className={styles.caseGrid} aria-live="polite">
      {cases.map((caseItem) => (
        <CaseCard key={caseItem.id} caseItem={caseItem} onOpen={onOpen} />
      ))}
    </section>
  );
}

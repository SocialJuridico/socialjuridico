import Link from "next/link";
import { ArrowLeft, RefreshCw, Star } from "lucide-react";

import styles from "../Avaliacoes.module.css";

export default function ReviewsHeader({ total, visible, onReload }) {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Star size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Reputação e qualidade</span>
            <h1>Avaliações de advogados</h1>
            <p>{visible} de {total} avaliações visíveis nesta consulta.</p>
          </div>
        </div>
      </div>

      <button type="button" className={styles.secondaryButton} onClick={onReload}>
        <RefreshCw size={16} aria-hidden="true" />
        Atualizar
      </button>
    </header>
  );
}

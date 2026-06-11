import { ArrowLeft, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import styles from "../Pesquisas.module.css";

export default function SurveysHeader({ total, onReload, loading }) {
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
            <span className={styles.eyebrow}>Experiência e qualidade</span>
            <h1>Pesquisas de satisfação</h1>
            <p>
              {total} avaliação{total === 1 ? "" : "ões"} registrada
              {total === 1 ? "" : "s"} entre advogados e clientes.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onReload}
        disabled={loading}
      >
        <RefreshCw
          size={16}
          className={loading ? styles.spinning : undefined}
          aria-hidden="true"
        />
        Atualizar
      </button>
    </header>
  );
}

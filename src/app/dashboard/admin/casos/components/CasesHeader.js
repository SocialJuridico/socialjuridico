import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import styles from "../CasosAdmin.module.css";

export default function CasesHeader({
  total,
  loading,
  governanceAvailable,
  onReload,
}) {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Operação, conversão e governança</span>
            <h1>Gestão de casos</h1>
            <p>
              {total} caso{total === 1 ? "" : "s"} monitorado
              {total === 1 ? "" : "s"} com privacidade por padrão e trilha de auditoria.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <span
          className={`${styles.governanceStatus} ${
            governanceAvailable ? styles.governanceOnline : styles.governanceWarning
          }`}
        >
          {governanceAvailable ? "Governança ativa" : "Migração pendente"}
        </span>

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
      </div>
    </header>
  );
}

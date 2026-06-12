import { ArrowLeft, MessageSquareText, RefreshCw } from "lucide-react";
import Link from "next/link";
import styles from "../MensagensAdmin.module.css";

export default function MessagesHeader({ total, loading, onReload }) {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <MessageSquareText size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Atendimento administrativo</span>
            <h1>Mensagens enviadas</h1>
            <p>
              {total} conversa{total === 1 ? "" : "s"} com advogados na central administrativa.
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

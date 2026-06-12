import { ArrowLeft, BellRing, RefreshCw } from "lucide-react";
import Link from "next/link";
import styles from "../ComunicadosAdmin.module.css";

export default function BroadcastHeader({ loading, onReload }) {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <BellRing size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Comunicação interna</span>
            <h1>Comunicados da plataforma</h1>
            <p>
              Publique avisos na central de notificações e envie push para o público selecionado.
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

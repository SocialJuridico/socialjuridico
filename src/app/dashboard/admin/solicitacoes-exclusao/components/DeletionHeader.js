import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";

import styles from "../DeletionRequests.module.css";

export default function DeletionHeader({ controller }) {
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
            <span className={styles.eyebrow}>Privacidade, LGPD e governança</span>
            <h1>Solicitações de exclusão</h1>
            <p>
              Analise pedidos, verifique pendências operacionais e processe a
              remoção definitiva com finalidade, justificativa e auditoria.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => controller.loadRequests()}
        disabled={controller.busy}
      >
        <RefreshCw size={16} aria-hidden="true" />
        Atualizar fila
      </button>
    </header>
  );
}

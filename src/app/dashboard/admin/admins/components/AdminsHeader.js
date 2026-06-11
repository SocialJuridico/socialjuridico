import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, ShieldCheck } from "lucide-react";

import styles from "../AdminsAdmin.module.css";

export default function AdminsHeader({ total, visible, onReload, onCreate }) {
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
            <span className={styles.eyebrow}>Controle de acesso</span>
            <h1>Administradores</h1>
            <p>{visible} de {total} administradores visíveis nesta consulta.</p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button type="button" className={styles.secondaryButton} onClick={onReload}>
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>
        <button type="button" className={styles.goldButton} onClick={onCreate}>
          <Plus size={16} aria-hidden="true" />
          Novo administrador
        </button>
      </div>
    </header>
  );
}

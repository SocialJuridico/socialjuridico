import { ArrowLeft, Bell, CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import styles from "../Notificacoes.module.css";

export default function NotificationsHeader({
  total,
  unread,
  loading,
  markingAllRead,
  onReload,
  onMarkAllRead,
  onDeleteAll,
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
            <Bell size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Mensagens e alertas</span>
            <h1>Notificações administrativas</h1>
            <p>
              {total} notificação{total === 1 ? "" : "ões"} na caixa de entrada,
              {" "}{unread} não lida{unread === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
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

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onMarkAllRead}
          disabled={!unread || markingAllRead}
        >
          <CheckCheck
            size={16}
            className={markingAllRead ? styles.spinning : undefined}
            aria-hidden="true"
          />
          Marcar lidas
        </button>

        <button
          type="button"
          className={styles.dangerOutlineButton}
          onClick={onDeleteAll}
          disabled={!total}
        >
          <Trash2 size={16} aria-hidden="true" />
          Limpar caixa
        </button>
      </div>
    </header>
  );
}

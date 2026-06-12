import {
  Bell,
  Clock3,
  MailOpen,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import {
  getNotificationTypeLabel,
  isChatNotification,
} from "../config/notificationTypes";
import styles from "../Notificacoes.module.css";

function formatDate(value) {
  if (!value) return "Data não informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function NotificationIcon({ notification }) {
  if (isChatNotification(notification)) {
    return <MessageSquareText size={18} aria-hidden="true" />;
  }

  if (!notification.lida) {
    return <MailOpen size={18} aria-hidden="true" />;
  }

  return <Bell size={18} aria-hidden="true" />;
}

export default function NotificationsList({
  notifications,
  onOpen,
  onDelete,
}) {
  if (!notifications.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <Bell size={24} aria-hidden="true" />
        </span>
        <h2>Nenhuma notificação encontrada</h2>
        <p>Ajuste os filtros ou aguarde a chegada de novas mensagens.</p>
      </div>
    );
  }

  return (
    <section className={styles.notificationList} aria-live="polite">
      {notifications.map((notification) => {
        const chatNotification = isChatNotification(notification);
        const unread = !notification.lida;

        return (
          <article
            key={notification.id}
            className={`${styles.notificationCard} ${
              unread ? styles.notificationUnread : ""
            } ${chatNotification ? styles.notificationClickable : ""}`}
            onClick={() => onOpen(notification)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(notification);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${notification.titulo || "Notificação"}. ${
              chatNotification ? "Abrir conversa" : "Marcar como lida"
            }`}
          >
            <span className={styles.notificationIcon}>
              <NotificationIcon notification={notification} />
            </span>

            <div className={styles.notificationBody}>
              <div className={styles.notificationTitleRow}>
                <div>
                  <div className={styles.notificationTitleLine}>
                    <h2>{notification.titulo || "Notificação"}</h2>
                    {unread && <span className={styles.unreadBadge}>Nova</span>}
                  </div>
                  <span className={styles.notificationDate}>
                    <Clock3 size={12} aria-hidden="true" />
                    {formatDate(notification.created_at)}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(notification);
                  }}
                  aria-label={`Excluir notificação ${notification.titulo || ""}`}
                  title="Excluir notificação"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>

              <p className={styles.notificationMessage}>
                {notification.mensagem || "Sem conteúdo disponível."}
              </p>

              <footer className={styles.notificationFooter}>
                <span className={styles.typeBadge}>
                  {getNotificationTypeLabel(notification.tipo)}
                </span>
                {chatNotification && (
                  <span className={styles.openHint}>Abrir conversa</span>
                )}
              </footer>
            </div>
          </article>
        );
      })}
    </section>
  );
}

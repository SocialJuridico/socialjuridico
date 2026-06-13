"use client";

import {
  Bell,
  CheckCheck,
  FileText,
  MessageSquare,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import styles from "../ClientDashboard.module.css";

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const units = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return formatter.format(seconds, "second");
}

function NotificationIcon({ item }) {
  const source = `${item.tipo || ""} ${item.titulo || ""}`.toLowerCase();

  if (source.includes("chat") || source.includes("mensagem")) {
    return <MessageSquare size={18} aria-hidden="true" />;
  }
  if (source.includes("caso") || source.includes("interesse")) {
    return <FileText size={18} aria-hidden="true" />;
  }
  if (source.includes("oab") || source.includes("segurança")) {
    return <ShieldAlert size={18} aria-hidden="true" />;
  }
  return <Bell size={18} aria-hidden="true" />;
}

export default function ClientNotifications({ controller }) {
  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntroCard}>
        <div>
          <span className={styles.eyebrow}>Central de atualizações</span>
          <h2>Notificações</h2>
          <p>
            Acompanhe novos interesses, mensagens, alterações nos casos e avisos da
            plataforma.
          </p>
        </div>
        <div className={styles.notificationIntroActions}>
          <span className={styles.counterBadge}>
            {controller.summary.unreadNotifications} não lida(s)
          </span>
          {controller.notifications.length > 0 && (
            <button
              type="button"
              className={styles.dangerTextButton}
              onClick={() => controller.setModal({ type: "notifications-clear" })}
            >
              <Trash2 size={14} aria-hidden="true" />
              Limpar todas
            </button>
          )}
        </div>
      </section>

      {controller.notifications.length ? (
        <section className={styles.notificationList}>
          {controller.notifications.map((item) => (
            <article
              key={item.id}
              className={`${styles.notificationItem} ${
                !item.lida ? styles.notificationUnread : ""
              }`}
            >
              <button
                type="button"
                className={styles.notificationMain}
                onClick={() => controller.openNotification(item)}
              >
                <span className={styles.notificationIcon}>
                  <NotificationIcon item={item} />
                </span>
                <span className={styles.notificationCopy}>
                  <span className={styles.notificationTitleRow}>
                    <strong>{item.titulo || "Atualização"}</strong>
                    {!item.lida && <span className={styles.unreadPill}>Nova</span>}
                  </span>
                  <p>{item.mensagem}</p>
                  <small>{formatRelativeTime(item.created_at)}</small>
                </span>
              </button>

              <button
                type="button"
                className={styles.iconButton}
                onClick={() =>
                  controller.setModal({ type: "notification-delete", item })
                }
                aria-label={`Remover notificação ${item.titulo || ""}`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.largeEmptyState}>
          <CheckCheck size={30} aria-hidden="true" />
          <h2>Tudo em dia</h2>
          <p>Você não possui notificações no momento.</p>
        </div>
      )}
    </div>
  );
}

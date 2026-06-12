import { Bell, CheckCheck, MessageSquareText, MailOpen } from "lucide-react";
import styles from "../Notificacoes.module.css";

const cards = [
  { key: "total", label: "Total na caixa", icon: Bell },
  { key: "unread", label: "Não lidas", icon: MailOpen },
  { key: "read", label: "Lidas", icon: CheckCheck },
  { key: "chat", label: "Conversas", icon: MessageSquareText },
];

export default function NotificationsSummary({ summary }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo das notificações">
      {cards.map(({ key, label, icon: Icon }) => (
        <article key={key} className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className={styles.summaryContent}>
            <strong>{summary[key] ?? 0}</strong>
            <span>{label}</span>
          </span>
        </article>
      ))}
    </section>
  );
}

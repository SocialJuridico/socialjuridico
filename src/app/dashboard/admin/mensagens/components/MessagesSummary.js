import { BellRing, MessageCircle, MessageSquareText, Users } from "lucide-react";
import styles from "../MensagensAdmin.module.css";

const cards = [
  { key: "conversations", label: "Conversas", icon: Users },
  { key: "messages", label: "Mensagens enviadas", icon: MessageSquareText },
  { key: "chats", label: "Mensagens de chat", icon: MessageCircle },
  { key: "broadcasts", label: "Comunicados", icon: BellRing },
];

export default function MessagesSummary({ summary }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo das mensagens">
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

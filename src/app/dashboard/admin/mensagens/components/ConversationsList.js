import {
  BellRing,
  ChevronRight,
  Clock3,
  Mail,
  MessageCircle,
  Scale,
  Trash2,
} from "lucide-react";
import { getConversationTypeLabel } from "../config/messageFilters";
import styles from "../MensagensAdmin.module.css";

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getConversationIcon(type) {
  return type === "ADMIN_BROADCAST" ? BellRing : MessageCircle;
}

export default function ConversationsList({
  groups,
  onOpen,
  onDelete,
}) {
  if (!groups.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <MessageCircle size={24} aria-hidden="true" />
        </span>
        <h2>Nenhuma conversa encontrada</h2>
        <p>Ajuste os filtros ou inicie uma nova conversa com um advogado.</p>
      </div>
    );
  }

  return (
    <section className={styles.conversationGroups} aria-live="polite">
      {groups.map((group) => (
        <div key={group.key} className={styles.dateGroup}>
          <div className={styles.dateSeparator}>
            <span>{group.label}</span>
          </div>

          <div className={styles.conversationGrid}>
            {group.items.map((conversation) => {
              const Icon = getConversationIcon(conversation.lastType);
              const lawyer = conversation.lawyer || {};

              return (
                <article key={conversation.userId} className={styles.conversationCard}>
                  <button
                    type="button"
                    className={styles.conversationOpenButton}
                    onClick={() => onOpen(conversation)}
                    aria-label={`Abrir conversa com ${lawyer.name || "advogado"}`}
                  >
                    <span className={styles.conversationIcon}>
                      <Icon size={18} aria-hidden="true" />
                    </span>

                    <div className={styles.conversationBody}>
                      <div className={styles.conversationHeader}>
                        <div className={styles.lawyerInfo}>
                          <h2>{lawyer.name || "Advogado"}</h2>
                          <div className={styles.lawyerMeta}>
                            {lawyer.email && (
                              <span>
                                <Mail size={12} aria-hidden="true" />
                                {lawyer.email}
                              </span>
                            )}
                            {lawyer.oab && (
                              <span>
                                <Scale size={12} aria-hidden="true" />
                                OAB {lawyer.oab}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.previewBlock}>
                        <div className={styles.previewTitleRow}>
                          <strong>{conversation.lastTitle || "Mensagem"}</strong>
                          <span className={styles.typeBadge}>
                            {getConversationTypeLabel(conversation.lastType)}
                          </span>
                        </div>
                        <p>{conversation.lastMessage || "Sem conteúdo"}</p>
                      </div>

                      <footer className={styles.conversationFooter}>
                        <div className={styles.footerMeta}>
                          <span>
                            <Clock3 size={12} aria-hidden="true" />
                            {formatTime(conversation.lastDate)}
                          </span>
                          <span>
                            {conversation.totalMessages || 0} mensagem
                            {conversation.totalMessages === 1 ? "" : "s"}
                          </span>
                        </div>

                        <span className={styles.openChat}>
                          Abrir chat <ChevronRight size={14} aria-hidden="true" />
                        </span>
                      </footer>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(conversation)}
                    aria-label={`Excluir conversa com ${lawyer.name || "advogado"}`}
                    title="Excluir conversa"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

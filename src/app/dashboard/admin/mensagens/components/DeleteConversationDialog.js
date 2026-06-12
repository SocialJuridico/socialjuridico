import { LoaderCircle, Trash2, X } from "lucide-react";
import styles from "../MensagensAdmin.module.css";

export default function DeleteConversationDialog({
  conversation,
  deleting,
  onClose,
  onConfirm,
}) {
  if (!conversation) return null;

  const lawyerName = conversation.lawyer?.name || "este advogado";

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.confirmModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-conversation-title"
        aria-describedby="delete-conversation-description"
      >
        <button
          type="button"
          className={styles.modalCloseButton}
          onClick={onClose}
          disabled={deleting}
          aria-label="Fechar confirmação"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <span className={styles.modalDangerIcon}>
          <Trash2 size={24} aria-hidden="true" />
        </span>
        <span className={styles.modalEyebrow}>Ação permanente</span>
        <h2 id="delete-conversation-title">Excluir conversa?</h2>
        <p id="delete-conversation-description">
          As mensagens trocadas com <strong>{lawyerName}</strong> serão removidas da visão administrativa. O histórico preservado para o outro participante continuará respeitando as regras de exclusão individual.
        </p>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <LoaderCircle size={16} className={styles.spinning} aria-hidden="true" />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
            {deleting ? "Removendo..." : "Excluir conversa"}
          </button>
        </div>
      </section>
    </div>
  );
}

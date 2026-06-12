import { LoaderCircle, Trash2, X } from "lucide-react";
import styles from "../Notificacoes.module.css";

export default function DeleteNotificationDialog({
  notification,
  deleteAll,
  deleting,
  onClose,
  onConfirm,
}) {
  const open = Boolean(notification || deleteAll);
  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.confirmModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-notification-title"
        aria-describedby="delete-notification-description"
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
        <h2 id="delete-notification-title">
          {deleteAll ? "Limpar toda a caixa?" : "Excluir esta notificação?"}
        </h2>
        <p id="delete-notification-description">
          {deleteAll
            ? "Todas as notificações visíveis para este administrador serão removidas da caixa de entrada."
            : `A notificação “${notification?.titulo || "Sem título"}” será removida da sua caixa de entrada.`}
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
            {deleting
              ? "Removendo..."
              : deleteAll
                ? "Limpar caixa"
                : "Excluir notificação"}
          </button>
        </div>
      </section>
    </div>
  );
}

import { AlertTriangle, LoaderCircle, Send, X } from "lucide-react";
import styles from "../ComunicadosAdmin.module.css";

export default function ConfirmBroadcastDialog({
  open,
  audienceLabel,
  estimatedRecipients,
  sending,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.confirmModal} role="dialog" aria-modal="true">
        <button
          type="button"
          className={styles.modalCloseButton}
          onClick={onClose}
          disabled={sending}
          aria-label="Fechar confirmação"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <span className={styles.modalWarningIcon}>
          <AlertTriangle size={24} aria-hidden="true" />
        </span>
        <span className={styles.modalEyebrow}>Envio coletivo</span>
        <h2>Confirmar comunicado?</h2>
        <p>
          O comunicado será enviado para <strong>{audienceLabel}</strong>, com alcance estimado de <strong>{estimatedRecipients}</strong> usuário{estimatedRecipients === 1 ? "" : "s"}.
        </p>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="button" className={styles.primaryButton} onClick={onConfirm} disabled={sending}>
            {sending ? <LoaderCircle size={16} className={styles.spinning} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            {sending ? "Enviando..." : "Confirmar envio"}
          </button>
        </div>
      </section>
    </div>
  );
}

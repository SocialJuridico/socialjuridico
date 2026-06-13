"use client";

import { useEffect } from "react";
import { AlertTriangle, Eye, EyeOff, X } from "lucide-react";

import styles from "../ReviewGovernance.module.css";

export default function ReviewModerationModal({ state }) {
  const modal = state.moderationModal;

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !state.moderationBusy) {
        state.closeModeration();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [modal, state]);

  if (!modal) return null;

  const hiding = modal.nextStatus === "HIDDEN";
  const Icon = hiding ? EyeOff : Eye;
  const canSubmit =
    !state.moderationBusy &&
    (!hiding || modal.reason.trim().length >= 10);

  return (
    <div
      className={styles.overlay}
      onMouseDown={() => !state.moderationBusy && state.closeModeration()}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={state.closeModeration}
          disabled={state.moderationBusy}
          aria-label="Fechar"
        >
          <X size={17} aria-hidden="true" />
        </button>

        <span className={styles.modalIcon}>
          <Icon size={22} aria-hidden="true" />
        </span>
        <span className={styles.eyebrow}>Governança de reputação</span>
        <h2>{hiding ? "Ocultar avaliação" : "Restaurar avaliação"}</h2>
        <p>
          {hiding
            ? "A avaliação deixará de compor a média pública, mas será preservada para auditoria."
            : "A avaliação voltará a compor a reputação e a média será recalculada."}
        </p>

        <div className={styles.reviewSnapshot}>
          <strong>{modal.review.advogado_nome}</strong>
          <span>{modal.review.nota}/5 · {modal.review.caso_titulo}</span>
          <span>Cliente: {modal.review.cliente_nome}</span>
        </div>

        <label className={styles.field}>
          <span>{hiding ? "Justificativa obrigatória" : "Observação opcional"}</span>
          <textarea
            rows={5}
            maxLength={2000}
            value={modal.reason}
            onChange={(event) => state.setModerationReason(event.target.value)}
            disabled={state.moderationBusy}
          />
          <small>
            {modal.reason.length}/2000 caracteres
            {hiding ? " · mínimo de 10" : ""}
          </small>
        </label>

        <div className={styles.notice}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            A operação será auditada e não apagará o registro original.
          </span>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={state.closeModeration}
            disabled={state.moderationBusy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={state.submitModeration}
            disabled={!canSubmit}
          >
            {state.moderationBusy
              ? "Processando..."
              : hiding
                ? "Ocultar avaliação"
                : "Restaurar avaliação"}
          </button>
        </div>
      </section>
    </div>
  );
}

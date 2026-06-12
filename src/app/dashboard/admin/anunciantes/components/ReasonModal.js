"use client";

import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "../AnunciantesAdmin.module.css";

export default function ReasonModal({
  open,
  title,
  description,
  confirmLabel,
  busy,
  requireReason = true,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  const canConfirm = !busy && (!requireReason || reason.trim().length >= 10);

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={styles.reasonModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-modal-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>Ação controlada</span>
            <h2 id="reason-modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar confirmação"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.reasonAlert}>
            <AlertTriangle size={19} aria-hidden="true" />
            <p>{description}</p>
          </div>

          {requireReason && (
            <label className={styles.field}>
              <span>Justificativa administrativa</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                rows={5}
                autoFocus
                placeholder="Explique o motivo da decisão. Mínimo de 10 caracteres."
              />
              <small>{reason.trim().length}/1000 caracteres</small>
            </label>
          )}
        </div>

        <footer className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
          >
            {busy && (
              <LoaderCircle
                size={16}
                className={styles.spinning}
                aria-hidden="true"
              />
            )}
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

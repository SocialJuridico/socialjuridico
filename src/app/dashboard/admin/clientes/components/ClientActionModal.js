"use client";

import { AlertTriangle, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import styles from "../ClientesAdmin.module.css";

export default function ClientActionModal({
  action,
  deletingId,
  resettingId,
  onClose,
  onDelete,
  onReset,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!action) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [action, onClose]);

  if (!action) return null;

  const deleting = deletingId === action.client.id;
  const resetting = resettingId === action.client.id;
  const busy = deleting || resetting;
  const isDelete = action.type === "delete";

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-action-title"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <span
            className={`${styles.modalIcon} ${
              isDelete ? styles.modalIconDanger : styles.modalIconWarning
            }`}
          >
            {isDelete ? (
              <Trash2 size={20} aria-hidden="true" />
            ) : (
              <Send size={20} aria-hidden="true" />
            )}
          </span>

          <div>
            <span className={styles.modalEyebrow}>Ação administrativa</span>
            <h2 id="client-action-title">
              {isDelete ? "Excluir cliente" : "Enviar redefinição de senha"}
            </h2>
          </div>

          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <p>
            {isDelete ? (
              <>
                Confirma a exclusão de <strong>{action.client.name || "cliente"}</strong>?
                Esta ação pode remover dados relacionados e não poderá ser desfeita.
              </>
            ) : (
              <>
                Confirma o envio de um link seguro de redefinição para{" "}
                <strong>{action.client.email || "o e-mail do cliente"}</strong>?
              </>
            )}
          </p>

          <div className={styles.modalNotice}>
            <AlertTriangle size={17} aria-hidden="true" />
            <span>
              {isDelete
                ? "Revise cuidadosamente antes de excluir esta conta."
                : "Nenhuma senha será definida pelo administrador. O cliente criará a nova senha pelo link recebido."}
            </span>
          </div>
        </div>

        <footer className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={isDelete ? styles.confirmDangerButton : styles.confirmWarningButton}
            onClick={isDelete ? onDelete : onReset}
            disabled={busy}
          >
            {isDelete
              ? deleting
                ? "Excluindo..."
                : "Confirmar exclusão"
              : resetting
                ? "Enviando..."
                : "Enviar link seguro"}
          </button>
        </footer>
      </section>
    </div>
  );
}

"use client";

import { AlertTriangle, KeyRound, ShieldCheck, UserPlus, X } from "lucide-react";
import { useEffect, useRef } from "react";

import styles from "../AdminsAdmin.module.css";

export default function AdminModal({
  modal,
  form,
  setForm,
  busyId,
  onClose,
  onSubmit,
  onReset,
  onDelete,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!modal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyId) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, busyId, onClose]);

  if (!modal) return null;

  const isBusy = Boolean(busyId);
  const isForm = modal.type === "create" || modal.type === "edit";
  const titles = {
    create: "Novo administrador",
    edit: "Editar administrador",
    reset: "Redefinir senha",
    delete: "Excluir administrador",
  };
  const Icon =
    modal.type === "create"
      ? UserPlus
      : modal.type === "reset"
        ? KeyRound
        : modal.type === "delete"
          ? AlertTriangle
          : ShieldCheck;

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.modalEyebrow}>Controle de acesso</span>
            <h2 id="admin-modal-title">{titles[modal.type]}</h2>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            disabled={isBusy}
            aria-label="Fechar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isForm ? (
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Nome</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>E-mail</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                  />
                </label>

                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Telefone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </label>
              </div>

              {modal.type === "create" && (
                <div className={styles.securityNotice}>
                  <KeyRound size={17} aria-hidden="true" />
                  <span>
                    O administrador receberá um link seguro por e-mail para criar a própria senha.
                  </span>
                </div>
              )}
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                disabled={isBusy}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.goldButton} disabled={isBusy}>
                {isBusy
                  ? "Salvando..."
                  : modal.type === "create"
                    ? "Criar e enviar convite"
                    : "Salvar alterações"}
              </button>
            </footer>
          </form>
        ) : (
          <>
            <div className={styles.modalBody}>
              <p className={styles.modalIntro}>
                {modal.type === "reset" ? (
                  <>
                    Enviar um link seguro de redefinição para{" "}
                    <strong>{modal.admin?.email || "este administrador"}</strong>?
                  </>
                ) : (
                  <>
                    Confirma a exclusão de{" "}
                    <strong>{modal.admin?.name || "este administrador"}</strong>?
                  </>
                )}
              </p>

              <div
                className={
                  modal.type === "delete"
                    ? styles.dangerNotice
                    : styles.securityNotice
                }
              >
                {modal.type === "delete" ? (
                  <AlertTriangle size={17} aria-hidden="true" />
                ) : (
                  <KeyRound size={17} aria-hidden="true" />
                )}
                <span>
                  {modal.type === "delete"
                    ? "O acesso administrativo será revogado imediatamente. Esta ação não poderá ser desfeita."
                    : "Nenhuma senha será definida por outro administrador. O destinatário criará a nova senha pelo link recebido."}
                </span>
              </div>
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                disabled={isBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={modal.type === "delete" ? styles.dangerButton : styles.goldButton}
                onClick={modal.type === "delete" ? onDelete : onReset}
                disabled={isBusy}
              >
                {isBusy
                  ? modal.type === "delete"
                    ? "Excluindo..."
                    : "Enviando..."
                  : modal.type === "delete"
                    ? "Confirmar exclusão"
                    : "Enviar link seguro"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

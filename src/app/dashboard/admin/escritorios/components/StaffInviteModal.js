"use client";

import { MailCheck, UserPlus, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { BRAZIL_STATES } from "../utils/officeConstants";
import styles from "../EscritoriosAdmin.module.css";

export default function StaffInviteModal({
  office,
  form,
  setForm,
  busy,
  onClose,
  onSubmit,
}) {
  const dialogRef = useRef(null);
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

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
        aria-labelledby="staff-invite-title"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            <UserPlus size={20} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.modalEyebrow}>Equipe Enterprise</span>
            <h2 id="staff-invite-title">Adicionar membro</h2>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            <p className={styles.modalIntro}>
              Novo membro para <strong>{office.nome}</strong>.
            </p>

            <div className={styles.securityNotice}>
              <MailCheck size={17} aria-hidden="true" />
              <span>
                O membro receberá um link seguro por e-mail para criar a própria senha.
              </span>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.formGroup}>
                <span>Nome completo</span>
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

              <label className={styles.formGroup}>
                <span>Cargo</span>
                <select
                  value={form.cargo}
                  onChange={(event) => update("cargo", event.target.value)}
                >
                  <option value="advogado">Advogado</option>
                  <option value="estagiario">Estagiário</option>
                </select>
              </label>

              <label className={styles.formGroup}>
                <span>Telefone/WhatsApp</span>
                <input
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </label>

              <label className={styles.formGroup}>
                <span>OAB</span>
                <input
                  required={form.cargo === "advogado"}
                  value={form.oab}
                  onChange={(event) => update("oab", event.target.value)}
                  disabled={form.cargo === "estagiario"}
                />
              </label>

              <label className={styles.formGroup}>
                <span>UF da OAB</span>
                <select
                  value={form.estado}
                  onChange={(event) => update("estado", event.target.value)}
                  disabled={form.cargo === "estagiario"}
                >
                  {BRAZIL_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <footer className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.goldButton} disabled={busy}>
              {busy ? "Cadastrando..." : "Cadastrar e enviar convite"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

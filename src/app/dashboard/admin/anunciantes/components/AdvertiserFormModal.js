"use client";

import { LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "../AnunciantesAdmin.module.css";

const EMPTY_FORM = {
  companyName: "",
  username: "",
  password: "",
  whatsapp: "",
};

export default function AdvertiserFormModal({
  mode,
  advertiser,
  open,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && advertiser) {
      setForm({
        companyName: advertiser.companyName || "",
        username: advertiser.username || "",
        password: "",
        whatsapp: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [advertiser, mode, open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, saving]);

  if (!open) return null;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();

    onSubmit({
      id: advertiser?.id,
      nome_empresa: form.companyName,
      username: form.username,
      password: form.password,
      ...(form.whatsapp.trim() ? { whatsapp: form.whatsapp } : {}),
    });
  }

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        className={styles.modal}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advertiser-form-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>Conta comercial</span>
            <h2 id="advertiser-form-title">
              {mode === "edit" ? "Editar anunciante" : "Novo anunciante"}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar formulário"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <label className={styles.field}>
            <span>Empresa ou anunciante</span>
            <input
              type="text"
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
              maxLength={120}
              autoFocus
              required
            />
          </label>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Usuário de acesso</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
                minLength={3}
                maxLength={40}
                autoComplete="off"
                required
              />
              <small>Letras, números, ponto, hífen ou sublinhado.</small>
            </label>

            {mode === "create" && (
              <label className={styles.field}>
                <span>Senha inicial</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <small>Mínimo de 10 caracteres.</small>
              </label>
            )}
          </div>

          <label className={styles.field}>
            <span>
              {mode === "edit" ? "Novo WhatsApp (opcional)" : "WhatsApp"}
            </span>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(event) => updateField("whatsapp", event.target.value)}
              maxLength={40}
              placeholder={
                mode === "edit"
                  ? "Deixe em branco para manter o atual"
                  : "+55 51 99999-9999"
              }
            />
            {mode === "edit" && advertiser?.hasWhatsapp && (
              <small>Atual cadastrado: {advertiser.maskedWhatsapp}</small>
            )}
          </label>
        </div>

        <footer className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? (
              <LoaderCircle
                size={16}
                className={styles.spinning}
                aria-hidden="true"
              />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            {mode === "edit" ? "Salvar alterações" : "Criar anunciante"}
          </button>
        </footer>
      </form>
    </div>
  );
}

"use client";

import { LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./Afiliados.module.css";

export default function GovernanceModal({
  referral,
  open,
  busy,
  governanceAvailable,
  onClose,
  onConfirm,
}) {
  const [reviewStatus, setReviewStatus] = useState("PENDING");
  const [riskLevel, setRiskLevel] = useState("STANDARD");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !referral) return;

    setReviewStatus(referral.governance.reviewStatus || "PENDING");
    setRiskLevel(referral.governance.riskLevel || "STANDARD");
    setNotes("");
  }, [open, referral]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, open]);

  if (!open || !referral) return null;

  const reasonRequired = ["REVIEW", "INVALID"].includes(reviewStatus);
  const canConfirm =
    governanceAvailable &&
    (!reasonRequired || notes.trim().length >= 10) &&
    !busy;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="governance-modal-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>Governança do programa</span>
            <h2 id="governance-modal-title">Classificar indicação</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.commissionIdentity}>
            <span className={styles.modalIcon}>
              <ShieldAlert size={23} />
            </span>
            <div>
              <strong>{referral.referred.name}</strong>
              <span>{referral.referred.maskedEmail}</span>
              <small>Indicado por {referral.referrer.name}</small>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Status de revisão</span>
              <select
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value)}
              >
                <option value="PENDING">Pendente</option>
                <option value="REVIEW">Em revisão</option>
                <option value="CLEARED">Revisada</option>
                <option value="INVALID">Inválida</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Nível de risco</span>
              <select
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value)}
              >
                <option value="STANDARD">Padrão</option>
                <option value="ELEVATED">Elevado</option>
                <option value="RESTRICTED">Restrito</option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Observação administrativa</span>
            <textarea
              rows={5}
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Registre a análise realizada, especialmente em casos de revisão ou invalidação."
            />
            <small>
              {notes.trim().length}/1000
              {reasonRequired ? " · mínimo de 10 caracteres" : ""}
            </small>
          </label>
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
            className={styles.primaryButton}
            onClick={() =>
              onConfirm({
                referralId: referral.id,
                reviewStatus,
                riskLevel,
                notes: notes.trim(),
              })
            }
            disabled={!canConfirm}
          >
            {busy ? <LoaderCircle size={16} className={styles.spinning} /> : <ShieldAlert size={16} />}
            Salvar classificação
          </button>
        </footer>
      </section>
    </div>
  );
}

"use client";

import { AlertTriangle, Coins, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./Afiliados.module.css";

export default function CommissionModal({
  referral,
  defaultAmount,
  open,
  busy,
  governanceAvailable,
  onClose,
  onConfirm,
}) {
  const [amount, setAmount] = useState(String(defaultAmount || 35));
  const [justification, setJustification] = useState("");
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(String(defaultAmount || 35));
    setJustification("");
    setManualOverride(false);
  }, [defaultAmount, open, referral?.id]);

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

  const numericAmount = Number(amount);
  const overrideRequired =
    !referral.eligibility.canCredit &&
    referral.eligibility.manualOverrideAllowed;
  const minimumReason = manualOverride ? 20 : 10;
  const canConfirm =
    governanceAvailable &&
    Number.isInteger(numericAmount) &&
    numericAmount >= 1 &&
    numericAmount <= 1000 &&
    justification.trim().length >= minimumReason &&
    (!overrideRequired || manualOverride) &&
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
        aria-labelledby="commission-modal-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>Liquidação em Juris</span>
            <h2 id="commission-modal-title">Creditar comissão</h2>
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
              <Coins size={23} />
            </span>
            <div>
              <strong>{referral.referrer.name}</strong>
              <span>{referral.referrer.maskedEmail}</span>
              <small>
                Indicação de {referral.referred.name} · saldo atual:{" "}
                {referral.referrer.currentBalance} Juris
              </small>
            </div>
          </div>

          {!governanceAvailable && (
            <div className={styles.dangerNotice}>
              <AlertTriangle size={18} />
              <p>
                Execute a migração de governança de afiliados antes de liberar
                qualquer comissão.
              </p>
            </div>
          )}

          {referral.eligibility.alert && (
            <div className={styles.warningNotice}>
              <AlertTriangle size={18} />
              <p>{referral.eligibility.alert}</p>
            </div>
          )}

          <label className={styles.field}>
            <span>Quantidade de Juris</span>
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <small>
              A bonificação é saldo interno da plataforma e não representa saque
              em dinheiro.
            </small>
          </label>

          {overrideRequired && (
            <label className={styles.overrideCheck}>
              <input
                type="checkbox"
                checked={manualOverride}
                onChange={(event) => setManualOverride(event.target.checked)}
              />
              <span>
                Aprovar excepcionalmente sem uma assinatura paga conciliada ou
                apesar da possível duplicidade.
              </span>
            </label>
          )}

          <label className={styles.field}>
            <span>Justificativa administrativa</span>
            <textarea
              rows={5}
              maxLength={1000}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Descreva a comprovação analisada e o motivo do crédito."
            />
            <small>
              {justification.trim().length}/1000 · mínimo de {minimumReason}
              caracteres
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
                amount: numericAmount,
                justification: justification.trim(),
                manualOverride,
              })
            }
            disabled={!canConfirm}
          >
            {busy ? <LoaderCircle size={16} className={styles.spinning} /> : <Coins size={16} />}
            Confirmar crédito
          </button>
        </footer>
      </section>
    </div>
  );
}

"use client";

import { Coins, Loader2, X } from "lucide-react";

import styles from "../Oportunidade.module.css";
import modalStyles from "./RadarModals.module.css";

export function RadarAccessModal({ controller, balance }) {
  const item = controller.pendingAccess;
  if (!item) return null;
  const busy = controller.busyId === item.id;

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          controller.setPendingAccess(null);
        }
      }}
    >
      <section
        className={`${styles.modal} ${styles.confirmModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="radar-access-title"
      >
        <div className={styles.confirmBody}>
          <span className={styles.confirmIcon}>
            <Coins size={26} aria-hidden="true" />
          </span>
          <h2 id="radar-access-title">Liberar publicação original</h2>
          <p>
            O plano START utiliza <strong>1 Juri</strong> para liberar esta
            oportunidade. Seu saldo atual é de {balance || 0} Juris.
          </p>
          <p>O débito e o acesso serão registrados de forma transacional e auditável.</p>
        </div>
        <footer className={styles.modalFooter}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => controller.setPendingAccess(null)}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => controller.executeAccess(item)}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2
                  size={15}
                  className={styles.spinner}
                  aria-hidden="true"
                />
                Processando
              </>
            ) : (
              "Confirmar por 1 Juri"
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function RadarReportModal({ controller }) {
  const item = controller.reportTarget;
  if (!item) return null;

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeReport();
      }}
    >
      <section
        className={`${styles.modal} ${styles.confirmModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="radar-report-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <h2 id="radar-report-title">Sinalizar oportunidade</h2>
            <p>{item.titulo}</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={controller.closeReport}
            disabled={controller.reporting}
            aria-label="Fechar reporte"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <section className={styles.detailSection}>
            <h3>Motivo da sinalização</h3>
            <p>
              Informe se o link está quebrado, se a publicação foi removida ou se o
              conteúdo é inadequado. O reporte ficará vinculado ao seu perfil para
              auditoria.
            </p>
            <textarea
              className={`${styles.select} ${modalStyles.reportTextarea}`}
              value={controller.reportReason}
              onChange={(event) =>
                controller.setReportReason(event.target.value.slice(0, 500))
              }
              placeholder="Descreva o problema encontrado..."
              rows={5}
              minLength={10}
              maxLength={500}
              disabled={controller.reporting}
            />
            <span className={modalStyles.characterCount}>
              {controller.reportReason.trim().length}/500 caracteres
            </span>
          </section>
        </div>

        <footer className={styles.modalFooter}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={controller.closeReport}
            disabled={controller.reporting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={controller.submitReport}
            disabled={
              controller.reporting || controller.reportReason.trim().length < 10
            }
          >
            {controller.reporting ? (
              <>
                <Loader2
                  size={15}
                  className={styles.spinner}
                  aria-hidden="true"
                />
                Enviando
              </>
            ) : (
              "Enviar sinalização"
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

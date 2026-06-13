"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck, Star, X } from "lucide-react";

import styles from "../ClientDashboard.module.css";

const RATING_LABELS = {
  1: "Muito insatisfeito",
  2: "Insatisfeito",
  3: "Regular",
  4: "Satisfeito",
  5: "Excelente",
};

export default function ClientRatingModal({ controller }) {
  const modal = controller.modal;

  useEffect(() => {
    if (modal?.type !== "rating") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !controller.busy) {
        controller.setModal(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [controller, modal]);

  if (modal?.type !== "rating") return null;

  const visibleRating = modal.hover || modal.rating || 0;
  const requiresComment = modal.rating > 0 && modal.rating <= 2;
  const commentLength = modal.justification.trim().length;
  const canSubmit =
    !controller.busy &&
    modal.rating >= 1 &&
    modal.rating <= 5 &&
    (!requiresComment || commentLength >= 10);

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={() => !controller.busy && controller.setModal(null)}
    >
      <section
        className={styles.mediumModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-rating-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={() => controller.setModal(null)}
          disabled={controller.busy}
          aria-label="Fechar avaliação"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <span className={styles.modalIcon}>
          <Star size={23} aria-hidden="true" />
        </span>
        <span className={styles.eyebrow}>Reputação verificada</span>
        <h2 id="client-rating-title">Como foi sua experiência?</h2>
        <p>
          Avalie {modal.item.advogado_nome} pelo atendimento no caso “
          {modal.item.caso_titulo}”. Apenas o profissional contratado pode receber
          esta avaliação.
        </p>

        <div className={styles.ratingButtons}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                controller.setModal((current) => ({ ...current, rating: value }))
              }
              onMouseEnter={() =>
                controller.setModal((current) => ({ ...current, hover: value }))
              }
              onMouseLeave={() =>
                controller.setModal((current) => ({ ...current, hover: 0 }))
              }
              aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
              aria-pressed={modal.rating === value}
              disabled={controller.busy}
            >
              <Star
                size={38}
                fill={visibleRating >= value ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <div className={styles.modalNotice}>
          {visibleRating ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <ShieldCheck size={16} aria-hidden="true" />
          )}
          <span>
            {visibleRating
              ? `${visibleRating}/5 · ${RATING_LABELS[visibleRating]}`
              : "Selecione de uma a cinco estrelas para continuar."}
          </span>
        </div>

        <label className={styles.field}>
          <span>
            Comentário {requiresComment ? "obrigatório" : "opcional"}
          </span>
          <textarea
            rows={5}
            maxLength={2000}
            placeholder={
              requiresComment
                ? "Explique brevemente o que não atendeu às suas expectativas..."
                : "Conte como foi o atendimento, a comunicação e a experiência..."
            }
            value={modal.justification}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                justification: event.target.value.slice(0, 2000),
              }))
            }
            disabled={controller.busy}
          />
          <small>
            {modal.justification.length}/2000 caracteres
            {requiresComment ? " · mínimo de 10" : ""}
          </small>
        </label>

        {requiresComment && commentLength < 10 && (
          <div className={styles.modalNotice}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Avaliações de uma ou duas estrelas exigem uma explicação breve para
              garantir contexto e justiça na reputação profissional.
            </span>
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => controller.setModal(null)}
            disabled={controller.busy}
          >
            Avaliar depois
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={controller.submitRating}
            disabled={!canSubmit}
          >
            {controller.busy ? "Publicando..." : "Publicar avaliação"}
          </button>
        </div>
      </section>
    </div>
  );
}

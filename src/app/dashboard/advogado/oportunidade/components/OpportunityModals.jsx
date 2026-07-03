"use client";

import { useEffect, useRef } from "react";
import {
  CalendarDays,
  Coins,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  X,
} from "lucide-react";

import styles from "../Oportunidade.module.css";
import { formatOpportunityDate } from "../opportunityUtils";
import {
  PRIORITY_LABELS,
  SOCIAL_TYPE_LABELS,
} from "@/lib/clientDashboard/caseClassification";

function ModalFrame({ children, className = "", onClose, busy, labelledBy }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`${styles.modal} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children(closeRef)}
      </section>
    </div>
  );
}

export function OpportunityDetailsModal({ item, busy, onClose, onInterest }) {
  if (!item) return null;
  const location = [item.city, item.state].filter(Boolean).join(" - ") || "Local não informado";
  const priority = item.priority || "NORMAL";
  const isSocial = Boolean(item.isSocial);
  const nextSteps = Array.isArray(item.nextSteps) ? item.nextSteps : [];
  const showClassification =
    priority !== "NORMAL" || isSocial || Boolean(item.priorityReason);

  return (
    <ModalFrame onClose={onClose} busy={busy} labelledBy="opportunity-detail-title">
      {(closeRef) => (
        <>
          <header className={styles.modalHeader}>
            <div>
              <h2 id="opportunity-detail-title">{item.title}</h2>
              <p>{item.practiceArea}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className={styles.iconButton}
              onClick={onClose}
              disabled={busy}
              aria-label="Fechar detalhes"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className={styles.modalBody}>
            <div className={styles.cardMeta}>
              <span>
                <MapPin size={14} aria-hidden="true" /> {location}
              </span>
              <span>
                <CalendarDays size={14} aria-hidden="true" />
                {formatOpportunityDate(item.createdAt)}
              </span>
            </div>

            {showClassification && (
              <section
                className={`${styles.detailSection} ${styles.classificationBox} ${
                  isSocial ? styles.classificationSocial : ""
                }`.trim()}
              >
                <h3>Classificação por IA</h3>
                <div className={styles.classificationTags}>
                  {priority !== "NORMAL" && (
                    <span
                      className={`${styles.priorityBadge} ${
                        priority === "URGENTE"
                          ? styles.priorityUrgent
                          : styles.priorityPreferencial
                      }`}
                    >
                      Prioridade: {PRIORITY_LABELS[priority]}
                    </span>
                  )}
                  {isSocial && (
                    <span className={styles.socialBadge}>
                      {SOCIAL_TYPE_LABELS[item.socialType]}
                    </span>
                  )}
                </div>
                {item.priorityReason && (
                  <p>
                    <strong>Prioridade:</strong> {item.priorityReason}
                  </p>
                )}
                {isSocial && item.socialTypeReason && (
                  <p>
                    <strong>Tipo social:</strong> {item.socialTypeReason}
                  </p>
                )}
                <p className={styles.classificationNote}>
                  Classificação preliminar gerada por IA e sujeita à revisão profissional.
                </p>
              </section>
            )}

            <section className={styles.detailSection}>
              <h3>Relato do cliente</h3>
              <p>
                {item.description || "O cliente não informou uma descrição detalhada."}
              </p>
            </section>

            {nextSteps.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Próximos passos sugeridos</h3>
                <ol className={styles.nextStepsList}>
                  {nextSteps.map((step, index) => (
                    <li key={index} className={styles.nextStepItem}>
                      {step.titulo && <strong>{step.titulo}</strong>}
                      {step.descricao && <span>{step.descricao}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {item.transcript && (
              <section className={styles.detailSection}>
                <h3>Transcrição de áudio/vídeo</h3>
                <p className={styles.transcriptText}>{item.transcript}</p>
              </section>
            )}

            {item.negotiatingLawyers?.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Negociação em andamento</h3>
                <p>
                  {item.negotiatingLawyers.length} profissional(is) já iniciou(aram)
                  negociação. O caso permanece disponível enquanto não houver contratação.
                </p>
              </section>
            )}

            {item.attachments?.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Documentos enviados</h3>
                <div className={styles.attachmentList}>
                  {item.attachments.map((attachment, index) => (
                    <a
                      key={`${attachment.url}-${index}`}
                      className={styles.attachmentLink}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>
                        <FileText size={14} aria-hidden="true" /> {attachment.name}
                      </span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {item.audioUrl && (
              <section className={styles.detailSection}>
                <h3>Áudio do cliente</h3>
                <audio className={styles.mediaPlayer} controls preload="metadata">
                  <source src={item.audioUrl} />
                </audio>
              </section>
            )}

            {item.videoUrl && (
              <section className={styles.detailSection}>
                <h3>Vídeo do cliente</h3>
                <video className={styles.mediaPlayer} controls preload="metadata">
                  <source src={item.videoUrl} />
                </video>
              </section>
            )}
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={onClose}
              disabled={busy}
            >
              Voltar
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => onInterest(item)}
              disabled={busy}
            >
              Tenho interesse
            </button>
          </footer>
        </>
      )}
    </ModalFrame>
  );
}

export function InterestConfirmModal({ item, balance, busy, onClose, onConfirm }) {
  if (!item) return null;
  const isEmergency = Boolean(item.isEmergency);

  return (
    <ModalFrame
      className={styles.confirmModal}
      onClose={onClose}
      busy={busy}
      labelledBy="interest-confirm-title"
    >
      {(closeRef) => (
        <>
          <div className={styles.confirmBody}>
            <span className={styles.confirmIcon}>
              <Coins size={26} aria-hidden="true" />
            </span>
            <h2 id="interest-confirm-title">Confirmar manifestação de interesse</h2>
            {isEmergency ? (
              <p>
                Este é um caso de <strong>emergência</strong>: manifestar interesse
                em <strong>“{item.title}”</strong> é <strong>gratuito</strong>,
                sem débito de Juris.
              </p>
            ) : (
              <p>
                Será debitado <strong>1 Juri</strong> para demonstrar interesse em
                <strong> “{item.title}”</strong>. Seu saldo atual é de {balance || 0} Juris.
              </p>
            )}
            <p>
              O cliente receberá uma notificação e poderá aceitar, recusar ou iniciar
              uma negociação com você.
            </p>
          </div>

          <footer className={styles.modalFooter}>
            <button
              ref={closeRef}
              type="button"
              className={styles.buttonSecondary}
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => onConfirm(item)}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
                  Processando
                </>
              ) : isEmergency ? (
                "Confirmar (grátis)"
              ) : (
                "Confirmar por 1 Juri"
              )}
            </button>
          </footer>
        </>
      )}
    </ModalFrame>
  );
}

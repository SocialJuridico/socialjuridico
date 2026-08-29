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
import {
  buildOpportunityDossier,
  formatOpportunityDate,
} from "../opportunityUtils";
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

function DetailList({ items, ordered = false }) {
  if (!items?.length) return null;
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className={ordered ? styles.nextStepsList : styles.dossierBulletList}>
      {items.map((item, index) => (
        <li
          key={`${typeof item === "string" ? item : item?.titulo || item?.descricao}-${index}`}
          className={ordered ? styles.nextStepItem : styles.dossierBulletItem}
        >
          {typeof item === "string" ? (
            item
          ) : (
            <>
              {item?.titulo && <strong>{item.titulo}</strong>}
              {item?.descricao && <span>{item.descricao}</span>}
            </>
          )}
        </li>
      ))}
    </Tag>
  );
}

export function OpportunityDetailsModal({ item, busy, onClose, onInterest }) {
  if (!item) return null;
  const location = [item.city, item.state].filter(Boolean).join(" - ") || "Local não informado";
  const priority = item.priority || "NORMAL";
  const isSocial = Boolean(item.isSocial);
  const dossier = buildOpportunityDossier(item);
  const showClassification =
    priority !== "NORMAL" || isSocial || Boolean(item.priorityReason);
  const hasStructuredOverview =
    dossier.keyFacts.length > 0 ||
    dossier.questions.length > 0 ||
    dossier.references.length > 0 ||
    dossier.mentionedDocuments.length > 0;

  return (
    <ModalFrame
      className={styles.detailsModal}
      onClose={onClose}
      busy={busy}
      labelledBy="opportunity-detail-title"
    >
      {(closeRef) => (
        <>
          <header className={`${styles.modalHeader} ${styles.detailsModalHeader}`}>
            <div className={styles.modalHeaderContent}>
              <div className={styles.modalHeaderTags}>
                <span className={styles.areaBadge}>{item.practiceArea}</span>
                {item.status === "NEGOCIANDO" && (
                  <span className={styles.statusBadge}>Em negociação</span>
                )}
                {Number.isFinite(item.intencaoFechamento) && (
                  <span className={styles.intentBadge}>
                    {item.intencaoFechamento}% intenção
                  </span>
                )}
              </div>
              <h2 id="opportunity-detail-title">{item.title}</h2>
              <div className={styles.detailHeaderMeta}>
                <span>
                  <MapPin size={14} aria-hidden="true" /> {location}
                </span>
                <span>
                  <CalendarDays size={14} aria-hidden="true" />
                  {formatOpportunityDate(item.createdAt)}
                </span>
                <span>
                  {item.negotiatingLawyers?.length > 0
                    ? `${item.negotiatingLawyers.length} profissional(is) em negociação`
                    : "Nenhuma negociação iniciada"}
                </span>
              </div>
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

          <div className={`${styles.modalBody} ${styles.detailsModalBody}`}>
            {dossier.summary && (
              <section className={styles.summaryCard}>
                <span className={styles.sectionKicker}>Resumo do caso</span>
                <p>{dossier.summary}</p>
              </section>
            )}

            {hasStructuredOverview && (
              <div className={styles.dossierGrid}>
                {dossier.keyFacts.length > 0 && (
                  <section className={styles.dossierCard}>
                    <h3>Dados principais</h3>
                    <dl className={styles.factList}>
                      {dossier.keyFacts.map((fact, index) => (
                        <div key={`${fact.label}-${index}`} className={styles.factRow}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                {dossier.questions.length > 0 && (
                  <section className={styles.dossierCard}>
                    <h3>Questões identificadas no relato</h3>
                    <DetailList items={dossier.questions} />
                  </section>
                )}

                {dossier.mentionedDocuments.length > 0 && (
                  <section className={styles.dossierCard}>
                    <h3>Documentos informados</h3>
                    <DetailList items={dossier.mentionedDocuments} />
                    <p className={styles.sourceDisclaimer}>
                      Itens mencionados pelo cliente no relato. A existência, integridade e
                      conteúdo desses documentos ainda precisam ser verificados pelo profissional.
                    </p>
                  </section>
                )}

                {dossier.references.length > 0 && (
                  <section className={styles.dossierCard}>
                    <h3>Processos e referências mencionadas</h3>
                    <dl className={styles.referenceList}>
                      {dossier.references.map((reference, index) => (
                        <div key={`${reference.label}-${reference.value}-${index}`}>
                          <dt>{reference.label}</dt>
                          <dd>{reference.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
            )}

            <section className={`${styles.detailSection} ${styles.fullNarrativeSection}`}>
              <h3>Relato completo do cliente</h3>
              <p>
                {dossier.narrative || "O cliente não informou uma descrição detalhada."}
              </p>
            </section>

            {showClassification && (
              <section
                className={`${styles.detailSection} ${styles.classificationBox} ${
                  isSocial ? styles.classificationSocial : ""
                }`.trim()}
              >
                <h3>Classificação preliminar</h3>
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

            {dossier.attentionPoints.length > 0 && (
              <section className={`${styles.detailSection} ${styles.attentionBox}`}>
                <h3>Pontos de atenção</h3>
                <DetailList items={dossier.attentionPoints} />
              </section>
            )}

            {dossier.nextSteps.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Próximos passos sugeridos</h3>
                <DetailList items={dossier.nextSteps} ordered />
                <p className={styles.sourceDisclaimer}>
                  Sugestões de organização inicial. A estratégia jurídica deve ser definida pelo
                  advogado após a conferência dos fatos e documentos.
                </p>
              </section>
            )}

            {item.transcript && (
              <section className={styles.detailSection}>
                <h3>Transcrição de áudio/vídeo</h3>
                <p className={styles.transcriptText}>{item.transcript}</p>
              </section>
            )}

            {item.attachments?.length > 0 && (
              <section className={styles.detailSection}>
                <h3>Documentos enviados na plataforma</h3>
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

          <footer className={`${styles.modalFooter} ${styles.detailsModalFooter}`}>
            <div className={styles.modalFooterNote}>
              Analise os dados antes de manifestar interesse. O cliente será notificado pela plataforma.
            </div>
            <div className={styles.modalFooterActions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={onClose}
                disabled={busy}
              >
                Fechar
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => onInterest(item)}
                disabled={busy}
              >
                Tenho interesse
              </button>
            </div>
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

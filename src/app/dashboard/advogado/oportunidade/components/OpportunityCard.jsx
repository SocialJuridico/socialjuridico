"use client";

import {
  CalendarDays,
  FileText,
  Headphones,
  Loader2,
  MapPin,
  MessageCircleMore,
  Video,
} from "lucide-react";

import styles from "../Oportunidade.module.css";
import { formatOpportunityDate, getInitials } from "../opportunityUtils";

export default function OpportunityCard({
  item,
  busy,
  onView,
  onInterest,
}) {
  const location = [item.city, item.state].filter(Boolean).join(" - ") || "Local não informado";
  const lawyers = item.negotiatingLawyers || [];

  return (
    <article className={styles.caseCard}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.areaBadge}>{item.practiceArea}</span>
          {item.status === "NEGOCIANDO" && (
            <span className={styles.statusBadge}>Em negociação</span>
          )}
        </div>
      </div>

      <h3 className={styles.caseTitle}>{item.title}</h3>

      <div className={styles.cardMeta}>
        <span>
          <MapPin size={13} aria-hidden="true" />
          {location}
        </span>
        <span>
          <CalendarDays size={13} aria-hidden="true" />
          {formatOpportunityDate(item.createdAt)}
        </span>
      </div>

      <p className={styles.description}>
        {item.description || "O cliente não informou uma descrição detalhada."}
      </p>

      {(item.attachments?.length > 0 || item.audioUrl || item.videoUrl) && (
        <div className={styles.mediaRow} aria-label="Mídias disponíveis">
          {item.attachments?.length > 0 && (
            <span className={styles.mediaBadge}>
              <FileText size={12} aria-hidden="true" />
              {item.attachments.length} documento(s)
            </span>
          )}
          {item.audioUrl && (
            <span className={styles.mediaBadge}>
              <Headphones size={12} aria-hidden="true" /> Áudio
            </span>
          )}
          {item.videoUrl && (
            <span className={styles.mediaBadge}>
              <Video size={12} aria-hidden="true" /> Vídeo
            </span>
          )}
        </div>
      )}

      <div className={styles.negotiating}>
        <span>
          {lawyers.length > 0
            ? `${lawyers.length} profissional(is) em negociação`
            : "Nenhuma negociação iniciada"}
        </span>
        {lawyers.length > 0 && (
          <div className={styles.lawyerStack} aria-label="Advogados em negociação">
            {lawyers.slice(0, 4).map((lawyer) => (
              <span
                key={lawyer.id}
                className={styles.lawyerAvatar}
                title={lawyer.name}
              >
                {lawyer.avatar ? (
                  <img src={lawyer.avatar} alt="" loading="lazy" />
                ) : (
                  getInitials(lawyer.name)
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <footer className={styles.cardFooter}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => onView(item)}
        >
          Ver detalhes
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => onInterest(item)}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
              Processando
            </>
          ) : (
            <>
              <MessageCircleMore size={15} aria-hidden="true" />
              Tenho interesse
            </>
          )}
        </button>
      </footer>
    </article>
  );
}

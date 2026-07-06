import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  MapPin,
  Paperclip,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import {
  getIntentTierLabel,
  getRiskLabel,
  getStageLabel,
} from "../config/caseManagement";
import styles from "../CasosAdmin.module.css";

function formatDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function CaseCard({ caseItem, compact = false, onOpen }) {
  const location = [caseItem.city, caseItem.state].filter(Boolean).join("/");
  const pending = caseItem.interestSummary?.pending || 0;
  const totalInterests = caseItem.interestSummary?.total || 0;

  return (
    <article
      className={`${styles.caseCard} ${compact ? styles.caseCardCompact : ""}`}
    >
      <button
        type="button"
        className={styles.caseCardMain}
        onClick={() => onOpen(caseItem)}
        aria-label={`Gerenciar caso ${caseItem.title}`}
      >
        <div className={styles.caseCardHeader}>
          <div>
            <span className={styles.caseArea}>{caseItem.area}</span>
            <h3>{caseItem.title}</h3>
          </div>
          <ChevronRight size={16} aria-hidden="true" />
        </div>

        <div className={styles.caseBadges}>
          <span className={styles.stageBadge} data-stage={caseItem.stage}>
            {getStageLabel(caseItem.stage)}
          </span>
          <span
            className={styles.riskBadge}
            data-risk={caseItem.privacyAttention}
          >
            <ShieldAlert size={12} aria-hidden="true" />
            {getRiskLabel(caseItem.privacyAttention)}
          </span>
          <span
            className={styles.intentBadge}
            data-intent={caseItem.intentTier}
          >
            {getIntentTierLabel(caseItem.intentTier)}
            {Number.isFinite(caseItem.intencaoFechamento)
              ? ` · ${caseItem.intencaoFechamento}%`
              : ""}
          </span>
          {caseItem.governance?.legalHold && (
            <span className={styles.legalHoldBadge}>Preservação jurídica</span>
          )}
        </div>

        <div className={styles.caseMetaGrid}>
          <span>
            <UserRound size={13} aria-hidden="true" />
            <strong>{caseItem.client?.name || "Cliente"}</strong>
            <small>{caseItem.client?.maskedEmail || "E-mail não informado"}</small>
          </span>

          {location && (
            <span>
              <MapPin size={13} aria-hidden="true" />
              <strong>{location}</strong>
              <small>Localidade informada</small>
            </span>
          )}

          <span>
            <Users size={13} aria-hidden="true" />
            <strong>{totalInterests} interesse{totalInterests === 1 ? "" : "s"}</strong>
            <small>{pending} pendente{pending === 1 ? "" : "s"}</small>
          </span>

          <span>
            <CalendarClock size={13} aria-hidden="true" />
            <strong>{formatDate(caseItem.lastActivityAt)}</strong>
            <small>Última atividade</small>
          </span>
        </div>

        {(caseItem.attachmentCount > 0 || caseItem.hasMedia) && (
          <div className={styles.sensitiveAssetsNote}>
            <Paperclip size={13} aria-hidden="true" />
            Conteúdo sensível protegido: {caseItem.attachmentCount} anexo
            {caseItem.attachmentCount === 1 ? "" : "s"}
            {caseItem.hasMedia ? " e mídia" : ""}
          </div>
        )}

        {caseItem.alert && (
          <div
            className={styles.caseAlert}
            data-severity={caseItem.alert.severity}
          >
            <AlertTriangle size={14} aria-hidden="true" />
            <div>
              <strong>{caseItem.alert.label}</strong>
              <span>{caseItem.alert.recommendedAction}</span>
            </div>
          </div>
        )}
      </button>
    </article>
  );
}

import {
  BellRing,
  LoaderCircle,
  MapPin,
  Scale,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import { getRiskLabel, getStageLabel } from "../../config/caseManagement";
import styles from "../../CasosAdmin.module.css";

export default function CaseOverviewTab({
  caseItem,
  actionName,
  busy,
  onNotifyClient,
}) {
  const reminderCount = caseItem.governance?.notificationCount || 0;
  const reminderLimitReached = reminderCount >= 3;
  const canNotify =
    caseItem.interestSummary?.pending > 0 &&
    !reminderLimitReached &&
    caseItem.stage !== "ARCHIVED";

  return (
    <div className={styles.drawerSectionStack}>
      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Resumo operacional</h3>
          <span className={styles.stageBadge} data-stage={caseItem.stage}>
            {getStageLabel(caseItem.stage)}
          </span>
        </div>

        <div className={styles.drawerInfoGrid}>
          <div>
            <UserRound size={15} aria-hidden="true" />
            <span>Cliente</span>
            <strong>{caseItem.client?.name || "Cliente"}</strong>
            <small>{caseItem.client?.maskedEmail}</small>
          </div>
          <div>
            <MapPin size={15} aria-hidden="true" />
            <span>Localidade</span>
            <strong>
              {[caseItem.city, caseItem.state].filter(Boolean).join("/") ||
                "Não informada"}
            </strong>
          </div>
          <div>
            <Users size={15} aria-hidden="true" />
            <span>Interesses</span>
            <strong>{caseItem.interestSummary?.total || 0}</strong>
            <small>{caseItem.interestSummary?.pending || 0} pendentes</small>
          </div>
          <div>
            <ShieldAlert size={15} aria-hidden="true" />
            <span>Privacidade</span>
            <strong>{getRiskLabel(caseItem.privacyAttention)}</strong>
            <small>{caseItem.attachmentCount || 0} anexos</small>
          </div>
        </div>
      </section>

      {caseItem.alert && (
        <section
          className={styles.drawerAlert}
          data-severity={caseItem.alert.severity}
        >
          <ShieldAlert size={18} aria-hidden="true" />
          <div>
            <strong>{caseItem.alert.label}</strong>
            <p>{caseItem.alert.recommendedAction}</p>
          </div>
        </section>
      )}

      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Interesses recebidos</h3>
          <span>{caseItem.interestSummary?.total || 0}</span>
        </div>

        {caseItem.interests?.length ? (
          <div className={styles.interestList}>
            {caseItem.interests.map((interest) => (
              <div key={interest.id} className={styles.interestItem}>
                <span className={styles.interestIcon}>
                  <Scale size={14} aria-hidden="true" />
                </span>
                <div>
                  <strong>{interest.lawyer?.name || "Advogado"}</strong>
                  <small>
                    {interest.lawyer?.oab
                      ? `OAB ${interest.lawyer.oab}`
                      : "OAB não informada"}
                  </small>
                </div>
                <span
                  className={styles.interestStatus}
                  data-status={interest.status}
                >
                  {interest.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.mutedText}>Nenhum interesse registrado.</p>
        )}
      </section>

      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Reengajamento do cliente</h3>
          <span>{reminderCount}/3 lembretes</span>
        </div>
        <p className={styles.drawerPanelText}>
          Envie lembretes somente quando houver interesses pendentes. O sistema
          limita frequência e volume para reduzir excesso de comunicação.
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onNotifyClient}
          disabled={!canNotify || busy}
        >
          {actionName === "NOTIFY_CLIENT" ? (
            <LoaderCircle
              size={16}
              className={styles.spinning}
              aria-hidden="true"
            />
          ) : (
            <BellRing size={16} aria-hidden="true" />
          )}
          {reminderLimitReached
            ? "Limite de lembretes atingido"
            : "Notificar cliente"}
        </button>
      </section>
    </div>
  );
}

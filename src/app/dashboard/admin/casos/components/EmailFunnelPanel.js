import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  MailCheck,
  MousePointerClick,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  EMAIL_JOURNEY_STEPS,
  getEmailStepIndex,
} from "../config/caseManagement";
import styles from "../CasosAdmin.module.css";

const summaryCards = [
  {
    key: "openRate",
    label: "Taxa de abertura",
    icon: MailCheck,
    suffix: "%",
  },
  {
    key: "clickRate",
    label: "Taxa de clique",
    icon: MousePointerClick,
    suffix: "%",
  },
  {
    key: "interestViewRate",
    label: "Visualização de interesses",
    icon: UserCheck,
    suffix: "%",
  },
  {
    key: "responseRate",
    label: "Resposta do cliente",
    icon: CheckCircle2,
    suffix: "%",
  },
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function EmailFunnelPanel({
  events,
  summary,
  loading,
  onReload,
}) {
  return (
    <section className={styles.emailFunnelSection} aria-labelledby="email-funnel-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Rastreamento de comunicação</span>
          <h2 id="email-funnel-title">Jornada de e-mail</h2>
          <p>
            Acompanhe abertura, clique, login, visualização dos interesses e resposta,
            sem expor o e-mail completo na listagem.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onReload({ force: true })}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={loading ? styles.spinning : undefined}
            aria-hidden="true"
          />
          Atualizar jornada
        </button>
      </div>

      <div className={styles.funnelSummaryGrid}>
        {summaryCards.map(({ key, label, icon: Icon, suffix }) => (
          <article key={key} className={styles.funnelSummaryCard}>
            <span className={styles.funnelSummaryIcon}>
              <Icon size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{summary[key] ?? 0}{suffix}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.funnelHealthBar}>
        <span>
          <strong>{summary.sent || 0}</strong> enviados
        </span>
        <span>
          <strong>{summary.responded || 0}</strong> responderam
        </span>
        <span data-warning={summary.stalled > 0}>
          <strong>{summary.stalled || 0}</strong> gargalos ativos
        </span>
      </div>

      {loading ? (
        <div className={styles.inlineLoading}>
          <span className={styles.loadingSpinner} aria-hidden="true" />
          Carregando jornada de e-mail...
        </div>
      ) : events.length ? (
        <div className={styles.emailEventList}>
          {events.map((event) => {
            const currentIndex = getEmailStepIndex(event.currentStep);

            return (
              <article key={event.id} className={styles.emailEventCard}>
                <header className={styles.emailEventHeader}>
                  <div>
                    <span className={styles.emailTypeBadge}>
                      {event.emailType}
                    </span>
                    <h3>{event.caseTitle || "Comunicação do sistema"}</h3>
                    <p>
                      {event.recipientName} · {event.maskedEmail}
                    </p>
                  </div>
                  <time dateTime={event.sentAt || undefined}>
                    {formatDate(event.sentAt)}
                  </time>
                </header>

                <div className={styles.emailJourney}>
                  {EMAIL_JOURNEY_STEPS.map((step, index) => {
                    const completed = index <= currentIndex;

                    return (
                      <div
                        key={step.value}
                        className={`${styles.emailJourneyStep} ${
                          completed ? styles.emailJourneyStepComplete : ""
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        ) : (
                          <Circle size={14} aria-hidden="true" />
                        )}
                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {event.alert && (
                  <div
                    className={styles.caseAlert}
                    data-severity={event.alert.severity}
                  >
                    <AlertTriangle size={14} aria-hidden="true" />
                    <div>
                      <strong>{event.alert.label}</strong>
                      <span>{event.alert.recommendedAction}</span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <MailCheck size={24} aria-hidden="true" />
          </span>
          <h2>Nenhum evento de e-mail encontrado</h2>
          <p>Os próximos envios rastreados aparecerão nesta jornada.</p>
        </div>
      )}
    </section>
  );
}

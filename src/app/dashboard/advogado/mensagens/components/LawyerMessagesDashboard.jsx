"use client";

import {
  AlertTriangle,
  BriefcaseBusiness,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../Mensagens.module.css";
import { useLawyerMessages } from "../useLawyerMessages";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";

function SummaryCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className={`${styles.summaryCard} ${accent ? styles[accent] : ""}`}>
      <span>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
        <em>{detail}</em>
      </div>
    </article>
  );
}

function LoadingInbox() {
  return (
    <div className={styles.routeLoading} aria-live="polite">
      <Loader2 size={30} className={styles.spinner} aria-hidden="true" />
      <strong>Organizando suas conversas</strong>
      <p>Estamos carregando negociações, casos e mensagens não lidas.</p>
    </div>
  );
}

export default function LawyerMessagesDashboard() {
  const controller = useLawyerMessages();
  const summary = controller.inbox.summary;

  return (
    <LawyerDashboardShell
      activeRoute="mensagens"
      title="Minhas Mensagens"
      subtitle="Negociações e atendimentos organizados em uma única central"
      icon={MessageCircle}
    >
      {controller.loadingInbox && !controller.inbox.conversations.length ? (
        <LoadingInbox />
      ) : controller.error ? (
        <section className={styles.routeError} role="alert">
          <AlertTriangle size={38} aria-hidden="true" />
          <h2>Não foi possível carregar suas conversas</h2>
          <p>{controller.error}</p>
          <button type="button" onClick={controller.reloadInbox}>
            <RefreshCw size={15} aria-hidden="true" />
            Tentar novamente
          </button>
        </section>
      ) : (
        <div className={styles.page}>
          <section className={styles.summaryGrid} aria-label="Resumo das mensagens">
            <SummaryCard
              icon={MessageCircle}
              label="Conversas"
              value={summary.total}
              detail="Negociações e casos vinculados"
            />
            <SummaryCard
              icon={MessageCircle}
              label="Não lidas"
              value={summary.unread}
              detail="Mensagens aguardando resposta"
              accent="summaryUnread"
            />
            <SummaryCard
              icon={Clock3}
              label="Negociações"
              value={summary.negotiating}
              detail="Conversas antes da contratação"
              accent="summaryWarning"
            />
            <SummaryCard
              icon={BriefcaseBusiness}
              label="Casos ativos"
              value={summary.activeCases}
              detail="Atendimentos após contratação"
              accent="summarySuccess"
            />
          </section>

          <section className={styles.messagingLayout}>
            <ConversationList controller={controller} />
            <MessageThread controller={controller} />
          </section>

          {(controller.inbox.limits.messagesTruncated ||
            controller.inbox.limits.conversationsTruncated) && (
            <p className={styles.limitWarning}>
              A central mostra as conversas e mensagens mais recentes dentro dos
              limites operacionais de segurança.
            </p>
          )}
        </div>
      )}
    </LawyerDashboardShell>
  );
}

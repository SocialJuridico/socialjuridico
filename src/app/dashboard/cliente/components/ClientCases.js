"use client";

import {
  CalendarClock,
  FileText,
  MessageSquare,
  PlusCircle,
  Scale,
  Share2,
} from "lucide-react";

import { CASE_STATUS_META } from "../clientDashboardConfig";
import styles from "../ClientDashboard.module.css";

function formatDate(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function CaseCard({ item, controller }) {
  const meta = CASE_STATUS_META[item.status] || {
    label: item.status,
    tone: "default",
  };

  return (
    <article className={styles.caseCard}>
      <button
        type="button"
        className={styles.caseCardMain}
        onClick={() => controller.openCaseEditor(item)}
      >
        <div className={styles.caseCardHeader}>
          <span
            className={`${styles.caseStatus} ${styles[`caseStatus_${meta.tone}`]}`}
          >
            {meta.label}
          </span>
          <span>{formatDate(item.created_at)}</span>
        </div>
        <h3>{item.titulo}</h3>
        <p className={styles.caseArea}>{item.area_atuacao || "Área não informada"}</p>
        <p className={styles.caseExcerpt}>
          {String(item.descricao || "").slice(0, 190)}
          {String(item.descricao || "").length > 190 ? "…" : ""}
        </p>
        <div className={styles.caseCardMeta}>
          <span>
            <Scale size={13} aria-hidden="true" />
            {item.advogado_id ? "Advogado vinculado" : "Aguardando advogado"}
          </span>
          <span>
            <FileText size={13} aria-hidden="true" />
            {Array.isArray(item.anexos) ? item.anexos.length : 0} anexo(s)
          </span>
        </div>
      </button>

      <div className={styles.caseCardActions}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => controller.shareCase(item)}
        >
          <Share2 size={14} aria-hidden="true" />
          Compartilhar
        </button>
        {item.advogado_id && (
          <button
            type="button"
            className={styles.primaryCompactButton}
            onClick={() => {
              window.location.href = `/chat/${item.id}`;
            }}
          >
            <MessageSquare size={14} aria-hidden="true" />
            Conversar
          </button>
        )}
      </div>
    </article>
  );
}

export function ClientCases({ controller }) {
  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntroCard}>
        <div>
          <span className={styles.eyebrow}>Histórico jurídico</span>
          <h2>Meus casos</h2>
          <p>
            Consulte o andamento, edite informações, compartilhe ou finalize suas
            solicitações.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => controller.setActiveTab("novo")}
        >
          <PlusCircle size={16} aria-hidden="true" />
          Novo caso
        </button>
      </section>

      {controller.cases.length ? (
        <section className={styles.caseGrid}>
          {controller.cases.map((item) => (
            <CaseCard key={item.id} item={item} controller={controller} />
          ))}
        </section>
      ) : (
        <div className={styles.largeEmptyState}>
          <FileText size={30} aria-hidden="true" />
          <h2>Nenhum caso registrado</h2>
          <p>Publique uma solicitação para iniciar o atendimento jurídico.</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => controller.setActiveTab("novo")}
          >
            Publicar meu primeiro caso
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientConversations({ controller }) {
  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntroCard}>
        <div>
          <span className={styles.eyebrow}>Atendimento jurídico</span>
          <h2>Minhas conversas</h2>
          <p>
            Acesse os chats dos casos que já possuem um profissional vinculado.
          </p>
        </div>
        <span className={styles.counterBadge}>
          {controller.conversations.length} conversa(s)
        </span>
      </section>

      {controller.conversations.length ? (
        <section className={styles.conversationList}>
          {controller.conversations.map((item) => {
            const meta = CASE_STATUS_META[item.status] || {
              label: item.status,
              tone: "default",
            };
            return (
              <button
                key={item.id}
                type="button"
                className={styles.conversationItem}
                onClick={() => {
                  window.location.href = `/chat/${item.id}`;
                }}
              >
                <span className={styles.conversationIcon}>
                  <MessageSquare size={19} aria-hidden="true" />
                </span>
                <span className={styles.conversationCopy}>
                  <strong>{item.titulo}</strong>
                  <small>{item.area_atuacao || "Área não informada"}</small>
                </span>
                <span className={styles.conversationDate}>
                  <CalendarClock size={13} aria-hidden="true" />
                  {formatDate(item.updated_at || item.created_at)}
                </span>
                <span
                  className={`${styles.caseStatus} ${styles[`caseStatus_${meta.tone}`]}`}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </section>
      ) : (
        <div className={styles.largeEmptyState}>
          <MessageSquare size={30} aria-hidden="true" />
          <h2>Nenhuma conversa iniciada</h2>
          <p>
            As conversas aparecerão quando um advogado for vinculado a um dos seus
            casos.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  MessageSquare,
  PlusCircle,
  Scale,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

import { CASE_STATUS_META } from "../clientDashboardConfig";
import LawyerCard from "./LawyerCard";
import styles from "../ClientDashboard.module.css";

function SummaryCard({ icon: Icon, value, label, detail, onClick }) {
  const Component = onClick ? "button" : "article";
  return (
    <Component
      type={onClick ? "button" : undefined}
      className={`${styles.summaryCard} ${onClick ? styles.summaryCardAction : ""}`}
      onClick={onClick}
    >
      <span className={styles.summaryIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <strong>{value || 0}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </Component>
  );
}

function formatDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function ActiveCase({ controller }) {
  const item = controller.activeCase;

  if (!item) {
    return (
      <article className={styles.emptyOverviewCard}>
        <span className={styles.emptyOverviewIcon}>
          <FileText size={24} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.eyebrow}>Seu primeiro passo</span>
          <h2>Você ainda não publicou um caso</h2>
          <p>
            Descreva sua situação por texto, áudio ou vídeo para receber o
            interesse de profissionais cadastrados.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => controller.setActiveTab("novo")}
          >
            <PlusCircle size={16} aria-hidden="true" />
            Publicar meu caso
          </button>
        </div>
      </article>
    );
  }

  const meta = CASE_STATUS_META[item.status] || {
    label: item.status,
    tone: "default",
  };
  const hasLawyer = Boolean(item.advogado_id);

  return (
    <article className={styles.activeCaseCard}>
      <div className={styles.cardSectionHeader}>
        <div>
          <span className={styles.eyebrow}>Caso em destaque</span>
          <h2>{item.titulo}</h2>
        </div>
        <span
          className={`${styles.caseStatus} ${styles[`caseStatus_${meta.tone}`]}`}
        >
          {meta.label}
        </span>
      </div>

      <p className={styles.activeCaseDescription}>
        {String(item.descricao || "").slice(0, 260)}
        {String(item.descricao || "").length > 260 ? "…" : ""}
      </p>

      <div className={styles.activeCaseMeta}>
        <span>
          <Scale size={14} aria-hidden="true" />
          {item.area_atuacao || "Área não informada"}
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          Publicado em {formatDate(item.created_at)}
        </span>
        <span>
          <BriefcaseBusiness size={14} aria-hidden="true" />
          {hasLawyer ? "Advogado vinculado" : "Aguardando profissional"}
        </span>
      </div>

      <div className={styles.caseProgress} aria-label="Andamento do caso">
        <div className={styles.caseProgressItemActive}>
          <span />
          <strong>Publicado</strong>
        </div>
        <div
          className={
            item.status !== "ABERTO"
              ? styles.caseProgressItemActive
              : styles.caseProgressItem
          }
        >
          <span />
          <strong>Em análise</strong>
        </div>
        <div
          className={hasLawyer ? styles.caseProgressItemActive : styles.caseProgressItem}
        >
          <span />
          <strong>Conectado</strong>
        </div>
      </div>

      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.openCaseEditor(item)}
        >
          Ver detalhes
        </button>
        {hasLawyer && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              window.location.href = `/chat/${item.id}`;
            }}
          >
            <MessageSquare size={15} aria-hidden="true" />
            Abrir conversa
          </button>
        )}
      </div>
    </article>
  );
}

function Interests({ controller }) {
  if (!controller.interests.length) {
    return (
      <article className={styles.interestsCard}>
        <div className={styles.cardSectionHeader}>
          <div>
            <span className={styles.eyebrow}>Novos contatos</span>
            <h2>Interesses dos advogados</h2>
          </div>
          <Bell size={18} aria-hidden="true" />
        </div>
        <div className={styles.compactEmptyState}>
          <Users size={22} aria-hidden="true" />
          <p>
            Quando um advogado demonstrar interesse em um caso aberto, a proposta
            aparecerá aqui.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.interestsCard}>
      <div className={styles.cardSectionHeader}>
        <div>
          <span className={styles.eyebrow}>Ação necessária</span>
          <h2>Advogados interessados</h2>
        </div>
        <span className={styles.counterBadge}>{controller.interests.length}</span>
      </div>

      <div className={styles.interestList}>
        {controller.interests.slice(0, 5).map((interest) => {
          const negotiating = interest.status === "NEGOTIATING";
          return (
            <div key={interest.id} className={styles.interestItem}>
              <span className={styles.interestAvatar}>
                {String(interest.lawyer_name || "A")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className={styles.interestInfo}>
                <strong>{interest.lawyer_name || "Advogado"}</strong>
                <span>
                  {interest.lawyer_oab || "OAB não informada"} · {interest.caso_titulo}
                </span>
                {negotiating && (
                  <small className={styles.negotiatingBadge}>Em negociação</small>
                )}
              </div>
              <div className={styles.interestActions}>
                {negotiating ? (
                  <>
                    <button
                      type="button"
                      className={styles.iconActionButton}
                      onClick={() => {
                        window.location.href = `/chat/${interest.case_id}?interest=${interest.id}`;
                      }}
                      aria-label="Abrir conversa de negociação"
                    >
                      <MessageSquare size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.approveButton}
                      onClick={() => controller.respondInterest(interest, "HIRE")}
                      disabled={controller.busy}
                    >
                      <UserRoundCheck size={14} aria-hidden="true" />
                      Contratar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.approveButton}
                    onClick={() => controller.respondInterest(interest, "ACCEPT")}
                    disabled={controller.busy}
                  >
                    <Check size={14} aria-hidden="true" />
                    Negociar
                  </button>
                )}
                <button
                  type="button"
                  className={styles.rejectButton}
                  onClick={() => controller.respondInterest(interest, "DECLINE")}
                  disabled={controller.busy}
                  aria-label="Recusar interesse"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function ClientOverview({ controller }) {
  const featuredLawyers = controller.lawyers
    .filter((item) => item.is_premium)
    .slice(0, 4);

  return (
    <div className={styles.pageStack}>
      <section className={styles.summaryGrid} aria-label="Resumo da área do cliente">
        <SummaryCard
          icon={FileText}
          value={controller.summary.activeCases}
          label="Casos ativos"
          detail={`${controller.summary.totalCases} caso(s) no histórico`}
          onClick={() => controller.setActiveTab("meus-casos")}
        />
        <SummaryCard
          icon={Users}
          value={controller.summary.interests}
          label="Novos interesses"
          detail="Propostas aguardando sua resposta"
        />
        <SummaryCard
          icon={MessageSquare}
          value={controller.summary.conversations}
          label="Conversas"
          detail="Atendimentos com advogado vinculado"
          onClick={() => controller.setActiveTab("conversas")}
        />
        <SummaryCard
          icon={Bell}
          value={controller.summary.unreadNotifications}
          label="Notificações não lidas"
          detail="Atualizações recentes da plataforma"
          onClick={() => controller.setActiveTab("notificacoes")}
        />
      </section>

      <section className={styles.overviewGrid}>
        <ActiveCase controller={controller} />
        <Interests controller={controller} />
      </section>

      <section className={styles.directoryPreview}>
        <div className={styles.cardSectionHeader}>
          <div>
            <span className={styles.eyebrow}>Profissionais disponíveis</span>
            <h2>Advogados em destaque</h2>
            <p>
              Consulte perfis, especialidades e avaliações antes de iniciar um
              contato direto.
            </p>
          </div>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => controller.setActiveTab("profissionais")}
          >
            Ver diretório completo
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>

        {featuredLawyers.length ? (
          <div className={styles.lawyerGrid}>
            {featuredLawyers.map((lawyer) => (
              <LawyerCard
                key={lawyer.id}
                lawyer={lawyer}
                online={controller.onlineLawyerIds.includes(lawyer.id)}
                onOpen={controller.openLawyer}
                onContact={controller.openChatSelector}
              />
            ))}
          </div>
        ) : (
          <div className={styles.compactEmptyState}>
            <Users size={22} aria-hidden="true" />
            <p>Nenhum profissional em destaque está disponível no momento.</p>
          </div>
        )}
      </section>
    </div>
  );
}

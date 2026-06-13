"use client";

import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../MeusCasos.module.css";
import { useLawyerCases } from "../useLawyerCases";

function formatDate(value) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Sem mensagens";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name) {
  return String(name || "Cliente")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SummaryCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className={`${styles.summaryCard} ${accent ? styles[accent] : ""}`}>
      <span><Icon size={18} aria-hidden="true" /></span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
        <em>{detail}</em>
      </div>
    </article>
  );
}

function StatusBadge({ item }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${item.status}`] || ""}`}>
      {item.statusLabel || item.status || "Caso"}
    </span>
  );
}

function LoadingState() {
  return (
    <section className={styles.stateBox} aria-live="polite">
      <Loader2 size={30} className={styles.spinner} aria-hidden="true" />
      <h3>Carregando seus casos</h3>
      <p>Organizando atendimentos, mensagens e status atualizados.</p>
    </section>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <section className={styles.stateBox}>
      <BriefcaseBusiness size={38} aria-hidden="true" />
      <h3>{hasFilters ? "Nenhum caso encontrado" : "Você ainda não possui casos vinculados"}</h3>
      <p>
        {hasFilters
          ? "Ajuste a busca ou o status para localizar outros atendimentos."
          : "Quando um cliente contratar seus serviços, o caso aparecerá aqui com histórico, mensagens e dados essenciais para o atendimento."}
      </p>
      {hasFilters && (
        <button type="button" className={styles.buttonSecondary} onClick={onClear}>
          Limpar filtros
        </button>
      )}
    </section>
  );
}

function CaseCard({ item, busy, onDetails, onChat }) {
  const chatLabel = item.chatStarted
    ? item.status === "FECHADO"
      ? "Ver conversa"
      : "Abrir conversa"
    : "Abrir atendimento";

  return (
    <article className={styles.caseCard}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.areaBadge}>{item.practiceArea}</span>
          <StatusBadge item={item} />
        </div>
        <time>{formatDate(item.updatedAt || item.createdAt)}</time>
      </div>

      <div className={styles.clientRow}>
        <span className={styles.avatar}>
          {item.client?.avatar ? (
            <img src={item.client.avatar} alt="" />
          ) : (
            initials(item.client?.name)
          )}
        </span>
        <div>
          <small>Cliente</small>
          <strong>{item.client?.name || "Cliente"}</strong>
        </div>
        {item.unreadCount > 0 && (
          <span className={styles.unreadBadge}>{item.unreadCount} nova(s)</span>
        )}
      </div>

      <h3>{item.title}</h3>
      <div className={styles.cardMeta}>
        {(item.city || item.state) && (
          <span><MapPin size={13} /> {[item.city, item.state].filter(Boolean).join(" - ")}</span>
        )}
        <span><Clock3 size={13} /> Vinculado em {formatDate(item.createdAt)}</span>
      </div>

      <p className={styles.description}>{item.description || "Sem descrição disponível."}</p>

      <div className={styles.messageStrip}>
        <MessageCircle size={15} aria-hidden="true" />
        <div>
          <strong>{item.messageCount} mensagem(ns)</strong>
          <span>
            {item.lastMessage
              ? `${item.lastMessage.direction === "IN" ? "Cliente" : "Você"}: ${item.lastMessage.preview}`
              : "Nenhuma mensagem enviada ainda"}
          </span>
        </div>
        <time>{formatDateTime(item.lastMessage?.createdAt)}</time>
      </div>

      <footer className={styles.cardFooter}>
        <button type="button" className={styles.buttonSecondary} onClick={() => onDetails(item)}>
          <Eye size={15} /> Detalhes
        </button>
        {(item.canOpenChat || item.canStartChat) && (
          <button type="button" className={styles.button} disabled={busy} onClick={() => onChat(item)}>
            {busy ? <Loader2 size={15} className={styles.spinner} /> : <MessageCircle size={15} />}
            {chatLabel}
          </button>
        )}
        {item.status === "CANCELADO" && (
          <span className={styles.closedLabel}>Atendimento cancelado</span>
        )}
      </footer>
    </article>
  );
}

function CaseDetailsModal({ item, busy, onClose, onChat }) {
  if (!item) return null;

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="case-details-title">
        <header className={styles.modalHeader}>
          <div>
            <h2 id="case-details-title">{item.title}</h2>
            <p>Caso vinculado em {formatDate(item.createdAt)}</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar detalhes">
            <X size={18} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.modalBadges}>
            <span className={styles.areaBadge}>{item.practiceArea}</span>
            <StatusBadge item={item} />
          </div>

          <section className={styles.clientPanel}>
            <span className={styles.avatarLarge}>
              {item.client?.avatar ? <img src={item.client.avatar} alt="" /> : initials(item.client?.name)}
            </span>
            <div>
              <small>Cliente vinculado</small>
              <strong>{item.client?.name || "Cliente"}</strong>
              <span>Dados de contato permanecem protegidos nesta listagem.</span>
            </div>
          </section>

          <section className={styles.detailSection}>
            <h3>Relato do caso</h3>
            <p>{item.description || "Sem descrição disponível."}</p>
          </section>

          <section className={styles.detailGrid}>
            <div><strong>Localização</strong><span>{[item.city, item.state].filter(Boolean).join(" - ") || "Não informada"}</span></div>
            <div><strong>Status</strong><span>{item.statusLabel}</span></div>
            <div><strong>Mensagens</strong><span>{item.messageCount}</span></div>
            <div><strong>Não lidas</strong><span>{item.unreadCount}</span></div>
          </section>

          {item.attachments?.length > 0 && (
            <section className={styles.detailSection}>
              <h3>Documentos anexados</h3>
              <div className={styles.attachmentList}>
                {item.attachments.map((attachment, index) => (
                  <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
                    <FileText size={15} />
                    <span>{attachment.name || `Documento ${index + 1}`}</span>
                    <ArrowRight size={14} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {item.audioUrl && (
            <section className={styles.detailSection}>
              <h3>Áudio do cliente</h3>
              <audio controls src={item.audioUrl} className={styles.mediaPlayer} />
            </section>
          )}

          {item.videoUrl && (
            <section className={styles.detailSection}>
              <h3>Vídeo do cliente</h3>
              <video controls src={item.videoUrl} className={styles.mediaPlayer} />
            </section>
          )}
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" className={styles.buttonSecondary} onClick={onClose}>Fechar</button>
          {(item.canOpenChat || item.canStartChat) && (
            <button type="button" className={styles.button} disabled={busy} onClick={() => onChat(item)}>
              {busy ? <Loader2 size={15} className={styles.spinner} /> : <MessageCircle size={15} />}
              {item.chatStarted ? "Abrir conversa" : "Abrir atendimento"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

export default function LawyerCasesDashboard() {
  const controller = useLawyerCases();
  const balance = controller.profileData?.balance || 0;

  return (
    <LawyerDashboardShell
      activeRoute="meuscasos"
      title="Meus Casos"
      subtitle="Atendimentos contratados, conversas e histórico profissional"
      icon={BriefcaseBusiness}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}><ShieldCheck size={15} /> Gestão segura de atendimentos</span>
            <h2>Sua carteira de casos, <span>organizada.</span></h2>
            <p>Acompanhe clientes contratados, mensagens, documentos e o estágio atual de cada atendimento em um único ambiente.</p>
          </div>
          <div className={styles.heroAside}>
            <div className={styles.wallet}><WalletCards size={20} /><strong>{balance}</strong><span>Juris disponíveis</span></div>
            <div className={styles.jurisRule}>
              <small>Regra de consumo</small>
              <span><b>1</b> interesse</span>
              <span><b>2</b> aceite</span>
              <span><b>2</b> contratação</span>
            </div>
          </div>
        </section>

        <section className={styles.summaryGrid} aria-label="Resumo dos casos">
          <SummaryCard icon={BriefcaseBusiness} label="Ativos" value={controller.summary.active} detail="Contratados ou em andamento" />
          <SummaryCard icon={MessageCircle} label="Com conversa" value={controller.summary.chatReady} detail="Atendimentos disponíveis" accent="summaryChat" />
          <SummaryCard icon={AlertTriangle} label="Não lidas" value={controller.summary.unread} detail="Mensagens aguardando" accent="summaryUnread" />
          <SummaryCard icon={CheckCircle2} label="Encerrados" value={controller.summary.closed + controller.summary.cancelled} detail="Finalizados ou cancelados" />
        </section>

        <section className={styles.panel}>
          <form className={styles.filters} onSubmit={controller.applyFilters}>
            <label className={styles.field}>
              <span>Buscar</span>
              <div className={styles.inputWrap}>
                <Search size={15} />
                <input className={styles.input} value={controller.filters.search} onChange={(event) => controller.updateFilter("search", event.target.value)} placeholder="Caso, cliente, área ou cidade" />
              </div>
            </label>
            <label className={styles.field}>
              <span>Status</span>
              <select className={styles.select} value={controller.filters.status} onChange={(event) => controller.updateFilter("status", event.target.value)}>
                <option value="ACTIVE">Ativos</option>
                <option value="CONTRATADO">Contratados</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="CLOSED">Encerrados</option>
                <option value="FECHADO">Finalizados</option>
                <option value="CANCELADO">Cancelados</option>
                <option value="ALL">Todos</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="submit" className={styles.button}>Filtrar</button>
              <button type="button" className={styles.buttonSecondary} onClick={controller.clearFilters}>Limpar</button>
            </div>
          </form>

          <div className={styles.statusBar}>
            <span><strong>{controller.pagination.total}</strong> caso(s) encontrados</span>
            <button type="button" className={styles.refreshButton} onClick={controller.reload}><RefreshCw size={14} /> Atualizar</button>
          </div>

          {controller.loading && !controller.cases.length ? (
            <LoadingState />
          ) : controller.error ? (
            <section className={styles.stateBox} role="alert">
              <AlertTriangle size={38} />
              <h3>Não foi possível carregar seus casos</h3>
              <p>{controller.error}</p>
              <button type="button" className={styles.button} onClick={controller.reload}><RefreshCw size={15} /> Tentar novamente</button>
            </section>
          ) : controller.cases.length === 0 ? (
            <EmptyState hasFilters={controller.hasFilters} onClear={controller.clearFilters} />
          ) : (
            <div className={styles.cardsGrid}>
              {controller.cases.map((item) => (
                <CaseCard
                  key={item.id}
                  item={item}
                  busy={controller.busyCaseId === item.id}
                  onDetails={controller.setSelectedCase}
                  onChat={controller.openChat}
                />
              ))}
            </div>
          )}

          {controller.pagination.pages > 1 && (
            <nav className={styles.pagination} aria-label="Paginação de casos">
              <button type="button" className={styles.buttonSecondary} disabled={controller.page <= 1} onClick={() => controller.setPage((current) => Math.max(1, current - 1))}>Anterior</button>
              <span>Página {controller.pagination.page} de {controller.pagination.pages}</span>
              <button type="button" className={styles.buttonSecondary} disabled={controller.page >= controller.pagination.pages} onClick={() => controller.setPage((current) => current + 1)}>Próxima</button>
            </nav>
          )}
        </section>
      </div>

      <CaseDetailsModal
        item={controller.selectedCase}
        busy={controller.busyCaseId === controller.selectedCase?.id}
        onClose={() => controller.setSelectedCase(null)}
        onChat={controller.openChat}
      />
    </LawyerDashboardShell>
  );
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../DeclareiInteresse.module.css";
import { useLawyerDeclaredInterests } from "../useLawyerDeclaredInterests";

const STATUS_LABELS = {
  PENDING: "Aguardando cliente",
  NEGOTIATING: "Em negociação",
  HIRED: "Contratado",
  DECLINED: "Recusado",
};

function formatDate(value) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

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

function LoadingState() {
  return (
    <section className={styles.stateBox} aria-live="polite">
      <Loader2 size={30} className={styles.spinner} aria-hidden="true" />
      <h3>Carregando interesses declarados</h3>
      <p>Estamos organizando seus casos, status e negociações recentes.</p>
    </section>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <section className={styles.stateBox}>
      <ShieldCheck size={38} aria-hidden="true" />
      <h3>{hasFilters ? "Nenhum interesse encontrado" : "Você ainda não declarou interesse"}</h3>
      <p>
        {hasFilters
          ? "Ajuste os filtros para encontrar outros casos em que você manifestou interesse."
          : "Quando você manifestar interesse em uma oportunidade, ela aparecerá aqui com status, rastreabilidade e ações seguras."}
      </p>
      {hasFilters && (
        <button type="button" className={styles.buttonSecondary} onClick={onClear}>
          Limpar filtros
        </button>
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`] || ""}`}>
      {STATUS_LABELS[status] || status || "Interesse"}
    </span>
  );
}

function InterestCard({ item, busy, onDetails, onCancel, onNegotiation }) {
  const relatedCase = item.case || {};

  return (
    <article className={styles.interestCard}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.areaBadge}>{relatedCase.practiceArea || "Direito Geral"}</span>
          <StatusBadge status={item.status} />
        </div>
        <time>{formatDate(item.createdAt)}</time>
      </div>

      <h3 className={styles.caseTitle}>{relatedCase.title || "Caso jurídico"}</h3>
      <div className={styles.cardMeta}>
        {(relatedCase.city || relatedCase.state) && (
          <span>
            <MapPin size={13} aria-hidden="true" />
            {[relatedCase.city, relatedCase.state].filter(Boolean).join(" - ")}
          </span>
        )}
        <span>
          <Clock3 size={13} aria-hidden="true" />
          Caso {relatedCase.status || "sem status"}
        </span>
      </div>

      <p className={styles.description}>
        {relatedCase.description || "Sem descrição disponível para este caso."}
      </p>

      <div className={styles.auditStrip}>
        <ShieldCheck size={15} aria-hidden="true" />
        <span>
          Interesse #{String(item.id || "").slice(0, 8)} · {item.canCancel ? "Cancelamento permitido antes da resposta do cliente" : "Fluxo já processado pelo cliente"}
        </span>
      </div>

      <footer className={styles.cardFooter}>
        <button type="button" className={styles.buttonSecondary} onClick={() => onDetails(item)}>
          <Eye size={15} aria-hidden="true" /> Detalhes
        </button>
        {item.canOpenNegotiation && (
          <button type="button" className={styles.button} onClick={() => onNegotiation(item)}>
            <MessageCircle size={15} aria-hidden="true" /> Conversar
          </button>
        )}
        {item.canCancel && (
          <button
            type="button"
            className={styles.dangerButton}
            disabled={busy}
            onClick={() => onCancel(item)}
          >
            {busy ? <Loader2 size={15} className={styles.spinner} /> : <Trash2 size={15} />}
            Desfazer
          </button>
        )}
      </footer>
    </article>
  );
}

function InterestDetailsModal({ item, onClose, onCancel, onNegotiation }) {
  if (!item) return null;
  const relatedCase = item.case || {};

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="interest-details-title">
        <header className={styles.modalHeader}>
          <div>
            <h2 id="interest-details-title">{relatedCase.title || "Caso jurídico"}</h2>
            <p>Interesse declarado em {formatDate(item.createdAt)}</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar detalhes">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.modalBadges}>
            <span className={styles.areaBadge}>{relatedCase.practiceArea || "Direito Geral"}</span>
            <StatusBadge status={item.status} />
          </div>

          <section className={styles.detailSection}>
            <h3>Relato do cliente</h3>
            <p>{relatedCase.description || "Sem descrição disponível."}</p>
          </section>

          <section className={styles.detailGrid}>
            <div>
              <strong>Localização</strong>
              <span>{[relatedCase.city, relatedCase.state].filter(Boolean).join(" - ") || "Não informada"}</span>
            </div>
            <div>
              <strong>Status do caso</strong>
              <span>{relatedCase.status || "Não informado"}</span>
            </div>
            <div>
              <strong>Status do interesse</strong>
              <span>{STATUS_LABELS[item.status] || item.status}</span>
            </div>
            <div>
              <strong>Rastreio</strong>
              <span>{item.id}</span>
            </div>
          </section>

          {relatedCase.attachments?.length > 0 && (
            <section className={styles.detailSection}>
              <h3>Anexos</h3>
              <div className={styles.attachmentList}>
                {relatedCase.attachments.map((attachment, index) => (
                  <a
                    key={`${attachment.url}-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentLink}
                  >
                    {attachment.name || `Anexo ${index + 1}`}
                    <ArrowRight size={14} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {relatedCase.audioUrl && (
            <section className={styles.detailSection}>
              <h3>Áudio do cliente</h3>
              <audio src={relatedCase.audioUrl} controls className={styles.mediaPlayer} />
            </section>
          )}

          {relatedCase.videoUrl && (
            <section className={styles.detailSection}>
              <h3>Vídeo do cliente</h3>
              <video src={relatedCase.videoUrl} controls className={styles.mediaPlayer} />
            </section>
          )}
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" className={styles.buttonSecondary} onClick={onClose}>
            Fechar
          </button>
          {item.canOpenNegotiation && (
            <button type="button" className={styles.button} onClick={() => onNegotiation(item)}>
              <MessageCircle size={15} aria-hidden="true" /> Abrir conversa
            </button>
          )}
          {item.canCancel && (
            <button type="button" className={styles.dangerButton} onClick={() => onCancel(item)}>
              <Trash2 size={15} aria-hidden="true" /> Desfazer interesse
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function CancelInterestModal({ item, busy, onClose, onConfirm }) {
  if (!item) return null;

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section className={`${styles.modal} ${styles.confirmModal}`} role="dialog" aria-modal="true" aria-labelledby="cancel-interest-title">
        <div className={styles.confirmBody}>
          <span className={styles.confirmIcon}>
            <RotateCcw size={26} aria-hidden="true" />
          </span>
          <h2 id="cancel-interest-title">Desfazer interesse?</h2>
          <p>
            Esta ação só é permitida enquanto o cliente ainda não respondeu. O sistema fará o reembolso de <strong>1 Juri</strong> com auditoria e transação segura no servidor.
          </p>
          <p className={styles.confirmCase}>{item.case?.title || "Caso jurídico"}</p>
        </div>
        <footer className={styles.modalFooter}>
          <button type="button" className={styles.buttonSecondary} disabled={busy} onClick={onClose}>
            Manter interesse
          </button>
          <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => onConfirm(item)}>
            {busy ? <Loader2 size={15} className={styles.spinner} /> : <RotateCcw size={15} />}
            Confirmar cancelamento
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function DeclaredInterestsDashboard() {
  const controller = useLawyerDeclaredInterests();
  const balance = controller.profileData?.balance || 0;

  return (
    <LawyerDashboardShell
      activeRoute="declareiinteresse"
      title="Declarei Interesse"
      subtitle="Acompanhe manifestações, negociações e cancelamentos com segurança"
      icon={CheckCircle2}
    >
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="declared-interests-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <ShieldCheck size={15} aria-hidden="true" /> Rastreamento profissional
            </span>
            <h2 id="declared-interests-title" className={styles.heroTitle}>
              Seus interesses, <span>sob controle.</span>
            </h2>
            <p className={styles.heroDescription}>
              Veja os casos em que você já manifestou interesse, filtre por status, abra negociações aceitas e cancele com reembolso seguro quando ainda for permitido.
            </p>
          </div>

          <div className={styles.heroWallet}>
            <WalletCards size={22} aria-hidden="true" />
            <strong>{balance}</strong>
            <span>Juris disponíveis</span>
          </div>
        </section>

        <section className={styles.summaryGrid} aria-label="Resumo dos interesses">
          <SummaryCard icon={CheckCircle2} label="Ativos" value={controller.summary.active} detail="Pendente ou negociação" />
          <SummaryCard icon={Clock3} label="Aguardando" value={controller.summary.pending} detail="Cliente ainda não respondeu" accent="summaryPending" />
          <SummaryCard icon={MessageCircle} label="Negociando" value={controller.summary.negotiating} detail="Conversa liberada" accent="summaryNegotiating" />
          <SummaryCard icon={ShieldCheck} label="Histórico" value={controller.summary.hired + controller.summary.declined} detail="Contratados ou recusados" />
        </section>

        <section className={styles.panel}>
          <form className={styles.filters} onSubmit={controller.applyFilters}>
            <label className={styles.field}>
              <span>Buscar</span>
              <div className={styles.inputWrap}>
                <Search size={15} aria-hidden="true" />
                <input
                  className={styles.input}
                  value={controller.filters.search}
                  onChange={(event) => controller.updateFilter("search", event.target.value)}
                  placeholder="Título, área, cidade ou descrição"
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Status</span>
              <select
                className={styles.select}
                value={controller.filters.status}
                onChange={(event) => controller.updateFilter("status", event.target.value)}
              >
                <option value="ACTIVE">Ativos</option>
                <option value="PENDING">Aguardando cliente</option>
                <option value="NEGOTIATING">Em negociação</option>
                <option value="HIRED">Contratado</option>
                <option value="DECLINED">Recusado</option>
                <option value="ALL">Todos</option>
              </select>
            </label>

            <div className={styles.filterActions}>
              <button type="submit" className={styles.button}>
                Filtrar
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={controller.clearFilters}>
                Limpar
              </button>
            </div>
          </form>

          <div className={styles.statusBar}>
            <span>
              <strong>{controller.pagination.total}</strong> interesse(s) encontrados
            </span>
            <button type="button" className={styles.refreshButton} onClick={controller.reload}>
              <RefreshCw size={14} aria-hidden="true" /> Atualizar
            </button>
          </div>

          {controller.loading && !controller.interests.length ? (
            <LoadingState />
          ) : controller.error ? (
            <section className={styles.stateBox} role="alert">
              <AlertTriangle size={38} aria-hidden="true" />
              <h3>Não foi possível carregar seus interesses</h3>
              <p>{controller.error}</p>
              <button type="button" className={styles.button} onClick={controller.reload}>
                <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
              </button>
            </section>
          ) : controller.interests.length === 0 ? (
            <EmptyState hasFilters={controller.hasFilters} onClear={controller.clearFilters} />
          ) : (
            <div className={styles.cardsGrid}>
              {controller.interests.map((item) => (
                <InterestCard
                  key={item.id}
                  item={item}
                  busy={controller.busyInterestId === item.id}
                  onDetails={controller.setSelectedInterest}
                  onCancel={controller.setCancelTarget}
                  onNegotiation={controller.openNegotiation}
                />
              ))}
            </div>
          )}

          {controller.pagination.pages > 1 && (
            <nav className={styles.pagination} aria-label="Paginação de interesses">
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={controller.page <= 1}
                onClick={() => controller.setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <span>
                Página {controller.pagination.page} de {controller.pagination.pages}
              </span>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={controller.page >= controller.pagination.pages}
                onClick={() => controller.setPage((current) => current + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </section>
      </div>

      <InterestDetailsModal
        item={controller.selectedInterest}
        onClose={() => controller.setSelectedInterest(null)}
        onCancel={(item) => {
          controller.setSelectedInterest(null);
          controller.setCancelTarget(item);
        }}
        onNegotiation={controller.openNegotiation}
      />
      <CancelInterestModal
        item={controller.cancelTarget}
        busy={Boolean(controller.busyInterestId)}
        onClose={() => {
          if (!controller.busyInterestId) controller.setCancelTarget(null);
        }}
        onConfirm={controller.cancelInterest}
      />
    </LawyerDashboardShell>
  );
}

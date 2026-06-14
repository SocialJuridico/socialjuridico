"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Cloud,
  FilterX,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../Agenda.module.css";
import { useLawyerAgenda } from "../useLawyerAgenda";

const STATUS = {
  PENDING: { label: "Pendente", className: "statusPending", icon: Clock3 },
  COMPLETED: { label: "Concluído", className: "statusCompleted", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelado", className: "statusCancelled", icon: X },
};
const TYPE_LABELS = {
  PRAZO: "Prazo processual",
  AUDIENCIA: "Audiência",
  REUNIAO: "Reunião",
  TAREFA: "Tarefa",
  OUTRO: "Outro",
};
const URGENCY = {
  LOW: { label: "Baixa", className: "urgencyLow" },
  MEDIUM: { label: "Média", className: "urgencyMedium" },
  HIGH: { label: "Alta", className: "urgencyHigh" },
};

function formatDate(value) {
  if (!value) return { date: "Data não informada", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "Data inválida", time: "" };
  return {
    date: new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function StatusBadge({ status }) {
  const config = STATUS[status] || STATUS.PENDING;
  const Icon = config.icon;
  return (
    <span className={`${styles.status} ${styles[config.className]}`}>
      <Icon size={12} aria-hidden="true" /> {config.label}
    </span>
  );
}

function UrgencyBadge({ urgency }) {
  const config = URGENCY[urgency] || URGENCY.MEDIUM;
  return <span className={`${styles.urgency} ${styles[config.className]}`}>{config.label}</span>;
}

function EventActions({ controller, item }) {
  return (
    <div className={styles.actions}>
      {item.canEdit && item.status !== "CANCELLED" && (
        <button
          type="button"
          onClick={() => controller.complete(item)}
          disabled={controller.completingId === item.id}
          title={item.status === "COMPLETED" ? "Reabrir compromisso" : "Marcar como concluído"}
        >
          {controller.completingId === item.id ? (
            <Loader2 size={13} className={styles.spinner} aria-hidden="true" />
          ) : (
            <CircleCheckBig size={13} aria-hidden="true" />
          )}
          {item.status === "COMPLETED" ? "Reabrir" : "Concluir"}
        </button>
      )}
      {item.canEdit && (
        <button type="button" onClick={() => controller.openEdit(item)} title="Editar compromisso">
          <Pencil size={13} aria-hidden="true" /> Editar
        </button>
      )}
      {item.canDelete && (
        <button
          type="button"
          className={styles.dangerAction}
          onClick={() => controller.remove(item)}
          disabled={controller.deletingId === item.id}
          title="Excluir compromisso"
        >
          {controller.deletingId === item.id ? (
            <Loader2 size={13} className={styles.spinner} aria-hidden="true" />
          ) : (
            <Trash2 size={13} aria-hidden="true" />
          )}
          Excluir
        </button>
      )}
    </div>
  );
}

function AgendaTable({ controller }) {
  return (
    <>
      <div className={styles.desktopTable}>
        <table>
          <thead>
            <tr>
              <th>Compromisso</th>
              <th>Data e horário</th>
              <th>Responsável</th>
              <th>Tipo</th>
              <th>Urgência</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {controller.items.map((item) => {
              const startsAt = formatDate(item.date);
              const endsAt = formatDate(item.endDate);
              return (
                <tr key={item.id}>
                  <td>
                    <div className={styles.eventCell}>
                      <span className={styles.eventIcon}>
                        <CalendarClock size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <strong title={item.title}>{item.title}</strong>
                        <small>{item.clientName || "Sem vínculo ao CRM"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.dateCell}>
                      <strong>{startsAt.date}</strong>
                      <small>
                        {startsAt.time}
                        {endsAt.time ? ` — ${endsAt.time}` : ""}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className={styles.ownerCell}>
                      <UserRound size={13} aria-hidden="true" />
                      <span>{item.lawyerName}</span>
                    </div>
                  </td>
                  <td><span className={styles.typeBadge}>{TYPE_LABELS[item.type] || "Outro"}</span></td>
                  <td><UrgencyBadge urgency={item.urgency} /></td>
                  <td>
                    <StatusBadge status={item.status} />
                    {item.googleSynced && (
                      <span className={styles.googleBadge}><Cloud size={10} aria-hidden="true" /> Google</span>
                    )}
                  </td>
                  <td><EventActions controller={controller} item={item} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {controller.items.map((item) => {
          const startsAt = formatDate(item.date);
          const endsAt = formatDate(item.endDate);
          return (
            <article key={item.id} className={styles.mobileCard}>
              <header className={styles.mobileHeader}>
                <span className={styles.eventIcon}><CalendarClock size={16} aria-hidden="true" /></span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.clientName || "Sem vínculo ao CRM"}</p>
                </div>
                <StatusBadge status={item.status} />
              </header>
              <div className={styles.mobileMeta}>
                <div><small>Quando</small><strong>{startsAt.date}<br />{startsAt.time}{endsAt.time ? ` — ${endsAt.time}` : ""}</strong></div>
                <div><small>Responsável</small><strong>{item.lawyerName}</strong></div>
                <div><small>Tipo</small><strong>{TYPE_LABELS[item.type] || "Outro"}</strong></div>
                <div><small>Urgência</small><UrgencyBadge urgency={item.urgency} /></div>
              </div>
              {item.description && <p className={styles.mobileDescription}>{item.description}</p>}
              {item.googleSynced && <span className={styles.googleBadge}><Cloud size={10} aria-hidden="true" /> Sincronizado com Google</span>}
              <EventActions controller={controller} item={item} />
            </article>
          );
        })}
      </div>
    </>
  );
}

function AgendaModal({ controller }) {
  const { modalOpen, closeModal } = controller;
  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, modalOpen]);

  if (!modalOpen) return null;
  const minimumDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeModal();
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title">
        <header className={styles.modalHeader}>
          <div>
            <span><CalendarDays size={15} aria-hidden="true" /> Governança de prazos</span>
            <h2 id="agenda-modal-title">
              {controller.editingItem ? "Editar compromisso" : "Novo compromisso"}
            </h2>
            <p>Registre prazos, audiências e tarefas com responsável, histórico e sincronização segura.</p>
          </div>
          <button type="button" onClick={controller.closeModal} disabled={controller.submitting} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form className={styles.form} onSubmit={controller.submit} noValidate>
          {controller.fieldErrors.form && <div className={styles.formError}><AlertTriangle size={15} /> {controller.fieldErrors.form}</div>}
          <div className={styles.formGrid}>
            <label className={styles.fieldWide}>
              <span>Título *</span>
              <input
                type="text"
                maxLength={160}
                value={controller.form.title}
                onChange={(event) => controller.updateField("title", event.target.value)}
                placeholder="Ex.: Prazo para contestação — Processo 0001234"
                autoFocus
              />
              {controller.fieldErrors.title && <small>{controller.fieldErrors.title}</small>}
            </label>

            <label>
              <span>Início *</span>
              <input
                type="datetime-local"
                min={minimumDate}
                value={controller.form.date}
                onChange={(event) => controller.updateField("date", event.target.value)}
              />
              {controller.fieldErrors.date && <small>{controller.fieldErrors.date}</small>}
            </label>
            <label>
              <span>Término *</span>
              <input
                type="datetime-local"
                min={controller.form.date || minimumDate}
                value={controller.form.endDate}
                onChange={(event) => controller.updateField("endDate", event.target.value)}
              />
              {controller.fieldErrors.endDate && <small>{controller.fieldErrors.endDate}</small>}
            </label>

            <label>
              <span>Tipo</span>
              <select value={controller.form.type} onChange={(event) => controller.updateField("type", event.target.value)}>
                <option value="PRAZO">Prazo processual</option>
                <option value="AUDIENCIA">Audiência</option>
                <option value="REUNIAO">Reunião</option>
                <option value="TAREFA">Tarefa</option>
                <option value="OUTRO">Outro</option>
              </select>
              {controller.fieldErrors.type && <small>{controller.fieldErrors.type}</small>}
            </label>
            <label>
              <span>Urgência</span>
              <select value={controller.form.urgency} onChange={(event) => controller.updateField("urgency", event.target.value)}>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </select>
              {controller.fieldErrors.urgency && <small>{controller.fieldErrors.urgency}</small>}
            </label>

            <label>
              <span>Cliente do CRM</span>
              <select value={controller.form.clientId} onChange={(event) => controller.updateField("clientId", event.target.value)}>
                <option value="">Sem vínculo ao CRM</option>
                {controller.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
              {controller.fieldErrors.clientId && <small>{controller.fieldErrors.clientId}</small>}
            </label>
            <label>
              <span>Responsável</span>
              <select
                value={controller.form.lawyerId}
                onChange={(event) => controller.updateField("lawyerId", event.target.value)}
                disabled={!controller.governance?.canManageOffice}
              >
                <option value="">Selecione o responsável</option>
                {controller.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
              {controller.fieldErrors.lawyerId && <small>{controller.fieldErrors.lawyerId}</small>}
            </label>

            {controller.editingItem && (
              <label>
                <span>Status</span>
                <select value={controller.form.status} onChange={(event) => controller.updateField("status", event.target.value)}>
                  <option value="PENDING">Pendente</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </label>
            )}

            <label className={styles.fieldWide}>
              <span>Descrição e observações</span>
              <textarea
                maxLength={3000}
                value={controller.form.description}
                onChange={(event) => controller.updateField("description", event.target.value)}
                placeholder="Contexto, providências necessárias, número do processo ou orientações internas."
              />
              {controller.fieldErrors.description && <small>{controller.fieldErrors.description}</small>}
            </label>
          </div>

          <div className={styles.governanceNote}>
            <ShieldCheck size={17} aria-hidden="true" />
            <div>
              <strong>Registro governado e auditável</strong>
              <p>Criações, alterações, conclusões e exclusões ficam vinculadas ao usuário, IP anonimizado e horário da operação.</p>
            </div>
          </div>

          <footer className={styles.modalFooter}>
            <button type="button" className={styles.ghostAction} onClick={controller.closeModal} disabled={controller.submitting}>Cancelar</button>
            <button type="submit" className={styles.primaryAction} disabled={controller.submitting}>
              {controller.submitting ? <Loader2 size={15} className={styles.spinner} /> : <CheckCircle2 size={15} />}
              {controller.editingItem ? "Salvar alterações" : "Criar compromisso"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function AgendaDashboard() {
  const controller = useLawyerAgenda();
  const quota = controller.governance?.quota;

  return (
    <LawyerDashboardShell
      activeRoute="agenda"
      title="Agenda & Prazos"
      subtitle="Compromissos, responsáveis e rastreabilidade em um único fluxo."
      icon={CalendarDays}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><ShieldCheck size={14} /> Controle jurídico operacional</span>
            <h1>Seus prazos sob controle, <span>sem perder a governança.</span></h1>
            <p>Organize audiências, reuniões, tarefas e prazos processuais com responsáveis, vínculo ao CRM, auditoria e sincronização opcional com o Google Calendar.</p>
          </div>
          <div className={styles.heroActions}>
            {controller.governance?.googleSyncAvailable && !controller.governance?.googleSyncEnabled && (
              <button type="button" className={styles.secondaryAction} onClick={controller.connectGoogle}>
                <Cloud size={15} /> Conectar Google
              </button>
            )}
            <button type="button" className={styles.primaryAction} onClick={controller.openNew}>
              <Plus size={16} /> Novo compromisso
            </button>
          </div>
        </section>

        <section className={styles.metrics} aria-label="Resumo da agenda">
          <article className={styles.metricCard}><span className={styles.metricIcon}><CalendarDays size={18} /></span><div><small>Hoje</small><strong>{controller.metrics.today || 0}</strong><p>compromissos pendentes</p></div></article>
          <article className={styles.metricCard}><span className={styles.metricIcon}><Clock3 size={18} /></span><div><small>Próximos 7 dias</small><strong>{controller.metrics.nextSevenDays || 0}</strong><p>itens programados</p></div></article>
          <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.warningIcon}`}><AlertTriangle size={18} /></span><div><small>Atrasados</small><strong>{controller.metrics.overdue || 0}</strong><p>exigem atenção</p></div></article>
          <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.successIcon}`}><CheckCircle2 size={18} /></span><div><small>Concluídos</small><strong>{controller.metrics.completed || 0}</strong><p>registros finalizados</p></div></article>
          <article className={styles.metricCard}><span className={styles.metricIcon}><ShieldCheck size={18} /></span><div><small>Plano</small><strong>{controller.governance?.planType || "—"}</strong><p>{quota?.unlimited ? "agenda ilimitada" : quota ? `${quota.remaining} registros restantes` : "carregando limites"}</p></div></article>
        </section>

        <section className={styles.flow} aria-label="Controles de governança">
          <article><span><UserRound size={15} /></span><div><small>Responsabilidade</small><strong>{controller.governance?.canManageOffice ? "Gestão compartilhada do escritório" : "Agenda individual protegida"}</strong></div></article>
          <article><span><Briefcase size={15} /></span><div><small>CRM integrado</small><strong>Vínculo opcional com a carteira de clientes</strong></div></article>
          <article><span><ShieldCheck size={15} /></span><div><small>Auditoria</small><strong>Operações rastreadas e exclusão lógica</strong></div></article>
          <article><span><Cloud size={15} /></span><div><small>Google Calendar</small><strong>{controller.governance?.googleSyncEnabled ? "Sincronização ativa" : "Integração opcional"}</strong></div></article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div><span>Agenda operacional</span><h2>Compromissos e prazos</h2></div>
            <div className={styles.filters}>
              <label className={styles.searchField}>
                <Search size={14} aria-hidden="true" />
                <input value={controller.filters.q} onChange={(event) => controller.updateFilter("q", event.target.value)} placeholder="Buscar título, cliente ou responsável" aria-label="Buscar agenda" />
              </label>
              <select value={controller.filters.status} onChange={(event) => controller.updateFilter("status", event.target.value)} aria-label="Filtrar por status">
                <option value="">Todos os status</option><option value="PENDING">Pendentes</option><option value="COMPLETED">Concluídos</option><option value="CANCELLED">Cancelados</option>
              </select>
              <select value={controller.filters.type} onChange={(event) => controller.updateFilter("type", event.target.value)} aria-label="Filtrar por tipo">
                <option value="">Todos os tipos</option><option value="PRAZO">Prazos</option><option value="AUDIENCIA">Audiências</option><option value="REUNIAO">Reuniões</option><option value="TAREFA">Tarefas</option><option value="OUTRO">Outros</option>
              </select>
              {controller.members.length > 1 && (
                <select value={controller.filters.memberId} onChange={(event) => controller.updateFilter("memberId", event.target.value)} aria-label="Filtrar por responsável">
                  <option value="">Todos os responsáveis</option>{controller.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              )}
              {controller.hasActiveFilters && <button type="button" className={styles.refresh} onClick={controller.clearFilters} title="Limpar filtros"><FilterX size={15} /></button>}
              <button type="button" className={styles.refresh} onClick={() => controller.load({ silent: true })} disabled={controller.refreshing} title="Atualizar agenda">
                <RefreshCw size={15} className={controller.refreshing ? styles.spinner : undefined} />
              </button>
            </div>
          </header>

          {controller.loading ? (
            <div className={styles.state}><Loader2 size={28} className={styles.spinner} /><strong>Carregando agenda segura…</strong><span>Validando permissões, responsáveis e limites do plano.</span></div>
          ) : controller.error ? (
            <div className={`${styles.state} ${styles.errorState}`}><AlertTriangle size={28} /><strong>Não foi possível carregar a agenda</strong><span>{controller.error}</span><button type="button" className={styles.secondaryAction} onClick={() => controller.load()}>Tentar novamente</button></div>
          ) : controller.items.length === 0 ? (
            <div className={styles.state}><CalendarDays size={30} /><strong>{controller.hasActiveFilters ? "Nenhum compromisso encontrado" : "Sua agenda está pronta"}</strong><span>{controller.hasActiveFilters ? "Ajuste ou remova os filtros para ampliar a busca." : "Crie o primeiro compromisso para centralizar seus prazos e responsabilidades."}</span><button type="button" className={styles.primaryAction} onClick={controller.hasActiveFilters ? controller.clearFilters : controller.openNew}>{controller.hasActiveFilters ? <FilterX size={15} /> : <Plus size={15} />}{controller.hasActiveFilters ? "Limpar filtros" : "Criar compromisso"}</button></div>
          ) : (
            <AgendaTable controller={controller} />
          )}

          {!controller.loading && !controller.error && controller.pagination.total > 0 && (
            <footer className={styles.pagination}>
              <span>{controller.pagination.total} registro{controller.pagination.total === 1 ? "" : "s"}</span>
              <div>
                <button type="button" onClick={() => controller.updateFilter("page", Math.max(1, controller.pagination.page - 1))} disabled={controller.pagination.page <= 1}><ChevronLeft size={15} /></button>
                <strong>{controller.pagination.page} / {controller.pagination.totalPages}</strong>
                <button type="button" onClick={() => controller.updateFilter("page", Math.min(controller.pagination.totalPages, controller.pagination.page + 1))} disabled={controller.pagination.page >= controller.pagination.totalPages}><ChevronRight size={15} /></button>
              </div>
            </footer>
          )}
        </section>
      </div>
      <AgendaModal controller={controller} />
    </LawyerDashboardShell>
  );
}

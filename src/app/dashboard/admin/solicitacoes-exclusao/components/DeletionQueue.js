import {
  CalendarClock,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  PROFILE_LABELS,
  STATUS_FILTERS,
  STATUS_META,
} from "../deletionConstants";
import styles from "../DeletionRequests.module.css";

function formatDate(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function remainingTime(item) {
  if (!item.due_at) return "Sem prazo definido";
  if (item.overdue) return "Prazo excedido";

  const difference = new Date(item.due_at).getTime() - Date.now();
  const hours = Math.max(0, Math.ceil(difference / 3_600_000));
  return `${hours}h restantes`;
}

export default function DeletionQueue({ controller }) {
  return (
    <section className={styles.queueCard} aria-labelledby="deletion-queue-title">
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>Fila operacional</span>
          <h2 id="deletion-queue-title">Pedidos registrados</h2>
          <p>
            A listagem exibe somente dados minimizados. Informações completas
            exigem finalidade e justificativa auditadas.
          </p>
        </div>
        <span className={styles.resultCount}>
          {controller.filtered.length} resultado(s)
        </span>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchWrap}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome, e-mail mascarado ou resumo..."
            value={controller.search}
            onChange={(event) => controller.setSearch(event.target.value)}
          />
        </label>

        <div className={styles.filterGroup}>
          <span>Perfil</span>
          <div className={styles.filterTabs}>
            {[
              ["all", "Todos"],
              ["LAWYER", "Advogados"],
              ["CLIENT", "Clientes"],
              ["UNKNOWN", "Não identificados"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  controller.typeFilter === value
                    ? styles.filterTabActive
                    : styles.filterTab
                }
                onClick={() => controller.setTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span>Status</span>
          <div className={styles.filterTabs}>
            {STATUS_FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  controller.statusFilter === value
                    ? styles.filterTabActive
                    : styles.filterTab
                }
                onClick={() => controller.setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {controller.filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <ShieldCheck size={28} aria-hidden="true" />
          <h3>Nenhuma solicitação encontrada</h3>
          <p>Altere os filtros ou aguarde novos pedidos dos titulares.</p>
        </div>
      ) : (
        <div className={styles.requestList}>
          {controller.filtered.map((item) => {
            const status = STATUS_META[item.status] || STATUS_META.PENDENTE;

            return (
              <article
                key={item.id}
                className={`${styles.requestCard} ${item.overdue ? styles.requestOverdue : ""}`}
              >
                <div className={styles.requestHeader}>
                  <div className={styles.identityBlock}>
                    <span className={styles.identityIcon}>
                      <UserRound size={17} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{item.display_name}</strong>
                      <span>{item.email_masked}</span>
                    </div>
                  </div>

                  <span
                    className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className={styles.requestMeta}>
                  <span>
                    <UserRound size={13} aria-hidden="true" />
                    {PROFILE_LABELS[item.profile_type] || PROFILE_LABELS.UNKNOWN}
                  </span>
                  <span>
                    <Clock3 size={13} aria-hidden="true" />
                    Criada em {formatDate(item.created_at)}
                  </span>
                  <span className={item.overdue ? styles.overdueText : ""}>
                    <CalendarClock size={13} aria-hidden="true" />
                    {remainingTime(item)}
                  </span>
                </div>

                <div className={styles.protectedReason}>
                  <LockKeyhole size={15} aria-hidden="true" />
                  <div>
                    <strong>Resumo protegido</strong>
                    <p>{item.reason_preview || "Motivo não informado."}</p>
                  </div>
                </div>

                {item.last_error_code && (
                  <div className={styles.errorNotice}>
                    Código operacional: <strong>{item.last_error_code}</strong>
                  </div>
                )}

                <div className={styles.requestFooter}>
                  <span>
                    Atualizada em {formatDate(item.updated_at)} · versão {item.version}
                  </span>
                  <button
                    type="button"
                    className={styles.reviewButton}
                    onClick={() => controller.openAccess(item)}
                    disabled={controller.busy}
                  >
                    Analisar com acesso auditado
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

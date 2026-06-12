import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Coins,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  PauseCircle,
  Pencil,
  Search,
  ShieldAlert,
  ShoppingCart,
  TicketPercent,
  TimerReset,
  Users,
} from "lucide-react";

import styles from "../CouponsAdmin.module.css";

const STATUS_OPTIONS = [
  ["all", "Todos"],
  ["active", "Ativos"],
  ["scheduled", "Agendados"],
  ["inactive", "Pausados"],
  ["expired", "Expirados"],
  ["exhausted", "Esgotados"],
  ["archived", "Arquivados"],
];

const STATUS_META = {
  active: { label: "Ativo", icon: CheckCircle2 },
  scheduled: { label: "Agendado", icon: Clock3 },
  inactive: { label: "Pausado", icon: PauseCircle },
  expired: { label: "Expirado", icon: CalendarClock },
  exhausted: { label: "Esgotado", icon: Gauge },
  archived: { label: "Arquivado", icon: Archive },
};

function formatDateTime(value) {
  if (!value) return "Sem limite";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDiscount(coupon) {
  if (coupon.desconto_tipo === "PERCENTUAL") {
    return `${Number(coupon.valor || 0).toLocaleString("pt-BR")}%`;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(coupon.valor || 0));
}

function usageProgress(coupon) {
  if (!coupon.limite_total) return null;
  return Math.min(
    100,
    Math.round(
      (Number(coupon.total_usos || 0) / Number(coupon.limite_total)) * 100,
    ),
  );
}

export default function CouponsInventory({ coupons }) {
  return (
    <section className={styles.inventoryCard} aria-labelledby="inventario-title">
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>Inventário promocional</span>
          <h2 id="inventario-title">Cupons configurados</h2>
          <p>Consulte disponibilidade, consumo e vínculo operacional.</p>
        </div>
        <span className={styles.resultCount}>
          {coupons.filtered.length} resultado(s)
        </span>
      </div>

      <div className={styles.filters} aria-label="Filtros dos cupons">
        <label className={styles.searchWrap}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por código, descrição ou referência Stripe..."
            value={coupons.search}
            onChange={(event) => coupons.setSearch(event.target.value)}
          />
        </label>

        <div className={styles.filterGroup}>
          <span>Aplicação</span>
          <div className={styles.filterTabs}>
            {[
              ["all", "Todas"],
              ["PLANO_PRO", "Planos"],
              ["COMPRA_JURIS", "Juris"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  coupons.typeFilter === value
                    ? styles.filterTabActive
                    : styles.filterTab
                }
                onClick={() => coupons.setTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span>Situação</span>
          <div className={styles.filterTabs}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  coupons.statusFilter === value
                    ? styles.filterTabActive
                    : styles.filterTab
                }
                onClick={() => coupons.setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {coupons.filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <TicketPercent size={28} aria-hidden="true" />
          <h3>Nenhum cupom encontrado</h3>
          <p>Altere os filtros ou cadastre uma nova campanha promocional.</p>
        </div>
      ) : (
        <div className={styles.couponList}>
          {coupons.filtered.map((coupon) => {
            const status =
              STATUS_META[coupon.publication_status] || STATUS_META.inactive;
            const StatusIcon = status.icon;
            const busy = coupons.busyId === coupon.id;
            const progress = usageProgress(coupon);
            const archived = coupon.publication_status === "archived";

            return (
              <article key={coupon.id} className={styles.couponCard}>
                <div className={styles.couponPrimary}>
                  <div className={styles.codeBlock}>
                    <div className={styles.codeRow}>
                      <code>{coupon.codigo}</code>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => coupons.copyCode(coupon.codigo)}
                        aria-label={`Copiar código ${coupon.codigo}`}
                      >
                        <Copy size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${styles[`status_${coupon.publication_status}`]}`}
                    >
                      <StatusIcon size={12} aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>

                  <div className={styles.discountBlock}>
                    <strong>{formatDiscount(coupon)}</strong>
                    <span>
                      {coupon.desconto_tipo === "PERCENTUAL"
                        ? "desconto percentual"
                        : "desconto fixo"}
                    </span>
                  </div>

                  <div className={styles.typeBadge}>
                    {coupon.tipo === "PLANO_PRO" ? (
                      <ShieldAlert size={14} aria-hidden="true" />
                    ) : (
                      <Coins size={14} aria-hidden="true" />
                    )}
                    {coupon.tipo === "PLANO_PRO"
                      ? "Planos START e PRO"
                      : "Compra de Juris"}
                  </div>
                </div>

                {coupon.description && (
                  <p className={styles.couponDescription}>{coupon.description}</p>
                )}

                <div className={styles.metricsGrid}>
                  <div>
                    <ShoppingCart size={14} aria-hidden="true" />
                    <span><strong>{coupon.total_usos}</strong> uso(s)</span>
                  </div>
                  <div>
                    <Users size={14} aria-hidden="true" />
                    <span><strong>{coupon.usuarios_unicos}</strong> usuário(s)</span>
                  </div>
                  <div>
                    <TimerReset size={14} aria-hidden="true" />
                    <span><strong>{coupon.reservas_ativas}</strong> reserva(s)</span>
                  </div>
                  <div>
                    <Gauge size={14} aria-hidden="true" />
                    <span><strong>{coupon.limite_por_usuario}</strong> por usuário</span>
                  </div>
                </div>

                {progress !== null && (
                  <div className={styles.progressBlock}>
                    <div>
                      <span>Consumo total</span>
                      <strong>{coupon.total_usos}/{coupon.limite_total}</strong>
                    </div>
                    <span className={styles.progressTrack}>
                      <span style={{ width: `${progress}%` }} />
                    </span>
                  </div>
                )}

                <dl className={styles.couponMeta}>
                  <div>
                    <dt>Início</dt>
                    <dd>{formatDateTime(coupon.starts_at)}</dd>
                  </div>
                  <div>
                    <dt>Encerramento</dt>
                    <dd>{formatDateTime(coupon.expira_em)}</dd>
                  </div>
                  <div>
                    <dt>Stripe</dt>
                    <dd>{coupon.stripe_coupon_id || "Sem vínculo"}</dd>
                  </div>
                </dl>

                {archived && coupon.archive_reason && (
                  <div className={styles.archiveNotice}>
                    <Archive size={15} aria-hidden="true" />
                    <div>
                      <strong>Motivo do arquivamento</strong>
                      <span>{coupon.archive_reason}</span>
                    </div>
                  </div>
                )}

                <div className={styles.cardActions}>
                  {!archived && (
                    <>
                      <button
                        type="button"
                        className={styles.visibilityButton}
                        onClick={() => coupons.toggleCoupon(coupon)}
                        disabled={busy}
                      >
                        {coupon.ativo ? (
                          <EyeOff size={14} aria-hidden="true" />
                        ) : (
                          <Eye size={14} aria-hidden="true" />
                        )}
                        {coupon.ativo ? "Pausar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => coupons.openEdit(coupon)}
                        disabled={busy}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.archiveButton}
                        onClick={() => coupons.openArchive(coupon)}
                        disabled={busy}
                      >
                        <Archive size={14} aria-hidden="true" />
                        Arquivar
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

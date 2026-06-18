"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BellRing,
  Building2,
  CheckCircle2,
  Crown,
  FileSignature,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Settings,
  ShieldOff,
  UserRoundX,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import styles from "./AssinaturaAccountsAdmin.module.css";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const PLAN_LABELS = {
  FREE: "Gratuito",
  ESSENTIAL: "Essencial",
  PROFESSIONAL: "Profissional",
  BUSINESS: "Negócios",
  UNLIMITED: "Ilimitado",
};

const PLAN_TONES = {
  FREE: "muted",
  ESSENTIAL: "success",
  PROFESSIONAL: "indigo",
  BUSINESS: "gold",
  UNLIMITED: "warning",
};

const STATUS_LABELS = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CLOSED: "Encerrado",
};

const STATUS_TONES = {
  ACTIVE: "success",
  SUSPENDED: "danger",
  CLOSED: "muted",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function formatCurrency(cents) {
  if (!cents) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function UsageBar({ used, limit, label }) {
  if (limit === null || limit === undefined) {
    return (
      <div className={styles.usageCell}>
        <span className={styles.usageLabel}>
          <span>{label}</span>
          <span>{used} / ∞</span>
        </span>
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className={styles.usageCell}>
      <span className={styles.usageLabel}>
        <span>{label}</span>
        <span>
          {used}/{limit}
        </span>
      </span>
      <div className={styles.usageBar}>
        <div
          className={styles.usageFill}
          style={{ width: `${pct}%` }}
          data-danger={pct >= 85 ? "true" : "false"}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status, tone }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${tone}`]}`}>
      {status}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AccountModal
// ──────────────────────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { code: "FREE", label: "Gratuito — 3 docs/mês" },
  { code: "ESSENTIAL", label: "Essencial — 10 docs/mês" },
  { code: "PROFESSIONAL", label: "Profissional — 50 docs/mês" },
  { code: "BUSINESS", label: "Negócios — 100 docs/mês" },
  { code: "UNLIMITED", label: "Ilimitado — sem limites" },
];

function AccountModal({ account, busyId, onClose, onAction }) {
  const [selectedPlan, setSelectedPlan] = useState(account?.plan_code || "FREE");

  useEffect(() => {
    if (account) setSelectedPlan(account.plan_code || "FREE");
  }, [account]);

  if (!account) return null;

  const busy = busyId === account.user_id;
  const isActive = account.account_status === "ACTIVE";
  const orgActive = account.org_status === "ACTIVE";

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Gerenciar conta de ${account.full_name}`}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalCard}>
        <header className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            <Settings size={18} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.modalEyebrow}>Módulo Assinatura</span>
            <h2>{account.full_name || account.email}</h2>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {/* Profile grid */}
          <dl className={styles.profileGrid}>
            <div className={styles.profileField}>
              <dt>E-mail</dt>
              <dd>{account.email}</dd>
            </div>
            <div className={styles.profileField}>
              <dt>Telefone</dt>
              <dd>{account.phone || "Não informado"}</dd>
            </div>
            <div className={styles.profileField}>
              <dt>Organização</dt>
              <dd>{account.org_name || "Sem organização"}</dd>
            </div>
            <div className={styles.profileField}>
              <dt>Slug</dt>
              <dd>{account.org_slug || "—"}</dd>
            </div>
            <div className={styles.profileField}>
              <dt>Status da conta</dt>
              <dd>
                <StatusBadge
                  status={STATUS_LABELS[account.account_status] || account.account_status}
                  tone={STATUS_TONES[account.account_status] || "muted"}
                />
              </dd>
            </div>
            <div className={styles.profileField}>
              <dt>Status da org</dt>
              <dd>
                {account.org_status ? (
                  <StatusBadge
                    status={STATUS_LABELS[account.org_status] || account.org_status}
                    tone={STATUS_TONES[account.org_status] || "muted"}
                  />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className={styles.profileField}>
              <dt>Plano atual</dt>
              <dd>
                <StatusBadge
                  status={PLAN_LABELS[account.plan_code] || account.plan_code}
                  tone={PLAN_TONES[account.plan_code] || "muted"}
                />
              </dd>
            </div>
            <div className={styles.profileField}>
              <dt>Valor do plano</dt>
              <dd>{formatCurrency(account.price_cents)}</dd>
            </div>
            <div className={styles.profileField}>
              <dt>Cadastro</dt>
              <dd>{formatDate(account.created_at)}</dd>
            </div>
            <div className={styles.profileField}>
              <dt>Período ativo</dt>
              <dd>
                {account.period_start
                  ? `${formatDate(account.period_start)} → ${formatDate(account.period_end)}`
                  : "—"}
              </dd>
            </div>
          </dl>

          {/* Usage summary */}
          <p style={{ marginBottom: 12 }}>
            <strong>Uso do período atual:</strong>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <UsageBar used={account.documents_used} limit={account.documents_limit} label="Documentos" />
            <UsageBar used={account.certificates_used} limit={account.certificates_limit} label="Certificados" />
            <UsageBar used={account.ai_generations_used} limit={null} label="Gerações IA" />
            <UsageBar used={account.extrajudicial_notifications_used} limit={null} label="Notificações Ext." />
          </div>

          <hr className={styles.divider} />

          {/* Change plan */}
          {account.org_id && (
            <>
              <label className={styles.planSelectLabel}>
                <span>Alterar plano da organização:</span>
                <select
                  className={styles.planSelect}
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                >
                  {PLAN_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.modalNotice}>
                <AlertTriangle size={14} aria-hidden="true" />
                Alterar o plano aqui não cancela cobranças externas. Garanta que
                a alteração corresponda ao status da assinatura no gateway de
                pagamento.
              </div>
            </>
          )}
        </div>

        <footer className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
          >
            Fechar
          </button>

          {account.org_id && selectedPlan !== account.plan_code && (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy}
              onClick={() =>
                onAction(account, "CHANGE_PLAN", { plan_code: selectedPlan })
              }
            >
              <Crown size={14} aria-hidden="true" />
              Alterar para {PLAN_LABELS[selectedPlan] || selectedPlan}
            </button>
          )}

          {account.org_id &&
            (orgActive ? (
              <button
                type="button"
                className={styles.dangerButton}
                disabled={busy}
                onClick={() => onAction(account, "SUSPEND_ORG")}
              >
                <ShieldOff size={14} aria-hidden="true" />
                Suspender organização
              </button>
            ) : (
              <button
                type="button"
                className={styles.goldButton}
                disabled={busy}
                onClick={() => onAction(account, "ACTIVATE_ORG")}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                Reativar organização
              </button>
            ))}

          {isActive ? (
            <button
              type="button"
              className={styles.dangerButton}
              disabled={busy}
              onClick={() => onAction(account, "SUSPEND_ACCOUNT")}
            >
              <ShieldOff size={14} aria-hidden="true" />
              Suspender conta
            </button>
          ) : (
            account.account_status !== "CLOSED" && (
              <button
                type="button"
                className={styles.goldButton}
                disabled={busy}
                onClick={() => onAction(account, "ACTIVATE_ACCOUNT")}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                Reativar conta
              </button>
            )
          )}
        </footer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

export default function AdminAssinaturaAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/assinatura-accounts", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || "Não foi possível carregar as contas.",
        );
      }

      setAccounts(payload.data || []);
    } catch (err) {
      console.error("[Admin/AssinaturaAccounts] Erro ao carregar:", err);
      setLoadError(err.message || "Erro ao carregar contas.");
      toast.error("Erro ao carregar contas de assinatura.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();

    return accounts.filter((acc) => {
      if (term) {
        const searchable =
          `${acc.full_name || ""} ${acc.email || ""} ${acc.phone || ""} ${acc.org_name || ""} ${acc.org_slug || ""}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      if (planFilter !== "ALL" && acc.plan_code !== planFilter) return false;
      if (statusFilter !== "ALL" && acc.account_status !== statusFilter) return false;

      if (dateFilter !== "ALL") {
        const createdAt = new Date(acc.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;
        const diffDays = Math.floor((now - createdAt) / 86_400_000);
        if (dateFilter === "TODAY" && createdAt.toDateString() !== now.toDateString()) return false;
        if (dateFilter === "7DAYS" && diffDays > 7) return false;
        if (dateFilter === "30DAYS" && diffDays > 30) return false;
      }

      return true;
    });
  }, [accounts, search, planFilter, statusFilter, dateFilter]);

  // ── Summary ────────────────────────────────────────────────────────────────

  const summary = useMemo(() => ({
    total: accounts.length,
    visible: filtered.length,
    active: accounts.filter((a) => a.account_status === "ACTIVE").length,
    suspended: accounts.filter((a) => a.account_status === "SUSPENDED").length,
    paid: accounts.filter((a) => a.plan_code !== "FREE").length,
    free: accounts.filter((a) => a.plan_code === "FREE").length,
    unlimited: accounts.filter((a) => a.plan_code === "UNLIMITED").length,
  }), [accounts, filtered.length]);

  const summaryCards = [
    { key: "total", label: "Total de contas", icon: Users, filter: null },
    { key: "active", label: "Contas ativas", icon: BadgeCheck, filter: "ACTIVE" },
    { key: "suspended", label: "Suspensas", icon: UserRoundX, filter: "SUSPENDED" },
    { key: "paid", label: "Planos pagos", icon: Crown, filter: null },
    { key: "free", label: "Plano gratuito", icon: Zap, filter: null },
  ];

  // ── Actions ────────────────────────────────────────────────────────────────

  const performAction = useCallback(
    async (account, action, value = null) => {
      setBusyId(account.user_id);

      try {
        const response = await fetch("/api/admin/assinatura-accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: account.user_id,
            orgId: account.org_id,
            action,
            value,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Falha ao executar ação.");
        }

        toast.success(data.message || "Ação executada com sucesso.");
        setModal(null);
        await loadAccounts();
      } catch (err) {
        console.error("[Admin/AssinaturaAccounts] Erro na ação:", err);
        toast.error(err.message || "Erro ao executar ação.");
      } finally {
        setBusyId(null);
      }
    },
    [loadAccounts],
  );

  const clearFilters = () => {
    setSearch("");
    setPlanFilter("ALL");
    setStatusFilter("ALL");
    setDateFilter("ALL");
  };

  const hasFilters =
    search.trim() || planFilter !== "ALL" || statusFilter !== "ALL" || dateFilter !== "ALL";

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando contas de assinatura</h1>
        <p>Preparando os dados do módulo de assinatura eletrônica.</p>
      </main>
    );
  }

  if (loadError && accounts.length === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={26} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar as contas</h1>
        <p>{loadError}</p>
        <button
          type="button"
          className={styles.goldButton}
          onClick={loadAccounts}
          style={{ marginTop: 20 }}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar ao painel administrativo
        </Link>

        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon} aria-hidden="true">
              <FileSignature size={22} />
            </span>
            <div>
              <span className={styles.eyebrow}>Módulo Assinatura Eletrônica</span>
              <h1>Contas de Assinatura</h1>
              <p>
                Gerencie cadastros, planos, limites e status das organizações
                ativas no Social Jurídico Assinatura.
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={loadAccounts}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* ── Warning banner ── */}
      {loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Dados parcialmente indisponíveis</strong>
            <p>{loadError}</p>
          </div>
          <button type="button" onClick={loadAccounts}>
            Atualizar
          </button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <section
        className={styles.summaryGrid}
        aria-label="Resumo de contas de assinatura"
      >
        {summaryCards.map(({ key, label, icon: Icon, filter }) => (
          <button
            key={key}
            type="button"
            className={styles.summaryCard}
            onClick={() => {
              clearFilters();
              if (filter) setStatusFilter(filter);
            }}
            title={`Filtrar por: ${label}`}
          >
            <span className={styles.summaryIcon}>
              <Icon size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{summary[key] ?? 0}</strong>
              <span>{label}</span>
            </div>
          </button>
        ))}
      </section>

      {/* ── Filters ── */}
      <div className={styles.filters} role="search" aria-label="Filtros de contas">
        <div className={styles.searchField}>
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome, e-mail, telefone ou organização…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar conta"
            id="sig-accounts-search"
          />
        </div>

        <div className={styles.filterField}>
          <Crown size={14} aria-hidden="true" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            aria-label="Filtrar por plano"
            id="sig-accounts-plan"
          >
            <option value="ALL">Todos os planos</option>
            <option value="FREE">Gratuito</option>
            <option value="ESSENTIAL">Essencial</option>
            <option value="PROFESSIONAL">Profissional</option>
            <option value="BUSINESS">Negócios</option>
            <option value="UNLIMITED">Ilimitado</option>
          </select>
        </div>

        <div className={styles.filterField}>
          <Filter size={14} aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status"
            id="sig-accounts-status"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="SUSPENDED">Suspensas</option>
            <option value="CLOSED">Encerradas</option>
          </select>
        </div>

        <div className={styles.filterField}>
          <Filter size={14} aria-hidden="true" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filtrar por data de cadastro"
            id="sig-accounts-date"
          >
            <option value="ALL">Qualquer data</option>
            <option value="TODAY">Hoje</option>
            <option value="7DAYS">Últimos 7 dias</option>
            <option value="30DAYS">Últimos 30 dias</option>
          </select>
        </div>

        <span className={styles.resultCount}>
          {filtered.length} de {accounts.length}
        </span>

        {hasFilters && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
            aria-label="Limpar filtros"
          >
            <X size={13} aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <section className={styles.listSection} aria-label="Lista de contas de assinatura">
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <Users size={26} aria-hidden="true" />
            </span>
            <h2>Nenhuma conta encontrada</h2>
            <p>
              {hasFilters
                ? "Ajuste os filtros para ver mais resultados."
                : "Ainda não há cadastros no módulo de assinatura."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Contato</th>
                    <th>Organização</th>
                    <th>Plano</th>
                    <th>Status</th>
                    <th>Docs usados</th>
                    <th>Notif. ext.</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((acc) => (
                    <tr key={acc.user_id}>
                      <td>
                        <div className={styles.userIdentity}>
                          <span className={styles.userAvatar} aria-hidden="true">
                            {(acc.full_name || acc.email || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <div>
                            <strong>{acc.full_name || "Usuário sem nome"}</strong>
                            <a href={`mailto:${acc.email}`}>
                              <Mail size={12} aria-hidden="true" />
                              {acc.email}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td>
                        {acc.phone ? (
                          <a
                            className={`${styles.userIdentity} ${styles.muted}`}
                            href={`tel:${acc.phone}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Phone size={12} aria-hidden="true" />
                            {acc.phone}
                          </a>
                        ) : (
                          <span className={styles.muted}>Não informado</span>
                        )}
                      </td>
                      <td>
                        {acc.org_name ? (
                          <div
                            style={{ display: "flex", flexDirection: "column", gap: 3 }}
                          >
                            <span style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.72rem" }}>
                              <Building2
                                size={12}
                                style={{ marginRight: 4, verticalAlign: "middle" }}
                              />
                              {acc.org_name}
                            </span>
                            <span className={styles.muted} style={{ fontSize: "0.61rem" }}>
                              /{acc.org_slug}
                            </span>
                          </div>
                        ) : (
                          <span className={styles.muted}>Sem organização</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={PLAN_LABELS[acc.plan_code] || acc.plan_code}
                          tone={PLAN_TONES[acc.plan_code] || "muted"}
                        />
                      </td>
                      <td>
                        <StatusBadge
                          status={STATUS_LABELS[acc.account_status] || acc.account_status}
                          tone={STATUS_TONES[acc.account_status] || "muted"}
                        />
                      </td>
                      <td>
                        <UsageBar
                          used={acc.documents_used}
                          limit={acc.documents_limit}
                          label="docs"
                        />
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              acc.extrajudicial_notifications_used > 0
                                ? "#a5b4fc"
                                : "rgba(255,255,255,0.28)",
                            fontSize: "0.72rem",
                          }}
                        >
                          <BellRing size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                          {acc.extrajudicial_notifications_used}
                        </span>
                      </td>
                      <td>{formatDate(acc.created_at)}</td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.manageButton}
                            onClick={() => setModal(acc)}
                            disabled={busyId === acc.user_id}
                          >
                            <Settings size={13} aria-hidden="true" />
                            Gerenciar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className={styles.mobileList}>
              {filtered.map((acc) => (
                <article key={acc.user_id} className={styles.mobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <div className={styles.userIdentity}>
                      <span className={styles.userAvatar} aria-hidden="true">
                        {(acc.full_name || acc.email || "U")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{acc.full_name || "Usuário sem nome"}</strong>
                        <span>{acc.email}</span>
                      </div>
                    </div>
                    <StatusBadge
                      status={PLAN_LABELS[acc.plan_code] || acc.plan_code}
                      tone={PLAN_TONES[acc.plan_code] || "muted"}
                    />
                  </header>

                  <div className={styles.mobileBadges}>
                    <StatusBadge
                      status={STATUS_LABELS[acc.account_status] || acc.account_status}
                      tone={STATUS_TONES[acc.account_status] || "muted"}
                    />
                  </div>

                  <dl className={styles.mobileDetails}>
                    <div>
                      <dt>Organização</dt>
                      <dd>{acc.org_name || "—"}</dd>
                    </div>
                    <div>
                      <dt>Docs usados</dt>
                      <dd>
                        {acc.documents_used}/{acc.documents_limit ?? "∞"}
                      </dd>
                    </div>
                    <div>
                      <dt>Notif. ext.</dt>
                      <dd>{acc.extrajudicial_notifications_used}</dd>
                    </div>
                    <div>
                      <dt>Cadastro</dt>
                      <dd>{formatDate(acc.created_at)}</dd>
                    </div>
                  </dl>

                  <div className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.manageButton}
                      onClick={() => setModal(acc)}
                      disabled={busyId === acc.user_id}
                    >
                      <Settings size={13} aria-hidden="true" />
                      Gerenciar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Modal ── */}
      {modal && (
        <AccountModal
          account={modal}
          busyId={busyId}
          onClose={() => setModal(null)}
          onAction={performAction}
        />
      )}
    </main>
  );
}

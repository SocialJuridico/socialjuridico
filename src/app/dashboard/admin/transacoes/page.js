"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileDown,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  WalletCards,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import styles from "./TransacoesAdmin.module.css";

const PRODUCT_LABELS = {
  JURIS: "Pacote de Juris",
  START: "Plano START",
  PRO: "Plano PRO",
  ADDON: "Expansão",
  OTHER: "Outro produto",
};

const STATUS_LABELS = {
  CONFIRMED: "Confirmada",
  MANUAL: "Crédito manual",
  REVIEW: "Revisão necessária",
  FAILED: "Falhou",
  PENDING: "Pendente",
};

const PROVIDER_LABELS = {
  STRIPE_CHECKOUT: "Stripe Checkout",
  STRIPE_PAYMENT_INTENT: "Stripe PaymentIntent",
  STRIPE_SETUP_INTENT: "Stripe SetupIntent",
  MANUAL: "Operação manual",
  UNKNOWN: "Origem não identificada",
};

const EMPTY_SUMMARY = {
  totalRecords: 0,
  confirmedCount: 0,
  confirmedGross: 0,
  reviewCount: 0,
  failedCount: 0,
  pendingCount: 0,
  manualCount: 0,
  alertCount: 0,
  uniqueCustomers: 0,
  averageTicket: 0,
  byProduct: {},
};

function formatCurrency(value, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function calculateSummary(items) {
  const summary = items.reduce(
    (current, transaction) => {
      current.totalRecords += 1;

      if (transaction.financialStatus === "CONFIRMED") {
        current.confirmedCount += 1;
        if (transaction.amount > 0) {
          current.confirmedGross += transaction.amount;
          current.positiveConfirmedCount += 1;
        }
      }

      if (transaction.financialStatus === "REVIEW") current.reviewCount += 1;
      if (transaction.financialStatus === "FAILED") current.failedCount += 1;
      if (transaction.financialStatus === "PENDING") current.pendingCount += 1;
      if (transaction.financialStatus === "MANUAL") current.manualCount += 1;
      if (transaction.alert) current.alertCount += 1;
      if (transaction.lawyerId) current.customerIds.add(transaction.lawyerId);

      current.byProduct[transaction.product] =
        (current.byProduct[transaction.product] || 0) + 1;

      return current;
    },
    {
      ...EMPTY_SUMMARY,
      positiveConfirmedCount: 0,
      customerIds: new Set(),
      byProduct: {},
    },
  );

  return {
    totalRecords: summary.totalRecords,
    confirmedCount: summary.confirmedCount,
    confirmedGross: Number(summary.confirmedGross.toFixed(2)),
    reviewCount: summary.reviewCount,
    failedCount: summary.failedCount,
    pendingCount: summary.pendingCount,
    manualCount: summary.manualCount,
    alertCount: summary.alertCount,
    uniqueCustomers: summary.customerIds.size,
    averageTicket: summary.positiveConfirmedCount
      ? Number(
          (
            summary.confirmedGross / summary.positiveConfirmedCount
          ).toFixed(2),
        )
      : 0,
    byProduct: summary.byProduct,
  };
}

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

export default function AdminTransacoesPage() {
  const [transactions, setTransactions] = useState([]);
  const [serverSummary, setServerSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [alertsOnly, setAlertsOnly] = useState(false);

  const loadTransactions = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      const response = await fetch("/api/admin/transacoes", {
        cache: "no-store",
      });
      const payload = await readJson(response);

      setTransactions(payload.data?.transactions || []);
      setServerSummary(payload.data?.summary || EMPTY_SUMMARY);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar a governança financeira.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const days = periodFilter === "ALL" ? null : Number(periodFilter);
    const minimumDate = days
      ? Date.now() - days * 24 * 60 * 60 * 1000
      : null;

    return transactions.filter((transaction) => {
      if (
        productFilter !== "ALL" &&
        transaction.product !== productFilter
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        transaction.financialStatus !== statusFilter
      ) {
        return false;
      }

      if (
        providerFilter !== "ALL" &&
        transaction.provider !== providerFilter
      ) {
        return false;
      }

      if (alertsOnly && !transaction.alert) return false;

      if (minimumDate) {
        const createdAt = new Date(transaction.createdAt || 0).getTime();
        if (!createdAt || createdAt < minimumDate) return false;
      }

      if (!term) return true;

      return [
        transaction.customer?.name,
        transaction.customer?.maskedEmail,
        transaction.providerReference,
        transaction.couponCode,
        PRODUCT_LABELS[transaction.product],
        STATUS_LABELS[transaction.financialStatus],
      ].some((value) =>
        String(value || "").toLowerCase().includes(term),
      );
    });
  }, [
    alertsOnly,
    periodFilter,
    productFilter,
    providerFilter,
    search,
    statusFilter,
    transactions,
  ]);

  const visibleSummary = useMemo(
    () => calculateSummary(filteredTransactions),
    [filteredTransactions],
  );

  async function syncStripe() {
    setSyncing(true);
    const toastId = toast.loading("Conciliando lançamentos com o Stripe...");

    try {
      const response = await fetch("/api/admin/transacoes/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await readJson(response);
      const result = payload.data || {};

      await loadTransactions({ silent: true });

      const reviewText = result.review
        ? ` ${result.review} item(ns) precisam de revisão.`
        : "";

      toast.success(
        `${result.imported || 0} lançamento(s) importado(s).${reviewText}`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao conciliar com o Stripe.",
        { id: toastId },
      );
    } finally {
      setSyncing(false);
    }
  }

  function exportPdf() {
    if (!filteredTransactions.length) {
      toast.error("Não há transações visíveis para exportar.");
      return;
    }

    const document = new jsPDF({ orientation: "landscape" });

    document.setFontSize(18);
    document.text("Relatório de Governança Financeira", 14, 18);
    document.setFontSize(9);
    document.text(
      `Social Jurídico · gerado em ${new Date().toLocaleString("pt-BR")}`,
      14,
      25,
    );
    document.text(
      `Receita confirmada: ${formatCurrency(
        visibleSummary.confirmedGross,
      )} · Registros: ${visibleSummary.totalRecords} · Revisões: ${
        visibleSummary.reviewCount
      } · Falhas: ${visibleSummary.failedCount}`,
      14,
      31,
    );
    document.text(
      "Relatório administrativo. E-mails e referências do provedor permanecem mascarados.",
      14,
      37,
    );

    autoTable(document, {
      startY: 43,
      head: [
        [
          "Data",
          "Comprador",
          "Produto",
          "Origem",
          "Valor",
          "Status",
          "Cupom",
          "Referência",
        ],
      ],
      body: filteredTransactions.map((transaction) => [
        formatDate(transaction.createdAt),
        `${transaction.customer?.name || "N/A"}\n${
          transaction.customer?.maskedEmail || ""
        }`,
        PRODUCT_LABELS[transaction.product] || "Outro",
        PROVIDER_LABELS[transaction.provider] || "Não identificada",
        formatCurrency(transaction.amount, transaction.currency),
        STATUS_LABELS[transaction.financialStatus] || "Indefinido",
        transaction.couponCode || "-",
        transaction.providerReference,
      ]),
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2.2 },
      headStyles: { fillColor: [28, 28, 32] },
    });

    document.save(
      `governanca-financeira-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
    toast.success("Relatório financeiro gerado.");
  }

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle className={styles.spinning} size={30} />
        <h1>Carregando governança financeira</h1>
        <p>Classificando receita, pendências e riscos operacionais.</p>
      </main>
    );
  }

  if (loadError && transactions.length === 0) {
    return (
      <main className={styles.statePage}>
        <AlertTriangle size={30} />
        <h1>Não foi possível carregar as transações</h1>
        <p>{loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => loadTransactions()}
        >
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <header className={styles.header}>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} />
            Voltar ao dashboard
          </Link>

          <div className={styles.headerContent}>
            <div>
              <span className={styles.eyebrow}>Governança financeira</span>
              <h1>
                <CreditCard size={25} />
                Transações e conciliação
              </h1>
              <p>
                Receita confirmada, créditos manuais, falhas de processamento e
                divergências com o provedor em um único painel.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => loadTransactions({ silent: true })}
                disabled={refreshing || syncing}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? styles.spinning : undefined}
                />
                Atualizar
              </button>
              <button
                type="button"
                className={styles.syncButton}
                onClick={syncStripe}
                disabled={syncing || refreshing}
              >
                <RefreshCw
                  size={16}
                  className={syncing ? styles.spinning : undefined}
                />
                {syncing ? "Conciliando..." : "Conciliar Stripe"}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={exportPdf}
              >
                <FileDown size={16} />
                Exportar PDF
              </button>
            </div>
          </div>
        </header>

        {loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Os dados podem estar desatualizados</strong>
              <p>{loadError}</p>
            </div>
          </div>
        )}

        {serverSummary.alertCount > 0 && (
          <div className={styles.riskBanner} role="alert">
            <ShieldAlert size={20} />
            <div>
              <strong>
                {serverSummary.alertCount} lançamento(s) exigem atenção
              </strong>
              <p>
                Itens em revisão, falhas de entrega ou registros incompatíveis
                com uma cobrança confirmada não entram automaticamente na receita.
              </p>
            </div>
            <button type="button" onClick={() => setAlertsOnly(true)}>
              Ver alertas
            </button>
          </div>
        )}

        <section className={styles.statsGrid} aria-label="Resumo financeiro">
          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="success">
              <CircleDollarSign size={21} />
            </span>
            <div>
              <span>Receita confirmada</span>
              <strong>{formatCurrency(visibleSummary.confirmedGross)}</strong>
              <small>{visibleSummary.confirmedCount} transações confirmadas</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="neutral">
              <BadgeDollarSign size={21} />
            </span>
            <div>
              <span>Ticket médio</span>
              <strong>{formatCurrency(visibleSummary.averageTicket)}</strong>
              <small>{visibleSummary.uniqueCustomers} compradores únicos</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="warning">
              <ShieldAlert size={21} />
            </span>
            <div>
              <span>Revisão financeira</span>
              <strong>{visibleSummary.reviewCount}</strong>
              <small>{visibleSummary.alertCount} alertas operacionais</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="danger">
              <AlertTriangle size={21} />
            </span>
            <div>
              <span>Falhas</span>
              <strong>{visibleSummary.failedCount}</strong>
              <small>{visibleSummary.pendingCount} ainda pendentes</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="manual">
              <WalletCards size={21} />
            </span>
            <div>
              <span>Créditos manuais</span>
              <strong>{visibleSummary.manualCount}</strong>
              <small>Não contabilizados como receita</small>
            </div>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros financeiros">
          <div className={styles.searchWrap}>
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar comprador, cupom ou referência mascarada"
            />
          </div>

          <label className={styles.selectWrap}>
            <Filter size={15} />
            <select
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              aria-label="Filtrar por produto"
            >
              <option value="ALL">Todos os produtos</option>
              <option value="JURIS">Pacotes de Juris</option>
              <option value="START">Plano START</option>
              <option value="PRO">Plano PRO</option>
              <option value="ADDON">Expansões</option>
              <option value="OTHER">Outros</option>
            </select>
          </label>

          <label className={styles.selectWrap}>
            <Filter size={15} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrar por status"
            >
              <option value="ALL">Todos os status</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="MANUAL">Créditos manuais</option>
              <option value="REVIEW">Em revisão</option>
              <option value="FAILED">Falhas</option>
              <option value="PENDING">Pendentes</option>
            </select>
          </label>

          <label className={styles.selectWrap}>
            <Filter size={15} />
            <select
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              aria-label="Filtrar por origem"
            >
              <option value="ALL">Todas as origens</option>
              <option value="STRIPE_CHECKOUT">Stripe Checkout</option>
              <option value="STRIPE_PAYMENT_INTENT">PaymentIntent</option>
              <option value="STRIPE_SETUP_INTENT">SetupIntent</option>
              <option value="MANUAL">Manual</option>
              <option value="UNKNOWN">Não identificada</option>
            </select>
          </label>

          <label className={styles.selectWrap}>
            <Filter size={15} />
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              aria-label="Filtrar por período"
            >
              <option value="ALL">Todo o período</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Últimos 12 meses</option>
            </select>
          </label>

          <label className={styles.alertToggle}>
            <input
              type="checkbox"
              checked={alertsOnly}
              onChange={(event) => setAlertsOnly(event.target.checked)}
            />
            Somente alertas
          </label>
        </section>

        <div className={styles.resultBar}>
          <span>
            {filteredTransactions.length} de {transactions.length} registros
          </span>
          <span>
            START: {visibleSummary.byProduct.START || 0} · PRO:{" "}
            {visibleSummary.byProduct.PRO || 0} · Juris:{" "}
            {visibleSummary.byProduct.JURIS || 0}
          </span>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Comprador</th>
                  <th>Produto</th>
                  <th>Origem</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Cupom</th>
                  <th>Referência</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length ? (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      data-alert={transaction.alert ? "true" : "false"}
                    >
                      <td>
                        <time dateTime={transaction.createdAt || undefined}>
                          {formatDate(transaction.createdAt)}
                        </time>
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.avatar}>
                            <UserRound size={15} />
                          </span>
                          <div>
                            <strong>{transaction.customer?.name}</strong>
                            <small>{transaction.customer?.maskedEmail}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={styles.productBadge}
                          data-product={transaction.product}
                        >
                          {PRODUCT_LABELS[transaction.product] || "Outro"}
                        </span>
                        {transaction.jurisAmount > 0 && (
                          <small className={styles.benefitText}>
                            {transaction.jurisAmount} Juris associados
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={styles.providerLabel}>
                          {PROVIDER_LABELS[transaction.provider] ||
                            "Não identificada"}
                        </span>
                      </td>
                      <td>
                        <strong className={styles.amount}>
                          {formatCurrency(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </strong>
                      </td>
                      <td>
                        <div className={styles.statusCell}>
                          <span
                            className={styles.statusBadge}
                            data-status={transaction.financialStatus}
                            title={transaction.rawStatus}
                          >
                            {transaction.financialStatus === "CONFIRMED" && (
                              <CheckCircle2 size={13} />
                            )}
                            {transaction.financialStatus !== "CONFIRMED" && (
                              <AlertTriangle size={13} />
                            )}
                            {STATUS_LABELS[transaction.financialStatus] ||
                              "Indefinido"}
                          </span>
                          {transaction.alert && (
                            <small
                              className={styles.alertText}
                              title={transaction.alert.recommendation}
                            >
                              {transaction.alert.label}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        {transaction.couponCode ? (
                          <span className={styles.couponBadge}>
                            {transaction.couponCode}
                          </span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        <code className={styles.reference}>
                          {transaction.providerReference}
                        </code>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      <CreditCard size={25} />
                      <strong>Nenhuma transação encontrada</strong>
                      <span>Revise os filtros aplicados ao painel.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

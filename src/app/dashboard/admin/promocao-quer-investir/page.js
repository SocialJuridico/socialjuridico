"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  HandCoins,
  LoaderCircle,
  RefreshCw,
  Repeat,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// Mesmo visual da Gestão financeira.
import styles from "../transacoes/TransacoesAdmin.module.css";

const STATUS = {
  PAID: { label: "Pagamento confirmado", tone: "CONFIRMED" },
  PENDING: { label: "Aguardando Pix", tone: "PENDING" },
  EXPIRED: { label: "Pix expirado", tone: "FAILED" },
  CANCELLED: { label: "Cancelado", tone: "FAILED" },
};

const money = (cents) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);

function formatDate(value) {
  const date = new Date(value || 0);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

async function fetchPromo() {
  const response = await fetch("/api/admin/promocoes/quer-investir-quanto", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result;
}

export default function PromoQuerInvestirAdminPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PAID");

  const apply = useCallback((promise) =>
    promise
      .then((result) => {
        setItems(result.items || []);
        setSummary(result.summary || null);
        setLoadError("");
      })
      .catch((error) => setLoadError(error.message || "Não foi possível carregar a promoção."))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      }), []);

  function load() {
    setRefreshing(true);
    void apply(fetchPromo());
  }

  useEffect(() => { void apply(fetchPromo()); }, [apply]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!term) return true;
      return [item.name, item.email, item.oab, item.orderId, item.paymentReference]
        .some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [items, search, statusFilter]);

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle className={styles.spinning} size={30} />
        <h1>Carregando promoção</h1>
        <p>Buscando compras e confirmações de pagamento.</p>
      </main>
    );
  }

  if (loadError && !items.length) {
    return (
      <main className={styles.statePage}>
        <AlertTriangle size={30} />
        <h1>Não foi possível carregar a promoção</h1>
        <p>{loadError}</p>
        <button type="button" className={styles.secondaryButton} onClick={load}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <header className={styles.header}>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} /> Voltar ao dashboard
          </Link>
          <div className={styles.headerContent}>
            <div>
              <span className={styles.eyebrow}>Promoção</span>
              <h1><HandCoins size={25} /> Quer Investir Quanto?</h1>
              <p>
                Advogados que pagaram o valor que quiseram via Pix (Mercado Pago) pelo Plano PRO de 30 dias.
                Até 3 meses por advogado; do 4º mês em diante, valor cheio.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.secondaryButton} onClick={load} disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? styles.spinning : undefined} /> Atualizar
              </button>
            </div>
          </div>
        </header>

        {loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div><strong>Os dados podem estar desatualizados</strong><p>{loadError}</p></div>
          </div>
        )}

        <section className={styles.statsGrid} aria-label="Resumo da promoção">
          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="success"><CircleDollarSign size={21} /></span>
            <div>
              <span>Arrecadado</span>
              <strong>{money(summary?.totalCents)}</strong>
              <small>{summary?.confirmedPayments || 0} pagamentos confirmados</small>
            </div>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="neutral"><Users size={21} /></span>
            <div>
              <span>Advogados na promoção</span>
              <strong>{summary?.buyers || 0}</strong>
              <small>com ao menos 1 pagamento confirmado</small>
            </div>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="manual"><Repeat size={21} /></span>
            <div>
              <span>Renovaram</span>
              <strong>{summary?.renewals || 0}</strong>
              <small>{summary?.completed || 0} já usaram os 3 meses</small>
            </div>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="warning"><BadgeDollarSign size={21} /></span>
            <div>
              <span>Valor médio</span>
              <strong>{money(summary?.averageCents)}</strong>
              <small>{summary?.pendingPayments || 0} Pix aguardando pagamento</small>
            </div>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros">
          <div className={styles.searchWrap}>
            <Search size={17} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar advogado, e-mail, OAB ou ID do pagamento" />
          </div>
          <label className={styles.selectWrap}>
            <Clock size={15} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Status do pagamento">
              <option value="PAID">Pagamentos confirmados</option>
              <option value="PENDING">Aguardando Pix</option>
              <option value="EXPIRED">Pix expirados</option>
              <option value="CANCELLED">Cancelados</option>
              <option value="ALL">Todas as tentativas</option>
            </select>
          </label>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Advogado</th>
                  <th>Mês</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                  <th>Confirmado em</th>
                  <th>Plano até</th>
                  <th>ID Mercado Pago</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map((item) => (
                  <tr key={item.id}>
                    <td><time dateTime={item.createdAt || undefined}>{formatDate(item.createdAt)}</time></td>
                    <td>
                      <div className={styles.customerCell}>
                        <span className={styles.avatar}><UserRound size={15} /></span>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.email}{item.oab ? ` · OAB ${item.oab}` : ""}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className={styles.productBadge} data-product="PRO">{item.purchaseNumber ? `${item.purchaseNumber}º mês` : "—"}</span></td>
                    <td><strong className={styles.amount}>{money(item.amountCents)}</strong></td>
                    <td>
                      <span className={styles.statusBadge} data-status={STATUS[item.status]?.tone}>
                        {item.status === "PAID" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {STATUS[item.status]?.label || item.status}
                      </span>
                    </td>
                    <td>{item.paidAt ? formatDate(item.paidAt) : <span className={styles.muted}>—</span>}</td>
                    <td>{item.status === "PAID" && item.planType === "PRO" ? formatDate(item.planExpiresAt) : <span className={styles.muted}>—</span>}</td>
                    <td><code className={styles.reference}>{item.orderId || "—"}</code></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      <HandCoins size={25} />
                      <strong>Nenhuma compra encontrada</strong>
                      <span>Revise os filtros ou aguarde as primeiras adesões.</span>
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

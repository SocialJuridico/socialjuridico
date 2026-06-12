"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Coins,
  FileDown,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useMemo, useState } from "react";

import CommissionModal from "./CommissionModal";
import GovernanceModal from "./GovernanceModal";
import {
  ELIGIBILITY_LABELS,
  PROVIDER_LABELS,
  REVIEW_STATUS_LABELS,
  RISK_LABELS,
  formatCurrency,
  formatDate,
} from "./config";
import { useAdminAffiliates } from "./useAdminAffiliates";
import styles from "./Afiliados.module.css";

const PLAN_LABELS = {
  FREE: "Plano gratuito",
  START: "Plano START",
  PRO: "Plano PRO",
};

function getFilteredSummary(referrals) {
  return referrals.reduce(
    (summary, referral) => {
      summary.total += 1;
      if (referral.eligibility.code === "ELIGIBLE") summary.eligible += 1;
      if (referral.eligibility.code === "REVIEW") summary.review += 1;
      if (referral.eligibility.code === "COMMISSIONED") {
        summary.commissioned += 1;
        summary.creditedJuris += Number(referral.commission.amount || 0);
      }
      if (referral.eligibility.alert) summary.alerts += 1;
      return summary;
    },
    {
      total: 0,
      eligible: 0,
      review: 0,
      commissioned: 0,
      creditedJuris: 0,
      alerts: 0,
    },
  );
}

export default function AdminAfiliadosPage() {
  const {
    referrals,
    summary,
    policy,
    schema,
    loading,
    refreshing,
    busyAction,
    loadError,
    loadAffiliates,
    mutate,
  } = useAdminAffiliates();

  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [commissionReferral, setCommissionReferral] = useState(null);
  const [governanceReferral, setGovernanceReferral] = useState(null);

  const filteredReferrals = useMemo(() => {
    const term = search.trim().toLowerCase();
    const days = periodFilter === "ALL" ? null : Number(periodFilter);
    const minimumDate = days
      ? Date.now() - days * 24 * 60 * 60 * 1000
      : null;

    return referrals.filter((referral) => {
      if (
        eligibilityFilter !== "ALL" &&
        referral.eligibility.code !== eligibilityFilter
      ) {
        return false;
      }

      if (planFilter !== "ALL" && referral.referred.planType !== planFilter) {
        return false;
      }

      if (alertsOnly && !referral.eligibility.alert) return false;

      if (minimumDate) {
        const createdAt = new Date(referral.createdAt || 0).getTime();
        if (!createdAt || createdAt < minimumDate) return false;
      }

      if (!term) return true;

      return [
        referral.referrer.name,
        referral.referrer.maskedEmail,
        referral.referred.name,
        referral.referred.maskedEmail,
        referral.eligibility.label,
        referral.referred.planType,
        referral.qualifyingPayment?.provider,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term),
      );
    });
  }, [
    alertsOnly,
    eligibilityFilter,
    periodFilter,
    planFilter,
    referrals,
    search,
  ]);

  const visibleSummary = useMemo(
    () => getFilteredSummary(filteredReferrals),
    [filteredReferrals],
  );

  async function confirmCommission(payload) {
    try {
      await mutate("CREDIT_COMMISSION", payload);
      setCommissionReferral(null);
    } catch {
      // O hook já apresentou a mensagem de erro.
    }
  }

  async function confirmGovernance(payload) {
    try {
      await mutate("UPDATE_GOVERNANCE", payload);
      setGovernanceReferral(null);
    } catch {
      // O hook já apresentou a mensagem de erro.
    }
  }

  function exportPdf() {
    if (!filteredReferrals.length) return;

    const document = new jsPDF({ orientation: "landscape" });

    document.setFontSize(18);
    document.text("Relatório de Governança de Afiliados", 14, 18);
    document.setFontSize(9);
    document.text(
      `Social Jurídico · gerado em ${new Date().toLocaleString("pt-BR")}`,
      14,
      25,
    );
    document.text(
      `Indicações: ${visibleSummary.total} · Elegíveis: ${visibleSummary.eligible} · Em revisão: ${visibleSummary.review} · Comissionadas: ${visibleSummary.commissioned} · Juris creditados: ${visibleSummary.creditedJuris}`,
      14,
      31,
    );
    document.text(
      "Relatório administrativo com e-mails mascarados e sem referências financeiras sensíveis.",
      14,
      37,
    );

    autoTable(document, {
      startY: 43,
      head: [
        [
          "Data",
          "Afiliado",
          "Indicado",
          "Perfil/Plano",
          "Elegibilidade",
          "Pagamento",
          "Comissão",
          "Risco",
        ],
      ],
      body: filteredReferrals.map((referral) => [
        formatDate(referral.createdAt),
        `${referral.referrer.name}\n${referral.referrer.maskedEmail}`,
        `${referral.referred.name}\n${referral.referred.maskedEmail}`,
        `${referral.referred.profileType} · ${PLAN_LABELS[referral.referred.planType] || referral.referred.planType}`,
        ELIGIBILITY_LABELS[referral.eligibility.code] ||
          referral.eligibility.label,
        referral.qualifyingPayment
          ? `${PROVIDER_LABELS[referral.qualifyingPayment.provider] || referral.qualifyingPayment.provider}\n${formatCurrency(
              referral.qualifyingPayment.amount,
              referral.qualifyingPayment.currency,
            )}`
          : "Não conciliado",
        referral.commission.status === "COMMISSIONED"
          ? `${referral.commission.amount} Juris`
          : "Pendente",
        `${RISK_LABELS[referral.governance.riskLevel] || referral.governance.riskLevel} · ${REVIEW_STATUS_LABELS[referral.governance.reviewStatus] || referral.governance.reviewStatus}`,
      ]),
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2.2 },
      headStyles: { fillColor: [28, 28, 32] },
    });

    document.save(
      `governanca-afiliados-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  }

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle size={30} className={styles.spinning} />
        <h1>Carregando programa de afiliados</h1>
        <p>Validando indicações, assinaturas e comissões em Juris.</p>
      </main>
    );
  }

  if (loadError && referrals.length === 0) {
    return (
      <main className={styles.statePage}>
        <AlertTriangle size={30} />
        <h1>Não foi possível carregar os afiliados</h1>
        <p>{loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => loadAffiliates()}
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
              <span className={styles.eyebrow}>Programa Indique e Ganhe</span>
              <h1>
                <Users size={25} />
                Afiliados e comissões
              </h1>
              <p>
                Acompanhe a jornada da indicação, valide a assinatura paga e
                liquide bonificações em Juris com rastreabilidade administrativa.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => loadAffiliates({ silent: true })}
                disabled={refreshing || Boolean(busyAction)}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? styles.spinning : undefined}
                />
                Atualizar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={exportPdf}
                disabled={!filteredReferrals.length}
              >
                <FileDown size={16} />
                Exportar PDF
              </button>
            </div>
          </div>
        </header>

        {!schema.governanceAvailable && (
          <div className={styles.migrationBanner} role="alert">
            <ShieldAlert size={20} />
            <div>
              <strong>Governança financeira ainda não habilitada</strong>
              <p>
                A listagem funciona em modo legado, mas créditos e classificações
                permanecem bloqueados até a migração SQL ser executada.
              </p>
            </div>
          </div>
        )}

        {loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Os dados podem estar desatualizados</strong>
              <p>{loadError}</p>
            </div>
          </div>
        )}

        <section className={styles.statsGrid} aria-label="Resumo de afiliados">
          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="neutral">
              <Users size={20} />
            </span>
            <div>
              <span>Indicações</span>
              <strong>{summary.totalReferrals}</strong>
              <small>{summary.uniqueAffiliates} afiliados únicos</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="success">
              <BadgeCheck size={20} />
            </span>
            <div>
              <span>Elegíveis</span>
              <strong>{summary.eligibleCount}</strong>
              <small>Com assinatura paga conciliada</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="warning">
              <CircleAlert size={20} />
            </span>
            <div>
              <span>Em revisão</span>
              <strong>{summary.reviewCount}</strong>
              <small>{summary.alertCount} alerta(s) operacional(is)</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="gold">
              <Coins size={20} />
            </span>
            <div>
              <span>Juris creditados</span>
              <strong>{summary.creditedJuris}</strong>
              <small>{summary.commissionedCount} comissões liquidadas</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statIcon} data-tone="manual">
              <TrendingUp size={20} />
            </span>
            <div>
              <span>Conversão</span>
              <strong>{summary.conversionRate}%</strong>
              <small>Entre leads jurídicos qualificados</small>
            </div>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros de afiliados">
          <div className={styles.searchWrap}>
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar afiliado, indicado ou operadora"
            />
          </div>

          <label className={styles.selectWrap}>
            <Filter size={15} />
            <select
              value={eligibilityFilter}
              onChange={(event) => setEligibilityFilter(event.target.value)}
              aria-label="Filtrar por elegibilidade"
            >
              <option value="ALL">Todas as etapas</option>
              <option value="ELIGIBLE">Elegíveis</option>
              <option value="REVIEW">Em revisão</option>
              <option value="WAITING_PAYMENT">Aguardando assinatura</option>
              <option value="WAITING_REGISTRATION">Sem cadastro</option>
              <option value="CLIENT_LEAD">Indicação de cliente</option>
              <option value="COMMISSIONED">Comissionadas</option>
              <option value="INVALID">Inválidas</option>
            </select>
          </label>

          <label className={styles.selectWrap}>
            <Filter size={15} />
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value)}
              aria-label="Filtrar por plano"
            >
              <option value="ALL">Todos os planos</option>
              <option value="FREE">Gratuito</option>
              <option value="START">START</option>
              <option value="PRO">PRO</option>
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
            {filteredReferrals.length} de {referrals.length} indicações
          </span>
          <span>
            Elegíveis: {visibleSummary.eligible} · Revisão: {visibleSummary.review}
            {" · "}Comissionadas: {visibleSummary.commissioned}
          </span>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Afiliado</th>
                  <th>Indicado</th>
                  <th>Jornada</th>
                  <th>Assinatura qualificadora</th>
                  <th>Comissão</th>
                  <th>Governança</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.length ? (
                  filteredReferrals.map((referral) => {
                    const canOpenCommission =
                      referral.eligibility.canCredit ||
                      referral.eligibility.manualOverrideAllowed;
                    const rowBusy = busyAction.endsWith(`:${referral.id}`);

                    return (
                      <tr
                        key={referral.id}
                        data-alert={referral.eligibility.alert ? "true" : "false"}
                      >
                        <td>
                          <time dateTime={referral.createdAt || undefined}>
                            {formatDate(referral.createdAt)}
                          </time>
                        </td>
                        <td>
                          <div className={styles.personCell}>
                            <strong>{referral.referrer.name}</strong>
                            <small>{referral.referrer.maskedEmail}</small>
                            <span>
                              Saldo: {referral.referrer.currentBalance} Juris
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.personCell}>
                            <strong>{referral.referred.name}</strong>
                            <small>{referral.referred.maskedEmail}</small>
                            <span>
                              {referral.referred.profileType === "LAWYER"
                                ? "Advogado"
                                : referral.referred.profileType === "CLIENT"
                                  ? "Cliente"
                                  : "Sem cadastro localizado"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.journeyCell}>
                            <span className={styles.planBadge}>
                              {PLAN_LABELS[referral.referred.planType] ||
                                referral.referred.planType}
                            </span>
                            <span
                              className={styles.eligibilityBadge}
                              data-status={referral.eligibility.code}
                            >
                              {ELIGIBILITY_LABELS[referral.eligibility.code] ||
                                referral.eligibility.label}
                            </span>
                            {referral.eligibility.alert && (
                              <small title={referral.eligibility.alert}>
                                {referral.eligibility.alert}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          {referral.qualifyingPayment ? (
                            <div className={styles.paymentCell}>
                              <strong>
                                {formatCurrency(
                                  referral.qualifyingPayment.amount,
                                  referral.qualifyingPayment.currency,
                                )}
                              </strong>
                              <span>
                                {PROVIDER_LABELS[
                                  referral.qualifyingPayment.provider
                                ] || referral.qualifyingPayment.provider}
                              </span>
                              <small>
                                {formatDate(
                                  referral.qualifyingPayment.createdAt,
                                )}
                              </small>
                            </div>
                          ) : (
                            <span className={styles.muted}>
                              Não conciliada
                            </span>
                          )}
                        </td>
                        <td>
                          {referral.commission.status === "COMMISSIONED" ? (
                            <div className={styles.commissionPaid}>
                              <Coins size={14} />
                              <strong>{referral.commission.amount} Juris</strong>
                              <small>
                                {formatDate(
                                  referral.commission.commissionedAt ||
                                    referral.updatedAt,
                                )}
                              </small>
                            </div>
                          ) : (
                            <span className={styles.commissionPending}>
                              Pendente
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={styles.governanceCell}>
                            <span
                              className={styles.riskBadge}
                              data-risk={referral.governance.riskLevel}
                            >
                              {RISK_LABELS[referral.governance.riskLevel] ||
                                referral.governance.riskLevel}
                            </span>
                            <small>
                              {REVIEW_STATUS_LABELS[
                                referral.governance.reviewStatus
                              ] || referral.governance.reviewStatus}
                            </small>
                            {referral.governance.duplicateCount > 1 && (
                              <span className={styles.duplicateBadge}>
                                {referral.governance.duplicateCount} duplicidades
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {referral.commission.status !== "COMMISSIONED" &&
                              canOpenCommission && (
                                <button
                                  type="button"
                                  className={styles.primarySmallButton}
                                  onClick={() => setCommissionReferral(referral)}
                                  disabled={rowBusy || !schema.governanceAvailable}
                                >
                                  <Coins size={14} />
                                  Creditar
                                </button>
                              )}
                            <button
                              type="button"
                              className={styles.secondarySmallButton}
                              onClick={() => setGovernanceReferral(referral)}
                              disabled={rowBusy || !schema.governanceAvailable}
                            >
                              <ShieldAlert size={14} />
                              Classificar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      <Users size={28} />
                      <strong>Nenhuma indicação encontrada</strong>
                      <span>Revise os filtros aplicados ao painel.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className={styles.policyNote}>
          <ShieldAlert size={16} />
          <span>
            Comissão padrão sugerida: {policy.defaultCommissionJuris} Juris. O
            programa não oferece saque em dinheiro; os créditos são saldo interno
            da plataforma.
          </span>
        </footer>
      </div>

      <CommissionModal
        referral={commissionReferral}
        defaultAmount={policy.defaultCommissionJuris}
        open={Boolean(commissionReferral)}
        busy={Boolean(busyAction)}
        governanceAvailable={schema.governanceAvailable}
        onClose={() => {
          if (!busyAction) setCommissionReferral(null);
        }}
        onConfirm={confirmCommission}
      />

      <GovernanceModal
        referral={governanceReferral}
        open={Boolean(governanceReferral)}
        busy={Boolean(busyAction)}
        governanceAvailable={schema.governanceAvailable}
        onClose={() => {
          if (!busyAction) setGovernanceReferral(null);
        }}
        onConfirm={confirmGovernance}
      />
    </main>
  );
}

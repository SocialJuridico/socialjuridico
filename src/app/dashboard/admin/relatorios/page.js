"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Database,
  FileDown,
  FileText,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import {
  formatNumber,
  formatReportDay,
  mergeReportData,
} from "../utils/reportFormatters";
import HomeConversionPanel from "./HomeConversionPanel";
import { useAdminReports } from "./useAdminReports";
import styles from "./RelatoriosAdmin.module.css";

function formatDateTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function audienceLabel(audiences = []) {
  const labels = [];
  if (audiences.includes("LAWYERS")) labels.push("Advogados");
  if (audiences.includes("CLIENTS")) labels.push("Clientes");
  return labels.join(" e ") || "Não informado";
}

export default function AdminRelatoriosPage() {
  const {
    options,
    report,
    history,
    auditAvailable,
    loading,
    refreshing,
    generating,
    error,
    updateOption,
    reload,
    generate,
  } = useAdminReports();

  const dailyRows = useMemo(() => {
    if (!report) return [];

    return mergeReportData({
      accesses: report.accesses?.daily || [],
      lawyers: report.lawyers?.daily || [],
      clients: report.clients?.daily || [],
      limit: options.period,
    }).reverse();
  }, [options.period, report]);

  if (loading && !report) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle size={30} className={styles.spinning} />
        <h1>Preparando relatórios administrativos</h1>
        <p>Consolidando telemetria, cadastros e indicadores de uso.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} />
            Voltar ao dashboard
          </Link>

          <div className={styles.headerContent}>
            <div>
              <span className={styles.eyebrow}>Governança e telemetria</span>
              <h1>
                <FileText size={26} />
                Relatórios & Auditoria
              </h1>
              <p>
                Analise métricas agregadas, configure o conteúdo do documento e
                acompanhe o histórico administrativo de emissões.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => reload({ silent: true })}
                disabled={refreshing || generating}
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
                onClick={generate}
                disabled={generating || !report}
              >
                {generating ? (
                  <LoaderCircle size={16} className={styles.spinning} />
                ) : (
                  <FileDown size={16} />
                )}
                {generating ? "Gerando PDF" : "Gerar PDF"}
              </button>
            </div>
          </div>
        </header>

        {!auditAvailable && (
          <div className={styles.migrationBanner} role="alert">
            <AlertTriangle size={20} />
            <div>
              <strong>Histórico de emissões ainda não habilitado</strong>
              <p>
                A visualização e o PDF continuam disponíveis, mas as exportações
                não serão registradas até a migração de auditoria ser executada.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Não foi possível atualizar todas as informações</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <section className={styles.configCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionIcon}>
                <CalendarDays size={19} />
              </span>
              <div>
                <h2>Configuração do relatório</h2>
                <p>As alterações atualizam automaticamente a prévia.</p>
              </div>
            </div>
          </div>

          <div className={styles.configGrid}>
            <label className={styles.field}>
              <span>Período analisado</span>
              <select
                value={options.period}
                onChange={(event) =>
                  updateOption("period", Number(event.target.value))
                }
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={15}>Últimos 15 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
              <small>O resumo considera usuários únicos em todo o período.</small>
            </label>

            <fieldset className={styles.optionGroup}>
              <legend>Públicos incluídos</legend>
              <label className={styles.checkOption}>
                <input
                  type="checkbox"
                  checked={options.includeLawyers}
                  onChange={(event) =>
                    updateOption("includeLawyers", event.target.checked)
                  }
                />
                <span>
                  <strong>Advogados</strong>
                  <small>Logins, cadastros e ferramentas premium</small>
                </span>
              </label>
              <label className={styles.checkOption}>
                <input
                  type="checkbox"
                  checked={options.includeClients}
                  onChange={(event) =>
                    updateOption("includeClients", event.target.checked)
                  }
                />
                <span>
                  <strong>Clientes</strong>
                  <small>Logins, cadastros e satisfação</small>
                </span>
              </label>
            </fieldset>

            <fieldset className={styles.optionGroup}>
              <legend>Indicadores complementares</legend>
              <label className={styles.checkOption}>
                <input
                  type="checkbox"
                  checked={options.includeDbTotals}
                  onChange={(event) =>
                    updateOption("includeDbTotals", event.target.checked)
                  }
                />
                <span>
                  <strong>Totais de cadastros</strong>
                  <small>Volume atual das bases de usuários</small>
                </span>
              </label>
              <label className={styles.checkOption}>
                <input
                  type="checkbox"
                  checked={options.includeSatisfaction}
                  onChange={(event) =>
                    updateOption("includeSatisfaction", event.target.checked)
                  }
                />
                <span>
                  <strong>Satisfação</strong>
                  <small>Média e quantidade de pesquisas</small>
                </span>
              </label>
              <label className={styles.checkOption}>
                <input
                  type="checkbox"
                  checked={options.includePremiumUsage}
                  disabled={!options.includeLawyers}
                  onChange={(event) =>
                    updateOption("includePremiumUsage", event.target.checked)
                  }
                />
                <span>
                  <strong>Ferramentas premium</strong>
                  <small>Consumo agregado dos advogados</small>
                </span>
              </label>
            </fieldset>
          </div>
        </section>

        {report && (
          <>
            <section className={styles.statsGrid} aria-label="Resumo do período">
              <article className={styles.statCard}>
                <span className={styles.statIcon} data-tone="blue">
                  <Activity size={21} />
                </span>
                <div>
                  <span>Visualizações</span>
                  <strong>{formatNumber(report.summary.accesses)}</strong>
                  <small>Eventos de página no período</small>
                </div>
              </article>

              {options.includeLawyers && (
                <article className={styles.statCard}>
                  <span className={styles.statIcon} data-tone="gold">
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <span>Advogados únicos</span>
                    <strong>{formatNumber(report.summary.lawyers)}</strong>
                    <small>Usuários distintos com login</small>
                  </div>
                </article>
              )}

              {options.includeClients && (
                <article className={styles.statCard}>
                  <span className={styles.statIcon} data-tone="green">
                    <Users size={21} />
                  </span>
                  <div>
                    <span>Clientes únicos</span>
                    <strong>{formatNumber(report.summary.clients)}</strong>
                    <small>Usuários distintos com login</small>
                  </div>
                </article>
              )}

              {options.includeDbTotals && (
                <article className={styles.statCard}>
                  <span className={styles.statIcon} data-tone="purple">
                    <Database size={21} />
                  </span>
                  <div>
                    <span>Cadastros</span>
                    <strong>
                      {formatNumber(
                        Number(report.totals.lawyers || 0) +
                          Number(report.totals.clients || 0),
                      )}
                    </strong>
                    <small>Perfis incluídos nesta configuração</small>
                  </div>
                </article>
              )}

              {options.includeSatisfaction && (
                <article className={styles.statCard}>
                  <span className={styles.statIcon} data-tone="warning">
                    <Star size={21} />
                  </span>
                  <div>
                    <span>Satisfação geral</span>
                    <strong>
                      {Number(report.satisfaction.overallAvg || 0).toFixed(1)}
                    </strong>
                    <small>
                      {formatNumber(report.satisfaction.totalSurveys)} respostas
                    </small>
                  </div>
                </article>
              )}
            </section>

            <div className={styles.methodologyNote}>
              <BarChart3 size={17} />
              <p>
                <strong>Leitura correta:</strong> visualizações representam eventos
                de página. Advogados e clientes representam usuários distintos que
                fizeram login no período, evitando somar a mesma pessoa em dias
                diferentes.
              </p>
            </div>

            <HomeConversionPanel
              conversion={report.homeConversion}
              period={options.period}
            />

            <section className={styles.contentGrid}>
              <div className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionIcon}>
                      <BarChart3 size={19} />
                    </span>
                    <div>
                      <h2>Prévia diária</h2>
                      <p>Últimos {options.period} dias disponíveis.</p>
                    </div>
                  </div>
                  <span className={styles.updatedAt}>
                    Atualizado em {formatDateTime(report.generatedAt)}
                  </span>
                </div>

                <div className={styles.tableScroller}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Visualizações</th>
                        {options.includeLawyers && <th>Advogados únicos</th>}
                        {options.includeClients && <th>Clientes únicos</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.length ? (
                        dailyRows.map((row) => (
                          <tr key={row.date}>
                            <td>{formatReportDay(row.date)}</td>
                            <td>{formatNumber(row.accesses)}</td>
                            {options.includeLawyers && (
                              <td>{formatNumber(row.lawyers)}</td>
                            )}
                            {options.includeClients && (
                              <td>{formatNumber(row.clients)}</td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={
                              2 +
                              Number(options.includeLawyers) +
                              Number(options.includeClients)
                            }
                            className={styles.emptyCell}
                          >
                            Nenhum evento registrado no período selecionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {options.includePremiumUsage && (
                <aside className={styles.panel}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.sectionIcon}>
                        <Sparkles size={19} />
                      </span>
                      <div>
                        <h2>Ferramentas premium</h2>
                        <p>Consumo acumulado da base de advogados.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.usageList}>
                    <div>
                      <span>Redator IA</span>
                      <strong>
                        {formatNumber(report.premiumUsageSummary.redator.total)} usos
                      </strong>
                      <small>
                        Média {report.premiumUsageSummary.redator.avg} por advogado
                      </small>
                    </div>
                    <div>
                      <span>Triagem IA</span>
                      <strong>
                        {formatNumber(report.premiumUsageSummary.triagem.total)} usos
                      </strong>
                      <small>
                        Média {report.premiumUsageSummary.triagem.avg} por advogado
                      </small>
                    </div>
                    <div>
                      <span>Agenda e prazos</span>
                      <strong>
                        {formatNumber(report.premiumUsageSummary.agenda.total)} registros
                      </strong>
                      <small>
                        Média {report.premiumUsageSummary.agenda.avg} por advogado
                      </small>
                    </div>
                    <div>
                      <span>Armazenamento</span>
                      <strong>
                        {formatNumber(report.premiumUsageSummary.storage.total)} MB
                      </strong>
                      <small>
                        Média {report.premiumUsageSummary.storage.avg} MB por advogado
                      </small>
                    </div>
                  </div>
                </aside>
              )}
            </section>
          </>
        )}

        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionIcon}>
                <History size={19} />
              </span>
              <div>
                <h2>Histórico de emissões</h2>
                <p>Registro imutável dos PDFs preparados pela administração.</p>
              </div>
            </div>
            <span className={styles.historyCount}>{history.length} registros</span>
          </div>

          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Emissão</th>
                  <th>Administrador</th>
                  <th>Período</th>
                  <th>Públicos</th>
                  <th>Resumo</th>
                  <th>Arquivo</th>
                </tr>
              </thead>
              <tbody>
                {history.length ? (
                  history.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>{item.adminName}</td>
                      <td>{item.periodDays} dias</td>
                      <td>{audienceLabel(item.audiences)}</td>
                      <td>
                        {formatNumber(item.summary?.accesses)} visualizações ·{" "}
                        {formatNumber(item.summary?.lawyers)} advogados ·{" "}
                        {formatNumber(item.summary?.clients)} clientes
                      </td>
                      <td>
                        <span className={styles.fileName}>{item.fileName}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      {auditAvailable
                        ? "Nenhum relatório foi emitido ainda."
                        : "O histórico será exibido após a migração de auditoria."}
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

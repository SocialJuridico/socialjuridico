"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileDown,
  LoaderCircle,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { exportAuditReportPdf } from "./auditPdfExport";
import styles from "./AuditoriasAdmin.module.css";

const STATUS_META = {
  passed: { label: "Aprovado", tone: "passed" },
  failed: { label: "Falhou", tone: "failed" },
  warning: { label: "Atenção", tone: "warning" },
  manual: { label: "Evidência externa", tone: "manual" },
};

function formatDateTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Data indisponivel";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function AdminAuditoriasPage() {
  const [audits, setAudits] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function loadAudits() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auditorias", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Nao foi possivel carregar auditorias.");
      }
      const items = payload.data?.audits || [];
      setAudits(items);
      setSelectedId((current) => current || items[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudits();
  }, []);

  const selectedAudit = useMemo(
    () => audits.find((item) => item.id === selectedId) || audits[0] || null,
    [audits, selectedId],
  );

  async function runSelectedAudit(auditId = selectedId) {
    if (!auditId) return;
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auditorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Nao foi possivel executar a auditoria.");
      }
      setSelectedId(auditId);
      setReport(payload.data.report);
    } catch (runError) {
      setError(runError.message);
    } finally {
      setRunning(false);
    }
  }

  async function exportPdf() {
    if (!report) return;
    setExporting(true);
    try {
      await exportAuditReportPdf(report);
    } catch (exportError) {
      setError(exportError.message || "Nao foi possivel gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle size={30} className={styles.spinning} />
        <h1>Carregando auditorias internas</h1>
        <p>Preparando os roteiros de verificacao.</p>
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
              <span className={styles.eyebrow}>Governança e evidências</span>
              <h1>
                <ClipboardCheck size={27} />
                Auditorias internas
              </h1>
              <p>
                Execute verificações de SOC 2, ISO 27001, ISO 27701, LGPD e segurança
                técnica, registre os achados e gere um relatório PDF.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={loadAudits}
                disabled={running || exporting}
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => runSelectedAudit()}
                disabled={!selectedAudit || running || exporting}
              >
                {running ? <LoaderCircle size={16} className={styles.spinning} /> : <Play size={16} />}
                {running ? "Executando" : "Executar auditoria"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Operação não concluída</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <section className={styles.auditGrid} aria-label="Auditorias disponiveis">
          {audits.map((audit) => (
            <button
              key={audit.id}
              type="button"
              className={`${styles.auditCard} ${selectedId === audit.id ? styles.auditCardActive : ""}`}
              onClick={() => setSelectedId(audit.id)}
            >
              <span className={styles.auditIcon}>
                <ShieldCheck size={20} />
              </span>
              <span>
                <strong>{audit.title}</strong>
                <small>{audit.description}</small>
              </span>
              <em>{audit.criteria.join(" · ")}</em>
            </button>
          ))}
        </section>

        {selectedAudit && (
          <section className={styles.selectedPanel}>
            <div>
              <span className={styles.eyebrow}>Auditoria selecionada</span>
              <h2>{selectedAudit.title}</h2>
              <p>{selectedAudit.description}</p>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => runSelectedAudit(selectedAudit.id)}
              disabled={running}
            >
              {running ? <LoaderCircle size={16} className={styles.spinning} /> : <Play size={16} />}
              Rodar teste
            </button>
          </section>
        )}

        {report && (
          <>
            <section className={styles.summaryPanel}>
              <div>
                <span className={styles.score}>{report.summary.score}%</span>
                <div>
                  <h2>Resultado da auditoria</h2>
                  <p>
                    Gerado em {formatDateTime(report.generatedAt)} por{" "}
                    {report.generatedBy.name}.
                  </p>
                </div>
              </div>

              <div className={styles.summaryStats}>
                <span>{report.summary.passed} aprovados</span>
                <span>{report.summary.warnings} atenção</span>
                <span>{report.summary.failed} falhas</span>
                <span>{report.summary.manual} externos</span>
              </div>

              <button
                type="button"
                className={styles.downloadButton}
                onClick={exportPdf}
                disabled={exporting}
              >
                {exporting ? <LoaderCircle size={16} className={styles.spinning} /> : <FileDown size={16} />}
                {exporting ? "Gerando PDF" : "Baixar PDF"}
              </button>
            </section>

            <section className={styles.resultsPanel}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Testes executados</h2>
                  <p>Cada item indica evidência coletada e ação recomendada.</p>
                </div>
                <Download size={18} />
              </header>

              <div className={styles.resultsList}>
                {report.results.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.manual;
                  return (
                    <article key={item.id} className={styles.resultItem}>
                      <span className={styles.statusPill} data-tone={meta.tone}>
                        {item.status === "passed" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        {meta.label}
                      </span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.evidence}</p>
                        {item.recommendation && (
                          <small>{item.recommendation}</small>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

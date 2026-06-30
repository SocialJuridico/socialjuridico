"use client";

import { ArrowLeft, FileDown, LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { exportToolUsagePdf } from "./toolUsageExportService";
import styles from "./FerramentasUso.module.css";

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

export default function FerramentasUsoPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(
        `/api/admin/reports/tool-usage?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar as métricas.");
      }

      setReport(data);
    } catch (err) {
      setError(err.message || "Falha ao carregar as métricas.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = useCallback(async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportToolUsagePdf(report);
    } catch (err) {
      setError(err.message || "Falha ao gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }, [report]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin" className={styles.back}>
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <h1 className={styles.title}>Métricas de uso de ferramentas</h1>
        <p className={styles.subtitle}>
          Quem usou, o que usou e quantas vezes — Monitoramento de OAB, Assinatura
          Digital, Notificação Extrajudicial, Processos datajud e Blindagem de
          documentos.
        </p>
      </div>

      <div className={styles.filters}>
        <label className={styles.field}>
          <span>De</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span>Até</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={styles.input}
          />
        </label>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={loadReport}
          disabled={loading}
        >
          {loading ? <LoaderCircle size={16} className={styles.spin} /> : <RefreshCw size={16} />}
          Atualizar
        </button>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={!report || exporting || loading}
        >
          {exporting ? <LoaderCircle size={16} className={styles.spin} /> : <FileDown size={16} />}
          Exportar PDF
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading && !report && (
        <div className={styles.loading}>
          <LoaderCircle size={28} className={styles.spin} />
          Carregando métricas...
        </div>
      )}

      {report && (
        <>
          <div className={styles.cards}>
            {report.tools.map((tool) => (
              <div key={tool.key} className={styles.card}>
                <span className={styles.cardLabel}>{tool.label}</span>
                <strong className={styles.cardValue}>{formatNumber(tool.total)}</strong>
                <span className={styles.cardHint}>
                  {tool.byUser.length} usuário(s)
                </span>
              </div>
            ))}
            <div className={`${styles.card} ${styles.cardTotal}`}>
              <span className={styles.cardLabel}>Total geral</span>
              <strong className={styles.cardValue}>
                {formatNumber(report.grandTotal)}
              </strong>
              <span className={styles.cardHint}>todas as ferramentas</span>
            </div>
          </div>

          {report.tools.map((tool) => (
            <section key={tool.key} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {tool.label}
                <span className={styles.sectionTotal}>
                  {formatNumber(tool.total)} uso(s)
                </span>
              </h2>

              {tool.byUser.length === 0 ? (
                <p className={styles.empty}>Nenhum uso registrado no período.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Advogado / Usuário</th>
                        <th>E-mail</th>
                        <th className={styles.right}>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tool.byUser.map((user) => (
                        <tr key={`${tool.key}-${user.ownerId}`}>
                          <td>{user.name}</td>
                          <td className={styles.muted}>{user.email}</td>
                          <td className={styles.right}>{formatNumber(user.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

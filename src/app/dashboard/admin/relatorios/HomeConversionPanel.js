import {
  AlertTriangle,
  MousePointerClick,
  Scale,
  UserPlus,
} from "lucide-react";

import { formatNumber, formatReportDay } from "../utils/reportFormatters";
import baseStyles from "./RelatoriosAdmin.module.css";
import styles from "./HomeConversionPanel.module.css";

export default function HomeConversionPanel({ conversion, period }) {
  if (!conversion) return null;

  const rows = [...(conversion.daily || [])].reverse();
  const summary = conversion.summary || {};

  return (
    <section className={styles.panel}>
      <div className={baseStyles.sectionHeading}>
        <div>
          <span className={baseStyles.sectionIcon}>
            <MousePointerClick size={19} />
          </span>
          <div>
            <h2>Interações da home</h2>
            <p>
              Cliques nos principais chamados para ação nos últimos {period} dias.
            </p>
          </div>
        </div>
        <span className={baseStyles.historyCount}>Camada pública</span>
      </div>

      {!conversion.available && (
        <div className={styles.inlineWarning} role="alert">
          <AlertTriangle size={17} />
          <p>
            A home já possui os eventos, mas o armazenamento histórico será
            iniciado após a migração de eventos públicos.
          </p>
        </div>
      )}

      <div className={styles.stats}>
        <article>
          <span className={styles.icon} data-tone="blue">
            <MousePointerClick size={18} />
          </span>
          <div>
            <span>Visualizações da home</span>
            <strong>{formatNumber(summary.homeViews)}</strong>
            <small>Eventos de página em “/”</small>
          </div>
        </article>

        <article>
          <span className={styles.icon} data-tone="green">
            <UserPlus size={18} />
          </span>
          <div>
            <span>CTA para clientes</span>
            <strong>{formatNumber(summary.clientClicks)}</strong>
            <small>“Publicar meu caso gratuitamente”</small>
          </div>
        </article>

        <article>
          <span className={styles.icon} data-tone="gold">
            <Scale size={18} />
          </span>
          <div>
            <span>CTA para advogados</span>
            <strong>{formatNumber(summary.lawyerClicks)}</strong>
            <small>“Sou advogado”</small>
          </div>
        </article>

        <article>
          <span className={styles.icon} data-tone="purple">
            <MousePointerClick size={18} />
          </span>
          <div>
            <span>Taxa de interação</span>
            <strong>{Number(summary.interactionRate || 0).toFixed(1)}%</strong>
            <small>Cliques totais ÷ visualizações</small>
          </div>
        </article>
      </div>

      <div className={baseStyles.tableScroller}>
        <table className={baseStyles.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Visualizações</th>
              <th>CTA clientes</th>
              <th>CTA advogados</th>
              <th>Interações totais</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.date}>
                  <td>{formatReportDay(row.date)}</td>
                  <td>{formatNumber(row.homeViews)}</td>
                  <td>{formatNumber(row.clientClicks)}</td>
                  <td>{formatNumber(row.lawyerClicks)}</td>
                  <td>{formatNumber(row.totalClicks)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={baseStyles.emptyCell}>
                  Nenhuma interação foi registrada neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.footnote}>
        Os números representam eventos agregados, não pessoas únicas nem cadastros
        concluídos. Um visitante pode clicar mais de uma vez.
      </p>
    </section>
  );
}

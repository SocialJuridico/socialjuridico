import { Sparkles, X } from "lucide-react";

import styles from "../page.module.css";

export default function RadarSearchReport({ result, onClose }) {
  if (!result) return null;

  const sources = [
    { key: "brave", label: "Brave Search" },
    { key: "reddit", label: "Reddit RSS" },
  ];

  return (
    <section className={styles.searchReport}>
      <header>
        <div>
          <Sparkles size={17} aria-hidden="true" />
          <strong>Relatório da última busca automática</strong>
        </div>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar relatório">
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.reportTotals}>
        <span>Encontrados <strong>{result.total_encontrado || 0}</strong></span>
        <span>Duplicados <strong>{result.total_duplicados || 0}</strong></span>
        <span>Classificados <strong>{result.total_classificados || 0}</strong></span>
        <span>Descartados <strong>{result.total_descartados_baixo_score || 0}</strong></span>
        <span>Inseridos <strong>{result.total_inseridos || 0}</strong></span>
        <span>Erros <strong>{result.total_erros || 0}</strong></span>
      </div>

      <div className={styles.reportSources}>
        {sources.map(({ key, label }) => {
          const stats = result[key];
          if (!stats) return null;
          return (
            <article key={key}>
              <strong>{label}</strong>
              <span>Encontrados: {stats.encontrados || 0}</span>
              <span>Classificados: {stats.classificados || 0}</span>
              <span>Inseridos: {stats.inseridos || 0}</span>
              <span>Descartados: {stats.descartados_baixo_score || 0}</span>
              <span>Erros: {stats.erros || 0}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

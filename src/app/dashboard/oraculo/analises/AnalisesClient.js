"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import styles from "../OraculoStudentDashboard.module.css";

const TABS = [
  { key: "EM_ANDAMENTO", label: "Em andamento" },
  { key: "ENVIADA_REVISAO", label: "Aguardando revisão" },
  { key: "AJUSTE_SOLICITADO", label: "Correção solicitada" },
  { key: "APROVADA", label: "Aprovadas" },
  { key: "CONCLUIDA", label: "Concluídas" },
];

const STATUS_LABELS = {
  EM_ANDAMENTO: "Em andamento",
  ENVIADA_REVISAO: "Aguardando revisão",
  AJUSTE_SOLICITADO: "Correção solicitada",
  APROVADA: "Aprovada",
  CONCLUIDA: "Concluída",
};

const SOURCE_LABELS = {
  RADAR_ACADEMIC: "Radar Acadêmico",
  REAL_DERIVED: "Caso derivado",
  REAL_ACTIVE: "Caso real",
};

function shortCode(id) {
  return `AN-${String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function AnalisesClient({ analyses }) {
  const [tab, setTab] = useState("EM_ANDAMENTO");

  const counts = useMemo(() => {
    const c = {};
    for (const a of analyses) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [analyses]);

  const visible = useMemo(
    () => analyses.filter((a) => a.status === tab),
    [analyses, tab],
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Prática jurídica</span>
          <h1>Minhas Análises</h1>
          <p>
            Casos assumidos ou iniciados por você, organizados por etapa e status
            de revisão.
          </p>
        </div>
      </section>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] ? <span className={styles.tabCount}>{counts[t.key]}</span> : null}
          </button>
        ))}
      </div>

      <section className={styles.panel}>
        {visible.length === 0 ? (
          <div className={styles.emptyState}>
            <ClipboardList size={26} aria-hidden="true" />
            <p>Nenhuma análise nesta categoria.</p>
            <small>
              Inicie uma análise a partir de um caso do Radar Acadêmico na Central
              de Casos.
            </small>
            <Link href="/dashboard/oraculo/casos">Ir para a Central de Casos</Link>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {visible.map((a) => (
              <article key={a.id} className={styles.caseCard}>
                <div className={styles.caseCardHead}>
                  <span className={styles.caseArea}>{a.area || "Área"}</span>
                  <span className={styles.studyTag}>
                    {SOURCE_LABELS[a.source_type] || a.source_type}
                  </span>
                </div>
                <h3>{a.titulo || shortCode(a.id)}</h3>
                <div className={styles.caseMeta}>
                  <span>{shortCode(a.id)}</span>
                  <span>{STATUS_LABELS[a.status] || a.status}</span>
                </div>
                <Link
                  href={`/dashboard/oraculo/analises/${a.id}`}
                  className={styles.caseCta}
                >
                  Abrir Mesa de Análise
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

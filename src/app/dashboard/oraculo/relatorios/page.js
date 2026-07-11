import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FileText, NotebookPen } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { getNotebookReport } from "@/lib/oraculo/notebook/notebookReport";

import styles from "../OraculoStudentDashboard.module.css";

export const metadata = { title: "Relatórios — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function OraculoRelatoriosPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const report = await getNotebookReport({ oraculoId: context.oraculoId });
  const hasActivity =
    report.totalNotes ||
    report.totalCaseNotes ||
    report.totalQuestions ||
    report.totalFichamentos ||
    report.totalSources;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Minha evolução</span>
          <h1>Relatórios</h1>
          <p>
            Resumo da sua prática acadêmica a partir do Caderno Jurídico —
            evidência para relatórios de atividades complementares.
          </p>
        </div>
      </section>

      {!hasActivity ? (
        <section className={styles.panel}>
          <div className={styles.emptyState}>
            <FileText size={26} aria-hidden="true" />
            <p>Ainda não há dados suficientes para um relatório.</p>
            <small>
              Use o Caderno Jurídico — anotações, fontes salvas, questões de
              estudo e fichamentos alimentam este resumo automaticamente.
            </small>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>
                <NotebookPen size={18} aria-hidden="true" /> Atividades complementares
              </h2>
            </div>
            <dl className={styles.programList}>
              <div>
                <dt>Anotações jurídicas criadas</dt>
                <dd>{report.totalNotes}</dd>
              </div>
              <div>
                <dt>Notas vinculadas a casos</dt>
                <dd>{report.totalCaseNotes}</dd>
              </div>
              <div>
                <dt>Fontes salvas no Caderno</dt>
                <dd>{report.totalSources}</dd>
              </div>
              <div>
                <dt>Questões de estudo registradas</dt>
                <dd>
                  {report.totalQuestions} ({report.answeredQuestions} respondida
                  {report.answeredQuestions === 1 ? "" : "s"})
                </dd>
              </div>
              <div>
                <dt>Fichamentos concluídos</dt>
                <dd>
                  {report.completedFichamentos} de {report.totalFichamentos}
                </dd>
              </div>
            </dl>
          </section>

          {(report.topCategories.length > 0 || report.topTags.length > 0) && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Temas mais estudados</h2>
              </div>
              {report.topCategories.length > 0 && (
                <div className={styles.mesaField}>
                  <label>Por categoria</label>
                  <div className={styles.filterRow}>
                    {report.topCategories.map((c) => (
                      <span key={c.label} className={styles.filterChip}>
                        {c.label} · {c.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {report.topTags.length > 0 && (
                <div className={styles.mesaField}>
                  <label>Por tag</label>
                  <div className={styles.filterRow}>
                    {report.topTags.map((t) => (
                      <span key={t.label} className={styles.filterChip}>
                        {t.label} · {t.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

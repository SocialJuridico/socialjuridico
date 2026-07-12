import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import {
  getSupervisorConductReport,
  markConductReportViewedBySupervisor,
} from "@/lib/oraculo/radarAcademic/professionalConductReport";

import styles from "../../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Relatório de Conduta — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function SupervisorRelatorioCondutaPage({ params }) {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const report = await getSupervisorConductReport({ authUserId: context.authUserId, id });
  if (!report) notFound();

  await markConductReportViewedBySupervisor({ authUserId: context.authUserId, id });

  return (
    <main className={styles.page}>
      <Link href="/dashboard/oraculoacademico/supervisor/relatorios-conduta" className={styles.backLink}>
        Voltar
      </Link>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Relatório de Conduta Profissional</span>
          <h1>{report.studentName}</h1>
          <small className={styles.heroMeta}>
            {new Date(report.generated_at).toLocaleString("pt-BR")}
          </small>
        </div>
        {report.overall_score != null && (
          <span className={styles.callTag}>{report.overall_score}/100</span>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Resumo</h2>
        </div>
        <p>{report.summary || "—"}</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Especialidade e foco de atuação</h2>
          {report.specialty_focus_score != null && <span>{report.specialty_focus_score}/100</span>}
        </div>
        <p>{report.professional_expertise_summary || "—"}</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Transparência na primeira consulta</h2>
          {report.transparency_score != null && <span>{report.transparency_score}/100</span>}
        </div>
        <p>{report.transparency_summary || "—"}</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Ética e conhecimento</h2>
          {report.ethics_knowledge_score != null && <span>{report.ethics_knowledge_score}/100</span>}
        </div>
        <p>{report.ethics_summary || "—"}</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.feedbackBlocks}>
          <div>
            <h3>Pontos fortes</h3>
            <p>{(report.strengths || []).join(" ") || "—"}</p>
          </div>
          <div>
            <h3>Pontos de melhoria</h3>
            <p>{(report.improvement_points || []).join(" ") || "—"}</p>
          </div>
          {report.attention_points?.length > 0 && (
            <div>
              <h3>Pontos de atenção</h3>
              <p>{report.attention_points.join(" ")}</p>
            </div>
          )}
        </div>
        <p className={styles.muted}>
          Avaliação gerada por IA para fins de apoio acadêmico. A validação
          final cabe ao Supervisor, Orientador ou instituição, conforme
          regras do programa.
        </p>
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import { listOrientadorConductReports } from "@/lib/oraculo/radarAcademic/professionalConductReport";

import styles from "../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Relatórios de Conduta — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function OrientadorRelatoriosCondutaPage() {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  const reports = await listOrientadorConductReports({ authUserId: context.authUserId });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Avaliação</span>
          <h1>Relatórios de Conduta Profissional</h1>
          <p>
            Todo Atendimento Jurídico Simulado encerrado por seus alunos gera
            um relatório de apoio à orientação acadêmica.
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        {reports.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={26} aria-hidden="true" />
            <p>Nenhum relatório disponível.</p>
            <small>
              Relatórios de atendimentos simulados encerrados pelos alunos da
              sua turma aparecerão aqui.
            </small>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/oraculoacademico/orientador/relatorios-conduta/${r.id}`}
                className={styles.caseCard}
              >
                <div className={styles.caseCardHead}>
                  <span className={styles.callTag}>
                    {r.overall_score != null ? `${r.overall_score}/100` : "Sem nota"}
                  </span>
                  {!r.viewed_by_orientador_at && (
                    <span className={styles.studyTag}>NOVO</span>
                  )}
                </div>
                <h3>{r.studentName}</h3>
                <p>{r.summary || "Atendimento jurídico simulado concluído."}</p>
                <div className={styles.caseMeta}>
                  <span>{new Date(r.generated_at).toLocaleString("pt-BR")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

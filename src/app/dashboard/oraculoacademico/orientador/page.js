import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, MessageCircleQuestion } from "lucide-react";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import { getOrientatorHomeStats } from "@/lib/oraculo/staff/orientatorRead";
import { listStaffQuestions } from "@/lib/oraculo/notebook/notebookEntries";
import { countUnviewedConductReportsForOrientador } from "@/lib/oraculo/radarAcademic/professionalConductReport";

import styles from "../../oraculo/OraculoStudentDashboard.module.css";

export const dynamic = "force-dynamic";

export default async function OrientadorHomePage() {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  const [stats, pending, newReportsCount] = await Promise.all([
    getOrientatorHomeStats({ institutionUserId: context.institutionUserId, authUserId: context.authUserId }),
    listStaffQuestions({ authUserId: context.authUserId, answered: false, limit: 6 }),
    countUnviewedConductReportsForOrientador({ authUserId: context.authUserId }),
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Orientação acadêmica</span>
          <h1>Bem-vindo, Professor(a) {context.name}</h1>
          <p>
            Acompanhe turmas, alunos e dúvidas acadêmicas dos estudantes
            vinculados ao programa.
          </p>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <strong>{stats.turmasCount}</strong>
          <span>Turmas vinculadas</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{stats.studentsCount}</strong>
          <span>Alunos acompanhados</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{stats.pendingQuestions}</strong>
          <span>Perguntas aguardando resposta</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{newReportsCount}</strong>
          <span>Relatórios de conduta novos</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>
            <MessageCircleQuestion size={18} aria-hidden="true" /> Perguntas pendentes
          </h2>
          <Link href="/dashboard/oraculoacademico/orientador/perguntas" className={styles.backLink}>
            Ver todas
          </Link>
        </div>
        {pending.length === 0 ? (
          <div className={styles.emptyState}>
            <GraduationCap size={26} aria-hidden="true" />
            <p>Nenhuma pergunta pendente.</p>
          </div>
        ) : (
          <div className={styles.claimList}>
            {pending.map((q) => (
              <div key={q.id} className={styles.claimRow}>
                <div>
                  <strong>{q.studentName}</strong>
                  <small>{q.content}</small>
                </div>
                <span className={styles.claimStatus}>Aguardando resposta</span>
                <Link
                  href={`/dashboard/oraculoacademico/orientador/perguntas/${q.id}`}
                  className={styles.claimDeadline}
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

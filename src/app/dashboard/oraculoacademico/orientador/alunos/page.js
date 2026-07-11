import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import { listOrientatorStudents } from "@/lib/oraculo/staff/orientatorRead";

import styles from "../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Alunos — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

function formatHours(minutes) {
  const h = Math.floor((minutes || 0) / 60);
  const m = (minutes || 0) % 60;
  return `${h}h${m ? ` ${m}min` : ""}`;
}

export default async function OrientadorAlunosPage() {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  const students = await listOrientatorStudents({ institutionUserId: context.institutionUserId });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Acompanhamento</span>
          <h1>Alunos</h1>
          <p>Estudantes vinculados às suas turmas/programas.</p>
        </div>
      </section>

      <section className={styles.panel}>
        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={26} aria-hidden="true" />
            <p>Você ainda não possui alunos vinculados.</p>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {students.map((s) => (
              <article key={s.linkId} className={styles.caseCard}>
                <div className={styles.caseCardHead}>
                  <span className={styles.caseArea}>{s.turma?.nome || "Sem turma"}</span>
                  <span className={styles.studyTag}>{s.statusAcademico}</span>
                </div>
                <h3>{s.student?.name || "Estudante"}</h3>
                <p>{s.student?.curso || s.student?.email}</p>
                <div className={styles.caseMeta}>
                  <span>{s.atividadesRegistradas} atividade(s)</span>
                  <span>{formatHours(s.horasReconhecidasMinutos)} reconhecidas</span>
                  {s.revisoesPendentes > 0 && <span>{s.revisoesPendentes} pendência(s)</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

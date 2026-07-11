import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import { listOrientatorTurmas } from "@/lib/oraculo/staff/orientatorRead";

import styles from "../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Turmas — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function OrientadorTurmasPage() {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  const turmas = await listOrientatorTurmas({ institutionUserId: context.institutionUserId });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Acompanhamento</span>
          <h1>Turmas</h1>
          <p>Turmas com alunos vinculados a você como orientador.</p>
        </div>
      </section>

      <section className={styles.panel}>
        {turmas.length === 0 ? (
          <div className={styles.emptyState}>
            <GraduationCap size={26} aria-hidden="true" />
            <p>Você ainda não possui turmas vinculadas.</p>
            <small>
              A instituição poderá vincular você a um programa ou turma no
              painel institucional.
            </small>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {turmas.map((t) => (
              <article key={t.id} className={styles.caseCard}>
                <div className={styles.caseCardHead}>
                  <span className={styles.caseArea}>Turma</span>
                  <span className={styles.studyTag}>{t.status}</span>
                </div>
                <h3>{t.nome}</h3>
                <div className={styles.caseMeta}>
                  <span>{t.studentsCount} aluno(s)</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

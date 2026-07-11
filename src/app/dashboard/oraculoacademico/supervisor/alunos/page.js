import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import { listSupervisorStudents } from "@/lib/oraculo/staff/supervisorRead";

import styles from "../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Alunos Supervisionados — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

const RELACAO_LABELS = {
  PROFESSOR: "Professor",
  ADVOGADO_CONHECIDO: "Advogado conhecido",
  ADVOGADO_ESCRITORIO: "Advogado do escritório onde estagia",
  COORDENADOR_ACADEMICO: "Coordenador acadêmico",
  MENTOR: "Mentor",
  OUTRO: "Outro",
};

export default async function SupervisorAlunosPage() {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  const students = await listSupervisorStudents({ authUserId: context.authUserId });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Acompanhamento</span>
          <h1>Alunos Supervisionados</h1>
          <p>Estudantes que indicaram você como supervisor jurídico.</p>
        </div>
      </section>

      <section className={styles.panel}>
        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={26} aria-hidden="true" />
            <p>Você ainda não possui alunos vinculados para supervisão.</p>
            <small>Quando um estudante indicar você e você aprovar, ele aparecerá aqui.</small>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {students.map((s) => (
              <article key={s.linkId} className={styles.caseCard}>
                <div className={styles.caseCardHead}>
                  <span className={styles.caseArea}>Estudante de Direito</span>
                  <span className={styles.studyTag}>{RELACAO_LABELS[s.relacao] || s.relacao}</span>
                </div>
                <h3>{s.student?.name || "Estudante"}</h3>
                <p>{s.student?.curso || s.student?.email}</p>
                <div className={styles.caseMeta}>
                  <span>Desde {new Date(s.since).toLocaleDateString("pt-BR")}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import { listStaffQuestions } from "@/lib/oraculo/notebook/notebookEntries";

import styles from "../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Perguntas dos Alunos — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

const STATUS_LABELS = { OPEN: "Aguardando resposta", STUDYING: "Estudando", ANSWERED: "Respondida" };

export default async function OrientadorPerguntasPage() {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  const questions = await listStaffQuestions({ authUserId: context.authUserId });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Dúvidas</span>
          <h1>Perguntas dos Alunos</h1>
          <p>Dúvidas acadêmicas e metodológicas enviadas pelos estudantes.</p>
        </div>
      </section>

      <section className={styles.panel}>
        {questions.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageCircleQuestion size={26} aria-hidden="true" />
            <p>Nenhuma pergunta enviada ainda.</p>
          </div>
        ) : (
          <div className={styles.claimList}>
            {questions.map((q) => (
              <Link
                key={q.id}
                href={`/dashboard/oraculoacademico/orientador/perguntas/${q.id}`}
                className={styles.claimRow}
              >
                <div>
                  <strong>{q.studentName}</strong>
                  <small>{q.content}</small>
                </div>
                <span className={styles.claimStatus}>
                  {STATUS_LABELS[q.question_status] || q.question_status}
                </span>
                <span className={styles.claimDeadline}>
                  {new Date(q.created_at).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

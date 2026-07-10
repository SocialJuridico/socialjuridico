import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";

import styles from "../OraculoStudentDashboard.module.css";

export const metadata = { title: "Meu Perfil — Oráculo Acadêmico" };

export default async function OraculoPerfilPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const rows = [
    ["Nome", context.studentName],
    ["E-mail", context.studentEmail || "—"],
    ["Curso", context.curso || "—"],
    ["Período atual", context.periodoAtual || "—"],
    ["Matrícula", context.matricula || "—"],
    ["Instituição", context.institutionName || "—"],
    ["Programa", context.programName || "Não vinculado"],
    ["Turma", context.className || "Sem turma"],
    ["Status acadêmico", context.studentStatus],
    ["Status do perfil", context.profileStatus || "—"],
  ];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Conta</span>
          <h1>Meu Perfil</h1>
          <p>Seus dados acadêmicos resolvidos no servidor a partir do seu vínculo.</p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>
            <UserCircle size={15} aria-hidden="true" /> Dados do estudante
          </span>
        </div>
        <dl className={styles.programList}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}

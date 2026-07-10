import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";

import styles from "../OraculoStudentDashboard.module.css";

export const metadata = { title: "Meu Supervisor — Oráculo Acadêmico" };

export default async function OraculoSupervisorPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const supervisors = context.supervisors || [];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Acompanhamento</span>
          <h1>Meu Supervisor</h1>
          <p>
            O supervisor (padrinho) acompanha sua conduta, ética e os limites
            profissionais da sua prática. Dúvidas e revisões acadêmicas vão ao seu
            orientador.
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        {supervisors.length > 0 ? (
          <div className={styles.caseGrid}>
            {supervisors.map((s) => (
              <article key={`${s.tipo}-${s.id}`} className={styles.caseCard}>
                <div className={styles.caseCardHead}>
                  <span className={styles.caseArea}>
                    {s.tipo === "FORMAL" ? "Supervisor formal" : "Padrinho"}
                  </span>
                  <span className={styles.studyTag}>{s.origem}</span>
                </div>
                <h3>{s.name}</h3>
                <dl className={styles.programList}>
                  {s.oab ? (
                    <div>
                      <dt>OAB</dt>
                      <dd>{`OAB/${s.oabUf || "??"} ${s.oab}`}</dd>
                    </div>
                  ) : null}
                  {s.relacaoLabel ? (
                    <div>
                      <dt>Relação</dt>
                      <dd>{s.relacaoLabel}</dd>
                    </div>
                  ) : null}
                  {s.cargo ? (
                    <div>
                      <dt>Cargo</dt>
                      <dd>{s.cargo}</dd>
                    </div>
                  ) : null}
                  {s.status ? (
                    <div>
                      <dt>Status</dt>
                      <dd>{s.status}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <ShieldCheck size={26} aria-hidden="true" />
            <p>Nenhum supervisor vinculado.</p>
            <small>
              O padrinho indicado no cadastro ou um supervisor formal da
              instituição aparece aqui.
            </small>
          </div>
        )}
      </section>
    </main>
  );
}

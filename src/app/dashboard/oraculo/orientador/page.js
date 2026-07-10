import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";

import styles from "../OraculoStudentDashboard.module.css";

export const metadata = { title: "Meu Orientador — Oráculo Acadêmico" };

export default async function OraculoOrientadorPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const orientator = context.orientator;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Acompanhamento</span>
          <h1>Meu Orientador</h1>
          <p>Professor orientador responsável pelo acompanhamento acadêmico.</p>
        </div>
      </section>

      <section className={styles.panel}>
        {orientator ? (
          <dl className={styles.programList}>
            <div>
              <dt>
                <UserCog size={15} aria-hidden="true" /> Nome
              </dt>
              <dd>{orientator.name}</dd>
            </div>
            <div>
              <dt>Cargo</dt>
              <dd>{orientator.cargo || "Professor orientador"}</dd>
            </div>
          </dl>
        ) : (
          <div className={styles.emptyState}>
            <UserCog size={26} aria-hidden="true" />
            <p>Nenhum professor orientador vinculado.</p>
            <small>A instituição define o orientador do seu vínculo acadêmico.</small>
          </div>
        )}
      </section>
    </main>
  );
}

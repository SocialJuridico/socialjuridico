import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Timer } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";

import styles from "../OraculoStudentDashboard.module.css";

export const metadata = { title: "Carga Horária — Oráculo Acadêmico" };

function metaHoursFrom(programRules) {
  if (!programRules || typeof programRules !== "object") return null;
  const candidates = [
    programRules.meta_horas,
    programRules.carga_horaria_meta,
    programRules.carga_horaria_minima,
    programRules.horas_meta,
  ];
  const found = candidates.find((value) => Number(value) > 0);
  return found ? Number(found) : null;
}

export default async function OraculoCargaHorariaPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const minutos = context.horasReconhecidasMinutos || 0;
  const horas = Math.floor(minutos / 60);
  const restanteMin = minutos % 60;
  const meta = metaHoursFrom(context.programRules);
  const progresso = meta ? Math.min(100, Math.round((horas / meta) * 100)) : null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Minha evolução</span>
          <h1>Carga Horária</h1>
          <p>Horas reconhecidas na sua prática jurídica supervisionada.</p>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <strong>
            {horas}h{restanteMin ? ` ${restanteMin}min` : ""}
          </strong>
          <span>Horas reconhecidas</span>
          <small>{context.atividadesRegistradas || 0} atividade(s) registrada(s)</small>
        </div>
        <div className={styles.metricCard}>
          <strong>{meta ? `${meta}h` : "—"}</strong>
          <span>Meta do programa</span>
          <small>{meta ? "Definida nas regras do programa" : "Ainda não configurada"}</small>
        </div>
        <div className={styles.metricCard}>
          <strong>{progresso !== null ? `${progresso}%` : "—"}</strong>
          <span>Progresso</span>
          <small>{meta ? `Faltam ${Math.max(0, meta - horas)}h` : "Sem meta definida"}</small>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.emptyState}>
          <Timer size={26} aria-hidden="true" />
          <p>Detalhamento por atividade entra na próxima fase.</p>
          <small>
            As horas são somadas a partir das atividades acadêmicas reconhecidas
            pelo supervisor no seu vínculo com o programa.
          </small>
        </div>
      </section>
    </main>
  );
}

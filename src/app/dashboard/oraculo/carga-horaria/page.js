import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Timer } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import {
  listStudentActivities,
  ACTIVITY_TYPE_LABELS,
  RECOGNITION_STATUS_LABELS,
} from "@/lib/oraculo/oraculoActivities";

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

  const activities = await listStudentActivities({ oraculoId: context.oraculoId });

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
        <div className={styles.panelHeader}>
          <h2>Atividades registradas</h2>
        </div>
        {activities.length === 0 ? (
          <div className={styles.emptyState}>
            <Timer size={26} aria-hidden="true" />
            <p>Nenhuma atividade registrada ainda.</p>
            <small>
              Fichamentos concluídos, questões de estudo respondidas, notas de
              caso e fontes usadas em análises geram atividades aqui —
              aguardando reconhecimento da instituição para contar como hora.
            </small>
          </div>
        ) : (
          <div className={styles.claimList}>
            {activities.map((a) => (
              <div key={a.id} className={styles.claimRow}>
                <div>
                  <strong>{ACTIVITY_TYPE_LABELS[a.tipo_atividade] || a.tipo_atividade}</strong>
                  <small>
                    {a.titulo}
                    {a.conta_carga_horaria ? ` · ${a.tempo_registrado_minutos || 0}min` : ""}
                  </small>
                </div>
                <span className={styles.claimStatus}>
                  {a.conta_carga_horaria
                    ? RECOGNITION_STATUS_LABELS[a.reconhecimento_status] || a.reconhecimento_status
                    : "Não conta horas"}
                </span>
                <span className={styles.claimDeadline}>
                  {new Date(a.completed_at || a.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircleQuestion, ShieldAlert, Users } from "lucide-react";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import { getSupervisorHomeStats } from "@/lib/oraculo/staff/supervisorRead";
import { listStaffQuestions } from "@/lib/oraculo/notebook/notebookEntries";
import { listSupervisorAlerts, countPendingAlerts } from "@/lib/oraculo/staff/supervisorAlerts";
import { countUnviewedConductReportsForSupervisor } from "@/lib/oraculo/radarAcademic/professionalConductReport";

import styles from "../../oraculo/OraculoStudentDashboard.module.css";

export const dynamic = "force-dynamic";

export default async function SupervisorHomePage() {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  const [stats, pending, pendingAlertsCount, criticalAlerts, newReportsCount] = await Promise.all([
    getSupervisorHomeStats({ authUserId: context.authUserId }),
    listStaffQuestions({ authUserId: context.authUserId, answered: false, limit: 6 }),
    countPendingAlerts({ authUserId: context.authUserId }),
    listSupervisorAlerts({ authUserId: context.authUserId, status: "PENDING", limit: 5 }),
    countUnviewedConductReportsForSupervisor({ authUserId: context.authUserId }),
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Supervisão jurídica</span>
          <h1>Bem-vindo, {context.name}</h1>
          <p>
            Acompanhe os estudantes supervisionados e responda dúvidas
            jurídicas enviadas por eles.
          </p>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <strong>{stats.studentsCount}</strong>
          <span>Alunos supervisionados</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{stats.pendingQuestions}</strong>
          <span>Perguntas aguardando resposta</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{pendingAlertsCount}</strong>
          <span>Alertas pendentes</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{newReportsCount}</strong>
          <span>Relatórios de conduta novos</span>
        </div>
      </section>

      {criticalAlerts.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>
              <ShieldAlert size={18} aria-hidden="true" /> Atenção prioritária
            </h2>
            <Link href="/dashboard/oraculoacademico/supervisor/alertas" className={styles.backLink}>
              Ver todos
            </Link>
          </div>
          <p className={`${styles.simBanner} ${styles.simBannerBlock}`}>
            Há alertas de conduta aguardando revisão.
          </p>
          <div className={styles.claimList}>
            {criticalAlerts.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/oraculoacademico/supervisor/alertas/${a.id}`}
                className={styles.claimRow}
              >
                <div>
                  <strong>{a.studentName}</strong>
                  <small>{a.problematic_excerpt || a.flags?.[0]}</small>
                </div>
                <span
                  className={`${styles.level} ${a.risk_level === "CRITICAL" ? styles.critical : styles.attention}`}
                >
                  {a.risk_level}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>
            <MessageCircleQuestion size={18} aria-hidden="true" /> Pendências de supervisão
          </h2>
          <Link href="/dashboard/oraculoacademico/supervisor/perguntas" className={styles.backLink}>
            Ver todas
          </Link>
        </div>
        {pending.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={26} aria-hidden="true" />
            <p>Nenhum alerta pendente.</p>
            <small>Perguntas dos estudantes que exigirem sua resposta aparecerão aqui.</small>
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
                  href={`/dashboard/oraculoacademico/supervisor/perguntas/${q.id}`}
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

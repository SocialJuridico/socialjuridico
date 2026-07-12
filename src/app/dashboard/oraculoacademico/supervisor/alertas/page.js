import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import { listSupervisorAlerts } from "@/lib/oraculo/staff/supervisorAlerts";

import styles from "../../../oraculo/OraculoStudentDashboard.module.css";

export const metadata = { title: "Alertas do Anjo — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

const RISK_LABELS = { HIGH: "ALTO", CRITICAL: "CRÍTICO" };
const STATUS_LABELS = {
  PENDING: "Aguardando revisão",
  CONFIRMED: "Confirmado",
  FALSE_POSITIVE: "Falso positivo",
  ESCALATED: "Escalado à instituição",
};
const FLAG_LABELS = {
  PROMISE_OF_RESULT: "Promessa de resultado",
  LAWYER_IMPERSONATION: "Apresentação indevida como advogado",
  PRIVACY_RISK: "Risco à privacidade",
  MISLEADING_CERTAINTY: "Certeza jurídica enganosa",
  FRAUD: "Orientação de fraude",
  OTHER: "Outro",
};

export default async function SupervisorAlertasPage() {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  const alerts = await listSupervisorAlerts({ authUserId: context.authUserId });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Conduta</span>
          <h1>Alertas do Anjo</h1>
          <p>
            Mensagens de estudantes bloqueadas pelo guardião de conduta por
            risco alto ou crítico, aguardando sua revisão.
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        {alerts.length === 0 ? (
          <div className={styles.emptyState}>
            <ShieldAlert size={26} aria-hidden="true" />
            <p>Nenhum alerta pendente.</p>
            <small>
              As intervenções do Anjo Acadêmico que exigirem sua revisão
              aparecerão aqui.
            </small>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/oraculoacademico/supervisor/alertas/${a.id}`}
                className={styles.caseCard}
              >
                <div className={styles.caseCardHead}>
                  <span className={`${styles.level} ${a.risk_level === "CRITICAL" ? styles.critical : styles.attention}`}>
                    ALERTA {RISK_LABELS[a.risk_level] || a.risk_level}
                  </span>
                  <span className={styles.callTag}>{STATUS_LABELS[a.status] || a.status}</span>
                </div>
                <h3>{a.studentName}</h3>
                <p>{FLAG_LABELS[a.flags?.[0]] || a.flags?.[0] || "Motivo não classificado"}</p>
                {a.problematic_excerpt && (
                  <p className={styles.muted}>&ldquo;{a.problematic_excerpt}&rdquo;</p>
                )}
                <div className={styles.caseMeta}>
                  <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

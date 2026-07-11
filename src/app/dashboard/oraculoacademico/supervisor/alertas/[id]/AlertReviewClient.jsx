"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

import styles from "../../../../oraculo/OraculoStudentDashboard.module.css";

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
  OTHER: "Outro",
};
const ACTION_LABELS = { BLOCK: "Mensagem bloqueada", BLOCK_AND_ESCALATE: "Mensagem bloqueada e escalada" };

export default function AlertReviewClient({ id, initialAlert, student }) {
  const [alert, setAlert] = useState(initialAlert);
  const [comment, setComment] = useState(alert.review_comment || "");
  const [orientation, setOrientation] = useState(alert.student_orientation || "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const reviewed = alert.status !== "PENDING";

  async function decide(decision) {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/oraculoacademico/supervisor/alertas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment, studentOrientation: orientation }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setAlert((prev) => ({ ...prev, status: decision }));
        setFeedback({ type: "success", text: "Revisão registrada." });
      } else {
        setFeedback({ type: "error", text: payload?.message || "Não foi possível registrar." });
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de rede." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href="/dashboard/oraculoacademico/supervisor/alertas" className={styles.backLink}>
        Voltar
      </Link>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Alerta do Anjo</span>
          <h1>{student?.name || "Estudante"}</h1>
          <small className={styles.heroMeta}>
            {student?.curso || student?.email} · {STATUS_LABELS[alert.status] || alert.status}
          </small>
        </div>
        <span
          className={`${styles.level} ${alert.risk_level === "CRITICAL" ? styles.critical : styles.attention}`}
        >
          ALERTA {RISK_LABELS[alert.risk_level] || alert.risk_level}
        </span>
      </section>

      {feedback && (
        <div
          className={`${styles.feedback} ${
            feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess
          }`}
        >
          {feedback.text}
        </div>
      )}

      <section className={styles.panel}>
        <div className={styles.mesaField}>
          <label>Motivo</label>
          <p className={styles.muted}>
            {(alert.flags || []).map((f) => FLAG_LABELS[f] || f).join(", ") || "Não classificado"}
          </p>
        </div>
        {alert.problematic_excerpt && (
          <div className={styles.mesaField}>
            <label>Trecho problemático</label>
            <textarea value={alert.problematic_excerpt} readOnly rows={2} />
          </div>
        )}
        <div className={styles.mesaField}>
          <label>Ação automática</label>
          <p className={styles.muted}>{ACTION_LABELS[alert.ai_action_taken] || alert.ai_action_taken}</p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Sua revisão</h2>
        </div>
        <div className={styles.mesaField}>
          <label>Observação (interna)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Observações sobre o caso…"
          />
        </div>
        <div className={styles.mesaField}>
          <label>Orientação ao estudante</label>
          <textarea
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            rows={3}
            placeholder="O que o estudante deve ajustar na comunicação…"
          />
        </div>
        <div className={styles.encaminhaBtns}>
          <button type="button" onClick={() => decide("CONFIRMED")} disabled={busy}>
            <ShieldCheck size={14} aria-hidden="true" /> Confirmar alerta
          </button>
          <button type="button" onClick={() => decide("FALSE_POSITIVE")} disabled={busy}>
            <ShieldX size={14} aria-hidden="true" /> Falso positivo
          </button>
          <button type="button" onClick={() => decide("ESCALATED")} disabled={busy}>
            <ShieldAlert size={14} aria-hidden="true" /> Escalar à instituição
          </button>
        </div>
        {reviewed && <p className={styles.savedTick}>Já revisado — você pode atualizar a decisão acima.</p>}
      </section>
    </main>
  );
}

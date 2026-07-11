"use client";

import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";

import styles from "../../oraculo/OraculoStudentDashboard.module.css";

const STATUS_LABELS = {
  OPEN: "Em aberto",
  STUDYING: "Estudando",
  ANSWERED: "Respondida",
};

export default function QuestionAnswerClient({ id, apiBase, backHref, initialQuestion, initialStudent }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialQuestion.answer_notes || "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const answered = question.question_status === "ANSWERED";

  async function submit() {
    if (!answer.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerNotes: answer }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setQuestion(payload.data);
        setFeedback({ type: "success", text: "Resposta enviada ao estudante." });
      } else {
        setFeedback({ type: "error", text: payload?.message || "Não foi possível enviar." });
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de rede." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href={backHref} className={styles.backLink}>
        Voltar
      </Link>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pergunta do aluno</span>
          <h1>{initialStudent?.name || "Estudante"}</h1>
          <small className={styles.heroMeta}>
            {question.case_title_snapshot || "Sem caso vinculado"} ·{" "}
            {STATUS_LABELS[question.question_status] || question.question_status}
          </small>
        </div>
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
          <label>Pergunta</label>
          <textarea value={question.content} readOnly rows={3} />
        </div>

        <div className={styles.mesaField}>
          <label>Sua resposta</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Escreva sua orientação para o estudante…"
          />
        </div>

        <button
          type="button"
          className={styles.caseCta}
          onClick={submit}
          disabled={busy || !answer.trim()}
        >
          <Send size={15} aria-hidden="true" />
          {busy ? "Enviando…" : answered ? "Atualizar resposta" : "Enviar resposta"}
        </button>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, Send } from "lucide-react";

import styles from "../../../../OraculoStudentDashboard.module.css";

const AXIS_LABELS = {
  specialty: "Especialidade e foco de atuação",
  transparency: "Transparência na primeira consulta",
  ethics: "Ética e conhecimento",
};

export default function EntrevistaClient({
  caseId,
  caseTitle,
  caseCode,
  canAct,
  initialInterview,
  initialMessages,
  initialEvaluation,
}) {
  const [status, setStatus] = useState(initialInterview?.status || "NOT_STARTED");
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [report, setReport] = useState(
    initialInterview?.status === "COMPLETED"
      ? { evaluation: initialEvaluation, summary: initialInterview.summary_stats }
      : null,
  );

  const visibleMessages = messages.filter((m) => m.senderType !== "SYSTEM");

  async function iniciar() {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/oraculo/casos/radar/${caseId}/entrevista/iniciar`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setBanner({ type: "error", text: payload?.message || "Não foi possível iniciar." });
      } else {
        setStatus(payload.data?.interview?.status || "ACTIVE");
        setMessages(payload.data?.messages || []);
      }
    } catch {
      setBanner({ type: "error", text: "Falha de rede. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  async function enviar() {
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/oraculo/casos/radar/${caseId}/entrevista/mensagens`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const payload = await res.json().catch(() => null);

      if (res.status === 422 && payload?.blocked) {
        setBanner({
          type: "block",
          text: "Atenção à sua comunicação. Reformule considerando os limites da atividade acadêmica.",
          excerpt: payload.conduct?.excerpt,
        });
        return;
      }
      if (!res.ok || !payload?.success) {
        setBanner({ type: "error", text: payload?.message || "Não foi possível enviar." });
        return;
      }

      setMessages((prev) => [
        ...prev,
        payload.data.studentMessage,
        payload.data.clientMessage,
      ]);
      setInput("");
      if (payload.data.conductWarning) {
        setBanner({
          type: "warning",
          text: `Cautela: ${payload.data.conductWarning.reason || "revise a comunicação."}`,
        });
      }
    } catch {
      setBanner({ type: "error", text: "Falha de rede. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  async function encerrar() {
    if (busy) return;
    if (!window.confirm("Deseja encerrar o atendimento jurídico simulado? A conversa continuará disponível para consulta.")) {
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/oraculo/casos/radar/${caseId}/entrevista/encerrar`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setBanner({ type: "error", text: payload?.message || "Não foi possível encerrar." });
      } else {
        setStatus("COMPLETED");
        setReport({
          evaluation: payload.data?.evaluation,
          summary: payload.data?.summary,
        });
      }
    } catch {
      setBanner({ type: "error", text: "Falha de rede." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link
        href={`/dashboard/oraculo/casos/radar/${caseId}`}
        className={styles.backLink}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Voltar ao dossiê
      </Link>

      <section className={styles.simHeader}>
        <div>
          <span className={styles.simBadge}>
            <Bot size={13} aria-hidden="true" /> SIMULAÇÃO PROFISSIONAL
          </span>
          <h1>Atendimento Jurídico Simulado</h1>
          <small>
            Cliente simulado por IA · {caseCode} — {caseTitle}
          </small>
        </div>
      </section>

      {banner && (
        <div
          className={`${styles.simBanner} ${
            banner.type === "block"
              ? styles.simBannerBlock
              : banner.type === "warning"
                ? styles.simBannerWarn
                : styles.feedbackError
          }`}
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {banner.text}
            {banner.excerpt ? (
              <em className={styles.simExcerpt}> “{banner.excerpt}”</em>
            ) : null}
          </span>
        </div>
      )}

      {status === "NOT_STARTED" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.kicker}>Atendimento Jurídico Simulado</span>
            <h2>Antes de iniciar</h2>
          </div>
          <p className={styles.simIntro}>
            Este é um ambiente de treinamento com cliente simulado por
            inteligência artificial. Neste caso do Radar Acadêmico, você pode
            atuar como advogado em uma simulação profissional: conduzir a
            primeira consulta, explicar possibilidades jurídicas, orientar
            próximos passos simulados e demonstrar seu raciocínio profissional.
            A IA responde apenas com base nas informações do dossiê acadêmico e
            não inventa informação indisponível. Esta simulação não envolve
            cliente real e não gera atendimento jurídico real. Sua atuação
            poderá ser analisada para fins de atividade acadêmica.
          </p>
          <button
            type="button"
            className={styles.caseCta}
            onClick={iniciar}
            disabled={busy || !canAct}
          >
            {busy ? "Iniciando…" : "Iniciar atendimento simulado"}
          </button>
          {!canAct && (
            <p className={styles.muted}>
              Seu vínculo acadêmico precisa estar ativo.
            </p>
          )}
        </section>
      )}

      {status !== "NOT_STARTED" && (
        <section className={styles.chatPanel}>
          <div className={styles.chatMessages}>
            {visibleMessages.length === 0 ? (
              <p className={styles.muted}>
                Faça a primeira pergunta ao cliente simulado.
              </p>
            ) : (
              visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.chatMsg} ${
                    m.senderType === "STUDENT"
                      ? styles.chatMsgStudent
                      : styles.chatMsgClient
                  }`}
                >
                  <span className={styles.chatWho}>
                    {m.senderType === "STUDENT" ? "Você" : "Cliente simulado"}
                  </span>
                  <p>{m.content}</p>
                  {m.conductRisk === "MEDIUM" && (
                    <small className={styles.chatConduct}>
                      Cautela comunicacional sinalizada
                    </small>
                  )}
                </div>
              ))
            )}
          </div>

          {status === "ACTIVE" && (
            <div className={styles.chatComposer}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Digite sua mensagem ao cliente simulado…"
                rows={2}
                disabled={busy}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    enviar();
                  }
                }}
              />
              <div className={styles.chatComposerActions}>
                <button
                  type="button"
                  className={styles.chatSend}
                  onClick={enviar}
                  disabled={busy || !input.trim()}
                >
                  <Send size={15} aria-hidden="true" /> Enviar
                </button>
                <button
                  type="button"
                  className={styles.chatEnd}
                  onClick={encerrar}
                  disabled={busy}
                >
                  Encerrar atendimento
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {status === "COMPLETED" && report && (
        <InterviewReport report={report} caseId={caseId} />
      )}
    </main>
  );
}

function InterviewReport({ report, caseId }) {
  const evaluation = report.evaluation;
  const summary = report.summary || {};

  if (!evaluation) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Relatório do atendimento simulado</span>
          <h2>Avaliação indisponível</h2>
        </div>
        <p className={styles.muted}>
          Não foi possível gerar a avaliação por IA deste atendimento. A
          conversa continua disponível para consulta.
        </p>
        <Link
          href={`/dashboard/oraculo/casos/radar/${caseId}`}
          className={styles.dossieSecondaryCta}
        >
          Continuar análise
        </Link>
      </section>
    );
  }

  const axes = [
    {
      key: "specialty",
      score: evaluation.specialty_focus_score,
      level: evaluation.specialty_focus_level,
      feedback: evaluation.specialty_focus_feedback,
    },
    {
      key: "transparency",
      score: evaluation.first_consultation_transparency_score,
      level: evaluation.first_consultation_transparency_level,
      feedback: evaluation.first_consultation_transparency_feedback,
    },
    {
      key: "ethics",
      score: evaluation.ethics_and_knowledge_score,
      level: evaluation.ethics_and_knowledge_level,
      feedback: evaluation.ethics_and_knowledge_feedback,
    },
  ];

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Relatório do atendimento simulado</span>
          <h2>Avaliação do atendimento — {evaluation.overall_score}/100</h2>
        </div>
        <div className={styles.indicatorGrid}>
          {axes.map((axis) => (
            <div key={axis.key} className={styles.indicatorRow}>
              <span>
                {AXIS_LABELS[axis.key]}
                <br />
                <small className={styles.muted}>{axis.level}</small>
              </span>
              <strong>{axis.score}/100</strong>
            </div>
          ))}
        </div>
        <div className={styles.simStats}>
          <span>{summary.questions ?? 0} perguntas</span>
          <span>{summary.conductWarnings ?? 0} alerta(s) de conduta</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Feedback acadêmico</span>
        </div>
        <div className={styles.feedbackBlocks}>
          <div>
            <h3>Resumo</h3>
            <p>{evaluation.summary || "—"}</p>
          </div>
          {axes.map((axis) => (
            <div key={axis.key}>
              <h3>{AXIS_LABELS[axis.key]}</h3>
              <p>{axis.feedback || "—"}</p>
            </div>
          ))}
          <div>
            <h3>Pontos fortes</h3>
            <p>{(evaluation.strengths || []).join(" ") || "—"}</p>
          </div>
          <div>
            <h3>Pontos de melhoria</h3>
            <p>{(evaluation.development_points || []).join(" ") || "—"}</p>
          </div>
          {evaluation.critical_flags?.length > 0 && (
            <div>
              <h3>Pontos de atenção</h3>
              <p>{evaluation.critical_flags.join(" ")}</p>
            </div>
          )}
        </div>
        <p className={styles.muted}>
          Avaliação gerada por IA para fins de apoio acadêmico. A validação
          final cabe ao Supervisor, Orientador ou instituição, conforme
          regras do programa.
        </p>
        <Link
          href={`/dashboard/oraculo/casos/radar/${caseId}`}
          className={styles.dossieSecondaryCta}
        >
          Continuar análise
        </Link>
      </section>
    </>
  );
}

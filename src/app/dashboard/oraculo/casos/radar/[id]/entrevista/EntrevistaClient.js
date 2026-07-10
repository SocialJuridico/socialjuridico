"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, Send } from "lucide-react";

import styles from "../../../../OraculoStudentDashboard.module.css";

const INDICATOR_LABELS = {
  clareza_comunicacao: "Clareza na comunicação",
  coleta_informacoes: "Coleta de informações",
  organizacao_entrevista: "Organização da entrevista",
  cautela_juridica: "Cautela jurídica",
  linguagem_acessivel: "Linguagem acessível",
  conduta_comunicacional: "Conduta comunicacional",
};

export default function EntrevistaClient({
  caseId,
  caseTitle,
  caseCode,
  canAct,
  initialInterview,
  initialMessages,
}) {
  const [status, setStatus] = useState(initialInterview?.status || "NOT_STARTED");
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [report, setReport] = useState(
    initialInterview?.status === "COMPLETED"
      ? {
          indicators: initialInterview.indicators,
          feedback: initialInterview.ai_feedback,
          summary: initialInterview.summary_stats,
        }
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
    if (!window.confirm("Deseja encerrar a entrevista simulada? A conversa continuará disponível para consulta.")) {
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
          indicators: payload.data?.indicators,
          feedback: payload.data?.feedback,
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
            <Bot size={13} aria-hidden="true" /> SIMULAÇÃO IA
          </span>
          <h1>Cliente simulado</h1>
          <small>
            Entrevista acadêmica por IA · {caseCode} — {caseTitle}
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
            <span className={styles.kicker}>Entrevista simulada</span>
            <h2>Antes de iniciar</h2>
          </div>
          <p className={styles.simIntro}>
            Você iniciará uma conversa com um cliente simulado por inteligência
            artificial. A IA responderá apenas com base nas informações do dossiê
            acadêmico. Quando uma informação não estiver disponível, o cliente
            simulado não deverá inventá-la. Sua comunicação poderá ser analisada
            para fins de atividade acadêmica.
          </p>
          <button
            type="button"
            className={styles.caseCta}
            onClick={iniciar}
            disabled={busy || !canAct}
          >
            {busy ? "Iniciando…" : "Iniciar entrevista"}
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
                placeholder="Digite sua pergunta ao cliente simulado…"
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
                  Encerrar entrevista
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
  const indicators = report.indicators || {};
  const feedback = report.feedback || {};
  const summary = report.summary || {};

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Relatório da entrevista simulada</span>
          <h2>Indicadores de comunicação</h2>
        </div>
        <div className={styles.indicatorGrid}>
          {Object.entries(INDICATOR_LABELS).map(([key, label]) => (
            <div key={key} className={styles.indicatorRow}>
              <span>{label}</span>
              <strong>{indicators[key] ?? "—"}</strong>
            </div>
          ))}
        </div>
        <div className={styles.simStats}>
          <span>{summary.questions ?? 0} perguntas</span>
          <span>{summary.conductWarnings ?? 0} alerta(s) de conduta</span>
          <span>{summary.blockedCount ?? 0} mensagem(ns) bloqueada(s)</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Feedback acadêmico</span>
        </div>
        <div className={styles.feedbackBlocks}>
          <div>
            <h3>Pontos observados</h3>
            <p>{feedback.pontos_observados || "—"}</p>
          </div>
          <div>
            <h3>Pontos para desenvolvimento</h3>
            <p>{feedback.pontos_para_desenvolvimento || "—"}</p>
          </div>
          <div>
            <h3>Cautela comunicacional</h3>
            <p>{feedback.cautela_comunicacional || "—"}</p>
          </div>
        </div>
        <p className={styles.muted}>
          Estes indicadores são evidência acadêmica, não uma nota final.
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

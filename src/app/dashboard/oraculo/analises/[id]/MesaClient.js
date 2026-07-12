"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  HelpCircle,
  MessageSquare,
  NotebookPen,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";

import styles from "../../OraculoStudentDashboard.module.css";

const SECTIONS = [
  {
    key: "problema_identificado",
    label: "Problema identificado",
    placeholder: "Qual é o problema jurídico central do caso?",
  },
  {
    key: "fatos_relevantes",
    label: "Fatos juridicamente relevantes",
    placeholder: "Organize os fatos que importam para a análise.",
  },
  {
    key: "informacoes_faltantes",
    label: "Informações faltantes",
    placeholder: "O que ainda precisa ser esclarecido?",
  },
  {
    key: "questoes_pesquisa",
    label: "Questões de pesquisa",
    placeholder: "Quais questões você precisa pesquisar?",
  },
  {
    key: "analise_inicial",
    label: "Análise inicial",
    placeholder: "Desenvolva sua análise a partir dos fatos e das fontes.",
  },
  {
    key: "encaminhamento",
    label: "Encaminhamento",
    placeholder: "Qual encaminhamento acadêmico você propõe?",
  },
];

const STATUS_LABELS = {
  EM_ANDAMENTO: "Em andamento",
  ENVIADA_REVISAO: "Aguardando revisão",
  AJUSTE_SOLICITADO: "Correção solicitada",
  APROVADA: "Aprovada",
  CONCLUIDA: "Concluída",
};

function computeSteps(values, sourcesCount, status) {
  const f = (v) => Boolean(v && String(v).trim());
  return [
    { label: "Compreensão", done: f(values.problema_identificado) },
    { label: "Fatos", done: f(values.fatos_relevantes) },
    { label: "Pesquisa", done: f(values.questoes_pesquisa) || sourcesCount > 0 },
    { label: "Análise", done: f(values.analise_inicial) },
    { label: "Encaminhamento", done: f(values.encaminhamento) },
    {
      label: "Revisão",
      done: ["ENVIADA_REVISAO", "APROVADA", "CONCLUIDA"].includes(status),
    },
  ];
}

export default function MesaClient({
  analiseId,
  initialAnalysis,
  initialSources,
  caseView,
  editable: initialEditable,
  canAct,
  initialNotebookEntries,
  hasOrientator,
  hasSupervisor,
}) {
  const [values, setValues] = useState(() => {
    const v = {};
    for (const s of SECTIONS) v[s.key] = initialAnalysis[s.key] || "";
    return v;
  });
  const [saved, setSaved] = useState(() => ({ ...values }));
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [status, setStatus] = useState(initialAnalysis.status);
  const [sources, setSources] = useState(initialSources || []);
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newSource, setNewSource] = useState({ titulo: "", referencia: "" });
  const [cienciaSupervisor, setCienciaSupervisor] = useState(false);

  const editable =
    initialEditable && ["EM_ANDAMENTO", "AJUSTE_SOLICITADO"].includes(status);

  const steps = useMemo(
    () => computeSteps(values, sources.length, status),
    [values, sources.length, status],
  );

  async function saveField(key) {
    if (!editable || values[key] === saved[key]) return;
    setSavingKey(key);
    try {
      const res = await fetch(`/api/oraculo/analises/${analiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: values[key] }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setSaved((prev) => ({ ...prev, [key]: values[key] }));
        setSavedKey(key);
        setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
      } else {
        setBanner({ type: "error", text: payload?.message || "Não foi possível salvar." });
      }
    } catch {
      setBanner({ type: "error", text: "Falha de rede ao salvar." });
    } finally {
      setSavingKey((k) => (k === key ? null : k));
    }
  }

  async function addSource() {
    const titulo = newSource.titulo.trim();
    if (!titulo) return;
    try {
      const res = await fetch(`/api/oraculo/analises/${analiseId}/fontes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSource),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setSources((prev) => [...prev, payload.data]);
        setNewSource({ titulo: "", referencia: "" });
      } else {
        setBanner({ type: "error", text: payload?.message || "Não foi possível adicionar." });
      }
    } catch {
      setBanner({ type: "error", text: "Falha de rede." });
    }
  }

  async function removeSource(sourceId) {
    try {
      const res = await fetch(
        `/api/oraculo/analises/${analiseId}/fontes?sourceId=${sourceId}`,
        { method: "DELETE" },
      );
      if (res.ok) setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch {
      /* silencioso */
    }
  }

  async function enviarRevisao() {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/oraculo/analises/${analiseId}/enviar-revisao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cienciaSupervisor }),
        },
      );
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setStatus("ENVIADA_REVISAO");
        setBanner({ type: "success", text: payload.message });
      } else {
        setBanner({ type: "error", text: payload?.message || "Não foi possível enviar." });
      }
    } catch {
      setBanner({ type: "error", text: "Falha de rede." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href="/dashboard/oraculo/analises" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Minhas Análises
      </Link>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Mesa de Análise Jurídica</span>
          <h1>{initialAnalysis.titulo || "Análise"}</h1>
          <small className={styles.heroMeta}>
            {initialAnalysis.area || "Área"} · {STATUS_LABELS[status] || status}
          </small>
        </div>
      </section>

      <div className={styles.stepsBar}>
        {steps.map((step) => (
          <div
            key={step.label}
            className={`${styles.step} ${step.done ? styles.stepDone : ""}`}
          >
            <span className={styles.stepDot}>{step.done ? <Check size={12} /> : null}</span>
            {step.label}
          </div>
        ))}
      </div>

      {banner && (
        <div
          className={`${styles.feedback} ${
            banner.type === "error" ? styles.feedbackError : styles.feedbackSuccess
          }`}
        >
          {banner.text}
        </div>
      )}

      {status === "AJUSTE_SOLICITADO" && initialAnalysis.revisao_feedback && (
        <div className={styles.simBannerWarn}>
          Correção solicitada: {initialAnalysis.revisao_feedback}
        </div>
      )}

      <div className={styles.mesaGrid}>
        <section className={styles.mesaCol}>
          <h2 className={styles.mesaColTitle}>Caso</h2>
          {caseView ? (
            <CasoColumn caseView={caseView} caseId={initialAnalysis.radar_academic_case_id} />
          ) : (
            <p className={styles.muted}>Detalhes do caso indisponíveis.</p>
          )}
        </section>

        <section className={styles.mesaCol}>
          <h2 className={styles.mesaColTitle}>Minha análise</h2>
          {SECTIONS.map((section) => (
            <div key={section.key} className={styles.mesaField}>
              <label>
                {section.label}
                {savingKey === section.key && <em> · salvando…</em>}
                {savedKey === section.key && <em className={styles.savedTick}> · salvo</em>}
              </label>
              <textarea
                value={values[section.key]}
                placeholder={section.placeholder}
                readOnly={!editable}
                rows={3}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [section.key]: e.target.value }))
                }
                onBlur={() => saveField(section.key)}
              />
            </div>
          ))}

          {editable && (
            <div className={styles.reviewBox}>
              <label className={styles.cienciaCheck}>
                <input
                  type="checkbox"
                  checked={cienciaSupervisor}
                  onChange={(e) => setCienciaSupervisor(e.target.checked)}
                />
                Dar ciência ao supervisor (conduta)
              </label>
              <button
                type="button"
                className={styles.caseCta}
                onClick={enviarRevisao}
                disabled={submitting || !canAct}
              >
                <Send size={15} aria-hidden="true" />
                {submitting ? "Enviando…" : "Enviar para revisão do orientador"}
              </button>
            </div>
          )}
          {!editable && status !== "AJUSTE_SOLICITADO" && (
            <p className={styles.muted}>
              Esta análise foi enviada e está em revisão do orientador.
            </p>
          )}
        </section>

        <section className={styles.mesaCol}>
          <h2 className={styles.mesaColTitle}>Pesquisa e fontes</h2>

          <div className={styles.mesaField}>
            <label>Fontes consultadas</label>
            {sources.length === 0 ? (
              <p className={styles.muted}>Nenhuma fonte adicionada.</p>
            ) : (
              <ul className={styles.sourceList}>
                {sources.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.titulo}</strong>
                      {s.referencia ? <small>{s.referencia}</small> : null}
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => removeSource(s.id)}
                        aria-label="Remover fonte"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {editable && (
            <div className={styles.sourceForm}>
              <input
                placeholder="Fonte (ex: CDC — Art. 6º)"
                value={newSource.titulo}
                onChange={(e) => setNewSource((p) => ({ ...p, titulo: e.target.value }))}
              />
              <input
                placeholder="Referência / observação (opcional)"
                value={newSource.referencia}
                onChange={(e) => setNewSource((p) => ({ ...p, referencia: e.target.value }))}
              />
              <button type="button" onClick={addSource} disabled={!newSource.titulo.trim()}>
                <Plus size={14} aria-hidden="true" /> Adicionar fonte
              </button>
            </div>
          )}

          <EncaminhamentoPanel analiseId={analiseId} canAct={canAct} />

          <div className={styles.mesaLinks}>
            <Link href="/dashboard/oraculo/biblioteca">
              <BookOpen size={14} aria-hidden="true" /> Biblioteca Jurídica
            </Link>
            <Link href="/dashboard/oraculo/caderno">
              <NotebookPen size={14} aria-hidden="true" /> Meu Caderno
            </Link>
            <Link href="/dashboard/oraculo/orientador">
              <UserCog size={14} aria-hidden="true" /> Meu Orientador
            </Link>
            <Link href="/dashboard/oraculo/supervisor">
              <ShieldCheck size={14} aria-hidden="true" /> Meu Supervisor
            </Link>
          </div>
        </section>
      </div>

      <CadernoPanel
        analiseId={analiseId}
        initialEntries={initialNotebookEntries || []}
        editable={editable}
        hasOrientator={hasOrientator}
        hasSupervisor={hasSupervisor}
      />
    </main>
  );
}

function CadernoPanel({ analiseId, initialEntries, editable, hasOrientator, hasSupervisor }) {
  const [entries, setEntries] = useState(initialEntries);
  const [noteDraft, setNoteDraft] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionTarget, setQuestionTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const notes = entries.filter((e) => e.entry_type === "CASE_NOTE");
  const questions = entries.filter((e) => e.entry_type === "STUDY_QUESTION");

  async function create(entryType, content, reset, extra = {}) {
    const text = content.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/oraculo/caderno/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryType, content: text, analiseId, ...extra }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setEntries((prev) => [payload.data, ...prev]);
        reset();
      } else {
        setFeedback({ type: "error", text: payload?.message || "Não foi possível salvar." });
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de rede." });
    } finally {
      setBusy(false);
    }
  }

  async function patch(id, body) {
    try {
      const res = await fetch(`/api/oraculo/caderno/entradas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setEntries((prev) => prev.map((e) => (e.id === id ? payload.data : e)));
      }
    } catch {
      /* silencioso */
    }
  }

  async function archive(id) {
    try {
      const res = await fetch(`/api/oraculo/caderno/entradas/${id}`, { method: "DELETE" });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* silencioso */
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>
          <NotebookPen size={18} aria-hidden="true" /> Meu Caderno — este caso
        </h2>
        <Link href="/dashboard/oraculo/caderno" className={styles.backLink}>
          Ver caderno completo
        </Link>
      </div>

      {feedback && (
        <p className={feedback.type === "error" ? styles.dossieError : styles.savedTick}>
          {feedback.text}
        </p>
      )}

      <div className={styles.contentGrid}>
        <div className={styles.mesaField}>
          <label>Notas deste caso</label>
          {notes.length === 0 ? (
            <p className={styles.muted}>Nenhuma nota registrada.</p>
          ) : (
            <ul className={styles.sourceList}>
              {notes.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>{n.content}</strong>
                  </div>
                  {editable && (
                    <button type="button" onClick={() => archive(n.id)} aria-label="Arquivar nota">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <div className={styles.sourceForm}>
              <input
                placeholder="Nova nota sobre este caso…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <button
                type="button"
                onClick={() => create("CASE_NOTE", noteDraft, () => setNoteDraft(""))}
                disabled={!noteDraft.trim() || busy}
              >
                <Plus size={14} aria-hidden="true" /> Adicionar nota ao Caderno
              </button>
            </div>
          )}
        </div>

        <div className={styles.mesaField}>
          <label>Questões de estudo</label>
          {questions.length === 0 ? (
            <p className={styles.muted}>Nenhuma questão registrada.</p>
          ) : (
            <ul className={styles.sourceList}>
              {questions.map((q) => (
                <StudyQuestionItem key={q.id} question={q} editable={editable} onPatch={patch} onArchive={archive} />
              ))}
            </ul>
          )}
          {editable && (
            <div className={styles.sourceForm}>
              <input
                placeholder="Quando cabe inversão do ônus da prova?"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
              />
              {(hasOrientator || hasSupervisor) && (
                <select value={questionTarget} onChange={(e) => setQuestionTarget(e.target.value)}>
                  <option value="">Só minha dúvida (não enviar)</option>
                  {hasOrientator && <option value="ORIENTADOR">Enviar ao meu Orientador</option>}
                  {hasSupervisor && <option value="SUPERVISOR">Enviar ao meu Supervisor</option>}
                </select>
              )}
              <button
                type="button"
                onClick={() =>
                  create("STUDY_QUESTION", questionDraft, () => setQuestionDraft(""), {
                    targetType: questionTarget || undefined,
                  })
                }
                disabled={!questionDraft.trim() || busy}
              >
                <HelpCircle size={14} aria-hidden="true" /> Nova questão de estudo
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const QUESTION_STATUS_LABELS = {
  OPEN: "Em aberto",
  STUDYING: "Estudando",
  ANSWERED: "Respondida",
};

const TARGET_LABELS = { ORIENTADOR: "Enviada ao Orientador", SUPERVISOR: "Enviada ao Supervisor" };

function StudyQuestionItem({ question, editable, onPatch, onArchive }) {
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState(question.answer_notes || "");
  const sentToStaff = Boolean(question.target_type);

  return (
    <li>
      <div>
        <strong>{question.content}</strong>
        <small>
          {QUESTION_STATUS_LABELS[question.question_status] || question.question_status}
          {sentToStaff ? ` · ${TARGET_LABELS[question.target_type]}` : ""}
          {question.answer_notes ? ` · ${question.answer_notes}` : ""}
        </small>
        {editable && !sentToStaff && answering && (
          <div className={styles.sourceForm}>
            <input
              placeholder="Responda com suas palavras…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                onPatch(question.id, { answerNotes: answer });
                setAnswering(false);
              }}
              disabled={!answer.trim()}
            >
              Salvar resposta
            </button>
          </div>
        )}
      </div>
      {editable && (
        <div className={styles.encaminhaBtns}>
          {!sentToStaff && question.question_status === "OPEN" && (
            <button type="button" onClick={() => onPatch(question.id, { questionStatus: "STUDYING" })}>
              Estudando
            </button>
          )}
          {!sentToStaff && !answering && (
            <button type="button" onClick={() => setAnswering(true)}>
              Responder
            </button>
          )}
          <button type="button" onClick={() => onArchive(question.id)}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}

function EncaminhamentoPanel({ analiseId, canAct }) {
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function enviar(destino) {
    const texto = mensagem.trim();
    if (!texto || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/oraculo/encaminhamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destino, assunto, mensagem: texto, analiseId }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setFeedback({ type: "success", text: payload.message });
        setMensagem("");
        setAssunto("");
      } else {
        setFeedback({ type: "error", text: payload?.message || "Falha ao enviar." });
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de rede." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.encaminhaBox}>
      <label className={styles.mesaColTitle}>Dúvida / encaminhamento</label>
      <p className={styles.muted}>
        Dúvidas e correções acadêmicas vão ao orientador. Questões de conduta,
        ética ou limites, ao supervisor.
      </p>
      <input
        placeholder="Assunto (opcional)"
        value={assunto}
        onChange={(e) => setAssunto(e.target.value)}
      />
      <textarea
        placeholder="Escreva sua dúvida ou pedido…"
        rows={3}
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />
      <div className={styles.encaminhaBtns}>
        <button
          type="button"
          onClick={() => enviar("ORIENTADOR")}
          disabled={!canAct || sending || !mensagem.trim()}
        >
          Enviar ao orientador
        </button>
        <button
          type="button"
          onClick={() => enviar("SUPERVISOR")}
          disabled={!canAct || sending || !mensagem.trim()}
        >
          Enviar ao supervisor
        </button>
        <button
          type="button"
          onClick={() => enviar("AMBOS")}
          disabled={!canAct || sending || !mensagem.trim()}
        >
          Enviar a ambos
        </button>
      </div>
      {feedback && (
        <p
          className={
            feedback.type === "error" ? styles.dossieError : styles.savedTick
          }
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

function CasoColumn({ caseView, caseId }) {
  return (
    <div className={styles.casoContent}>
      <span className={styles.studyTag}>CASO DE ESTUDO — RADAR ACADÊMICO</span>
      {caseId && (
        <Link
          href={`/dashboard/oraculo/casos/radar/${caseId}/entrevista`}
          className={styles.dossieSecondaryCta}
        >
          <MessageSquare size={14} aria-hidden="true" /> Atendimento simulado
        </Link>
      )}

      <h3>Relato do caso</h3>
      <div className={styles.dossieNarrative}>
        {caseView.academicFullContent
          ? caseView.academicFullContent
              .split(/\n+/)
              .filter(Boolean)
              .map((p, i) => <p key={i}>{p}</p>)
          : <p className={styles.muted}>Relato não disponível.</p>}
      </div>

      <CasoList title="Fatos disponíveis" items={caseView.availableFacts} />
      <CasoList title="Informações não disponíveis" items={caseView.missingInformation} />
      {caseView.knownTimeline?.length > 0 && (
        <>
          <h3>Linha do tempo</h3>
          <ul className={styles.dossieTimeline}>
            {caseView.knownTimeline.map((t, i) => (
              <li key={i}>
                <span>{t.when}</span>
                <p>{t.event}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <CasoList title="Questões abertas" items={caseView.openQuestions} />
    </div>
  );
}

function CasoList({ title, items }) {
  if (!items?.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul className={styles.dossieUl}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Briefcase, Check, Plus, Trash2 } from "lucide-react";

import shared from "../../../OraculoStudentDashboard.module.css";
import styles from "../../Notebook.module.css";

const FIELDS = [
  { key: "summary", label: "Resumo pessoal", placeholder: "O que você entendeu sobre o tema?" },
  {
    key: "practicalApplication",
    label: "Aplicação prática",
    placeholder: "Onde isso se aplica na prática jurídica?",
  },
  { key: "questions", label: "Dúvidas", placeholder: "O que ainda não ficou claro?" },
];

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

async function callApi(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, data: data.data, message: data.message };
}

export default function FichamentoClient({
  id,
  initialFichamento,
  initialSources,
  initialAnalyses,
  availableSources,
  availableAnalyses,
}) {
  const [fichamento, setFichamento] = useState(initialFichamento);
  const [values, setValues] = useState({
    theme: initialFichamento.theme || "",
    summary: initialFichamento.summary || "",
    practicalApplication: initialFichamento.practical_application || "",
    questions: initialFichamento.questions || "",
  });
  const [sources, setSources] = useState(initialSources);
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [pickSource, setPickSource] = useState("");
  const [pickAnalysis, setPickAnalysis] = useState("");
  const [flash, setFlash] = useState(null);

  function notify(ok, message) {
    setFlash({ ok, message });
    setTimeout(() => setFlash(null), 3000);
  }

  async function saveField(key) {
    const { ok, data, message } = await callApi(`/api/oraculo/caderno/fichamentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ [key]: values[key] }),
    });
    if (!ok) return notify(false, message || "Não foi possível salvar.");
    setFichamento(data);
  }

  async function setStatus(status) {
    const { ok, data, message } = await callApi(`/api/oraculo/caderno/fichamentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!ok) return notify(false, message || "Não foi possível salvar.");
    setFichamento(data);
    notify(true, status === "COMPLETED" ? "Fichamento concluído." : "Status atualizado.");
  }

  async function addSource() {
    if (!pickSource) return;
    const { ok, message } = await callApi(`/api/oraculo/caderno/fichamentos/${id}/fontes`, {
      method: "POST",
      body: JSON.stringify({ sourceId: pickSource }),
    });
    if (!ok) return notify(false, message || "Não foi possível vincular.");
    const item = availableSources.find((s) => s.id === pickSource);
    if (item) setSources((prev) => [...prev, item]);
    setPickSource("");
  }

  async function removeSource(sourceId) {
    const { ok } = await callApi(
      `/api/oraculo/caderno/fichamentos/${id}/fontes?sourceId=${sourceId}`,
      { method: "DELETE" },
    );
    if (ok) setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }

  async function addAnalysis() {
    if (!pickAnalysis) return;
    const { ok, message } = await callApi(`/api/oraculo/caderno/fichamentos/${id}/casos`, {
      method: "POST",
      body: JSON.stringify({ analysisId: pickAnalysis }),
    });
    if (!ok) return notify(false, message || "Não foi possível vincular.");
    const item = availableAnalyses.find((a) => a.id === pickAnalysis);
    if (item) setAnalyses((prev) => [...prev, item]);
    setPickAnalysis("");
  }

  async function removeAnalysis(analysisId) {
    const { ok } = await callApi(
      `/api/oraculo/caderno/fichamentos/${id}/casos?analysisId=${analysisId}`,
      { method: "DELETE" },
    );
    if (ok) setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
  }

  const linkedSourceIds = new Set(sources.map((s) => s.id));
  const linkedAnalysisIds = new Set(analyses.map((a) => a.id));
  const pickableSources = availableSources.filter((s) => !linkedSourceIds.has(s.id));
  const pickableAnalyses = availableAnalyses.filter((a) => !linkedAnalysisIds.has(a.id));

  return (
    <main className={shared.page}>
      <Link href="/dashboard/oraculo/caderno" className={shared.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Meu Caderno
      </Link>

      <section className={shared.hero}>
        <div>
          <span className={shared.eyebrow}>Fichamento</span>
          <h1>{fichamento.title}</h1>
          <input
            className={styles.textInput}
            value={values.theme}
            placeholder="Tema (ex.: Responsabilidade civil nas relações de consumo)"
            onChange={(e) => setValues((p) => ({ ...p, theme: e.target.value }))}
            onBlur={() => saveField("theme")}
          />
        </div>
        {fichamento.status !== "COMPLETED" && (
          <button type="button" className={shared.primaryCta} onClick={() => setStatus("COMPLETED")}>
            <Check size={16} aria-hidden="true" /> Marcar como concluído
          </button>
        )}
      </section>

      {flash && (
        <div className={`${shared.feedback} ${flash.ok ? shared.feedbackSuccess : shared.feedbackError}`}>
          {flash.message}
        </div>
      )}

      <span className={styles.categoryTag}>{STATUS_LABELS[fichamento.status] || fichamento.status}</span>

      <section className={shared.panel}>
        {FIELDS.map((f) => (
          <div key={f.key} className={shared.mesaField}>
            <label>{f.label}</label>
            <textarea
              rows={4}
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
              onBlur={() => saveField(f.key)}
            />
          </div>
        ))}
      </section>

      <div className={shared.contentGrid}>
        <section className={shared.panel}>
          <div className={shared.panelHeader}>
            <h2>
              <BookOpen size={16} aria-hidden="true" /> Fontes vinculadas
            </h2>
          </div>
          {sources.length === 0 ? (
            <p className={shared.muted}>Nenhuma fonte vinculada.</p>
          ) : (
            <ul className={shared.sourceList}>
              {sources.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.title_snapshot}</strong>
                  </div>
                  <button type="button" onClick={() => removeSource(s.id)} aria-label="Remover fonte">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pickableSources.length > 0 && (
            <div className={shared.sourceForm}>
              <select
                className={styles.select}
                value={pickSource}
                onChange={(e) => setPickSource(e.target.value)}
              >
                <option value="">Selecione uma fonte salva…</option>
                {pickableSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title_snapshot}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addSource} disabled={!pickSource}>
                <Plus size={14} aria-hidden="true" /> Vincular fonte
              </button>
            </div>
          )}
        </section>

        <section className={shared.panel}>
          <div className={shared.panelHeader}>
            <h2>
              <Briefcase size={16} aria-hidden="true" /> Casos vinculados
            </h2>
          </div>
          {analyses.length === 0 ? (
            <p className={shared.muted}>Nenhum caso vinculado.</p>
          ) : (
            <ul className={shared.sourceList}>
              {analyses.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.titulo || "Análise"}</strong>
                    {a.area ? <small>{a.area}</small> : null}
                  </div>
                  <button type="button" onClick={() => removeAnalysis(a.id)} aria-label="Remover caso">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pickableAnalyses.length > 0 && (
            <div className={shared.sourceForm}>
              <select
                className={styles.select}
                value={pickAnalysis}
                onChange={(e) => setPickAnalysis(e.target.value)}
              >
                <option value="">Selecione uma análise…</option>
                {pickableAnalyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.titulo || "Análise"}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addAnalysis} disabled={!pickAnalysis}>
                <Plus size={14} aria-hidden="true" /> Vincular caso
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

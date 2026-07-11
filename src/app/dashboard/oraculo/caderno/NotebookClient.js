"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  NotebookPen,
  Search,
  Plus,
  Trash2,
  Pencil,
  ArrowRightCircle,
  BookOpen,
  HelpCircle,
  ClipboardList,
  X,
} from "lucide-react";

import shared from "../OraculoStudentDashboard.module.css";
import styles from "./Notebook.module.css";

const CATEGORIES = [
  "Direito Constitucional",
  "Direito Civil",
  "Direito do Consumidor",
  "Direito Penal",
  "Processo Civil",
  "Processo Penal",
  "Trabalhista",
  "Família",
  "Previdenciário",
  "Administrativo",
  "Tributário",
  "Prática Jurídica",
  "Dúvida Geral",
  "Outro",
];

const TABS = [
  { key: "ALL", label: "Tudo" },
  { key: "NOTE", label: "Anotações" },
  { key: "DRAFT", label: "Rascunhos" },
  { key: "CASE_NOTE", label: "Notas de Casos" },
  { key: "STUDY_QUESTION", label: "Questões de Estudo" },
  { key: "FICHAMENTO", label: "Fichamentos" },
  { key: "SOURCE", label: "Fontes Salvas" },
];

const FICHAMENTO_STATUS_LABELS = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

const QUESTION_STATUS_LABELS = {
  OPEN: "Em aberto",
  STUDYING: "Estudando",
  ANSWERED: "Respondida",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

async function callApi(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, data: data.data, message: data.message };
}

export default function NotebookClient({
  entries: initialEntries,
  sources: initialSources,
  fichamentos: initialFichamentos,
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [sources, setSources] = useState(initialSources);
  const [fichamentos, setFichamentos] = useState(initialFichamentos || []);
  const [tab, setTab] = useState("ALL");
  const [term, setTerm] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [fichamentoComposerOpen, setFichamentoComposerOpen] = useState(false);
  const [flash, setFlash] = useState(null);

  function notify(ok, message) {
    setFlash({ ok, message });
    setTimeout(() => setFlash(null), 3500);
  }

  const noteCount = entries.filter((e) => e.entry_type === "NOTE").length;
  const draftCount = entries.filter((e) => e.entry_type === "DRAFT").length;
  const caseNoteCount = entries.filter((e) => e.entry_type === "CASE_NOTE").length;
  const questionCount = entries.filter((e) => e.entry_type === "STUDY_QUESTION").length;

  const q = term.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!q) return true;
      const hay = `${e.title || ""} ${e.content} ${(e.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, q]);
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (!q) return true;
      const hay = `${s.title_snapshot || ""} ${s.content_snapshot || ""} ${s.note || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sources, q]);

  const filteredFichamentos = useMemo(() => {
    return fichamentos.filter((f) => {
      if (!q) return true;
      const hay = `${f.title || ""} ${f.theme || ""} ${(f.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fichamentos, q]);

  const notes = filteredEntries.filter((e) => e.entry_type === "NOTE");
  const drafts = filteredEntries.filter((e) => e.entry_type === "DRAFT");
  const caseNotes = filteredEntries.filter((e) => e.entry_type === "CASE_NOTE");
  const questions = filteredEntries.filter((e) => e.entry_type === "STUDY_QUESTION");

  async function createEntry({ entryType, title, content, category, tags }) {
    const { ok, data, message } = await callApi("/api/oraculo/caderno/entradas", {
      method: "POST",
      body: JSON.stringify({
        entryType,
        title,
        content,
        category,
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      }),
    });
    if (!ok) return notify(false, message || "Não foi possível salvar.");
    setEntries((prev) => [data, ...prev]);
    setComposerOpen(false);
    notify(true, entryType === "DRAFT" ? "Rascunho salvo." : "Anotação salva.");
  }

  async function patchEntry(id, patch) {
    const { ok, data, message } = await callApi(`/api/oraculo/caderno/entradas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!ok) return notify(false, message || "Não foi possível salvar.");
    setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    notify(true, "Atualizado.");
  }

  async function archiveEntry(id) {
    const { ok, message } = await callApi(`/api/oraculo/caderno/entradas/${id}`, {
      method: "DELETE",
    });
    if (!ok) return notify(false, message || "Não foi possível arquivar.");
    setEntries((prev) => prev.filter((e) => e.id !== id));
    notify(true, "Arquivado.");
  }

  async function patchSourceNote(id, note) {
    const { ok, data, message } = await callApi(`/api/oraculo/caderno/fontes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
    });
    if (!ok) return notify(false, message || "Não foi possível salvar.");
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, note: data.note } : s)));
    notify(true, "Nota atualizada.");
  }

  async function removeSource(id) {
    const { ok, message } = await callApi(`/api/oraculo/caderno/fontes/${id}`, {
      method: "DELETE",
    });
    if (!ok) return notify(false, message || "Não foi possível remover.");
    setSources((prev) => prev.filter((s) => s.id !== id));
    notify(true, "Fonte removida do Caderno.");
  }

  async function createFichamento({ title, theme }) {
    const { ok, data, message } = await callApi("/api/oraculo/caderno/fichamentos", {
      method: "POST",
      body: JSON.stringify({ title, theme }),
    });
    if (!ok) return notify(false, message || "Não foi possível criar.");
    setFichamentoComposerOpen(false);
    router.push(`/dashboard/oraculo/caderno/fichamentos/${data.id}`);
  }

  const showNotes = tab === "ALL" || tab === "NOTE";
  const showDrafts = tab === "ALL" || tab === "DRAFT";
  const showCaseNotes = tab === "ALL" || tab === "CASE_NOTE";
  const showQuestions = tab === "ALL" || tab === "STUDY_QUESTION";
  const showFichamentos = tab === "ALL" || tab === "FICHAMENTO";
  const showSources = tab === "ALL" || tab === "SOURCE";

  const tabCounts = {
    ALL: entries.length + sources.length + fichamentos.length,
    NOTE: noteCount,
    DRAFT: draftCount,
    CASE_NOTE: caseNoteCount,
    STUDY_QUESTION: questionCount,
    FICHAMENTO: fichamentos.length,
    SOURCE: sources.length,
  };

  const nothingToShow =
    (!showNotes || notes.length === 0) &&
    (!showDrafts || drafts.length === 0) &&
    (!showCaseNotes || caseNotes.length === 0) &&
    (!showQuestions || questions.length === 0) &&
    (!showFichamentos || filteredFichamentos.length === 0) &&
    (!showSources || filteredSources.length === 0);

  return (
    <main className={shared.page}>
      <section className={shared.hero}>
        <div>
          <span className={shared.eyebrow}>Estudo e pesquisa</span>
          <h1>Meu Caderno Jurídico</h1>
          <p>
            Organize suas anotações, fontes, dúvidas e fichamentos durante sua
            prática jurídica acadêmica.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={shared.dossieSecondaryCta}
            onClick={() => setFichamentoComposerOpen((v) => !v)}
          >
            <ClipboardList size={16} aria-hidden="true" /> Novo fichamento
          </button>
          <button
            type="button"
            className={shared.primaryCta}
            onClick={() => setComposerOpen((v) => !v)}
          >
            <Plus size={16} aria-hidden="true" /> Nova anotação
          </button>
        </div>
      </section>

      <div className={styles.searchForm}>
        <Search size={16} aria-hidden="true" className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar nas minhas notas, fontes e tags…"
          aria-label="Buscar no Caderno Jurídico"
        />
      </div>

      <section className={shared.metricsGrid}>
        <div className={shared.metricCard}>
          <strong>{noteCount}</strong>
          <span>Anotações</span>
        </div>
        <div className={shared.metricCard}>
          <strong>{draftCount}</strong>
          <span>Rascunhos</span>
        </div>
        <div className={shared.metricCard}>
          <strong>{sources.length}</strong>
          <span>Fontes salvas</span>
        </div>
        <div className={shared.metricCard}>
          <strong>{fichamentos.length}</strong>
          <span>Fichamentos</span>
        </div>
      </section>

      {flash && (
        <div className={`${shared.feedback} ${flash.ok ? shared.feedbackSuccess : shared.feedbackError}`}>
          {flash.message}
        </div>
      )}

      {composerOpen && (
        <EntryComposer onCancel={() => setComposerOpen(false)} onSubmit={createEntry} />
      )}

      {fichamentoComposerOpen && (
        <FichamentoComposer
          onCancel={() => setFichamentoComposerOpen(false)}
          onSubmit={createFichamento}
        />
      )}

      <div className={shared.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${shared.tab} ${tab === t.key ? shared.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {tabCounts[t.key] > 0 && <span className={shared.tabCount}>{tabCounts[t.key]}</span>}
          </button>
        ))}
      </div>

      {nothingToShow ? (
        <div className={shared.emptyState}>
          <NotebookPen size={26} aria-hidden="true" />
          <p>
            {q
              ? "Nada encontrado para sua busca."
              : "Seu Caderno Jurídico ainda está vazio."}
          </p>
          {!q && (
            <small>
              Salve fontes da Biblioteca, registre dúvidas e crie anotações
              durante suas análises.
            </small>
          )}
        </div>
      ) : (
        <>
          {showNotes && notes.length > 0 && (
            <EntrySection
              title="Anotações"
              items={notes}
              onArchive={archiveEntry}
              onSave={patchEntry}
            />
          )}
          {showDrafts && drafts.length > 0 && (
            <EntrySection
              title="Rascunhos"
              items={drafts}
              isDraft
              onArchive={archiveEntry}
              onSave={patchEntry}
              onConvert={(id) => patchEntry(id, { entryType: "NOTE" })}
            />
          )}
          {showCaseNotes && caseNotes.length > 0 && (
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2>Notas de Casos</h2>
              </div>
              <div className={styles.entryGrid}>
                {caseNotes.map((entry) => (
                  <CaseNoteCard key={entry.id} entry={entry} onArchive={archiveEntry} />
                ))}
              </div>
            </section>
          )}
          {showQuestions && questions.length > 0 && (
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2>Questões de Estudo</h2>
              </div>
              <div className={styles.entryGrid}>
                {questions.map((entry) => (
                  <QuestionCard key={entry.id} entry={entry} onSave={patchEntry} onArchive={archiveEntry} />
                ))}
              </div>
            </section>
          )}
          {showFichamentos && filteredFichamentos.length > 0 && (
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2>Fichamentos</h2>
              </div>
              <div className={styles.entryGrid}>
                {filteredFichamentos.map((f) => (
                  <FichamentoCard key={f.id} fichamento={f} />
                ))}
              </div>
            </section>
          )}
          {showSources && filteredSources.length > 0 && (
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2>
                  <BookOpen size={18} aria-hidden="true" /> Fontes Salvas
                </h2>
              </div>
              <div className={styles.entryGrid}>
                {filteredSources.map((s) => (
                  <SourceCard key={s.id} item={s} onSave={patchSourceNote} onRemove={removeSource} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function EntryComposer({ onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(entryType) {
    if (!content.trim() || busy) return;
    setBusy(true);
    await onSubmit({ entryType, title, content, category, tags });
    setBusy(false);
  }

  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>Nova entrada</h2>
        <button type="button" className={styles.iconBtn} onClick={onCancel} aria-label="Fechar">
          <X size={16} />
        </button>
      </div>
      <div className={styles.composerForm}>
        <input
          className={styles.textInput}
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={styles.textArea}
          placeholder="O que você quer registrar?"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className={styles.composerRow}>
          <select
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Categoria (opcional)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={styles.textInput}
            placeholder="Tags separadas por vírgula"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <div className={styles.composerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={!content.trim() || busy}
            onClick={() => submit("DRAFT")}
          >
            Salvar como rascunho
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={!content.trim() || busy}
            onClick={() => submit("NOTE")}
          >
            Salvar anotação
          </button>
        </div>
      </div>
    </section>
  );
}

function EntrySection({ title, items, isDraft, onArchive, onSave, onConvert }) {
  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>{title}</h2>
      </div>
      <div className={styles.entryGrid}>
        {items.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            isDraft={isDraft}
            onArchive={onArchive}
            onSave={onSave}
            onConvert={onConvert}
          />
        ))}
      </div>
    </section>
  );
}

function EntryCard({ entry, isDraft, onArchive, onSave, onConvert }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title || "");
  const [content, setContent] = useState(entry.content);

  async function save() {
    await onSave(entry.id, { title, content });
    setEditing(false);
  }

  return (
    <article className={styles.entryCard}>
      <div className={styles.entryTop}>
        <span className={isDraft ? styles.badgeDraft : styles.badgeNote}>
          {isDraft ? "RASCUNHO" : "ANOTAÇÃO"}
        </span>
        <small>{formatDate(entry.created_at)}</small>
      </div>

      {editing ? (
        <div className={styles.composerForm}>
          <input
            className={styles.textInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (opcional)"
          />
          <textarea
            className={styles.textArea}
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className={styles.composerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="button" className={styles.primaryBtn} onClick={save} disabled={!content.trim()}>
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          {entry.title && <strong className={styles.entryTitle}>{entry.title}</strong>}
          <p className={styles.entryContent}>{entry.content}</p>
          {entry.category && <span className={styles.categoryTag}>{entry.category}</span>}
          {entry.tags?.length > 0 && (
            <div className={styles.tagRow}>
              {entry.tags.map((t) => (
                <span key={t} className={styles.tag}>
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className={styles.entryActions}>
            <button type="button" className={styles.actionBtn} onClick={() => setEditing(true)}>
              <Pencil size={13} /> Editar
            </button>
            {isDraft && onConvert && (
              <button type="button" className={styles.actionBtn} onClick={() => onConvert(entry.id)}>
                <ArrowRightCircle size={13} /> Transformar em anotação
              </button>
            )}
            <button type="button" className={styles.actionBtnDanger} onClick={() => onArchive(entry.id)}>
              <Trash2 size={13} /> Arquivar
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function SourceCard({ item, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(item.note || "");

  async function save() {
    await onSave(item.id, note);
    setEditing(false);
  }

  return (
    <article className={styles.entryCard}>
      <div className={styles.entryTop}>
        <span className={styles.badgeSource}>FONTE SALVA</span>
        <small>{formatDate(item.created_at)}</small>
      </div>
      <strong className={styles.entryTitle}>{item.title_snapshot}</strong>
      {editing ? (
        <div className={styles.composerForm}>
          <textarea
            className={styles.textArea}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota pessoal"
          />
          <div className={styles.composerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="button" className={styles.primaryBtn} onClick={save}>
              Salvar nota
            </button>
          </div>
        </div>
      ) : (
        item.note && <p className={styles.entryContent}>{item.note}</p>
      )}
      {!editing && (
        <div className={styles.entryActions}>
          {item.collection_slug_snapshot && item.legal_unit_id && (
            <Link
              href={`/dashboard/oraculo/biblioteca/${item.collection_slug_snapshot}#unit-${item.legal_unit_id}`}
              className={styles.actionBtn}
            >
              <BookOpen size={13} /> Ver Fonte
            </Link>
          )}
          <button type="button" className={styles.actionBtn} onClick={() => setEditing(true)}>
            <Pencil size={13} /> Editar nota
          </button>
          <button type="button" className={styles.actionBtnDanger} onClick={() => onRemove(item.id)}>
            <Trash2 size={13} /> Remover
          </button>
        </div>
      )}
    </article>
  );
}

function CaseNoteCard({ entry, onArchive }) {
  return (
    <article className={styles.entryCard}>
      <div className={styles.entryTop}>
        <span className={styles.badgeNote}>NOTA DE CASO</span>
        <small>{formatDate(entry.created_at)}</small>
      </div>
      {entry.case_title_snapshot && (
        <span className={styles.categoryTag}>{entry.case_title_snapshot}</span>
      )}
      <p className={styles.entryContent}>{entry.content}</p>
      <div className={styles.entryActions}>
        {entry.linked_analysis_id && (
          <Link href={`/dashboard/oraculo/analises/${entry.linked_analysis_id}`} className={styles.actionBtn}>
            Abrir caso
          </Link>
        )}
        <button type="button" className={styles.actionBtnDanger} onClick={() => onArchive(entry.id)}>
          <Trash2 size={13} /> Arquivar
        </button>
      </div>
    </article>
  );
}

function QuestionCard({ entry, onSave, onArchive }) {
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState(entry.answer_notes || "");

  return (
    <article className={styles.entryCard}>
      <div className={styles.entryTop}>
        <span className={styles.badgeDraft}>
          <HelpCircle size={11} style={{ marginRight: 4 }} />
          {QUESTION_STATUS_LABELS[entry.question_status] || entry.question_status}
        </span>
        <small>{formatDate(entry.created_at)}</small>
      </div>
      {entry.case_title_snapshot && (
        <span className={styles.categoryTag}>{entry.case_title_snapshot}</span>
      )}
      <p className={styles.entryContent}>{entry.content}</p>
      {entry.answer_notes && !answering && (
        <p className={styles.entryContent}>
          <strong>Minha resposta: </strong>
          {entry.answer_notes}
        </p>
      )}

      {answering ? (
        <div className={styles.composerForm}>
          <textarea
            className={styles.textArea}
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Responda com suas próprias palavras…"
          />
          <div className={styles.composerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setAnswering(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!answer.trim()}
              onClick={() => {
                onSave(entry.id, { answerNotes: answer });
                setAnswering(false);
              }}
            >
              Salvar resposta
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.entryActions}>
          {entry.question_status === "OPEN" && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onSave(entry.id, { questionStatus: "STUDYING" })}
            >
              Marcar como estudando
            </button>
          )}
          <button type="button" className={styles.actionBtn} onClick={() => setAnswering(true)}>
            <Pencil size={13} /> Responder com minhas palavras
          </button>
          {entry.linked_analysis_id && (
            <Link href={`/dashboard/oraculo/analises/${entry.linked_analysis_id}`} className={styles.actionBtn}>
              Abrir caso
            </Link>
          )}
          <button type="button" className={styles.actionBtnDanger} onClick={() => onArchive(entry.id)}>
            <Trash2 size={13} /> Arquivar
          </button>
        </div>
      )}
    </article>
  );
}

function FichamentoComposer({ onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || busy) return;
    setBusy(true);
    await onSubmit({ title, theme });
    setBusy(false);
  }

  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>Novo fichamento</h2>
        <button type="button" className={styles.iconBtn} onClick={onCancel} aria-label="Fechar">
          <X size={16} />
        </button>
      </div>
      <div className={styles.composerForm}>
        <input
          className={styles.textInput}
          placeholder="Título (ex.: Responsabilidade civil nas relações de consumo)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={styles.textInput}
          placeholder="Tema (opcional)"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />
        <div className={styles.composerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={styles.primaryBtn} disabled={!title.trim() || busy} onClick={submit}>
            Criar e abrir
          </button>
        </div>
      </div>
    </section>
  );
}

function FichamentoCard({ fichamento }) {
  return (
    <Link
      href={`/dashboard/oraculo/caderno/fichamentos/${fichamento.id}`}
      className={styles.entryCard}
    >
      <div className={styles.entryTop}>
        <span className={styles.badgeSource}>
          {FICHAMENTO_STATUS_LABELS[fichamento.status] || fichamento.status}
        </span>
        <small>{formatDate(fichamento.updated_at)}</small>
      </div>
      <strong className={styles.entryTitle}>{fichamento.title}</strong>
      {fichamento.theme && <p className={styles.entryContent}>{fichamento.theme}</p>}
      <span className={styles.categoryTag}>
        {fichamento.linked_source_ids.length} fonte(s) · {fichamento.linked_analysis_ids.length} caso(s)
      </span>
    </Link>
  );
}

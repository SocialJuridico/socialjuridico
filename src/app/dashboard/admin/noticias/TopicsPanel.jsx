"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

import styles from "./NoticiasAdmin.module.css";

const EDITORIAL_OPTIONS = [
  { value: "NOTICIA_JURIDICA", label: "Notícia jurídica real (prioridade 1)" },
  { value: "EDUCATIVO", label: "Educativa / informativa (prioridade 2)" },
  { value: "NOVIDADE_PLATAFORMA", label: "Novidade da plataforma (prioridade 3)" },
];

const STATUS_LABELS = {
  PENDENTE: "Na fila",
  PROCESSANDO: "Processando…",
  CONCLUIDA: "Publicada",
  FALHA: "Falha",
};

async function readJson(response) {
  return response.json().catch(() => null);
}

// Traduz códigos técnicos da automação para mensagens claras ao admin.
const GENERATE_ERROR_MESSAGES = {
  AI_UNAVAILABLE:
    "IA indisponível: configure a variável OPENAI_API_KEY no ambiente.",
  AI_REQUEST_FAILED: "A IA recusou a requisição. Verifique a chave/modelo.",
  AI_EMPTY_RESPONSE: "A IA retornou vazio. Tente novamente.",
  AI_INVALID_JSON: "A IA retornou um formato inválido. Tente novamente.",
  AI_MISSING_FIELDS: "A IA não retornou os campos obrigatórios.",
  COMPLIANCE_BLOCKED:
    "Conteúdo bloqueado pela checagem de compliance (OAB). Refine o assunto.",
  GENERATION_FAILED: "Falha ao gerar a matéria. Veja o erro na pauta.",
  PERSIST_FAILED: "A matéria foi gerada, mas falhou ao salvar. Tente de novo.",
  SUPABASE_SERVICE_ROLE_NOT_CONFIGURED:
    "Banco não configurado: falta a SUPABASE_SERVICE_ROLE_KEY.",
};

function describeGenerateError(data) {
  const raw = data?.error || data?.message || "";
  const key = String(raw).split(":")[0].trim();
  return GENERATE_ERROR_MESSAGES[key] || raw || "Falha na geração.";
}

/**
 * Painel de PAUTAS da Central de Notícias.
 * O admin cadastra apenas o ASSUNTO (título + tipo + briefing opcional). A IA
 * pesquisa, redige e publica automaticamente (3/dia, na ordem de prioridade),
 * ou o admin pode acionar "Gerar agora" para publicar a próxima da fila.
 */
export default function TopicsPanel() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [editorialType, setEditorialType] = useState("NOTICIA_JURIDICA");
  const [briefing, setBriefing] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/news/topics", { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Falha ao carregar pautas.");
      }
      setTopics(data.topics || []);
    } catch (error) {
      console.error("[TopicsPanel]", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const createTopic = useCallback(
    async (event) => {
      event.preventDefault();
      if (title.trim().length < 5) {
        toast.error("Informe um assunto com ao menos 5 caracteres.");
        return;
      }
      setCreating(true);
      try {
        const res = await fetch("/api/admin/news/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            editorial_type: editorialType,
            briefing: briefing.trim() || null,
            reference_url:
              editorialType === "NOTICIA_JURIDICA"
                ? referenceUrl.trim() || null
                : null,
          }),
        });
        const data = await readJson(res);
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível cadastrar a pauta.");
        }
        toast.success("Pauta adicionada à fila.");
        setTitle("");
        setBriefing("");
        setReferenceUrl("");
        await loadTopics();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setCreating(false);
      }
    },
    [briefing, editorialType, loadTopics, referenceUrl, title],
  );

  const removeTopic = useCallback(
    async (id) => {
      try {
        const res = await fetch(`/api/admin/news/topics/${id}`, {
          method: "DELETE",
        });
        const data = await readJson(res);
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível remover.");
        }
        setTopics((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        toast.error(error.message);
      }
    },
    [],
  );

  const generateNow = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/news/generate", { method: "POST" });
      const data = await readJson(res);
      if (data?.status === "PUBLISHED") {
        toast.success("Matéria gerada e publicada pela IA.");
      } else if (data?.status === "NO_TOPICS") {
        toast("Não há pautas pendentes na fila.");
      } else if (data?.status === "LIMIT_REACHED") {
        toast(`Limite diário atingido (${data.dailyLimit}/dia).`);
      } else {
        throw new Error(describeGenerateError(data));
      }
      await loadTopics();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  }, [loadTopics]);

  return (
    <section className={styles.topicsSection}>
      <div className={styles.topicsHead}>
        <div>
          <h2 className={styles.topicsTitle}>Pautas para a IA</h2>
          <p className={styles.topicsSubtitle}>
            Cadastre o assunto. A IA pesquisa, escreve e publica automaticamente
            (até 3/dia, em horários definidos pela automação). Ordem de
            prioridade: notícia real → educativa → novidade da plataforma.
          </p>
        </div>
        <div className={styles.topicsActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadTopics}
            disabled={loading}
          >
            <RefreshCcw size={16} /> Atualizar
          </button>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={generateNow}
            disabled={generating}
          >
            <Sparkles size={16} />
            {generating ? "Gerando…" : "Gerar agora"}
          </button>
        </div>
      </div>

      <form className={styles.topicForm} onSubmit={createTopic}>
        <input
          type="text"
          className={styles.topicInput}
          placeholder="Assunto da matéria (ex.: Nova súmula do STJ sobre pensão…)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className={styles.topicSelect}
          value={editorialType}
          onChange={(e) => setEditorialType(e.target.value)}
        >
          {EDITORIAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          className={styles.topicInput}
          placeholder="Briefing opcional (ângulo, público, foco)"
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
        />
        <button
          type="submit"
          className={styles.addTopicBtn}
          disabled={creating}
        >
          <Plus size={16} />
          {creating ? "Adicionando…" : "Adicionar"}
        </button>

        {editorialType === "NOTICIA_JURIDICA" && (
          <input
            type="url"
            className={`${styles.topicInput} ${styles.topicReference}`}
            placeholder="Link da matéria/fonte de referência (opcional, ex.: portal do STJ)"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
          />
        )}
      </form>

      {loading ? (
        <p className={styles.empty}>Carregando pautas…</p>
      ) : topics.length === 0 ? (
        <p className={styles.empty}>Nenhuma pauta na fila.</p>
      ) : (
        <ul className={styles.topicsList}>
          {topics.map((topic) => (
            <li key={topic.id} className={styles.topicItem}>
              <span
                className={styles.topicPriority}
                data-priority={topic.priority}
              >
                P{topic.priority}
              </span>
              <div className={styles.topicInfo}>
                <strong>{topic.title}</strong>
                <span className={styles.topicType}>
                  {EDITORIAL_OPTIONS.find((o) => o.value === topic.editorial_type)
                    ?.label || topic.editorial_type}
                </span>
                {topic.reference_url && (
                  <a
                    className={styles.topicReferenceLink}
                    href={topic.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Fonte de referência
                  </a>
                )}
                {topic.last_error && (
                  <span className={styles.topicError}>{topic.last_error}</span>
                )}
              </div>
              <span
                className={styles.topicStatus}
                data-status={topic.status}
              >
                {STATUS_LABELS[topic.status] || topic.status}
              </span>
              {topic.status !== "PROCESSANDO" && (
                <button
                  type="button"
                  className={styles.topicDelete}
                  onClick={() => removeTopic(topic.id)}
                  aria-label="Remover pauta"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
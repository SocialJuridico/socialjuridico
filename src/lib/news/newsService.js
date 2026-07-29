/**
 * Camada de serviço da Central de Notícias (acesso a dados).
 * Usa supabaseAdmin (service role) para operações administrativas e de
 * automação. As rotas devem autorizar o chamador ANTES de invocar estes
 * métodos (ver newsServer.js).
 */

import { supabaseAdmin } from "@/lib/supabase";
import {
  ARTICLE_STATUS,
  buildExcerpt,
  ensureUniqueSlug,
  estimateReadingTime,
  generateShareCode,
  slugify,
} from "@/lib/news/newsUtils";

function db() {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  }
  return supabaseAdmin;
}

const ARTICLE_COLUMNS = "*, category:news_categories(id, name, slug, icon)";

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
export async function listCategories({ activeOnly = false } = {}) {
  let query = db()
    .from("news_categories")
    .select("*")
    .order("display_order", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Slug único
// ---------------------------------------------------------------------------
export async function resolveUniqueSlug(title, { excludeId = null } = {}) {
  const base = slugify(title);
  const { data, error } = await db()
    .from("news_articles")
    .select("slug, id")
    .ilike("slug", `${base}%`);
  if (error) throw error;
  const taken = new Set(
    (data || [])
      .filter((row) => row.id !== excludeId)
      .map((row) => row.slug),
  );
  return ensureUniqueSlug(base, taken);
}

// ---------------------------------------------------------------------------
// Matérias — listagem administrativa
// ---------------------------------------------------------------------------
export async function listArticlesAdmin({
  status = null,
  editorialType = null,
  categoryId = null,
  search = null,
  page = 1,
  pageSize = 20,
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db()
    .from("news_articles")
    .select(ARTICLE_COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (editorialType) query = query.eq("editorial_type", editorialType);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data || [], total: count || 0, page, pageSize };
}

export async function getArticleById(id) {
  const { data, error } = await db()
    .from("news_articles")
    .select(ARTICLE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Matérias — leitura pública
// ---------------------------------------------------------------------------
export async function getPublishedArticleBySlug(slug) {
  const { data, error } = await db()
    .from("news_articles")
    .select(ARTICLE_COLUMNS)
    .eq("slug", slug)
    .eq("status", ARTICLE_STATUS.PUBLICADO)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPublishedArticles({
  categorySlug = null,
  editorialType = null,
  featuredOnly = false,
  limit = 12,
  page = 1,
} = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db()
    .from("news_articles")
    .select(ARTICLE_COLUMNS, { count: "exact" })
    .eq("status", ARTICLE_STATUS.PUBLICADO)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (editorialType) query = query.eq("editorial_type", editorialType);
  if (featuredOnly) query = query.eq("is_featured", true);

  if (categorySlug) {
    const { data: cat } = await db()
      .from("news_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (!cat) return { items: [], total: 0, page, pageSize: limit };
    query = query.eq("category_id", cat.id);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data || [], total: count || 0, page, pageSize: limit };
}

export async function listPublishedSlugs() {
  const { data, error } = await db()
    .from("news_articles")
    .select("slug, updated_at, published_at")
    .eq("status", ARTICLE_STATUS.PUBLICADO)
    .eq("allow_indexing", true);
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Matérias — mutações
// ---------------------------------------------------------------------------
function computeDerivedFields(payload) {
  const derived = { ...payload };
  if (payload.content) {
    derived.reading_time =
      payload.reading_time || estimateReadingTime(payload.content);
    if (!payload.excerpt) {
      derived.excerpt = buildExcerpt(payload.content, 160);
    }
  }
  return derived;
}

export async function createArticle(payload, { actor } = {}) {
  const slug = payload.slug
    ? payload.slug
    : await resolveUniqueSlug(payload.title);

  const record = computeDerivedFields({
    ...payload,
    slug,
    status: payload.status || ARTICLE_STATUS.RASCUNHO_IA,
    author_id: actor?.id || payload.author_id || null,
    author_name: actor?.name || payload.author_name || null,
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await db()
    .from("news_articles")
    .insert([record])
    .select(ARTICLE_COLUMNS)
    .single();
  if (error) throw error;

  await recordRevision(data.id, {
    content: data.content,
    metadata: { title: data.title, status: data.status },
    changed_by: actor?.id || null,
    change_type: "CREATE",
  });

  return data;
}

export async function updateArticle(id, patch, { actor } = {}) {
  const record = computeDerivedFields({
    ...patch,
    updated_at: new Date().toISOString(),
  });
  delete record.id;
  delete record.created_at;
  delete record.category;

  const { data, error } = await db()
    .from("news_articles")
    .update(record)
    .eq("id", id)
    .select(ARTICLE_COLUMNS)
    .single();
  if (error) throw error;

  await recordRevision(id, {
    content: data.content,
    metadata: { title: data.title, status: data.status },
    changed_by: actor?.id || null,
    change_type: "UPDATE",
  });

  return data;
}

export async function changeArticleStatus(id, nextStatus, { actor } = {}) {
  const patch = { status: nextStatus, updated_at: new Date().toISOString() };

  if (nextStatus === ARTICLE_STATUS.PUBLICADO) {
    patch.published_at = new Date().toISOString();
  }
  if (nextStatus === ARTICLE_STATUS.APROVADO) {
    patch.reviewed_by = actor?.id || null;
    patch.reviewer_name = actor?.name || null;
  }

  const { data, error } = await db()
    .from("news_articles")
    .update(patch)
    .eq("id", id)
    .select(ARTICLE_COLUMNS)
    .single();
  if (error) throw error;

  await recordRevision(id, {
    metadata: { status: nextStatus },
    changed_by: actor?.id || null,
    change_type: `STATUS_${nextStatus}`,
  });

  return data;
}

// ---------------------------------------------------------------------------
// Fontes
// ---------------------------------------------------------------------------
export async function listSources(articleId) {
  const { data, error } = await db()
    .from("news_sources")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function replaceSources(articleId, sources = []) {
  await db().from("news_sources").delete().eq("article_id", articleId);
  if (!sources.length) return [];
  const rows = sources.map((s) => ({ ...s, article_id: articleId }));
  const { data, error } = await db()
    .from("news_sources")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Revisões
// ---------------------------------------------------------------------------
export async function recordRevision(articleId, revision) {
  const { data: last } = await db()
    .from("news_revisions")
    .select("version")
    .eq("article_id", articleId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (last?.version || 0) + 1;
  const { error } = await db().from("news_revisions").insert([
    {
      article_id: articleId,
      version,
      ...revision,
    },
  ]);
  if (error) {
    console.error("[NewsService] Falha ao registrar revisão:", error.message);
  }
}

export async function listRevisions(articleId) {
  const { data, error } = await db()
    .from("news_revisions")
    .select("*")
    .eq("article_id", articleId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Links compartilháveis
// ---------------------------------------------------------------------------
export async function createShareLink(articleId, { channel = null } = {}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateShareCode(8);
    const { data, error } = await db()
      .from("news_share_links")
      .insert([{ article_id: articleId, code, channel }])
      .select("*")
      .single();
    if (!error) return data;
    if (error.code !== "23505") throw error; // não é colisão de unique
  }
  throw new Error("SHARE_CODE_GENERATION_FAILED");
}

export async function resolveShareLink(code) {
  const { data, error } = await db()
    .from("news_share_links")
    .select("*, article:news_articles(slug, status)")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  await db()
    .from("news_share_links")
    .update({ clicks: (data.clicks || 0) + 1 })
    .eq("id", data.id);
  return data;
}

// ---------------------------------------------------------------------------
// Redirects de slug
// ---------------------------------------------------------------------------
export async function resolveRedirect(oldSlug) {
  const { data, error } = await db()
    .from("news_redirects")
    .select("*")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createRedirect(oldSlug, newSlug, articleId) {
  const { error } = await db()
    .from("news_redirects")
    .upsert(
      { old_slug: oldSlug, new_slug: newSlug, article_id: articleId },
      { onConflict: "old_slug" },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Fila de pautas (news_topics) — cadastradas pelo admin, consumidas pela IA
// ---------------------------------------------------------------------------
export async function listTopics({ status = null, limit = 50 } = {}) {
  let query = db()
    .from("news_topics")
    .select("*, article:news_articles(id, slug, status)")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTopic(payload, { actor } = {}) {
  const record = {
    title: payload.title,
    editorial_type: payload.editorial_type || "NOTICIA_JURIDICA",
    priority: Number.isFinite(payload.priority) ? payload.priority : 2,
    briefing: payload.briefing || null,
    legal_specialty: payload.legal_specialty || null,
    reference_url: payload.reference_url || null,
    category_id: payload.category_id || null,
    created_by: actor?.id || null,
    created_by_name: actor?.name || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db()
    .from("news_topics")
    .insert([record])
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTopic(id) {
  const { error } = await db().from("news_topics").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Reivindica a próxima pauta PENDENTE respeitando a ordem de prioridade
 * (1 = notícia real, 2 = educativo, 3 = novidade da plataforma). Marca como
 * PROCESSANDO de forma atômica para evitar corrida entre execuções de cron.
 */
export async function claimNextTopic() {
  const { data: candidates, error } = await db()
    .from("news_topics")
    .select("*")
    .eq("status", "PENDENTE")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const topic = candidates?.[0];
  if (!topic) return null;

  const { data: claimed, error: claimError } = await db()
    .from("news_topics")
    .update({
      status: "PROCESSANDO",
      processing_attempts: (topic.processing_attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", topic.id)
    .eq("status", "PENDENTE")
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed || null;
}

export async function markTopicDone(id, articleId) {
  const { error } = await db()
    .from("news_topics")
    .update({
      status: "CONCLUIDA",
      article_id: articleId,
      last_error: null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function markTopicFailed(id, reason) {
  const { error } = await db()
    .from("news_topics")
    .update({
      status: "FALHA",
      last_error: String(reason || "").slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Conta quantas matérias já foram PUBLICADAS por IA no dia (janela UTC),
 * usado para respeitar o limite diário (3/dia).
 */
export async function countAiPublishedToday() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db()
    .from("news_articles")
    .select("id", { count: "exact", head: true })
    .eq("ai_generated", true)
    .eq("status", ARTICLE_STATUS.PUBLICADO)
    .gte("published_at", start.toISOString());
  if (error) throw error;
  return count || 0;
}

// ---------------------------------------------------------------------------
// Contadores (views/shares)
// ---------------------------------------------------------------------------
export async function incrementCounter(articleId, field) {
  if (!["views_count", "shares_count"].includes(field)) return;
  const { data } = await db()
    .from("news_articles")
    .select(field)
    .eq("id", articleId)
    .maybeSingle();
  if (!data) return;
  await db()
    .from("news_articles")
    .update({ [field]: (data[field] || 0) + 1 })
    .eq("id", articleId);
}
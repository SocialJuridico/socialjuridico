import { supabaseAdmin } from "@/lib/supabase";

// Busca da Biblioteca — Fase 1: Full Text Search do Postgres + busca direta por
// artigo ("art 14 cdc"). A IA NÃO é usada como camada de busca nem escolhe o
// artigo pelo aluno.

export function normalizeLegalText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (diacríticos combinantes)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadAliasMap() {
  if (!supabaseAdmin) return new Map();
  const { data } = await supabaseAdmin
    .from("oraculo_legal_collection_aliases")
    .select("normalized_alias, collection_id, oraculo_legal_collections!inner(slug)");
  const map = new Map();
  for (const row of data || []) {
    const slug = row.oraculo_legal_collections?.slug;
    if (slug) map.set(row.normalized_alias, slug);
  }
  return map;
}

const ARTICLE_WORDS = /\b(art|artigo|arts|artigos)\b/;

/**
 * Detecta intenção "art N <apelido>" em qualquer ordem.
 * Ex.: "art 14 cdc", "cdc 14", "artigo 186 codigo civil".
 * Retorna { collectionSlug, number } ou null.
 */
export function parseArticleIntent(query, aliasMap) {
  const norm = normalizeLegalText(query);
  if (!norm) return null;

  const numberMatch = norm.match(/\b(\d{1,4})\b/);
  if (!numberMatch) return null;
  const number = numberMatch[1];

  // Tenta casar um apelido de coleção como substring da consulta.
  let collectionSlug = null;
  let bestLen = 0;
  for (const [alias, slug] of aliasMap.entries()) {
    // apelido presente na consulta (por palavra) — prioriza o mais longo.
    const re = new RegExp(`(^| )${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
    if (re.test(norm) && alias.length > bestLen) {
      collectionSlug = slug;
      bestLen = alias.length;
    }
  }
  if (!collectionSlug) return null;

  // Exige contexto de artigo OU formato compacto "<alias> <n>" / "<n> <alias>".
  const hasArticleWord = ARTICLE_WORDS.test(norm);
  if (!hasArticleWord) {
    const compact = norm.replace(/\s+/g, " ").trim();
    const tokens = compact.split(" ");
    if (tokens.length > 4) return null; // frase longa: trata como busca textual
  }
  return { collectionSlug, number };
}

async function findUnitByArticle(collectionSlug, number) {
  const { data: collection } = await supabaseAdmin
    .from("oraculo_legal_collections")
    .select("id, slug, title, short_title")
    .eq("slug", collectionSlug)
    .maybeSingle();
  if (!collection) return null;

  const { data: document } = await supabaseAdmin
    .from("oraculo_legal_documents")
    .select("id, official_title, short_title, current_version_id")
    .eq("collection_id", collection.id)
    .not("current_version_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (!document?.current_version_id) return null;

  const { data: unit } = await supabaseAdmin
    .from("oraculo_legal_units")
    .select("id, label, number, heading, content, hierarchy_path")
    .eq("document_version_id", document.current_version_id)
    .eq("unit_type", "ARTICLE")
    .eq("number", number)
    .maybeSingle();
  if (!unit) return null;

  return {
    unitId: unit.id,
    label: unit.label,
    heading: unit.heading,
    snippet: (unit.content || "").slice(0, 260),
    collectionSlug: collection.slug,
    collectionTitle: collection.title,
    collectionShort: collection.short_title,
  };
}

/**
 * Busca textual (FTS) nas unidades das versões correntes.
 */
async function fullTextSearch(query, limit = 30) {
  // plainto_tsquery lida com a frase do aluno com segurança (sem sintaxe crua).
  const { data, error } = await supabaseAdmin
    .from("oraculo_legal_units")
    .select(
      "id, label, number, heading, content, document_version_id, oraculo_legal_document_versions!inner(is_current, oraculo_legal_documents!inner(official_title, short_title, oraculo_legal_collections!inner(slug, title, short_title)))",
    )
    .eq("oraculo_legal_document_versions.is_current", true)
    .textSearch("search_vector", query, { type: "plain", config: "portuguese" })
    .limit(limit);

  if (error || !data) return [];
  return data.map((u) => {
    const version = u.oraculo_legal_document_versions;
    const doc = version?.oraculo_legal_documents;
    const col = doc?.oraculo_legal_collections;
    return {
      unitId: u.id,
      label: u.label,
      heading: u.heading,
      snippet: (u.content || "").slice(0, 260),
      collectionSlug: col?.slug || null,
      collectionTitle: col?.title || null,
      collectionShort: col?.short_title || null,
    };
  });
}

/**
 * Ponto de entrada da busca. Retorna resultados exatos (por artigo) e/ou
 * textuais. Fase 2 (semântica/relacionados) fica para depois.
 */
export async function searchLegalLibrary(query) {
  if (!supabaseAdmin) return { query, article: null, results: [] };
  const q = String(query || "").trim();
  if (q.length < 2) return { query: q, article: null, results: [] };

  const aliasMap = await loadAliasMap();

  // 1) Busca direta por artigo.
  const intent = parseArticleIntent(q, aliasMap);
  if (intent) {
    const article = await findUnitByArticle(intent.collectionSlug, intent.number);
    if (article) {
      return { query: q, article, results: [article] };
    }
  }

  // 2) Full Text Search.
  const results = await fullTextSearch(q);
  return { query: q, article: null, results };
}

import { supabaseAdmin } from "@/lib/supabase";

// Leitura da Biblioteca Jurídica: coleções (livros), documento vigente e a
// árvore de unidades (sumário). Só expõe a VERSÃO corrente (is_current) ao aluno.

/**
 * Lista as coleções (livros) para a Home da Biblioteca.
 * `available` = coleção ACTIVE (com conteúdo publicado); demais são "em breve".
 */
export async function listLegalCollections() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_legal_collections")
    .select("id, slug, title, short_title, description, category, jurisdiction, cover_config, status, display_order")
    .in("status", ["ACTIVE", "DRAFT", "PAUSED"])
    .order("display_order", { ascending: true });
  return (data || []).map((c) => ({
    ...c,
    available: c.status === "ACTIVE",
  }));
}

function buildUnitTree(units) {
  const byId = new Map();
  const roots = [];
  for (const u of units) byId.set(u.id, { ...u, children: [] });
  for (const u of units) {
    const node = byId.get(u.id);
    if (u.parent_unit_id && byId.has(u.parent_unit_id)) {
      byId.get(u.parent_unit_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/**
 * Carrega uma coleção com o documento vigente, sua versão corrente e todas as
 * unidades (flat + árvore para o sumário). Retorna null se coleção não existir.
 */
export async function getLegalCollectionBySlug(slug) {
  if (!supabaseAdmin || !slug) return null;

  const { data: collection } = await supabaseAdmin
    .from("oraculo_legal_collections")
    .select("id, slug, title, short_title, description, category, jurisdiction, cover_config, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!collection) return null;

  const { data: document } = await supabaseAdmin
    .from("oraculo_legal_documents")
    .select(
      "id, slug, document_type, number, year, official_title, short_title, ementa, authority, source_name, source_url, source_identifier, publication_date, effective_date, status, current_version_id, last_source_check_at",
    )
    .eq("collection_id", collection.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!document || !document.current_version_id) {
    return { collection, document: document || null, version: null, units: [], tree: [] };
  }

  const { data: version } = await supabaseAdmin
    .from("oraculo_legal_document_versions")
    .select("id, version_number, is_current, import_status, source_checked_at, effective_from")
    .eq("id", document.current_version_id)
    .maybeSingle();

  const { data: units } = await supabaseAdmin
    .from("oraculo_legal_units")
    .select("id, parent_unit_id, unit_type, label, number, heading, content, hierarchy_path, display_order")
    .eq("document_version_id", document.current_version_id)
    .order("display_order", { ascending: true });

  const flat = units || [];
  return {
    collection,
    document,
    version: version || null,
    units: flat,
    tree: buildUnitTree(flat),
  };
}

/**
 * Carrega um único dispositivo (unidade) + documento/coleção de origem.
 * Usado para snapshot ao adicionar à análise / salvar no caderno.
 */
export async function getLegalUnitFull(legalUnitId) {
  if (!supabaseAdmin || !legalUnitId) return null;

  const { data: unit } = await supabaseAdmin
    .from("oraculo_legal_units")
    .select("id, document_version_id, unit_type, label, number, heading, content, hierarchy_path")
    .eq("id", legalUnitId)
    .maybeSingle();
  if (!unit) return null;

  const { data: version } = await supabaseAdmin
    .from("oraculo_legal_document_versions")
    .select("id, version_number, document_id, is_current")
    .eq("id", unit.document_version_id)
    .maybeSingle();
  if (!version) return null;

  const { data: document } = await supabaseAdmin
    .from("oraculo_legal_documents")
    .select("id, collection_id, official_title, short_title, source_name, source_url, source_identifier")
    .eq("id", version.document_id)
    .maybeSingle();
  if (!document) return null;

  const { data: collection } = await supabaseAdmin
    .from("oraculo_legal_collections")
    .select("id, slug, title, short_title")
    .eq("id", document.collection_id)
    .maybeSingle();

  return { unit, version, document, collection: collection || null };
}

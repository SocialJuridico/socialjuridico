import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { buildUnitTree } from "@/lib/oraculo/legalLibrary/legalLibraryRead";
import { LEGAL_CATEGORY_LABELS, legalAccentColor, legalUnitTypeLabel } from "@/lib/oraculo/legalLibrary/legalLibraryFormat";

// GET /api/public/biblioteca/collections/[slug] — sem autenticação.
// Retorna a coleção (só se ACTIVE), documento vigente e a árvore de unidades.
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!supabaseAdmin || !slug) {
      return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
    }

    const { data: collection } = await supabaseAdmin
      .from("oraculo_legal_collections")
      .select("id, slug, title, short_title, description, category, jurisdiction, cover_config, status")
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!collection) {
      return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
    }

    const { data: document } = await supabaseAdmin
      .from("oraculo_legal_documents")
      .select(
        "id, official_title, short_title, ementa, authority, source_name, source_url, publication_date, effective_date, current_version_id",
      )
      .eq("collection_id", collection.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!document || !document.current_version_id) {
      return NextResponse.json({
        success: true,
        data: {
          collection: formatCollection(collection),
          document: null,
          units: [],
        },
      });
    }

    const { data: units } = await supabaseAdmin
      .from("oraculo_legal_units")
      .select("id, parent_unit_id, unit_type, label, number, heading, content, hierarchy_path, display_order")
      .eq("document_version_id", document.current_version_id)
      .order("display_order", { ascending: true });

    const tree = buildUnitTree(units || []).map(formatUnitNode);

    return NextResponse.json(
      {
        success: true,
        data: {
          collection: formatCollection(collection),
          document: {
            officialTitle: document.official_title,
            shortTitle: document.short_title,
            ementa: document.ementa,
            authority: document.authority,
            sourceName: document.source_name,
            sourceUrl: document.source_url,
            publicationDate: document.publication_date,
            effectiveDate: document.effective_date,
          },
          units: tree,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("Erro na API GET /api/public/biblioteca/collections/[slug]:", error);
    return NextResponse.json({ success: false, code: "SERVER_ERROR" }, { status: 500 });
  }
}

function formatCollection(c) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    shortTitle: c.short_title,
    description: c.description,
    category: c.category,
    categoryLabel: LEGAL_CATEGORY_LABELS[c.category] || c.category,
    jurisdiction: c.jurisdiction,
    accentColor: legalAccentColor(c.cover_config),
  };
}

function formatUnitNode(node) {
  return {
    id: node.id,
    unitType: node.unit_type,
    unitTypeLabel: legalUnitTypeLabel(node.unit_type),
    label: node.label,
    number: node.number,
    heading: node.heading,
    content: node.content,
    children: (node.children || []).map(formatUnitNode),
  };
}

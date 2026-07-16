import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { LEGAL_CATEGORY_LABELS, legalAccentColor } from "@/lib/oraculo/legalLibrary/legalLibraryFormat";

// GET /api/public/biblioteca/collections — sem autenticação.
// Lista apenas coleções ACTIVE (conteúdo publicado); usado pela extensão
// de navegador e por qualquer outro consumidor público futuro.
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("oraculo_legal_collections")
      .select("id, slug, title, short_title, description, category, jurisdiction, cover_config, display_order")
      .eq("status", "ACTIVE")
      .order("display_order", { ascending: true });

    if (error) throw error;

    const collections = (data || []).map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortTitle: c.short_title,
      description: c.description,
      category: c.category,
      categoryLabel: LEGAL_CATEGORY_LABELS[c.category] || c.category,
      jurisdiction: c.jurisdiction,
      accentColor: legalAccentColor(c.cover_config),
      coverShortLabel: c.cover_config?.shortTitle || c.short_title || "",
    }));

    return NextResponse.json(
      { success: true, data: collections },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("Erro na API GET /api/public/biblioteca/collections:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

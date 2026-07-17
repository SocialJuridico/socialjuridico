import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { searchLegalLibrary } from "@/lib/oraculo/legalLibrary/legalLibrarySearch";

// GET /api/public/biblioteca/search?q= — sem autenticação.
// Reusa a busca interna, mas restringe o resultado a coleções ACTIVE
// (a busca interna também enxerga DRAFT/PAUSED, que não são públicas).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!supabaseAdmin || q.trim().length < 2) {
      return NextResponse.json({ success: true, data: { query: q.trim(), article: null, results: [] } });
    }

    const { data: activeCollections } = await supabaseAdmin
      .from("oraculo_legal_collections")
      .select("slug")
      .eq("status", "ACTIVE");
    const activeSlugs = new Set((activeCollections || []).map((c) => c.slug));

    const formatResult = (r) => ({
      unitId: r.unitId,
      label: r.label,
      heading: r.heading,
      snippet: r.snippet,
      collectionSlug: r.collectionSlug,
      collectionTitle: r.collectionTitle,
      collectionShort: r.collectionShort,
    });

    const { query, article, results } = await searchLegalLibrary(q);
    const publicResults = results.filter((r) => activeSlugs.has(r.collectionSlug)).map(formatResult);
    // `article` = match exato por número de artigo (ex.: "art 14 cdc"), distinto de busca
    // textual (FTS). Consumidores (ex.: extensão) usam isso pra navegar direto ao artigo
    // em vez de mostrar uma lista de resultados.
    const publicArticle = article && activeSlugs.has(article.collectionSlug) ? formatResult(article) : null;

    return NextResponse.json({ success: true, data: { query, article: publicArticle, results: publicResults } });
  } catch (error) {
    console.error("Erro na API GET /api/public/biblioteca/search:", error);
    return NextResponse.json({ success: false, data: { query: "", article: null, results: [] } }, { status: 500 });
  }
}

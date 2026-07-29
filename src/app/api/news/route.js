import { NextResponse } from "next/server";

import { listPublishedArticles } from "@/lib/news/newsService";

export const runtime = "nodejs";
export const revalidate = 60;

// GET /api/news — listagem pública de matérias publicadas
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await listPublishedArticles({
      categorySlug: searchParams.get("categoria") || null,
      editorialType: searchParams.get("tipo") || null,
      featuredOnly: searchParams.get("destaque") === "1",
      limit: Math.min(Number(searchParams.get("limite") || 12), 48),
      page: Number(searchParams.get("pagina") || 1),
    });

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("[News] Falha ao listar público:", error.message);
    return NextResponse.json(
      { success: false, message: "Não foi possível carregar as notícias." },
      { status: 500 },
    );
  }
}
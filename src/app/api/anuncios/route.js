import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
  });
}

function normalizeCategory(value) {
  const category = String(value || "").trim().toUpperCase();
  return ["PREPOSTOS", "DILIGENCIAS", "OUTROS"].includes(category)
    ? category
    : "";
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço de anúncios indisponível." },
        503,
      );
    }

    const { searchParams } = new URL(request.url);
    const featuredOnly = searchParams.get("destaque") === "true";
    const category = normalizeCategory(searchParams.get("categoria"));

    const { data: advertisers, error: advertisersError } = await supabaseAdmin
      .from("anunciantes")
      .select("id, nome_empresa, whatsapp")
      .eq("ativo", true)
      .limit(2000);

    if (advertisersError) {
      throw new Error("Falha ao consultar anunciantes ativos.");
    }

    const advertiserMap = new Map(
      (advertisers || []).map((advertiser) => [advertiser.id, advertiser]),
    );
    const advertiserIds = [...advertiserMap.keys()];

    if (!advertiserIds.length) {
      return json({ success: true, data: [] });
    }

    let query = supabaseAdmin
      .from("anuncios")
      .select(
        "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
      )
      .in("anunciante_id", advertiserIds)
      .or("status.eq.ATIVO,status.is.null")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (featuredOnly) {
      query = query.eq("em_destaque", true);
    }

    if (category) {
      query = query.eq("categoria", category);
    }

    const { data: ads, error: adsError } = await query;

    if (adsError) throw new Error("Falha ao consultar anúncios ativos.");

    return json({
      success: true,
      data: (ads || []).map((ad) => ({
        id: ad.id,
        anunciante_id: ad.anunciante_id,
        titulo: ad.titulo,
        descricao: ad.descricao,
        categoria: ad.categoria,
        contato: ad.contato,
        status: ad.status || "ATIVO",
        em_destaque: Boolean(ad.em_destaque),
        created_at: ad.created_at,
        anunciante: advertiserMap.get(ad.anunciante_id) || null,
      })),
    });
  } catch (error) {
    console.error("[Anúncios Públicos][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os anúncios." },
      500,
    );
  }
}

import { getActiveAdvertiserSession } from "@/lib/anuncianteSessionServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = new Set(["PREPOSTOS", "DILIGENCIAS", "OUTROS"]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeContact(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 15);
  return digits;
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

export async function GET() {
  try {
    const session = await getActiveAdvertiserSession();

    if (!session) {
      return json(
        {
          success: false,
          message: "Sessão inválida ou conta suspensa.",
        },
        401,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("anuncios")
      .select(
        "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
      )
      .eq("anunciante_id", session.id)
      .or("status.eq.ATIVO,status.is.null")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error("Falha ao consultar anúncios.");

    return json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[Anunciante/Anúncios][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os anúncios." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const session = await getActiveAdvertiserSession();

    if (!session) {
      return json(
        {
          success: false,
          message: "Sessão inválida ou conta suspensa.",
        },
        401,
      );
    }

    const body = await request.json().catch(() => null);
    const title = normalizeText(body?.titulo, 140);
    const description = normalizeText(body?.descricao, 3000);
    const category = String(body?.categoria || "").trim().toUpperCase();
    const contact = normalizeContact(body?.contato);

    if (title.length < 4 || description.length < 20) {
      return json(
        {
          success: false,
          message:
            "Informe um título e uma descrição com conteúdo suficiente.",
        },
        400,
      );
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      return json(
        { success: false, message: "Categoria de anúncio inválida." },
        400,
      );
    }

    if (contact.length < 10) {
      return json(
        { success: false, message: "Informe um WhatsApp válido." },
        400,
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from("anuncios")
      .select("id", { count: "exact", head: true })
      .eq("anunciante_id", session.id)
      .or("status.eq.ATIVO,status.is.null");

    if (countError) throw new Error("Falha ao validar o limite de anúncios.");

    if (Number(count || 0) >= 50) {
      return json(
        {
          success: false,
          message: "O limite de 50 anúncios ativos foi atingido.",
        },
        409,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("anuncios")
      .insert([
        {
          anunciante_id: session.id,
          titulo: title,
          descricao: description,
          categoria: category,
          contato: contact,
          status: "ATIVO",
          em_destaque: false,
        },
      ])
      .select(
        "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
      )
      .single();

    if (error) throw new Error("Falha ao salvar o anúncio.");

    return json({
      success: true,
      message: "Anúncio criado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[Anunciante/Anúncios][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível criar o anúncio." },
      500,
    );
  }
}

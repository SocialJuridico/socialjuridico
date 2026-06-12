import { getActiveAdvertiserSession } from "@/lib/anuncianteSessionServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
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

export async function DELETE(request, { params }) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const { id } = await params;

    if (!isValidUuid(id)) {
      return json({ success: false, message: "Anúncio inválido." }, 400);
    }

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
      .update({
        status: "ARQUIVADO",
        em_destaque: false,
      })
      .eq("id", id)
      .eq("anunciante_id", session.id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error("Falha ao arquivar o anúncio.");

    if (!data) {
      return json(
        { success: false, message: "Anúncio não encontrado." },
        404,
      );
    }

    return json({
      success: true,
      message: "Anúncio arquivado sem excluir o histórico.",
    });
  } catch (error) {
    console.error("[Anunciante/Anúncio][DELETE] Erro:", error);
    return json(
      { success: false, message: "Não foi possível arquivar o anúncio." },
      500,
    );
  }
}

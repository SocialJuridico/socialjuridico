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

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function isMissingSupportTable(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("mensagens_suporte_anunciante")
  );
}

function supportMigrationResponse() {
  return json(
    {
      success: false,
      code: "ADVERTISER_SUPPORT_MIGRATION_REQUIRED",
      message:
        "O suporte aos anunciantes ainda não foi habilitado pela administração.",
    },
    409,
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
      .from("mensagens_suporte_anunciante")
      .select("id, anunciante_id, sender_type, content, created_at")
      .eq("anunciante_id", session.id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      if (isMissingSupportTable(error)) return supportMigrationResponse();
      throw new Error("Falha ao carregar o histórico de suporte.");
    }

    return json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[Anunciante/Suporte][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar o suporte." },
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
    const content = normalizeText(body?.content, 2000);

    if (!content) {
      return json(
        { success: false, message: "Informe uma mensagem." },
        400,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("mensagens_suporte_anunciante")
      .insert([
        {
          anunciante_id: session.id,
          sender_type: "ANUNCIANTE",
          content,
        },
      ])
      .select("id, anunciante_id, sender_type, content, created_at")
      .single();

    if (error) {
      if (isMissingSupportTable(error)) return supportMigrationResponse();
      throw new Error("Falha ao enviar a mensagem.");
    }

    return json({ success: true, data });
  } catch (error) {
    console.error("[Anunciante/Suporte][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível enviar a mensagem." },
      500,
    );
  }
}

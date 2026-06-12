import { getAuthenticatedAdmin } from "@/lib/adminAuth";
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
        "A migração de governança dos anunciantes precisa ser executada para habilitar o suporte.",
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

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        { success: false, message: "Serviço de suporte indisponível." },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

async function advertiserExists(db, advertiserId) {
  const { data, error } = await db
    .from("anunciantes")
    .select("id")
    .eq("id", advertiserId)
    .maybeSingle();

  if (error) throw new Error("Falha ao validar o anunciante.");
  return Boolean(data);
}

export async function GET(request, { params }) {
  try {
    const { anuncianteId } = await params;

    if (!isValidUuid(anuncianteId)) {
      return json({ success: false, message: "Anunciante inválido." }, 400);
    }

    const access = await requireAdmin();
    if (!access.ok) return access.response;

    if (!(await advertiserExists(access.db, anuncianteId))) {
      return json({ success: false, message: "Anunciante não encontrado." }, 404);
    }

    const { data, error } = await access.db
      .from("mensagens_suporte_anunciante")
      .select("id, anunciante_id, sender_type, content, created_at")
      .eq("anunciante_id", anuncianteId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      if (isMissingSupportTable(error)) return supportMigrationResponse();
      throw new Error("Falha ao carregar o histórico de suporte.");
    }

    return json({
      success: true,
      data: (data || []).map((message) => ({
        id: message.id,
        advertiserId: message.anunciante_id,
        senderType: message.sender_type,
        content: message.content,
        createdAt: message.created_at,
      })),
    });
  } catch (error) {
    console.error("[Admin/Anunciante/Suporte][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar o suporte." },
      500,
    );
  }
}

export async function POST(request, { params }) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const { anuncianteId } = await params;

    if (!isValidUuid(anuncianteId)) {
      return json({ success: false, message: "Anunciante inválido." }, 400);
    }

    const access = await requireAdmin();
    if (!access.ok) return access.response;

    if (!(await advertiserExists(access.db, anuncianteId))) {
      return json({ success: false, message: "Anunciante não encontrado." }, 404);
    }

    const body = await request.json().catch(() => null);
    const content = normalizeText(body?.content, 2000);

    if (!content) {
      return json(
        { success: false, message: "Informe uma mensagem." },
        400,
      );
    }

    const { data, error } = await access.db
      .from("mensagens_suporte_anunciante")
      .insert([
        {
          anunciante_id: anuncianteId,
          sender_type: "ADMIN",
          content,
        },
      ])
      .select("id, anunciante_id, sender_type, content, created_at")
      .single();

    if (error) {
      if (isMissingSupportTable(error)) return supportMigrationResponse();
      throw new Error("Falha ao enviar a mensagem.");
    }

    return json({
      success: true,
      data: {
        id: data.id,
        advertiserId: data.anunciante_id,
        senderType: data.sender_type,
        content: data.content,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("[Admin/Anunciante/Suporte][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível enviar a mensagem." },
      500,
    );
  }
}

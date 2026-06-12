import { hashAdvertiserPassword } from "@/lib/anuncianteAuth";
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

export async function PATCH(request) {
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
    const password = String(body?.senha || "");

    if (password.length < 10 || password.length > 128) {
      return json(
        {
          success: false,
          message: "A senha deve possuir entre 10 e 128 caracteres.",
        },
        400,
      );
    }

    const { error } = await supabaseAdmin
      .from("anunciantes")
      .update({
        password_hash: hashAdvertiserPassword(password),
        password: "__MIGRATED_TO_HASH__",
      })
      .eq("id", session.id)
      .eq("ativo", true);

    if (error) throw new Error("Falha ao atualizar a senha.");

    return json({
      success: true,
      message: "Senha atualizada com segurança.",
    });
  } catch (error) {
    console.error("[Anunciante/Perfil][PATCH] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar a senha." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const body = await request.json().catch(() => null);

    if (body?.logout !== true) {
      return json({ success: false, message: "Solicitação inválida." }, 400);
    }

    const response = json({ success: true });

    response.cookies.set("sj_anunciante_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch {
    return json({ success: false, message: "Solicitação inválida." }, 400);
  }
}

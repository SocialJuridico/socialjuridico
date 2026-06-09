import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  hashAdvertiserPassword,
  parseAdvertiserSessionToken,
} from "@/lib/anuncianteAuth";
import { supabaseAdmin } from "@/lib/supabase";

async function getAnuncianteSession() {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get(
    "sj_anunciante_session",
  );

  if (!sessionCookie?.value) {
    return null;
  }

  return parseAdvertiserSessionToken(
    sessionCookie.value,
  );
}

export async function PATCH(request) {
  const session =
    await getAnuncianteSession();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Não autorizado",
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const senha =
      typeof body?.senha === "string"
        ? body.senha
        : "";

    if (
      senha.length < 8 ||
      senha.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A senha deve possuir entre 8 e 128 caracteres.",
        },
        { status: 400 },
      );
    }

    const passwordHash =
      hashAdvertiserPassword(senha);

    const { error } = await supabaseAdmin
      .from("anunciantes")
      .update({
        password_hash: passwordHash,

        /*
         * Não mantemos a nova senha em texto puro.
         * O valor permanece preenchido apenas porque a
         * coluna antiga pode possuir restrição NOT NULL.
         */
        password: "__MIGRATED_TO_HASH__",
      })
      .eq("id", session.id);

    if (error) {
      console.error(
        "[Anunciante/Perfil] Erro ao atualizar senha:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível atualizar a senha.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Senha atualizada com segurança!",
    });
  } catch (error) {
    console.error(
      "[Anunciante/Perfil] Erro inesperado:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Erro ao processar requisição.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body?.logout !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "Solicitação inválida.",
        },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      "sj_anunciante_session",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
      },
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Solicitação inválida.",
      },
      { status: 400 },
    );
  }
}
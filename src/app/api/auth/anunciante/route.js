import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import {
  advertiserSessionConfig,
  createAdvertiserSession,
  hashAdvertiserPassword,
  verifyAdvertiserPassword,
} from "@/lib/anuncianteAuth";

function normalizeUsername(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

export async function POST(request) {
  try {
    const body = await request.json();

    const username =
      normalizeUsername(body?.usuario);

    const password =
      typeof body?.senha === "string"
        ? body.senha
        : "";

    if (
      !username ||
      username.length > 80 ||
      !password ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Informe usuário e senha válidos.",
        },
        { status: 400 },
      );
    }

    const {
      data: advertiser,
      error,
    } = await supabaseAdmin
      .from("anunciantes")
      .select(
        `
          id,
          username,
          nome_empresa,
          password,
          password_hash,
          ativo
        `,
      )
      .ilike("username", username)
      .maybeSingle();

    if (error) {
      console.error(
        "[Login anunciante] Erro no banco:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível realizar o acesso.",
        },
        { status: 500 },
      );
    }

    if (!advertiser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Usuário ou senha incorretos.",
        },
        { status: 401 },
      );
    }

    if (advertiser.ativo === false) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_INACTIVE",
          message:
            "Este acesso está temporariamente inativo. Entre em contato com a administração.",
        },
        { status: 403 },
      );
    }

    let passwordValid = false;
    let usedLegacyPassword = false;

    if (advertiser.password_hash) {
      passwordValid =
        verifyAdvertiserPassword(
          password,
          advertiser.password_hash,
        );
    } else if (
      typeof advertiser.password ===
        "string" &&
      advertiser.password === password
    ) {
      // Compatibilidade com anunciantes antigos.
      passwordValid = true;
      usedLegacyPassword = true;
    }

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Usuário ou senha incorretos.",
        },
        { status: 401 },
      );
    }

    /*
     * Migração automática:
     * o anunciante antigo entra normalmente e passa
     * a possuir hash após o primeiro login.
     */
    if (usedLegacyPassword) {
      const passwordHash =
        hashAdvertiserPassword(password);

      const { error: migrationError } =
        await supabaseAdmin
          .from("anunciantes")
          .update({
            password_hash: passwordHash,
          })
          .eq("id", advertiser.id);

      if (migrationError) {
        console.error(
          "[Login anunciante] Falha na migração da senha:",
          migrationError,
        );

        // O login continua para não bloquear a conta antiga.
      }
    }

    const sessionToken =
      createAdvertiserSession(advertiser);

    const response =
      NextResponse.json({
        success: true,
        user: {
          id: advertiser.id,
          nome:
            advertiser.nome_empresa,
          usuario:
            advertiser.username,
          role: "ANUNCIANTE",
        },
      });

    response.cookies.set(
      "sj_anunciante_session",
      sessionToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        maxAge:
          advertiserSessionConfig.maxAge,
        path: "/",
      },
    );

    return response;
  } catch (error) {
    console.error(
      "[Login anunciante] Erro inesperado:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Erro interno no servidor.",
      },
      { status: 500 },
    );
  }
}
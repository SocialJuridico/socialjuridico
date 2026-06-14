import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// ── RATE LIMITING ──
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LEGACY_DEFAULT_PASSWORD =
  process.env.LEGACY_DEFAULT_PASSWORD || process.env.DEFAULT_PASSWORD || null;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const retryMin = Math.ceil(
      (WINDOW_MS - (now - entry.firstAttempt)) / 60000,
    );
    return { allowed: false, retryMin };
  }
  entry.count++;
  return { allowed: true };
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";
  const rateCheck = checkRateLimit(ip);

  // Ignorar rate limit em localhost para testes
  const isLocalhost = ip === "127.0.0.1" || ip === "::1";

  if (!rateCheck.allowed && !isLocalhost) {
    return NextResponse.json(
      {
        success: false,
        message: `Muitas tentativas. Aguarde ${rateCheck.retryMin} minuto(s).`,
      },
      { status: 429 },
    );
  }

  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // 1. Autenticar no Supabase Auth
    let { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    // LOG DIAGNOSTIC — para identificar a causa raiz
    if (authError) {
      console.log("[LOGIN DIAGNOSTIC]", {
        code: authError.code,
        message: authError.message,
        status: authError.status,
        name: authError.name,
        fullError: JSON.stringify(authError),
      });
    }

    // Se o erro for "Email not confirmed", retornar erro amigável orientando a confirmação
    if (
      authError &&
      (authError.message?.toLowerCase().includes("email not confirmed") ||
        authError.message?.toLowerCase().includes("email_not_confirmed") ||
        authError.code === "email_not_confirmed")
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_CONFIRMED",
          message:
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou solicite um novo link.",
        },
        { status: 401 },
      );
    }

    // Se falhar, vamos tentar o "Lazy Sync" para usuários antigos/migrados
    if (
      authError &&
      (authError.status === 401 || authError.status === 400) &&
      supabaseAdmin &&
      LEGACY_DEFAULT_PASSWORD &&
      password === LEGACY_DEFAULT_PASSWORD
    ) {
      const db = supabaseAdmin || supabase;
      let existingProfile = null;

      // Procurar em todas as tabelas pelo email
      for (const table of ["advogados", "clientes", "admins"]) {
        const { data } = await db
          .from(table)
          .select("id, name, role")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();
        if (data) {
          existingProfile = { ...data, table };
          break;
        }
      }

      if (existingProfile) {
        // Criar ou atualizar usuário no Auth com a senha padrão e flag de troca obrigatória
        const { data: syncData, error: syncError } =
          await supabaseAdmin.auth.admin.createUser({
            id: existingProfile.id,
            email: email.trim().toLowerCase(),
            password: LEGACY_DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: existingProfile.name,
              role: existingProfile.role,
              needs_password_update: true,
            },
          });

        if (syncError) {
          if (syncError.message.includes("already has been registered")) {
            const { data: userData } =
              await supabaseAdmin.auth.admin.getUserById(existingProfile.id);

            await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
              password: LEGACY_DEFAULT_PASSWORD,
              email_confirm: true,
              user_metadata: {
                ...(userData?.user?.user_metadata || {}),
                full_name: existingProfile.name,
                role: existingProfile.role,
                needs_password_update: true,
              },
            });
          } else {
            console.error(
              "[LazySync] Erro crítico ao criar user no Auth:",
              syncError.message,
            );
          }
        }

        // Tentar logar novamente após o sync
        const { data: retryData, error: retryError } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

        if (!retryError) {
          authData = retryData;
          authError = null;
        }
      }
    }

    if (authError) {
      console.error("ERRO LOGIN AUTH:", {
        errorCode: authError.code,
        errorMessage: authError.message,
        status: authError.status,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Erro de autenticação: Credenciais inválidas ou conta não encontrada.`,
        },
        { status: 401 },
      );
    }

    const user = authData.user;

    // BLOQUEIO ADICIONAL: Mesmo que o Supabase permita o login, nós verificamos se o email foi confirmado
    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_CONFIRMED",
          message:
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou solicite um novo link.",
        },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;

    // 2. Buscar perfil — select('*') para compatibilidade entre tabelas
    let profile = null;
    const tables = ["clientes", "advogados", "admins"];
    for (const table of tables) {
      const { data } = await db
        .from(table)
        .select(
          `id, name, email, role, phone, avatar${table === "advogados" ? ", oab_verification_status, oab_warning_started_at, escritorio_id" : ""}`,
        )
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        profile = data;
        break;
      }
    }

    // Bloquear membros de escritório no login individual
    if (profile && profile.escritorio_id) {
      await supabase.auth.signOut(); // Revoga a sessão
      return NextResponse.json(
        {
          success: false,
          message:
            "Acesso restrito. Membros de escritório (Enterprise) devem efetuar o login pela aba 'Escritórios (Enterprise)'.",
        },
        { status: 403 },
      );
    }

    // Verificação de bloqueio de OAB
    if (profile?.role === "LAWYER") {
      let isError = profile.oab_verification_status === "ERROR";

      // Se estiver pendente, verifica se o prazo de 7 dias já estourou enquanto estava offline
      if (
        !isError &&
        profile.oab_verification_status === "PENDING" &&
        profile.oab_warning_started_at
      ) {
        const startedDate = new Date(profile.oab_warning_started_at);
        const daysPassed =
          (new Date().getTime() - startedDate.getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysPassed >= 7) {
          isError = true;
          // Suspende a conta imediatamente no banco
          await db
            .from("advogados")
            .update({ oab_verification_status: "ERROR" })
            .eq("id", profile.id);
        }
      }

      if (isError) {
        await supabase.auth.signOut(); // Revoga a sessão
        return NextResponse.json(
          {
            success: false,
            type: "OAB_ERROR",
            message:
              "Sua verificação de OAB apresentou inconsistências ou o prazo de envio expirou, e seu acesso foi restrito.",
          },
          { status: 403 },
        );
      }
    }

    // 3. Criar perfil padrão se não existir
    if (!profile) {
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split("@")[0],
        role: "CLIENT",
        created_at: new Date().toISOString(),
      };
      const { data: inserted } = await db
        .from("clientes")
        .insert([newProfile])
        .select("id, name, email, role")
        .single();
      if (inserted) profile = inserted;
    }

    // 4. Montar resposta — os cookies de sessão Supabase são gerenciados automaticamente pelo createClient()
    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email.split("@")[0],
        role: profile?.role || "CLIENT",
        cargo: profile?.cargo || null,
        needsPasswordUpdate: user.user_metadata?.needs_password_update === true,
      },
    });

    // Cookie de controle de 4 horas
    const loginData = Buffer.from(
      JSON.stringify({ loginAt: new Date().toISOString(), userId: user.id }),
    ).toString("base64");
    res.cookies.set("sj_login_time", loginData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 4 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Erro na API de Login:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

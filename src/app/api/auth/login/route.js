import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// ── RATE LIMITING ──
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

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

    const DEFAULT_PASSWORD = "socialjuridico1!";

    // Se falhar, vamos tentar o "Lazy Sync" para usuários antigos/migrados
    if (
      authError &&
      authError.status === 401 &&
      password === DEFAULT_PASSWORD
    ) {
      // ⚠️ SEGURANÇA: Não logar emails

      const db = supabaseAdmin || supabase;
      let existingProfile = null;

      // Procurar em todas as tabelas pelo email
      for (const table of ["advogados", "clientes", "admins"]) {
        const { data } = await db
          .from(table)
          .select("id, name, role")
          .eq("email", email.trim().toLowerCase())
          .single();
        if (data) {
          existingProfile = { ...data, table };
          break;
        }
      }

      if (existingProfile) {
        // ⚠️ SEGURANÇA: Não logar emails

        // Criar ou atualizar usuário no Auth com a senha padrão e flag de troca obrigatória
        const { data: syncData, error: syncError } =
          await supabaseAdmin.auth.admin.createUser({
            id: existingProfile.id,
            email: email.trim().toLowerCase(),
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: existingProfile.name,
              role: existingProfile.role,
              needs_password_update: true,
            },
          });

        if (syncError) {
          if (syncError.message.includes("already has been registered")) {
            // Se já existe no Auth mas a senha estava errada ou desatualizada, resetamos para a padrão
            // Buscamos o usuário atual para preservar metadados se necessário
            const { data: userData } =
              await supabaseAdmin.auth.admin.getUserById(existingProfile.id);

            await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
              password: DEFAULT_PASSWORD,
              user_metadata: {
                ...(userData?.user?.user_metadata || {}),
                full_name: existingProfile.name, // Garante que o nome venha do nosso banco oficial
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
          // ⚠️ SEGURANÇA: Não logar emails
        }
      }
    }

    if (authError) {
      console.error("ERRO LOGIN AUTH:", {
        email: email,
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
    const db = supabaseAdmin || supabase;

    // 2. Buscar perfil — select('*') para compatibilidade entre tabelas
    let profile = null;
    const tables = ["clientes", "advogados", "admins"];
    for (const table of tables) {
      const { data } = await db
        .from(table)
        .select("id, name, email, role, phone, avatar")
        .eq("id", user.id)
        .single();
      if (data) {
        profile = data;
        break;
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

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

const PROFILE_SELECT_FIELDS = {
  clientes: "id, name, email, role, phone, avatar, bio, created_at",
  advogados:
    "id, name, email, role, phone, avatar, bio, oab, estado, specialties, verified, created_at, is_premium, balance, badges, avg_rating, total_ratings, consulta, tempo, valor, oab_verification_status, oab_warning_started_at, plan_type, plan_billing_cycle, uso_redator_ia, uso_triagem, uso_agenda, uso_storage_mb, extra_redator_ia, extra_triagem, extra_storage_mb",
  admins: "id, name, email, role, phone, avatar, created_at",
};

const PROFILE_UPDATE_FIELDS = {
  clientes: ["name", "phone", "bio", "avatar"],
  advogados: [
    "phone",
    "bio",
    "specialties",
    "consulta",
    "tempo",
    "valor",
    "avatar",
  ],
  admins: ["name", "phone", "avatar"],
};

function getSelectFields(table) {
  return PROFILE_SELECT_FIELDS[table] || PROFILE_SELECT_FIELDS.clientes;
}

function buildUpdateData(body, allowedFields) {
  const updateData = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }
  return updateData;
}

export async function GET(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const tables = ["clientes", "advogados", "admins"];
    let profile = null;

    // 1ª tentativa: buscar por ID
    for (const table of tables) {
      const { data, error } = await db
        .from(table)
        .select(getSelectFields(table))
        .eq("id", user.id)
        .maybeSingle();
      if (data && !error) {
        profile = data;
        break;
      }
    }

    // 2ª tentativa: buscar por email (caso o ID Auth difira do ID no banco)
    if (!profile) {
      // ⚠️ SEGURANÇA: Não logar user.email
      for (const table of tables) {
        const { data, error } = await db
          .from(table)
          .select(getSelectFields(table))
          .eq("email", user.email)
          .maybeSingle();
        if (data && !error) {
          profile = data;
          break;
        }
      }
    }

    // 3ª tentativa: criar perfil padrão
    if (!profile) {
      console.warn(`[perfil] Criando perfil padrão para ${user.email}`);
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split("@")[0],
        role: "CLIENT",
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await db
        .from("clientes")
        .insert([newProfile])
        .select(getSelectFields("clientes"))
        .single();

      if (!insertError && inserted) {
        profile = inserted;
      } else {
        console.error(`[perfil] Erro ao criar perfil:`, insertError?.message);
        // Última chance: tentar buscar de novo (pode ter dado unique constraint se já existe)
        const { data: retry } = await db
          .from("clientes")
          .select(getSelectFields("clientes"))
          .eq("email", user.email)
          .maybeSingle();
        if (retry) profile = retry;
      }
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Perfil não encontrado. Entre em contato com o suporte.",
        },
        { status: 404 },
      );
    }

    // -- Lógica de Contagem de Verificação da OAB --
    if (profile.role === "LAWYER" && profile.oab_verification_status === "PENDING") {
      const now = new Date();
      if (!profile.oab_warning_started_at) {
        // Inicia o contador no primeiro login com status PENDING
        const startedAt = now.toISOString();
        const { error: updateError } = await db
          .from("advogados")
          .update({ oab_warning_started_at: startedAt })
          .eq("id", profile.id);
        
        if (!updateError) {
          profile.oab_warning_started_at = startedAt;
        }
      } else {
        // Verifica se já passaram 7 dias
        const startedDate = new Date(profile.oab_warning_started_at);
        const diffMs = now.getTime() - startedDate.getTime();
        const daysPassed = diffMs / (1000 * 60 * 60 * 24);
        
        if (daysPassed >= 7) {
          // Prazo estourou, suspende a conta
          await db
            .from("advogados")
            .update({ oab_verification_status: "ERROR" })
            .eq("id", profile.id);
          
          profile.oab_verification_status = "ERROR";
        }
      }
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Erro na API GET /api/perfil:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );

    const body = await request.json();
    const db = supabaseAdmin || supabase;

    // Descobrir em qual tabela o perfil está
    let profileTable = "clientes";
    for (const table of ["clientes", "advogados", "admins"]) {
      const { data } = await db
        .from(table)
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        profileTable = table;
        break;
      }
    }

    const updateData = buildUpdateData(
      body,
      PROFILE_UPDATE_FIELDS[profileTable] || PROFILE_UPDATE_FIELDS.clientes,
    );

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nada para atualizar",
      });
    }

    const { error: updateError } = await db
      .from(profileTable)
      .update(updateData)
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Atualizar senha no Auth se fornecida
    if (body.password && body.password.length >= 6) {
      const authClient = supabaseAdmin || supabase;
      const { error: pwdError } = await authClient.auth.admin.updateUserById(
        user.id,
        {
          password: body.password,
        },
      );
      if (pwdError) {
        console.error(
          "[perfil] Erro ao atualizar senha via Admin:",
          pwdError.message,
        );
        // Tentar via user auth se admin falhar/não disponível
        await supabase.auth.updateUser({ password: body.password });
      }
    }

    return NextResponse.json({ success: true, message: "Perfil atualizado" });
  } catch (error) {
    console.error("Erro na API PUT /api/perfil:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

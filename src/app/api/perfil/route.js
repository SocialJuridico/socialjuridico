import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { OAB_GRACE_PERIOD_DAYS } from "@/lib/oab";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { sanitizeString } from "@/lib/securityUtils";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store",
};

const PROFILE_SELECT_FIELDS = {
  clientes: "id, name, email, role, phone, avatar, bio, created_at",
  advogados:
    "id, name, email, role, phone, avatar, bio, oab, estado, specialties, verified, created_at, is_premium, premium_expires_at, balance, badges, avg_rating, total_ratings, consulta, tempo, valor, oab_verification_status, oab_warning_started_at, plan_type, plan_billing_cycle, uso_redator_ia, uso_triagem, uso_agenda, uso_storage_mb, extra_redator_ia, extra_triagem, extra_storage_mb, promo_start_used, promo_pro_used, escritorio_id, cargo, saldo_creditos_ia_extensao, uso_interpretar_ia_extensao, interpretar_ia_periodo",
  admins: "id, name, email, role, phone, avatar, created_at",
};

const PROFILE_UPDATE_FIELDS = {
  clientes: ["name", "phone", "bio", "avatar"],
  advogados: ["phone", "bio", "specialties", "consulta", "tempo", "valor", "avatar"],
  admins: ["name", "phone", "avatar"],
};

function json(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function getSelectFields(table) {
  return PROFILE_SELECT_FIELDS[table] || PROFILE_SELECT_FIELDS.clientes;
}

function limitText(value, maxLength) {
  return sanitizeString(value || "").slice(0, maxLength);
}

function normalizeProfileField(field, value) {
  switch (field) {
    case "name":
      return limitText(value, 160);
    case "phone":
      return String(value || "")
        .replace(/\D/g, "")
        .slice(0, 13);
    case "bio":
      return limitText(value, 1200);
    case "specialties":
      return String(value || "")
        .split(",")
        .map((item) => limitText(item, 40))
        .filter(Boolean)
        .slice(0, 20)
        .join(", ");
    case "consulta":
      return value === "Paga" ? "Paga" : "Gratuita";
    case "tempo":
      return limitText(value, 60);
    case "valor": {
      const numeric = Number(value || 0);
      if (!Number.isFinite(numeric) || numeric < 0) return 0;
      return Math.min(numeric, 100000);
    }
    case "avatar":
      return typeof value === "string" && value.startsWith("http")
        ? value.slice(0, 1000)
        : "";
    default:
      return value;
  }
}

function buildUpdateData(body, allowedFields) {
  const updateData = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = normalizeProfileField(field, body[field]);
    }
  }
  return updateData;
}

function validateProfilePayload(body) {
  if (!body || typeof body !== "object") {
    return "Dados invalidos.";
  }

  if (body.password !== undefined && body.password !== "") {
    if (typeof body.password !== "string") return "Senha invalida.";
    if (body.password.length < 6) {
      return "A nova senha precisa ter pelo menos 6 caracteres.";
    }
    if (body.password.length > 72) {
      return "A nova senha ultrapassa o limite permitido.";
    }
  }

  if (body.consulta !== undefined && !["Gratuita", "Paga"].includes(body.consulta)) {
    return "Tipo de consulta invalido.";
  }

  if (body.valor !== undefined) {
    const numeric = Number(body.valor);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100000) {
      return "Valor de consulta invalido.";
    }
  }

  return "";
}

async function findProfileByIdOrEmail(db, finalUser, fields = "id") {
  // Erro de banco (coluna inexistente, RLS, indisponibilidade) NUNCA pode ser
  // tratado como "perfil não existe": ensureProfile criaria um cliente bogus
  // para um advogado/admin real (incidente de 2026-07-17). Erro real → lança.
  for (const table of ["clientes", "advogados", "admins"]) {
    const { data, error } = await db
      .from(table)
      .select(fields === "profile" ? getSelectFields(table) : fields)
      .eq("id", finalUser.id)
      .maybeSingle();
    if (error) throw new Error(`[perfil] Falha ao consultar ${table}: ${error.message}`);
    if (data) return { table, data };
  }

  if (!finalUser.email) return null;

  for (const table of ["clientes", "advogados", "admins"]) {
    const { data, error } = await db
      .from(table)
      .select(fields === "profile" ? getSelectFields(table) : fields)
      .eq("email", finalUser.email)
      .maybeSingle();
    if (error) throw new Error(`[perfil] Falha ao consultar ${table} por email: ${error.message}`);
    if (data) return { table, data };
  }

  return null;
}

async function ensureProfile(db, finalUser) {
  const existing = await findProfileByIdOrEmail(db, finalUser, "profile");
  if (existing?.data) return existing.data;

  const newProfile = {
    id: finalUser.id,
    email: finalUser.email,
    name: finalUser.user_metadata?.full_name || finalUser.email?.split("@")[0] || "Cliente",
    role: "CLIENT",
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await db
    .from("clientes")
    .insert([newProfile])
    .select(getSelectFields("clientes"))
    .single();

  if (!insertError && inserted) return inserted;

  console.error("[perfil] Erro ao criar perfil:", insertError?.message);
  const retry = await findProfileByIdOrEmail(db, finalUser, "profile");
  return retry?.data || null;
}

async function updateOabWarningIfNeeded(db, profile) {
  if (
    profile.role !== "LAWYER" ||
    profile.oab_verification_status !== "PENDING"
  ) {
    return profile;
  }

  const now = new Date();
  if (!profile.oab_warning_started_at) {
    const startedAt = now.toISOString();
    const { error } = await db
      .from("advogados")
      .update({ oab_warning_started_at: startedAt })
      .eq("id", profile.id);
    if (!error) profile.oab_warning_started_at = startedAt;
    return profile;
  }

  const startedDate = new Date(profile.oab_warning_started_at);
  const daysPassed = (now.getTime() - startedDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysPassed >= OAB_GRACE_PERIOD_DAYS) {
    await db
      .from("advogados")
      .update({ oab_verification_status: "ERROR" })
      .eq("id", profile.id);
    profile.oab_verification_status = "ERROR";
  }

  return profile;
}

async function attachOfficeName(db, profile) {
  if (profile.role !== "LAWYER" || !profile.escritorio_id) return profile;

  const { data } = await db
    .from("escritorios")
    .select("nome")
    .eq("id", profile.escritorio_id)
    .maybeSingle();

  if (data?.nome) profile.nome_escritorio = data.nome;
  return profile;
}

export async function GET(request) {
  try {
    const finalUser = await getAuthenticatedUser(request);
    if (!finalUser) {
      return json({ success: false, message: "Nao autorizado" }, { status: 401 });
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;
    let profile = await ensureProfile(db, finalUser);

    if (!profile) {
      return json(
        {
          success: false,
          message: "Perfil nao encontrado. Entre em contato com o suporte.",
        },
        { status: 404 },
      );
    }

    profile.onboarding_complete =
      finalUser.user_metadata?.onboarding_complete === true;
    profile = await updateOabWarningIfNeeded(db, profile);

    if (profile.role === "LAWYER" && profile.oab_verification_status === "ERROR") {
      return json(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistencias na verificacao da OAB.",
        },
        { status: 403 },
      );
    }

    profile = await attachOfficeName(db, profile);
    return json({ success: true, data: profile });
  } catch (error) {
    console.error("Erro na API GET /api/perfil:", error);
    return json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const finalUser = await getAuthenticatedUser(request);
    if (!finalUser) {
      return json({ success: false, message: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const validationError = validateProfilePayload(body);
    if (validationError) {
      return json({ success: false, message: validationError }, { status: 400 });
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;
    const profileRecord = await findProfileByIdOrEmail(db, finalUser, "id");

    if (!profileRecord?.data?.id) {
      return json(
        { success: false, message: "Perfil nao encontrado." },
        { status: 404 },
      );
    }

    const updateData = buildUpdateData(
      body,
      PROFILE_UPDATE_FIELDS[profileRecord.table] || PROFILE_UPDATE_FIELDS.clientes,
    );

    if (Object.keys(updateData).length > 0) {
      const { error } = await db
        .from(profileRecord.table)
        .update(updateData)
        .eq("id", profileRecord.data.id);
      if (error) throw error;
    }

    if (body.password) {
      let adminPasswordError = null;

      if (supabaseAdmin?.auth?.admin?.updateUserById) {
        const result = await supabaseAdmin.auth.admin.updateUserById(finalUser.id, {
          password: body.password,
        });
        adminPasswordError = result.error;
      }

      if (!supabaseAdmin || adminPasswordError) {
        if (adminPasswordError) {
          console.error(
            "[perfil] Erro ao atualizar senha via Admin:",
            adminPasswordError.message,
          );
        }
        const { error: userPasswordError } = await supabase.auth.updateUser({
          password: body.password,
        });
        if (userPasswordError) throw userPasswordError;
      }
    }

    return json({ success: true, message: "Perfil atualizado" });
  } catch (error) {
    console.error("Erro na API PUT /api/perfil:", error);
    return json(
      { success: false, message: "Erro interno ao atualizar perfil." },
      { status: 500 },
    );
  }
}

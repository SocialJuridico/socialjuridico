import crypto from "node:crypto";

import { forgotPasswordAction } from "@/app/actions/passwordActions";
import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["advogado", "estagiario"]);
const ALLOWED_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

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

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeOab(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, "");
  if (!normalized || normalized.length > 30) return null;
  return /^[0-9A-Za-z.-]+$/.test(normalized)
    ? normalized.toUpperCase()
    : null;
}

function getEnterprisePlanType(plan) {
  const value = String(plan || "start");
  if (value.startsWith("pro_plus")) return "ENTERPRISE_PRO_PLUS";
  if (value.startsWith("pro")) return "ENTERPRISE_PRO";
  return "ENTERPRISE_START";
}

function getTemporaryExpiration(plan) {
  const match = String(plan || "").match(/_(7|15|30)$/);
  if (!match) return null;

  const expiration = new Date();
  expiration.setUTCDate(expiration.getUTCDate() + Number(match[1]));
  return expiration.toISOString();
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
        {
          success: false,
          message: "Serviço administrativo não configurado no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, db: supabaseAdmin };
}

async function getOfficeOrNull(db, officeId) {
  const { data, error } = await db
    .from("escritorios")
    .select("id, nome, plano, max_advogados, max_estagiarios")
    .eq("id", officeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível localizar o escritório: ${error.message}`);
  }

  return data || null;
}

export async function GET(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const officeId = searchParams.get("escritorioId");

    if (!isValidUuid(officeId)) {
      return json(
        { success: false, message: "ID do escritório inválido." },
        400,
      );
    }

    const office = await getOfficeOrNull(access.db, officeId);
    if (!office) {
      return json(
        { success: false, message: "Escritório não encontrado." },
        404,
      );
    }

    const { data, error } = await access.db
      .from("advogados")
      .select(
        "id, name, email, phone, oab, estado, cargo, created_at, balance, plan_type, premium_expires_at, oab_verification_status",
      )
      .eq("escritorio_id", officeId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao consultar membros: ${error.message}`);
    }

    return json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[Admin/Escritórios/Membros][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os membros." },
      500,
    );
  }
}

export async function POST(request) {
  let createdUserId = null;

  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const officeId = body?.escritorioId;
    const name = String(body?.name || "").trim();
    const email = normalizeEmail(body?.email);
    const role = String(body?.cargo || "").toLowerCase();
    const state = String(body?.estado || "").toUpperCase();
    const oab = role === "advogado" ? normalizeOab(body?.oab) : "";

    if (!isValidUuid(officeId) || !name || !email || !ALLOWED_ROLES.has(role)) {
      return json(
        { success: false, message: "Revise os dados obrigatórios do membro." },
        400,
      );
    }

    if (role === "advogado" && (!oab || !ALLOWED_STATES.has(state))) {
      return json(
        {
          success: false,
          message: "Advogados precisam de OAB e UF válidas.",
        },
        400,
      );
    }

    const office = await getOfficeOrNull(access.db, officeId);
    if (!office) {
      return json(
        { success: false, message: "Escritório não encontrado." },
        404,
      );
    }

    const { data: existingStaff, error: countError } = await access.db
      .from("advogados")
      .select("cargo")
      .eq("escritorio_id", officeId);

    if (countError) {
      throw new Error(`Falha ao verificar a capacidade: ${countError.message}`);
    }

    const lawyerCount = (existingStaff || []).filter(
      (member) => member.cargo !== "estagiario",
    ).length;
    const internCount = (existingStaff || []).filter(
      (member) => member.cargo === "estagiario",
    ).length;

    if (role === "advogado" && lawyerCount >= Number(office.max_advogados || 0)) {
      return json(
        {
          success: false,
          message: `O escritório atingiu o limite de ${office.max_advogados} advogados.`,
        },
        409,
      );
    }

    if (role === "estagiario" && internCount >= Number(office.max_estagiarios || 0)) {
      return json(
        {
          success: false,
          message: `O escritório atingiu o limite de ${office.max_estagiarios} estagiários.`,
        },
        409,
      );
    }

    const temporaryPassword = crypto.randomBytes(32).toString("base64url");
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "LAWYER",
          cargo: role,
          needs_password_update: true,
        },
      });

    if (authError || !authData?.user) {
      return json(
        {
          success: false,
          message:
            authError?.message?.toLowerCase().includes("registered")
              ? "Este e-mail já está cadastrado."
              : "Não foi possível criar o acesso do membro.",
        },
        409,
      );
    }

    createdUserId = authData.user.id;
    const now = new Date().toISOString();
    const newStaff = {
      id: createdUserId,
      email,
      name,
      phone: String(body?.phone || "").trim(),
      oab,
      estado: role === "advogado" ? state : "",
      cargo: role,
      escritorio_id: officeId,
      role: "LAWYER",
      balance: 10,
      is_premium: true,
      plan_type: getEnterprisePlanType(office.plano),
      premium_expires_at: getTemporaryExpiration(office.plano),
      oab_verification_status: role === "advogado" ? "PENDING" : "VERIFIED",
      oab_warning_started_at: role === "advogado" ? now : null,
      created_at: now,
    };

    const { error: insertError } = await access.db
      .from("advogados")
      .insert([newStaff]);

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      throw new Error(`Falha ao criar perfil do membro: ${insertError.message}`);
    }

    const resetResult = await forgotPasswordAction(email);
    if (!resetResult?.success) {
      console.error(
        "[Admin/Escritórios/Membros] Perfil criado, mas o convite falhou:",
        resetResult?.message,
      );
    }

    return json(
      {
        success: true,
        message: resetResult?.success
          ? `${role === "estagiario" ? "Estagiário" : "Advogado"} cadastrado. Um link para criação da senha foi enviado por e-mail.`
          : `${role === "estagiario" ? "Estagiário" : "Advogado"} cadastrado, mas o e-mail de criação da senha precisa ser reenviado.`,
      },
      201,
    );
  } catch (error) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => null);
    }

    console.error("[Admin/Escritórios/Membros][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível cadastrar o membro." },
      500,
    );
  }
}

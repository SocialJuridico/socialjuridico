import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { hashPassword } from "@/lib/passwordHash";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFFICE_FIELDS = [
  "id",
  "nome",
  "cnpj",
  "max_advogados",
  "max_estagiarios",
  "endereco",
  "cidade_estado",
  "cep",
  "areas_atuacao",
  "estados_atendidos",
  "nome_responsavel",
  "logo_url",
  "email",
  "plano",
  "limites",
  "balance",
  "created_at",
].join(", ");

const ALLOWED_PLANS = new Set([
  "start",
  "start_7",
  "start_15",
  "start_30",
  "pro",
  "pro_7",
  "pro_15",
  "pro_30",
  "pro_plus",
  "pro_plus_7",
  "pro_plus_15",
  "pro_plus_30",
]);

const DEFAULT_LIMITS = {
  start: {
    storage_mb: 256000,
    creditos_ia: 1500,
    notificacoes: 50,
    osint: 15,
    oab_sinc: 0,
  },
  pro: {
    storage_mb: 512000,
    creditos_ia: 3000,
    notificacoes: 120,
    osint: 40,
    oab_sinc: 150,
  },
  pro_plus: {
    storage_mb: 1024000,
    creditos_ia: 999999,
    notificacoes: 999999,
    osint: 999999,
    oab_sinc: 700,
  },
};

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

function normalizeCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 14) return null;

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function normalizeInteger(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max
    ? number
    : null;
}

function getPlanFamily(plan) {
  if (String(plan).startsWith("pro_plus")) return "pro_plus";
  if (String(plan).startsWith("pro")) return "pro";
  return "start";
}

function getEnterprisePlanType(plan) {
  const family = getPlanFamily(plan);
  if (family === "pro_plus") return "ENTERPRISE_PRO_PLUS";
  if (family === "pro") return "ENTERPRISE_PRO";
  return "ENTERPRISE_START";
}

function getPlanExpiration(plan) {
  const match = String(plan || "").match(/_(7|15|30)$/);
  if (!match) return null;

  const expiration = new Date();
  expiration.setUTCDate(expiration.getUTCDate() + Number(match[1]));
  return expiration.toISOString();
}

function normalizeLimits(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};
  const keys = [
    "storage_mb",
    "creditos_ia",
    "notificacoes",
    "osint",
    "oab_sinc",
  ];

  for (const key of keys) {
    const number = normalizeInteger(source[key], 0, 9999999);
    if (number === null) return null;
    normalized[key] = number;
  }

  return normalized;
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

  return { ok: true, db: supabaseAdmin, auth };
}

async function getOfficeOrNull(db, id) {
  const { data, error } = await db
    .from("escritorios")
    .select(OFFICE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível localizar o escritório: ${error.message}`);
  }

  return data || null;
}

async function syncOfficeMembersPlan(db, officeId, plan) {
  const { error } = await db
    .from("advogados")
    .update({
      is_premium: true,
      plan_type: getEnterprisePlanType(plan),
      premium_expires_at: getPlanExpiration(plan),
    })
    .eq("escritorio_id", officeId);

  if (error) {
    throw new Error(`Falha ao sincronizar benefícios da equipe: ${error.message}`);
  }
}

export async function GET() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("escritorios")
      .select(OFFICE_FIELDS)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao consultar escritórios: ${error.message}`);
    }

    return json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[Admin/Escritórios][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os escritórios." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const email = normalizeEmail(body?.email);
    const cnpj = normalizeCnpj(body?.cnpj);
    const plan = String(body?.plano || "start");
    const maxLawyers = normalizeInteger(body?.max_advogados ?? 10, 1, 20);
    const maxInterns = normalizeInteger(body?.max_estagiarios ?? 5, 0, 10);
    const name = String(body?.nome || "").trim();
    const responsibleName = String(body?.nome_responsavel || "").trim();

    if (
      !name ||
      !responsibleName ||
      !email ||
      !cnpj ||
      !maxLawyers ||
      maxInterns === null
    ) {
      return json(
        { success: false, message: "Revise os campos obrigatórios do escritório." },
        400,
      );
    }

    if (!ALLOWED_PLANS.has(plan)) {
      return json({ success: false, message: "Plano Enterprise inválido." }, 400);
    }

    let passwordHash;
    try {
      passwordHash = hashPassword(body?.senha);
    } catch (error) {
      return json({ success: false, message: error.message }, 400);
    }

    const family = getPlanFamily(plan);
    const newOffice = {
      nome: name,
      cnpj,
      max_advogados: maxLawyers,
      max_estagiarios: maxInterns,
      endereco: String(body?.endereco || "").trim(),
      cidade_estado: String(body?.cidade_estado || "").trim(),
      cep: String(body?.cep || "").trim(),
      areas_atuacao: Array.isArray(body?.areas_atuacao)
        ? body.areas_atuacao.filter((item) => typeof item === "string")
        : [],
      estados_atendidos: Array.isArray(body?.estados_atendidos)
        ? body.estados_atendidos.filter((item) => typeof item === "string")
        : [],
      nome_responsavel: responsibleName,
      logo_url: String(body?.logo_url || "").trim(),
      email,
      senha: passwordHash,
      plano: plan,
      limites: DEFAULT_LIMITS[family],
      created_at: new Date().toISOString(),
    };

    const { data, error } = await access.db
      .from("escritorios")
      .insert([newOffice])
      .select(OFFICE_FIELDS)
      .single();

    if (error) {
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("cnpj") ||
        error.message?.toLowerCase().includes("email")
      ) {
        return json(
          { success: false, message: "Este CNPJ ou e-mail já está cadastrado." },
          409,
        );
      }
      throw new Error(`Falha ao criar escritório: ${error.message}`);
    }

    return json(
      {
        success: true,
        data,
        message: "Escritório criado com sucesso.",
      },
      201,
    );
  } catch (error) {
    console.error("[Admin/Escritórios][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível cadastrar o escritório." },
      500,
    );
  }
}

export async function PUT(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const id = body?.id;
    const action = body?.action;
    const value = body?.value;

    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID do escritório inválido." }, 400);
    }

    const office = await getOfficeOrNull(access.db, id);
    if (!office) {
      return json({ success: false, message: "Escritório não encontrado." }, 404);
    }

    const updates = {};
    let planToSync = null;

    if (action === "UPDATE_LIMITS") {
      const limits = normalizeLimits(value);
      if (!limits) {
        return json({ success: false, message: "Limites inválidos." }, 400);
      }
      updates.limites = limits;
    } else if (action === "UPDATE_PLAN") {
      const plan = String(value || "");
      if (!ALLOWED_PLANS.has(plan)) {
        return json({ success: false, message: "Plano Enterprise inválido." }, 400);
      }
      updates.plano = plan;
      updates.limites = DEFAULT_LIMITS[getPlanFamily(plan)];
      planToSync = plan;
    } else if (action === "UPDATE_GENERAL") {
      const balance = normalizeInteger(value?.balance, 0, 9999999);
      if (balance === null) {
        return json({ success: false, message: "Saldo de Juris inválido." }, 400);
      }
      updates.balance = balance;
    } else {
      return json({ success: false, message: "Ação administrativa inválida." }, 400);
    }

    const { data, error } = await access.db
      .from("escritorios")
      .update(updates)
      .eq("id", id)
      .select(OFFICE_FIELDS)
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar escritório: ${error.message}`);
    }

    if (planToSync) {
      await syncOfficeMembersPlan(access.db, id, planToSync);
    }

    return json({
      success: true,
      data,
      message: planToSync
        ? "Plano do escritório e benefícios da equipe atualizados."
        : "Escritório atualizado com sucesso.",
    });
  } catch (error) {
    console.error("[Admin/Escritórios][PUT] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar o escritório." },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID do escritório inválido." }, 400);
    }

    const office = await getOfficeOrNull(access.db, id);
    if (!office) {
      return json({ success: false, message: "Escritório não encontrado." }, 404);
    }

    const { error: unlinkError } = await access.db
      .from("advogados")
      .update({
        escritorio_id: null,
        is_premium: false,
        plan_type: "FREE",
        premium_expires_at: null,
      })
      .eq("escritorio_id", id);

    if (unlinkError) {
      throw new Error(`Falha ao desassociar membros: ${unlinkError.message}`);
    }

    const { error: deleteError } = await access.db
      .from("escritorios")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Falha ao excluir escritório: ${deleteError.message}`);
    }

    return json({
      success: true,
      message: "Escritório excluído e membros desassociados.",
    });
  } catch (error) {
    console.error("[Admin/Escritórios][DELETE] Erro:", error);
    return json(
      { success: false, message: "Não foi possível excluir o escritório." },
      500,
    );
  }
}

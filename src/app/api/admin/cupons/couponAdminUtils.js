import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const COUPON_SELECT =
  "id, codigo, tipo, desconto_tipo, valor, limite_por_usuario, limite_total, starts_at, expira_em, ativo, description, stripe_coupon_id, created_at, updated_at, created_by, updated_by, archived_at, archived_by, archive_reason";

const ALLOWED_TYPES = new Set(["PLANO_PRO", "COMPRA_JURIS"]);
const ALLOWED_DISCOUNT_TYPES = new Set(["PERCENTUAL", "FIXO"]);
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validateMutationOrigin(request) {
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

export async function requireCouponAdmin() {
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
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeNullableInteger(value, { min = 1, max = 1_000_000 } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

export function normalizeCouponInput(body) {
  const codigo = String(body?.codigo || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const tipo = String(body?.tipo || "").trim().toUpperCase();
  const descontoTipo = String(body?.desconto_tipo || "")
    .trim()
    .toUpperCase();
  const valor = Number(body?.valor);
  const limitePorUsuario = normalizeNullableInteger(body?.limite_por_usuario, {
    min: 1,
    max: 100,
  });
  const limiteTotal = normalizeNullableInteger(body?.limite_total, {
    min: 1,
    max: 1_000_000,
  });
  const startsAt = normalizeDate(body?.starts_at);
  const expiresAt = normalizeDate(body?.expira_em);
  const description =
    String(body?.description || "").trim().slice(0, 500) || null;

  if (!CODE_PATTERN.test(codigo)) {
    return {
      ok: false,
      message:
        "O código deve ter entre 3 e 40 caracteres, usando letras, números, _ ou -.",
    };
  }

  if (!ALLOWED_TYPES.has(tipo)) {
    return { ok: false, message: "Aplicação comercial do cupom inválida." };
  }

  if (!ALLOWED_DISCOUNT_TYPES.has(descontoTipo)) {
    return { ok: false, message: "Tipo de desconto inválido." };
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return {
      ok: false,
      message: "Informe um valor de desconto maior que zero.",
    };
  }

  if (descontoTipo === "PERCENTUAL" && valor > 100) {
    return {
      ok: false,
      message: "O desconto percentual não pode exceder 100%.",
    };
  }

  if (
    tipo === "PLANO_PRO" &&
    descontoTipo === "PERCENTUAL" &&
    valor >= 100
  ) {
    return {
      ok: false,
      message:
        "Cupons de plano devem manter uma cobrança mínima e não podem conceder 100% de desconto.",
    };
  }

  if (limitePorUsuario === undefined || limitePorUsuario === null) {
    return {
      ok: false,
      message: "O limite por usuário deve ser um número inteiro entre 1 e 100.",
    };
  }

  if (limiteTotal === undefined) {
    return { ok: false, message: "O limite total informado é inválido." };
  }

  if (startsAt === undefined || expiresAt === undefined) {
    return { ok: false, message: "Período de disponibilidade inválido." };
  }

  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    return {
      ok: false,
      message: "A data final deve ser posterior à data inicial.",
    };
  }

  return {
    ok: true,
    value: {
      codigo,
      tipo,
      desconto_tipo: descontoTipo,
      valor: Number(valor.toFixed(2)),
      limite_por_usuario: limitePorUsuario,
      limite_total: limiteTotal,
      starts_at: startsAt,
      expira_em: expiresAt,
      ativo: body?.ativo === true,
      description,
    },
  };
}

export function couponStatus(coupon, now = Date.now()) {
  if (coupon?.archived_at) return "archived";
  if (!coupon?.ativo) return "inactive";

  const startsAt = coupon.starts_at ? new Date(coupon.starts_at).getTime() : null;
  const expiresAt = coupon.expira_em
    ? new Date(coupon.expira_em).getTime()
    : null;

  if (startsAt && startsAt > now) return "scheduled";
  if (expiresAt && expiresAt <= now) return "expired";

  const committedCapacity =
    Number(coupon.total_usos || 0) + Number(coupon.reservas_ativas || 0);
  if (
    coupon.limite_total !== null &&
    coupon.limite_total !== undefined &&
    committedCapacity >= Number(coupon.limite_total)
  ) {
    return "exhausted";
  }

  return "active";
}

export function serializeCoupon(coupon) {
  const normalized = {
    ...coupon,
    valor: Number(coupon.valor || 0),
    limite_por_usuario: Number(coupon.limite_por_usuario || 1),
    limite_total:
      coupon.limite_total === null || coupon.limite_total === undefined
        ? null
        : Number(coupon.limite_total),
    total_usos: Number(coupon.total_usos || 0),
    usuarios_unicos: Number(coupon.usuarios_unicos || 0),
    reservas_ativas: Number(coupon.reservas_ativas || 0),
  };

  return {
    ...normalized,
    publication_status: couponStatus(normalized),
  };
}

export function stripeCouponParams(input) {
  const params = {
    name: input.codigo,
    duration: "once",
    metadata: {
      source: "SOCIAL_JURIDICO",
      coupon_code: input.codigo,
      coupon_type: input.tipo,
    },
  };

  if (input.desconto_tipo === "PERCENTUAL") {
    params.percent_off = input.valor;
  } else {
    params.amount_off = Math.round(input.valor * 100);
    params.currency = "brl";
  }

  if (input.expira_em) {
    params.redeem_by = Math.floor(new Date(input.expira_em).getTime() / 1000);
  }

  if (input.limite_total) {
    params.max_redemptions = input.limite_total;
  }

  return params;
}

export async function registerCouponAudit(
  db,
  { couponId, adminId, action, reason = null, snapshot = {}, changes = {} },
) {
  const { error } = await db.from("admin_coupon_audit_logs").insert([
    {
      coupon_id: couponId,
      admin_id: adminId,
      action,
      reason,
      snapshot,
      changes,
    },
  ]);

  if (error) {
    const auditError = new Error(
      `Falha ao registrar auditoria: ${error.message}`,
    );
    auditError.status = ["42P01", "PGRST205"].includes(error.code) ? 503 : 500;
    throw auditError;
  }
}

export async function loadRecentCouponAudit(db, limit = 20) {
  const { data, error } = await db
    .from("admin_coupon_audit_logs")
    .select("id, coupon_id, admin_id, action, reason, changes, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { available: false, items: [] };
    }
    throw new Error(`Falha ao consultar auditoria: ${error.message}`);
  }

  return { available: true, items: data || [] };
}

export function safeErrorResponse(error, fallbackMessage) {
  console.error("[Admin/Cupons] Erro:", error);

  const status = Number(error?.status) || 500;
  const message = [400, 401, 403, 404, 409, 413, 422, 503].includes(status)
    ? error?.message
    : fallbackMessage;

  return json({ success: false, message: message || fallbackMessage }, status);
}

export const COUPON_TYPES = Object.freeze({
  PLAN: "PLANO_PRO",
  JURIS: "COMPRA_JURIS",
});

const COUPON_SELECT =
  "id, codigo, tipo, desconto_tipo, valor, limite_por_usuario, limite_total, starts_at, expira_em, ativo, description, stripe_coupon_id, archived_at, updated_at";

const RESERVATION_REASON_MESSAGES = {
  NOT_FOUND: "Cupom não encontrado.",
  INACTIVE: "Este cupom está pausado.",
  WRONG_TYPE: "Este cupom não é válido para este produto.",
  NOT_STARTED: "Este cupom ainda não está disponível.",
  EXPIRED: "Este cupom já expirou.",
  USER_LIMIT: "Você já atingiu o limite de uso deste cupom.",
  TOTAL_LIMIT: "O limite total de utilizações deste cupom foi atingido.",
  RESERVATION_NOT_FOUND: "A reserva do cupom não foi localizada.",
  RESERVATION_INVALID: "A reserva do cupom não está mais disponível.",
};

function couponError(message, status = 400, code = "COUPON_INVALID") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function normalizeCouponType(value) {
  const type = String(value || "").trim().toUpperCase();
  return Object.values(COUPON_TYPES).includes(type) ? type : null;
}

export function resolveExpectedCouponType({ paymentType, addOnType } = {}) {
  if (addOnType) return null;

  const type = String(paymentType || "").trim().toUpperCase();
  if (type === "JURIS_PURCHASE") return COUPON_TYPES.JURIS;
  if (type === "PRO_SUBSCRIPTION") return COUPON_TYPES.PLAN;
  return null;
}

export function calculateDiscountedAmount(amountInCents, coupon) {
  const amount = Number(amountInCents || 0);
  if (!Number.isFinite(amount) || amount <= 0 || !coupon) return amount;

  const value = Number(coupon.valor || 0);
  if (!Number.isFinite(value) || value <= 0) return amount;

  if (coupon.desconto_tipo === "PERCENTUAL") {
    return Math.max(0, Math.round(amount * (1 - value / 100)));
  }

  return Math.max(0, amount - Math.round(value * 100));
}

function assertCouponWindow(coupon, expectedType, now = new Date()) {
  if (!coupon || coupon.archived_at) {
    throw couponError("Cupom inválido ou não encontrado.", 404, "COUPON_NOT_FOUND");
  }

  if (!coupon.ativo) {
    throw couponError("Este cupom está pausado.", 409, "COUPON_INACTIVE");
  }

  if (expectedType && coupon.tipo !== expectedType) {
    throw couponError(
      expectedType === COUPON_TYPES.PLAN
        ? "Este cupom não é válido para contratação de plano."
        : "Este cupom não é válido para compra de Juris.",
      400,
      "COUPON_WRONG_TYPE",
    );
  }

  const startsAt = normalizeDate(coupon.starts_at);
  const expiresAt = normalizeDate(coupon.expira_em);

  if (startsAt && startsAt > now) {
    throw couponError(
      "Este cupom ainda não está disponível.",
      409,
      "COUPON_NOT_STARTED",
    );
  }

  if (expiresAt && expiresAt <= now) {
    throw couponError("Este cupom já expirou.", 409, "COUPON_EXPIRED");
  }

  if (!String(coupon.stripe_coupon_id || "").trim()) {
    throw couponError(
      "Este cupom está sem vínculo com o provedor de pagamentos.",
      503,
      "COUPON_PROVIDER_MISSING",
    );
  }
}

async function loadCoupon(db, { couponId, code }) {
  let query = db.from("cupons").select(COUPON_SELECT).is("archived_at", null);

  if (couponId) {
    query = query.eq("id", couponId);
  } else {
    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode) {
      throw couponError("Informe um código de cupom.", 400, "COUPON_CODE_REQUIRED");
    }
    query = query.eq("codigo", normalizedCode);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    const migrationMissing = ["42703", "PGRST204"].includes(error.code);
    throw couponError(
      migrationMissing
        ? "Execute a migração de governança dos cupons."
        : "Não foi possível consultar o cupom.",
      migrationMissing ? 503 : 500,
      migrationMissing ? "COUPON_MIGRATION_REQUIRED" : "COUPON_LOOKUP_FAILED",
    );
  }

  return data || null;
}

async function countCouponConsumption(db, couponId, userId) {
  const [userUses, totalUses, userReservations, totalReservations] =
    await Promise.all([
      db
        .from("cupom_usos")
        .select("id", { count: "exact", head: true })
        .eq("cupom_id", couponId)
        .eq("advogado_id", userId),
      db
        .from("cupom_usos")
        .select("id", { count: "exact", head: true })
        .eq("cupom_id", couponId),
      db
        .from("cupom_reservas")
        .select("id", { count: "exact", head: true })
        .eq("cupom_id", couponId)
        .eq("advogado_id", userId)
        .eq("status", "RESERVED")
        .gt("expires_at", new Date().toISOString()),
      db
        .from("cupom_reservas")
        .select("id", { count: "exact", head: true })
        .eq("cupom_id", couponId)
        .eq("status", "RESERVED")
        .gt("expires_at", new Date().toISOString()),
    ]);

  const firstError = [userUses, totalUses, userReservations, totalReservations].find(
    (result) => result.error,
  )?.error;

  if (firstError) {
    const migrationMissing = ["42P01", "PGRST205"].includes(firstError.code);
    throw couponError(
      migrationMissing
        ? "Execute a migração de governança dos cupons."
        : "Não foi possível verificar os limites do cupom.",
      migrationMissing ? 503 : 500,
      migrationMissing ? "COUPON_MIGRATION_REQUIRED" : "COUPON_USAGE_LOOKUP_FAILED",
    );
  }

  return {
    userUses: Number(userUses.count || 0),
    totalUses: Number(totalUses.count || 0),
    userReservations: Number(userReservations.count || 0),
    totalReservations: Number(totalReservations.count || 0),
  };
}

export async function validateCouponAvailability(
  db,
  { couponId = null, code = null, userId, expectedType },
) {
  if (!db) {
    throw couponError("Serviço de cupons indisponível.", 503, "COUPON_SERVICE_UNAVAILABLE");
  }

  if (!userId) {
    throw couponError("Usuário não autenticado.", 401, "COUPON_UNAUTHORIZED");
  }

  const normalizedType = normalizeCouponType(expectedType);
  if (!normalizedType) {
    throw couponError("Tipo de aplicação do cupom inválido.", 400, "COUPON_TYPE_INVALID");
  }

  const coupon = await loadCoupon(db, { couponId, code });
  assertCouponWindow(coupon, normalizedType);

  const usage = await countCouponConsumption(db, coupon.id, userId);
  const userLimit = Number(coupon.limite_por_usuario || 1);
  const totalLimit =
    coupon.limite_total === null || coupon.limite_total === undefined
      ? null
      : Number(coupon.limite_total);

  if (usage.userUses + usage.userReservations >= userLimit) {
    throw couponError(
      `Você já atingiu o limite de uso (${userLimit}) deste cupom.`,
      409,
      "COUPON_USER_LIMIT",
    );
  }

  if (
    totalLimit !== null &&
    usage.totalUses + usage.totalReservations >= totalLimit
  ) {
    throw couponError(
      "O limite total de utilizações deste cupom foi atingido.",
      409,
      "COUPON_TOTAL_LIMIT",
    );
  }

  return {
    ...coupon,
    usage,
    remainingUserUses: Math.max(
      0,
      userLimit - usage.userUses - usage.userReservations,
    ),
    remainingTotalUses:
      totalLimit === null
        ? null
        : Math.max(0, totalLimit - usage.totalUses - usage.totalReservations),
  };
}

export async function reserveCouponForCheckout(
  db,
  { couponId, userId, expectedType, ttlMinutes = 30 },
) {
  if (!couponId) return null;

  const normalizedType = normalizeCouponType(expectedType);
  if (!normalizedType) {
    throw couponError(
      "Cupons não são aceitos para este produto.",
      400,
      "COUPON_NOT_SUPPORTED",
    );
  }

  const token = crypto.randomUUID();
  const { data, error } = await db.rpc("reserve_coupon_usage", {
    p_coupon_id: couponId,
    p_advogado_id: userId,
    p_expected_type: normalizedType,
    p_token: token,
    p_ttl_minutes: ttlMinutes,
  });

  if (error) {
    const migrationMissing = ["PGRST202", "42883"].includes(error.code);
    throw couponError(
      migrationMissing
        ? "Execute a migração de governança dos cupons."
        : "Não foi possível reservar o cupom.",
      migrationMissing ? 503 : 500,
      migrationMissing ? "COUPON_MIGRATION_REQUIRED" : "COUPON_RESERVATION_FAILED",
    );
  }

  if (!data?.ok) {
    const reason = String(data?.reason || "COUPON_INVALID");
    throw couponError(
      RESERVATION_REASON_MESSAGES[reason] || "Cupom indisponível.",
      reason === "NOT_FOUND" ? 404 : 409,
      `COUPON_${reason}`,
    );
  }

  return {
    reservationId: data.reservationId,
    reservationToken: data.reservationToken,
    expiresAt: data.expiresAt,
    coupon: data.coupon,
  };
}

export async function releaseCouponReservation(db, token, userId) {
  if (!db || !token || !userId) return false;

  const { data, error } = await db.rpc("release_coupon_reservation", {
    p_token: token,
    p_advogado_id: userId,
  });

  if (error) {
    console.warn("[Coupons] Não foi possível liberar reserva:", error.message);
    return false;
  }

  return data === true;
}

export async function consumeCouponUsage(
  db,
  { token, couponId, userId, checkoutReference },
) {
  if (!couponId) return { ok: true, skipped: true };

  if (token) {
    const { data, error } = await db.rpc("consume_coupon_reservation", {
      p_token: token,
      p_coupon_id: couponId,
      p_advogado_id: userId,
      p_checkout_reference: checkoutReference,
    });

    if (error) {
      throw couponError(
        "Não foi possível confirmar o uso reservado do cupom.",
        500,
        "COUPON_CONSUME_FAILED",
      );
    }

    if (!data?.ok) {
      throw couponError(
        RESERVATION_REASON_MESSAGES[data?.reason] ||
          "A reserva do cupom não pôde ser confirmada.",
        409,
        `COUPON_${data?.reason || "RESERVATION_INVALID"}`,
      );
    }

    return data;
  }

  const { error } = await db.from("cupom_usos").insert([
    {
      cupom_id: couponId,
      advogado_id: userId,
      checkout_session_id: checkoutReference,
      pago_em: new Date().toISOString(),
    },
  ]);

  if (error && error.code !== "23505") {
    throw couponError(
      "Não foi possível registrar o uso do cupom.",
      500,
      "COUPON_USAGE_INSERT_FAILED",
    );
  }

  return { ok: true, legacy: true };
}

export function couponPublicPayload(coupon) {
  return {
    id: coupon.id,
    cupom_id: coupon.id,
    codigo: coupon.codigo,
    tipo: coupon.tipo,
    desconto_tipo: coupon.desconto_tipo,
    valor: Number(coupon.valor || 0),
    expira_em: coupon.expira_em,
    limite_por_usuario: Number(coupon.limite_por_usuario || 1),
    limite_total:
      coupon.limite_total === null || coupon.limite_total === undefined
        ? null
        : Number(coupon.limite_total),
    remainingUserUses: coupon.remainingUserUses,
    remainingTotalUses: coupon.remainingTotalUses,
  };
}

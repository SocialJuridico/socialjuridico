import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isRsLawyer, applyRsDiscountCents } from "@/lib/lawyerDiscount";
import { encodeOrderReference } from "@/lib/infinitepay/orderReference";
import {
  COUPON_TYPES,
  calculateDiscountedAmount,
  releaseCouponReservation,
  reserveCouponForCheckout,
} from "@/lib/coupons/couponServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateOrigin(request) {
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

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `+${withCountryCode.slice(0, 15)}`;
}

// Catálogo em centavos. Mantido em sincronia com planCatalog.js (frontend). O
// webhook NÃO depende destes valores para atribuir a venda (usa o produto
// embutido no order_nsu), mas o valor cobrado precisa bater com o exibido.
const JURIS_PACKAGES = { 10: 990, 20: 1690, 50: 3990 };

const PLAN_BASE = {
  START: {
    juris: 7,
    AVULSO: { cents: 4990, days: 30 },
    MONTHLY: { cents: 4099, days: 30 },
    ANNUAL: { cents: 43188, days: 365 },
    promoCents: 1099,
  },
  PRO: {
    juris: 20,
    AVULSO: { cents: 21000, days: 30 },
    MONTHLY: { cents: 15000, days: 30 },
    ANNUAL: { cents: 144000, days: 365 },
    promoCents: 3999,
  },
};

/**
 * Resolve o produto solicitado, o preço final em centavos e o contexto que será
 * gravado na transação e embutido no order_nsu.
 *
 * Ordem de descontos (não empilham): promoção de 1º mês > desconto OAB/RS >
 * cupom do usuário. Juris não recebem promo/RS.
 */
function resolveProduct({
  planType,
  billingCycle,
  jurisAmount,
  isPromoEligible,
  isRs,
  coupon,
}) {
  const juris = Number(jurisAmount || 0);

  if (JURIS_PACKAGES[juris]) {
    let cents = JURIS_PACKAGES[juris];
    if (coupon) cents = calculateDiscountedAmount(cents, coupon);

    return {
      type: "JURIS_PURCHASE",
      planType: null,
      billingCycle: null,
      jurisAmount: juris,
      expirationDays: 0,
      promo: false,
      priceInCents: cents,
      description: `Pacote ${juris} Juris`,
    };
  }

  const plan = PLAN_BASE[String(planType || "").toUpperCase()];
  const cycle = String(billingCycle || "MONTHLY").toUpperCase();
  if (!plan || !plan[cycle]) return null;

  const planKey = String(planType).toUpperCase();

  // Promoção de 1º mês (só mensal) — valor fixo, sem RS/cupom.
  if (cycle === "MONTHLY" && isPromoEligible) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: planKey,
      billingCycle: "MONTHLY",
      jurisAmount: plan.juris,
      expirationDays: plan.MONTHLY.days,
      promo: true,
      priceInCents: plan.promoCents,
      description: `Plano ${planKey} Promocional 30 dias`,
    };
  }

  const base = plan[cycle];
  let cents = base.cents;
  let tag = "";

  if (coupon) {
    cents = calculateDiscountedAmount(cents, coupon);
    tag = " (cupom)";
  } else if (isRs) {
    cents = applyRsDiscountCents(cents, planKey);
    tag = " (desconto OAB/RS)";
  }

  const cycleLabel =
    cycle === "AVULSO" ? "Avulso 30 dias" : cycle === "ANNUAL" ? "Anual" : "Mensal";

  return {
    type: "PRO_SUBSCRIPTION",
    planType: planKey,
    billingCycle: cycle,
    jurisAmount: plan.juris,
    expirationDays: base.days,
    promo: false,
    priceInCents: cents,
    description: `Plano ${planKey} ${cycleLabel}${tag}`,
  };
}

async function bindReservation(reservationToken, userId, reference) {
  if (!reservationToken) return;

  const { data, error } = await supabaseAdmin.rpc("bind_coupon_reservation", {
    p_token: reservationToken,
    p_advogado_id: userId,
    p_checkout_reference: reference,
  });

  if (error || data !== true) {
    const bindError = new Error(
      "Não foi possível vincular a reserva do cupom ao pagamento.",
    );
    bindError.status = ["PGRST202", "42883"].includes(error?.code) ? 503 : 409;
    throw bindError;
  }
}

export async function POST(request) {
  let reservation = null;
  let userId = null;
  let pendingTransactionId = null;

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }
    userId = user.id;

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço de pagamento indisponível." },
        503,
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, email, phone, estado, oab, oab_verification_status, promo_start_used, promo_pro_used",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json(
        { success: false, message: "Perfil do advogado não localizado." },
        404,
      );
    }

    if (profile.oab_verification_status === "ERROR") {
      return json(
        {
          success: false,
          message: "Acesso restrito devido a pendências na OAB.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const planType = String(body?.planType || "").toUpperCase();
    const billingCycle = String(body?.billingCycle || "MONTHLY").toUpperCase();
    const jurisAmount = Number(body?.jurisAmount || 0);
    const internalCouponId =
      String(body?.internalCouponId || "").trim() || null;
    const requestedPromo = Boolean(body?.isPromoEligible);

    const isJuris = Boolean(JURIS_PACKAGES[jurisAmount]);
    const promoAlreadyUsed =
      planType === "PRO"
        ? Boolean(profile.promo_pro_used)
        : Boolean(profile.promo_start_used);

    // Reserva do cupom (limites/janela validados no banco via RPC). Não depende
    // mais do Stripe.
    if (internalCouponId) {
      reservation = await reserveCouponForCheckout(supabaseAdmin, {
        couponId: internalCouponId,
        userId: user.id,
        expectedType: isJuris ? COUPON_TYPES.JURIS : COUPON_TYPES.PLAN,
      });
    }

    const product = resolveProduct({
      planType,
      billingCycle,
      jurisAmount,
      isPromoEligible: requestedPromo && !promoAlreadyUsed,
      isRs: isRsLawyer(profile),
      coupon: reservation?.coupon || null,
    });

    if (!product) {
      throw Object.assign(
        new Error("Não foi possível determinar o produto solicitado."),
        { status: 400 },
      );
    }

    if (product.priceInCents < 50) {
      throw Object.assign(
        new Error("O valor final ficou abaixo da cobrança mínima de R$ 0,50."),
        { status: 422 },
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://socialjuridico.com.br";
    const checkoutHandle =
      process.env.INFINITEPAY_HANDLE || "plataforma-social";

    // order_nsu com o produto embutido — o webhook decodifica e atribui a venda.
    const orderReference = encodeOrderReference(user.id, {
      t: product.type === "JURIS_PURCHASE" ? "JURIS" : "PLAN",
      planType: product.planType,
      billingCycle: product.billingCycle,
      jurisAmount: product.jurisAmount,
      promo: product.promo,
      expirationDays: product.expirationDays,
    });

    // Transação PENDENTE criada no clique — aparece imediatamente na governança
    // financeira (/dashboard/admin/transacoes) aguardando pagamento.
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from("transacoes")
      .insert([
        {
          advogado_id: user.id,
          tipo: product.type,
          valor: product.priceInCents / 100,
          moeda: "BRL",
          status: "pending",
          juris_amount: product.jurisAmount,
          stripe_session_id: orderReference,
          cupom_id: product.promo ? null : reservation?.coupon?.id || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (pendingError) {
      throw new Error("Falha ao registrar a transação pendente.");
    }
    pendingTransactionId = pending.id;

    if (reservation && product.promo) {
      // Promoção de 1º mês não empilha com cupom — libera a reserva.
      await releaseCouponReservation(
        supabaseAdmin,
        reservation.reservationToken,
        user.id,
      );
      reservation = null;
    } else if (reservation) {
      await bindReservation(reservation.reservationToken, user.id, orderReference);
    }

    const payload = {
      handle: checkoutHandle,
      items: [
        {
          quantity: 1,
          price: product.priceInCents,
          description: product.description,
        },
      ],
      redirect_url: `${siteUrl}/dashboard/advogado?payment_status=success`,
      webhook_url: `${siteUrl}/api/webhook/infinitepay`,
      order_nsu: orderReference,
      customer: {
        name: profile.name || "Cliente Social Jurídico",
        email: profile.email || user.email,
        phone_number: normalizePhone(profile.phone),
      },
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    if (!response.ok || !data.url) {
      console.error("[Checkout InfinitePay] Falha ao gerar link:", {
        status: response.status,
        hasResponseBody: Boolean(responseText),
      });
      throw Object.assign(
        new Error("Não foi possível gerar o link de pagamento."),
        { status: 502 },
      );
    }

    return json({
      success: true,
      url: data.url,
      reference: orderReference,
      provider: "INFINITEPAY",
    });
  } catch (error) {
    // Desfaz a transação pendente e libera a reserva do cupom em caso de falha
    // antes do link ficar pronto.
    if (pendingTransactionId && supabaseAdmin) {
      await supabaseAdmin
        .from("transacoes")
        .delete()
        .eq("id", pendingTransactionId);
    }

    if (reservation?.reservationToken && userId) {
      await releaseCouponReservation(
        supabaseAdmin,
        reservation.reservationToken,
        userId,
      );
    }

    console.error("[Checkout InfinitePay][POST] Erro:", error);
    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível iniciar o pagamento pela InfinitePay.",
      },
      status,
    );
  }
}

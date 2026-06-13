import { NextResponse } from "next/server";

import {
  calculateDiscountedAmount,
  COUPON_TYPES,
  releaseCouponReservation,
  reserveCouponForCheckout,
} from "@/lib/coupons/couponServer";
import {
  assertLawyerPlanPurchaseAllowed,
  normalizeLawyerPlanType,
} from "@/lib/lawyerPlans/planAccessServer";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";

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
      return json({ success: false, message: "Origem não autorizada." }, 403);
    }
  } catch {
    return json({ success: false, message: "Origem inválida." }, 403);
  }

  return null;
}

function allowedPlanPrices(planType) {
  const values =
    planType === "START"
      ? [
          process.env.STRIPE_PRICE_START_MENSAL,
          process.env.STRIPE_PRICE_START_ANUAL,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_START_MENSAL,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_START_ANUAL,
        ]
      : [
          process.env.STRIPE_PRICE_PRO_MENSAL,
          process.env.STRIPE_PRICE_PRO_ANUAL,
          process.env.PRICE_PRO_MONTHLY,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANUAL,
          process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY,
        ];

  return new Set(values.filter(Boolean));
}

function isCompatibleRecurringCycle(recurring, billingCycle) {
  if (!recurring) return false;

  const interval = recurring.interval;
  const intervalCount = Number(recurring.interval_count || 1);

  if (billingCycle === "MONTHLY") {
    return interval === "month" && intervalCount === 1;
  }

  if (billingCycle === "ANNUAL") {
    return (
      (interval === "year" && intervalCount === 1) ||
      (interval === "month" && intervalCount === 12)
    );
  }

  return false;
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
      "Não foi possível vincular a reserva do cupom à assinatura.",
    );
    bindError.status = ["PGRST202", "42883"].includes(error?.code) ? 503 : 409;
    throw bindError;
  }
}

export async function POST(request) {
  let couponReservation = null;
  let subscriptionId = null;
  let userId = null;

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) {
      return json(
        { success: false, message: "Serviço de assinatura indisponível." },
        503,
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }
    userId = user.id;

    const body = await request.json().catch(() => null);
    const priceId = String(body?.priceId || "").trim();
    const internalCouponId =
      String(body?.internalCouponId || "").trim() || null;
    const planType = normalizeLawyerPlanType(body?.planType);
    const billingCycle = String(body?.billingCycle || "")
      .trim()
      .toUpperCase();

    if (!priceId || !planType || !["MONTHLY", "ANNUAL"].includes(billingCycle)) {
      return json(
        { success: false, message: "Plano, ciclo ou preço inválido." },
        400,
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("advogados")
      .select("oab_verification_status, plan_type, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json(
        { success: false, message: "Perfil de advogado não encontrado." },
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

    assertLawyerPlanPurchaseAllowed(profile, planType);

    const allowedPrices = allowedPlanPrices(planType);
    if (!allowedPrices.size || !allowedPrices.has(priceId)) {
      return json(
        { success: false, message: "Preço não autorizado para este plano." },
        400,
      );
    }

    const price = await stripe.prices.retrieve(priceId);
    if (
      !price?.active ||
      !price.recurring ||
      price.unit_amount === null ||
      !isCompatibleRecurringCycle(price.recurring, billingCycle)
    ) {
      return json(
        { success: false, message: "Preço recorrente incompatível com o ciclo." },
        400,
      );
    }

    if (internalCouponId) {
      couponReservation = await reserveCouponForCheckout(supabaseAdmin, {
        couponId: internalCouponId,
        userId: user.id,
        expectedType: COUPON_TYPES.PLAN,
      });

      const stripeCoupon = await stripe.coupons.retrieve(
        couponReservation.coupon.stripe_coupon_id,
      );
      if (!stripeCoupon?.valid) {
        const error = new Error("O cupom não está mais válido no Stripe.");
        error.status = 409;
        throw error;
      }
    }

    const originalAmount = Number(price.unit_amount || 0);
    const amount = couponReservation
      ? calculateDiscountedAmount(originalAmount, couponReservation.coupon)
      : originalAmount;

    if (couponReservation && amount < 50) {
      const error = new Error(
        "O desconto não pode zerar a cobrança de uma assinatura. Ajuste o cupom para manter ao menos R$ 0,50.",
      );
      error.status = 422;
      throw error;
    }

    let customerId;
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    }

    const metadata = {
      userId: user.id,
      type: "PRO_SUBSCRIPTION",
      priceId,
      planType,
      billingCycle,
      cupomId: couponReservation?.coupon?.id || "",
      couponReservationToken: couponReservation?.reservationToken || "",
    };

    const subscriptionConfig = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_options: {
          card: { request_three_d_secure: "any" },
        },
      },
      expand: ["latest_invoice.payment_intent"],
      metadata,
    };

    if (couponReservation) {
      subscriptionConfig.discounts = [
        { coupon: couponReservation.coupon.stripe_coupon_id },
      ];
    }

    const subscription = await stripe.subscriptions.create(subscriptionConfig);
    subscriptionId = subscription.id;

    const invoice = subscription.latest_invoice;
    const intent = invoice?.payment_intent
      ? typeof invoice.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
        : invoice.payment_intent
      : null;

    if (!intent?.client_secret || !intent.id.startsWith("pi_")) {
      const error = new Error(
        "Não foi possível gerar uma cobrança válida para a assinatura.",
      );
      error.status = 502;
      throw error;
    }

    await stripe.paymentIntents.update(intent.id, {
      metadata: { ...metadata, subscriptionId: subscription.id },
    });

    if (couponReservation) {
      await bindReservation(
        couponReservation.reservationToken,
        user.id,
        intent.id,
      );
    }

    return json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: intent.client_secret,
      amount,
      originalAmount,
      currency: price.currency || "brl",
      isSetupIntent: false,
      couponDiscount: couponReservation
        ? {
            type:
              couponReservation.coupon.desconto_tipo === "PERCENTUAL"
                ? "percent"
                : "fixed",
            value: Number(couponReservation.coupon.valor || 0),
          }
        : null,
    });
  } catch (error) {
    if (subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (cancelError) {
        console.warn(
          "[Checkout/CreateSubscriptionIntent] Assinatura incompleta não cancelada:",
          cancelError.message,
        );
      }
    }

    if (couponReservation?.reservationToken && userId) {
      await releaseCouponReservation(
        supabaseAdmin,
        couponReservation.reservationToken,
        userId,
      );
    }

    console.error("[Checkout/CreateSubscriptionIntent] Erro:", error);
    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível preparar a assinatura.",
      },
      status,
    );
  }
}

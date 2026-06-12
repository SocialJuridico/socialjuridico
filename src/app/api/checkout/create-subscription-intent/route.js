import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import {
  calculateDiscountedAmount,
  COUPON_TYPES,
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
      return json({ success: false, message: "Origem não autorizada." }, 403);
    }
  } catch {
    return json({ success: false, message: "Origem inválida." }, 403);
  }

  return null;
}

function allowedPlanPrices(planType) {
  const values =
    String(planType || "PRO").toUpperCase() === "START"
      ? [
          process.env.STRIPE_PRICE_START_AVULSO,
          process.env.STRIPE_PRICE_START_MENSAL,
          process.env.STRIPE_PRICE_START_ANUAL,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_START_AVULSO,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_START_MENSAL,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_START_ANUAL,
        ]
      : [
          process.env.STRIPE_PRICE_PRO_AVULSO,
          process.env.STRIPE_PRICE_PRO_MENSAL,
          process.env.STRIPE_PRICE_PRO_ANUAL,
          process.env.PRICE_PRO_MONTHLY,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_AVULSO,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANUAL,
          process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY,
        ];

  return new Set(values.filter(Boolean));
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

    const { data: profile } = await supabaseAdmin
      .from("advogados")
      .select("oab_verification_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.oab_verification_status === "ERROR") {
      return json(
        {
          success: false,
          message: "Acesso restrito devido a pendências na OAB.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const priceId = String(body?.priceId || "").trim();
    const internalCouponId =
      String(body?.internalCouponId || "").trim() || null;
    const planType =
      String(body?.planType || "PRO").trim().toUpperCase() === "START"
        ? "START"
        : "PRO";
    const billingCycle =
      String(body?.billingCycle || "MONTHLY").trim().toUpperCase() ===
      "ANNUAL"
        ? "ANNUAL"
        : "MONTHLY";

    if (!priceId) {
      return json({ success: false, message: "Price ID é obrigatório." }, 400);
    }

    const allowedPrices = allowedPlanPrices(planType);
    if (!allowedPrices.size || !allowedPrices.has(priceId)) {
      return json(
        { success: false, message: "Preço não autorizado para este plano." },
        400,
      );
    }

    const price = await stripe.prices.retrieve(priceId);
    if (!price?.active || !price.recurring || price.unit_amount === null) {
      return json(
        { success: false, message: "Preço recorrente indisponível." },
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
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = newCustomer.id;
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
    const intentObject = invoice?.payment_intent
      ? typeof invoice.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
        : invoice.payment_intent
      : null;

    if (!intentObject?.client_secret || !intentObject.id.startsWith("pi_")) {
      const error = new Error(
        "Não foi possível gerar uma cobrança válida para a assinatura.",
      );
      error.status = 502;
      throw error;
    }

    const intentMetadata = {
      ...metadata,
      subscriptionId: subscription.id,
    };

    await stripe.paymentIntents.update(intentObject.id, {
      metadata: intentMetadata,
    });

    if (couponReservation) {
      await bindReservation(
        couponReservation.reservationToken,
        user.id,
        intentObject.id,
      );
    }

    return json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: intentObject.client_secret,
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

import { NextResponse } from "next/server";

import {
  calculateDiscountedAmount,
  releaseCouponReservation,
  reserveCouponForCheckout,
  resolveExpectedCouponType,
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

function compactSet(values) {
  return new Set(values.filter(Boolean));
}

function assertAllowedPrice(priceId, { paymentType, planType }) {
  const jurisPrices = compactSet([
    process.env.PRICE_JURIS_10,
    process.env.PRICE_JURIS_20,
    process.env.PRICE_JURIS_50,
    process.env.NEXT_PUBLIC_PRICE_JURIS_10,
    process.env.NEXT_PUBLIC_PRICE_JURIS_20,
    process.env.NEXT_PUBLIC_PRICE_JURIS_50,
  ]);

  const startAvulsoPrices = compactSet([
    process.env.STRIPE_PRICE_START_AVULSO,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_START_AVULSO,
  ]);

  const proAvulsoPrices = compactSet([
    process.env.STRIPE_PRICE_PRO_AVULSO,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_AVULSO,
  ]);

  let allowed = null;
  if (paymentType === "JURIS_PURCHASE") allowed = jurisPrices;
  if (paymentType === "PRO_SUBSCRIPTION") {
    allowed = planType === "START" ? startAvulsoPrices : proAvulsoPrices;
  }

  if (allowed && (!allowed.size || !allowed.has(priceId))) {
    const error = new Error("Preço não autorizado para este produto.");
    error.status = 400;
    throw error;
  }
}

function resolvePaymentType({ planType, addOnType }) {
  if (addOnType) return "ADDON_PURCHASE";
  if (planType) return "PRO_SUBSCRIPTION";
  return "JURIS_PURCHASE";
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
  let couponReservation = null;
  let userId = null;
  let paymentIntentId = null;

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) {
      return json(
        { success: false, message: "Serviço de pagamento indisponível." },
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
    const rawPlanType = String(body?.planType || "").trim();
    const planType = rawPlanType ? normalizeLawyerPlanType(rawPlanType) : null;
    const billingCycle = String(body?.billingCycle || "AVULSO")
      .trim()
      .toUpperCase();
    const addOnType =
      String(body?.addOnType || "").trim().toUpperCase() || null;

    if (!priceId || (rawPlanType && !planType)) {
      return json(
        { success: false, message: "Produto ou preço inválido." },
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

    const paymentType = resolvePaymentType({ planType, addOnType });
    if (planType) {
      if (billingCycle !== "AVULSO") {
        return json(
          {
            success: false,
            message: "Planos recorrentes devem usar o checkout de assinatura.",
          },
          400,
        );
      }
      assertLawyerPlanPurchaseAllowed(profile, planType);
    }

    assertAllowedPrice(priceId, { paymentType, planType });

    if (internalCouponId && addOnType) {
      return json(
        { success: false, message: "Cupons não são aceitos para expansões." },
        400,
      );
    }

    const price = await stripe.prices.retrieve(priceId);
    if (
      !price ||
      !price.unit_amount ||
      price.active === false ||
      Boolean(price.recurring)
    ) {
      return json(
        { success: false, message: "Preço avulso não encontrado ou indisponível." },
        400,
      );
    }

    if (internalCouponId) {
      couponReservation = await reserveCouponForCheckout(supabaseAdmin, {
        couponId: internalCouponId,
        userId: user.id,
        expectedType: resolveExpectedCouponType({ paymentType, addOnType }),
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

    const originalAmount = Number(price.unit_amount);
    const amountInCents = couponReservation
      ? calculateDiscountedAmount(originalAmount, couponReservation.coupon)
      : originalAmount;

    if (couponReservation && amountInCents < 50) {
      const error = new Error(
        "O desconto deixa o valor abaixo da cobrança mínima de R$ 0,50. Use outro cupom ou produto.",
      );
      error.status = 422;
      throw error;
    }

    const metadata = {
      userId: user.id,
      type: paymentType,
      priceId,
      planType: planType || "",
      billingCycle,
      addOnType: addOnType || "",
      cupomId: couponReservation?.coupon?.id || "",
      couponReservationToken: couponReservation?.reservationToken || "",
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: price.currency || "brl",
      payment_method_types: ["card"],
      metadata,
      receipt_email: user.email,
    });
    paymentIntentId = paymentIntent.id;

    if (couponReservation) {
      await bindReservation(
        couponReservation.reservationToken,
        user.id,
        paymentIntent.id,
      );
    }

    return json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      originalAmount,
      currency: price.currency || "brl",
      minimumChargeApplied: false,
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
    if (paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
      } catch (cancelError) {
        console.warn(
          "[Checkout/CreatePaymentIntent] Intent não cancelado após falha:",
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

    console.error("[Checkout/CreatePaymentIntent] Erro:", error);
    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível preparar o pagamento.",
      },
      status,
    );
  }
}

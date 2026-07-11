import { NextResponse } from "next/server";

import {
  calculateDiscountedAmount,
  releaseCouponReservation,
  reserveCouponForCheckout,
  resolveExpectedCouponType,
} from "@/lib/coupons/couponServer";
import {
  assertAllowedCheckoutPrice,
  normalizeCheckoutProductContext,
} from "@/lib/checkout/paymentProduct";
import {
  assertLawyerPlanPurchaseAllowed,
  normalizeLawyerPlanType,
} from "@/lib/lawyerPlans/planAccessServer";
import { isRsLawyer, applyRsDiscountCents } from "@/lib/lawyerDiscount";
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

    const product = normalizeCheckoutProductContext({
      priceId,
      planType,
      billingCycle,
      addOnType,
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("advogados")
      .select("oab_verification_status, plan_type, subscription_status, estado, oab")
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

    if (product.planType) {
      if (product.billingCycle !== "AVULSO") {
        return json(
          {
            success: false,
            message: "Planos recorrentes devem usar o checkout de assinatura.",
          },
          400,
        );
      }
      assertLawyerPlanPurchaseAllowed(profile, product.planType);
    }

    assertAllowedCheckoutPrice(priceId, {
      paymentType: product.paymentType,
      planType: product.planType,
    });

    if (internalCouponId && product.addOnType) {
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
        expectedType: resolveExpectedCouponType({
          paymentType: product.paymentType,
          addOnType: product.addOnType,
        }),
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
    let amountInCents = couponReservation
      ? calculateDiscountedAmount(originalAmount, couponReservation.coupon)
      : originalAmount;

    // Desconto de parceria OAB/RS (10% START / 15% PRO). Não empilha com cupom.
    const rsApplied =
      !couponReservation &&
      Boolean(product.planType) &&
      isRsLawyer(profile);
    if (rsApplied) {
      amountInCents = applyRsDiscountCents(amountInCents, product.planType);
    }

    if ((couponReservation || rsApplied) && amountInCents < 50) {
      const error = new Error(
        "O desconto deixa o valor abaixo da cobrança mínima de R$ 0,50. Use outro cupom ou produto.",
      );
      error.status = 422;
      throw error;
    }

    const metadata = {
      userId: user.id,
      type: product.paymentType,
      priceId,
      planType: product.planType || "",
      billingCycle: product.billingCycle,
      addOnType: product.addOnType || "",
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

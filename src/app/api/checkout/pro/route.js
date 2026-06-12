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

function allowedProPrices() {
  return new Set(
    [
      process.env.STRIPE_PRICE_PRO_MENSAL,
      process.env.STRIPE_PRICE_PRO_ANUAL,
      process.env.PRICE_PRO_MONTHLY,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANUAL,
      process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY,
    ].filter(Boolean),
  );
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
      "Não foi possível vincular a reserva do cupom ao checkout.",
    );
    bindError.status = ["PGRST202", "42883"].includes(error?.code) ? 503 : 409;
    throw bindError;
  }
}

export async function POST(request) {
  let reservation = null;
  let userId = null;
  let sessionId = null;

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
    const successUrl = String(body?.successUrl || "").trim();
    const cancelUrl = String(body?.cancelUrl || "").trim();

    if (!priceId) {
      return json({ success: false, message: "Price ID é obrigatório." }, 400);
    }

    const allowedPrices = allowedProPrices();
    if (!allowedPrices.size || !allowedPrices.has(priceId)) {
      return json(
        { success: false, message: "Preço não autorizado para o Plano PRO." },
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
      reservation = await reserveCouponForCheckout(supabaseAdmin, {
        couponId: internalCouponId,
        userId: user.id,
        expectedType: COUPON_TYPES.PLAN,
      });

      const stripeCoupon = await stripe.coupons.retrieve(
        reservation.coupon.stripe_coupon_id,
      );
      if (!stripeCoupon?.valid) {
        const error = new Error("O cupom não está mais válido no Stripe.");
        error.status = 409;
        throw error;
      }

      const discountedAmount = calculateDiscountedAmount(
        Number(price.unit_amount),
        reservation.coupon,
      );
      if (discountedAmount < 50) {
        const error = new Error(
          "O desconto não pode zerar a cobrança de uma assinatura. Ajuste o cupom para manter ao menos R$ 0,50.",
        );
        error.status = 422;
        throw error;
      }
    }

    const metadata = {
      userId: user.id,
      type: "PRO_SUBSCRIPTION",
      priceId,
      planType: "PRO",
      billingCycle: "MONTHLY",
      cupomId: reservation?.coupon?.id || "",
      couponReservationToken: reservation?.reservationToken || "",
    };

    const sessionConfig = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/advogado?payment_status=success`,
      cancel_url:
        cancelUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/advogado?payment_status=cancel`,
      metadata,
      subscription_data: { metadata },
      customer_email: user.email,
    };

    if (reservation) {
      sessionConfig.discounts = [
        { coupon: reservation.coupon.stripe_coupon_id },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    sessionId = session.id;

    if (reservation) {
      await bindReservation(reservation.reservationToken, user.id, session.id);
    }

    return json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    if (sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId);
      } catch (expireError) {
        console.warn(
          "[Checkout/Pro] Sessão não expirada após falha:",
          expireError.message,
        );
      }
    }

    if (reservation?.reservationToken && userId) {
      await releaseCouponReservation(
        supabaseAdmin,
        reservation.reservationToken,
        userId,
      );
    }

    console.error("[Checkout/Pro] Erro:", error);
    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível iniciar a assinatura.",
      },
      status,
    );
  }
}

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isRsLawyer } from "@/lib/lawyerDiscount";
import { assertLawyerPlanPurchaseAllowed } from "@/lib/lawyerPlans/planAccessServer";
import { hasLawyerPlanHistory } from "@/lib/billing/planHistoryServer";
import {
  COUPON_TYPES,
  releaseCouponReservation,
  reserveCouponForCheckout,
} from "@/lib/coupons/couponServer";
import { resolveCheckoutProduct } from "@/lib/billing/checkoutServer";
import {
  centsToBRL,
  getAiCreditPackage,
  getJurisPackage,
  subscriptionFrequencyFor,
} from "@/lib/billing/catalog";
import { encodeBillingReference } from "@/lib/billing/reference";
import {
  fulfillMercadoPagoOrder,
  isMercadoPagoOrderApproved,
  mercadoPagoOrderCheckoutData,
  normalizedMercadoPagoOrderStatus,
} from "@/lib/billing/mercadoPagoOrderServer";
import {
  createMercadoPagoOrder,
  createMercadoPagoSubscription,
} from "@/lib/mercadopago/client";

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

function sanitizePayer(payer, fallbackEmail) {
  const safe = {
    email: String(fallbackEmail || "").trim().toLowerCase(),
  };

  const firstName = String(payer?.first_name || payer?.firstName || "").trim();
  const lastName = String(payer?.last_name || payer?.lastName || "").trim();
  const identificationType = String(payer?.identification?.type || "").trim();
  const identificationNumber = String(payer?.identification?.number || "")
    .replace(/\D/g, "")
    .slice(0, 20);

  if (firstName) safe.first_name = firstName.slice(0, 60);
  if (lastName) safe.last_name = lastName.slice(0, 60);
  if (identificationType && identificationNumber) {
    safe.identification = {
      type: identificationType.slice(0, 10),
      number: identificationNumber,
    };
  }

  return safe;
}

function resolveOrderPaymentMethodType(paymentData, paymentMethodId) {
  if (paymentMethodId === "pix") return "bank_transfer";

  const type = String(paymentData?.payment_type_id || "")
    .trim()
    .toLowerCase();

  if (["credit_card", "debit_card", "prepaid_card"].includes(type)) {
    return type;
  }

  return "credit_card";
}

async function bindReservation(reservationToken, userId, reference) {
  if (!reservationToken) return;

  const { data, error } = await supabaseAdmin.rpc("bind_coupon_reservation", {
    p_token: reservationToken,
    p_advogado_id: userId,
    p_checkout_reference: reference,
  });

  if (error || data !== true) {
    const bindError = new Error("Não foi possível vincular o cupom ao pagamento.");
    bindError.status = ["PGRST202", "42883"].includes(error?.code) ? 503 : 409;
    throw bindError;
  }
}

async function createReferenceTransaction({ userId, product, reference, couponId }) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .insert([
      {
        advogado_id: userId,
        tipo: product.type,
        valor: centsToBRL(product.priceInCents),
        moeda: "BRL",
        status: product.recurring ? "subscription_pending" : "pending",
        juris_amount: product.jurisAmount || 0,
        stripe_session_id: reference,
        cupom_id: couponId || null,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) throw new Error("Falha ao registrar a cobrança pendente.");
  return data.id;
}

export async function POST(request) {
  let reservation = null;
  let transactionId = null;
  let userId = null;

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço financeiro indisponível." },
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, email, estado, oab, oab_verification_status, promo_start_used, promo_pro_used, plan_type, subscription_status, stripe_subscription_id",
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
    if (!body) return json({ success: false, message: "Dados inválidos." }, 400);

    const planType = String(body.planType || "").trim().toUpperCase();
    const billingCycle = String(body.billingCycle || "MONTHLY")
      .trim()
      .toUpperCase();
    const jurisAmount = Number(body.jurisAmount || 0);
    const aiCreditsAmount = Number(body.aiCreditsAmount || 0);
    const internalCouponId = String(body.internalCouponId || "").trim() || null;
    const requestedPromo = Boolean(body.isPromoEligible);
    const paymentData = body.paymentData || {};
    const isJuris = Boolean(getJurisPackage(jurisAmount));
    const isAiCredits = Boolean(getAiCreditPackage(aiCreditsAmount));

    if (!isJuris && !isAiCredits) {
      assertLawyerPlanPurchaseAllowed(profile, planType);
      profile.has_plan_history = await hasLawyerPlanHistory(
        supabaseAdmin,
        user.id,
        profile,
      );
    }

    const promoEligible =
      !isJuris &&
      !isAiCredits &&
      billingCycle === "MONTHLY" &&
      requestedPromo &&
      !profile.has_plan_history;

    const couponSupported =
      !isAiCredits && Boolean(internalCouponId) && !promoEligible;

    if (couponSupported) {
      reservation = await reserveCouponForCheckout(supabaseAdmin, {
        couponId: internalCouponId,
        userId: user.id,
        expectedType: isJuris ? COUPON_TYPES.JURIS : COUPON_TYPES.PLAN,
        ttlMinutes: 60,
      });
    }

    const product = resolveCheckoutProduct({
      planType,
      billingCycle,
      jurisAmount,
      aiCreditsAmount,
      requestedPromo: promoEligible,
      profile,
      isRs: isRsLawyer(profile),
      coupon: reservation?.coupon || null,
    });

    if (!product) {
      const error = new Error("Produto ou ciclo de cobrança inválido.");
      error.status = 400;
      throw error;
    }

    if (reservation && !product.couponApplied) {
      await releaseCouponReservation(
        supabaseAdmin,
        reservation.reservationToken,
        user.id,
      );
      reservation = null;
    }

    if (!product.priceInCents || product.priceInCents < 50) {
      const error = new Error(
        "O desconto deixa a cobrança abaixo do valor mínimo permitido.",
      );
      error.status = 422;
      throw error;
    }

    const reference = encodeBillingReference(product);
    transactionId = await createReferenceTransaction({
      userId: user.id,
      product,
      reference,
      couponId: reservation?.coupon?.id || null,
    });

    if (reservation) {
      await bindReservation(reservation.reservationToken, user.id, reference);
    }

    const siteUrl = String(
      process.env.NEXT_PUBLIC_SITE_URL || "https://socialjuridico.com.br",
    ).replace(/\/$/, "");
    const payerEmail = profile.email || user.email;

    if (product.recurring) {
      const frequency = subscriptionFrequencyFor(product.billingCycle);
      const cardToken = String(paymentData.token || "").trim();

      if (!frequency || !cardToken) {
        const error = new Error(
          "Assinaturas recorrentes exigem um cartão de crédito válido.",
        );
        error.status = 422;
        throw error;
      }

      const subscription = await createMercadoPagoSubscription({
        reason: product.description,
        external_reference: reference,
        payer_email: payerEmail,
        card_token_id: cardToken,
        auto_recurring: {
          ...frequency,
          transaction_amount: centsToBRL(product.priceInCents),
          currency_id: "BRL",
        },
        back_url: `${siteUrl}/dashboard/advogado`,
        status: "authorized",
      });

      if (!subscription?.id) {
        throw new Error("Mercado Pago não retornou o identificador da assinatura.");
      }

      return json({
        success: true,
        provider: "MERCADOPAGO",
        kind: "subscription",
        reference,
        subscriptionId: subscription.id,
        status: subscription.status || "authorized",
        amount: product.priceInCents,
        renewalAmount: product.renewalPriceInCents,
        discountSource: product.discountSource,
        recurring: true,
      });
    }

    const paymentMethodId = String(paymentData.payment_method_id || "").trim();
    if (!paymentMethodId) {
      const error = new Error("Selecione uma forma de pagamento.");
      error.status = 422;
      throw error;
    }

    const paymentMethodType = resolveOrderPaymentMethodType(
      paymentData,
      paymentMethodId,
    );
    const amount = (Number(product.priceInCents) / 100).toFixed(2);
    const paymentMethod = {
      id: paymentMethodId,
      type: paymentMethodType,
    };

    if (paymentMethodId !== "pix") {
      const token = String(paymentData.token || "").trim();
      if (!token) {
        const error = new Error("Token do cartão não foi gerado.");
        error.status = 422;
        throw error;
      }

      paymentMethod.token = token;
      const installments = Number(paymentData.installments || 1);
      paymentMethod.installments =
        Number.isInteger(installments) && installments > 0 ? installments : 1;
    }

    const orderPayload = {
      type: "online",
      processing_mode: "automatic",
      external_reference: reference,
      total_amount: amount,
      payer: sanitizePayer(paymentData.payer, payerEmail),
      transactions: {
        payments: [
          {
            amount,
            payment_method: paymentMethod,
          },
        ],
      },
    };

    if (paymentMethodId !== "pix") {
      orderPayload.capture_mode = "automatic";
    }

    const order = await createMercadoPagoOrder(orderPayload, reference);
    if (!order?.id) {
      throw new Error("Mercado Pago não retornou o identificador da order.");
    }

    let fulfillment = null;
    if (isMercadoPagoOrderApproved(order)) {
      fulfillment = await fulfillMercadoPagoOrder(order);
    } else {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: normalizedMercadoPagoOrderStatus(order) })
        .eq("id", transactionId);
    }

    const checkoutData = mercadoPagoOrderCheckoutData(order);

    return json({
      success: true,
      provider: "MERCADOPAGO",
      kind: paymentMethodId === "pix" ? "pix" : "card",
      reference,
      ...checkoutData,
      amount: product.priceInCents,
      discountSource: product.discountSource,
      approved: fulfillment?.status === "approved",
    });
  } catch (error) {
    if (transactionId && supabaseAdmin) {
      await supabaseAdmin.from("transacoes").delete().eq("id", transactionId);
    }

    if (reservation?.reservationToken && userId && supabaseAdmin) {
      await releaseCouponReservation(
        supabaseAdmin,
        reservation.reservationToken,
        userId,
      );
    }

    console.error("[Checkout/MercadoPago] Erro:", error);
    const status = Number(error?.status) || 500;

    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível processar o pagamento no Mercado Pago.",
      },
      status,
    );
  }
}

import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { fulfillMercadoPagoPayment, syncMercadoPagoSubscription } from "@/lib/billing/fulfillmentServer";
import { renovacaoPlanoTemplate } from "@/lib/emailTemplates";
import {
  getMercadoPagoSubscription,
  searchMercadoPagoPaymentsByReference,
} from "@/lib/mercadopago/client";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = String(
  process.env.NEXT_PUBLIC_SITE_URL || "https://socialjuridico.com.br",
).replace(/\/$/, "");

const PLAN_VALUE_LABELS = {
  START: {
    MONTHLY: "R$ 40,99/mês",
    ANNUAL: "R$ 431,88/ano",
    AVULSO: "R$ 49,90 por 30 dias",
  },
  PRO: {
    MONTHLY: "R$ 150,00/mês",
    ANNUAL: "R$ 1.440,00/ano",
    AVULSO: "R$ 210,00 por 30 dias",
  },
};

function isAuthorizedCronRequest(request, expectedSecret) {
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");

  return (
    querySecret === expectedSecret ||
    headerSecret === expectedSecret ||
    authorization === `Bearer ${expectedSecret}`
  );
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(expiresAt, now) {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000);
}

function subscriptionIdFromLawyer(lawyer) {
  const value = String(lawyer?.stripe_subscription_id || "").trim();
  return value.startsWith("mp_") ? value.slice(3) : null;
}

function isMercadoPagoRecurring(lawyer) {
  const cycle = String(lawyer?.plan_billing_cycle || "").toUpperCase();
  const status = String(lawyer?.subscription_status || "").toUpperCase();
  return (
    Boolean(subscriptionIdFromLawyer(lawyer)) &&
    ["MONTHLY", "ANNUAL"].includes(cycle) &&
    !["CANCELED", "CANCELLED", "BLOCKED", "UNPAID"].includes(status)
  );
}

async function reconcileRecurringSubscription(db, lawyer) {
  const subscriptionId = subscriptionIdFromLawyer(lawyer);
  if (!subscriptionId) return { reconciled: false, authorized: false };

  try {
    const subscription = await getMercadoPagoSubscription(subscriptionId);
    await syncMercadoPagoSubscription(subscription);

    const reference = String(subscription?.external_reference || "").trim();
    if (reference) {
      const search = await searchMercadoPagoPaymentsByReference(reference);
      const payments = Array.isArray(search?.results) ? search.results : [];

      for (const payment of [...payments].reverse()) {
        if (String(payment?.status || "").toLowerCase() !== "approved") continue;
        await fulfillMercadoPagoPayment(payment);
      }
    }

    const { data: refreshed } = await db
      .from("advogados")
      .select("premium_expires_at, subscription_status, is_premium, plan_type")
      .eq("id", lawyer.id)
      .maybeSingle();

    return {
      reconciled: true,
      authorized: String(subscription?.status || "").toLowerCase() === "authorized",
      refreshed: refreshed || null,
    };
  } catch (error) {
    console.error(
      `[cron/verificar-planos] Falha ao conciliar assinatura Mercado Pago ${lawyer.id}:`,
      error,
    );
    return { reconciled: false, authorized: false };
  }
}

async function notifyPlanExpired(db, lawyer, nowStr) {
  await db.from("notificacoes").insert([
    {
      id: crypto.randomUUID(),
      user_id: lawyer.id,
      titulo: "Assinatura expirada",
      mensagem: `Prezado(a) Dr(a), sua assinatura do plano ${lawyer.plan_type} expirou. Renove dentro do Social Jurídico para reativar o acesso às ferramentas premium.`,
      tipo: "PLANO_EXPIRADO",
      meta: JSON.stringify({
        expired: true,
        expired_at: lawyer.premium_expires_at,
      }),
      lida: false,
      created_at: nowStr,
    },
  ]);

  try {
    await sendPushNotification({
      userIds: [lawyer.id],
      title: "Assinatura expirada",
      message: `Sua assinatura do plano ${lawyer.plan_type} expirou. Renove dentro do Social Jurídico para reativar seu acesso.`,
      url: "/dashboard/advogado",
    });
  } catch (error) {
    console.error(
      `[cron/verificar-planos] Erro push notification expiracao para ${lawyer.id}:`,
      error,
    );
  }
}

function warningMessage(lawyer, daysRemaining) {
  if (daysRemaining === 3) {
    return {
      title: "Seu plano expira em 3 dias",
      message: `Prezado(a) ${lawyer.name || "Dr(a)"}, seu plano ${lawyer.plan_type} expira em 3 dias. A renovação pode ser feita diretamente dentro do Social Jurídico.`,
    };
  }

  if (daysRemaining === 2) {
    return {
      title: "Seu plano expira em 2 dias",
      message: `Prezado(a) ${lawyer.name || "Dr(a)"}, seu plano ${lawyer.plan_type} expira em 2 dias. Evite a interrupção no acesso às ferramentas.`,
    };
  }

  return {
    title: "Último dia de assinatura",
    message: `Prezado(a) ${lawyer.name || "Dr(a)"}, hoje é o último dia do seu plano ${lawyer.plan_type}. Renove diretamente no Social Jurídico para manter seu acesso.`,
  };
}

async function alreadySentWarning(db, lawyerId, daysRemaining, expiresAtIso) {
  const { data, error } = await db
    .from("notificacoes")
    .select("meta")
    .eq("user_id", lawyerId)
    .eq("tipo", "PLANO_EXPIRANDO");

  if (error) throw error;

  return (data || []).some((item) => {
    try {
      const meta = typeof item.meta === "string" ? JSON.parse(item.meta) : item.meta;
      return (
        Number(meta?.days_remaining) === daysRemaining &&
        meta?.expires_at === expiresAtIso
      );
    } catch {
      return false;
    }
  });
}

async function notifyPlanExpiring(db, lawyer, daysRemaining, nowStr) {
  if (
    await alreadySentWarning(
      db,
      lawyer.id,
      daysRemaining,
      lawyer.premium_expires_at,
    )
  ) {
    return false;
  }

  const { title, message } = warningMessage(lawyer, daysRemaining);
  const { error } = await db.from("notificacoes").insert([
    {
      id: crypto.randomUUID(),
      user_id: lawyer.id,
      titulo: title,
      mensagem: message,
      tipo: "PLANO_EXPIRANDO",
      meta: JSON.stringify({
        days_remaining: daysRemaining,
        expires_at: lawyer.premium_expires_at,
      }),
      lida: false,
      created_at: nowStr,
    },
  ]);

  if (error) throw error;

  await sendPushNotification({
    userIds: [lawyer.id],
    title,
    message,
    url: "/dashboard/advogado",
  });

  return true;
}

async function alreadySentRenewalEmail(db, lawyerId, expiresAtIso) {
  const { data, error } = await db
    .from("notificacoes")
    .select("meta")
    .eq("user_id", lawyerId)
    .eq("tipo", "PLANO_RENOVACAO_EMAIL");

  if (error) throw error;

  return (data || []).some((item) => {
    try {
      const meta = typeof item.meta === "string" ? JSON.parse(item.meta) : item.meta;
      return meta?.expires_at === expiresAtIso;
    } catch {
      return false;
    }
  });
}

async function sendRenewalEmail(db, lawyer, nowStr) {
  if (!process.env.RESEND_API_KEY || !lawyer.email) return false;

  if (await alreadySentRenewalEmail(db, lawyer.id, lawyer.premium_expires_at)) {
    return false;
  }

  const plan = String(lawyer.plan_type || "START").toUpperCase();
  const cycle = String(lawyer.plan_billing_cycle || "AVULSO").toUpperCase();
  const valueLabel = PLAN_VALUE_LABELS[plan]?.[cycle] || "Consulte no painel";

  await resend.emails.send({
    from: "Social Jurídico <contato@socialjuridico.com.br>",
    to: [lawyer.email],
    subject: `Seu plano ${plan} vence em breve`,
    html: renovacaoPlanoTemplate({
      lawyerName: lawyer.name || "Advogado",
      planType: plan,
      daysRemaining: 5,
      valorTexto: valueLabel,
      ctaUrl: `${SITE_URL}/dashboard/advogado`,
    }),
  });

  const { error } = await db.from("notificacoes").insert([
    {
      id: crypto.randomUUID(),
      user_id: lawyer.id,
      titulo: "Lembrete de renovação enviado",
      mensagem: `Enviamos um email lembrando que seu plano ${plan} vence em 5 dias. A renovação é feita dentro do Social Jurídico.`,
      tipo: "PLANO_RENOVACAO_EMAIL",
      meta: JSON.stringify({
        days_remaining: 5,
        expires_at: lawyer.premium_expires_at,
      }),
      lida: false,
      created_at: nowStr,
    },
  ]);

  if (error) throw error;
  return true;
}

export async function GET(request) {
  try {
    const expectedSecret =
      process.env.CRON_SECRET || "socialjuridico_cron_secret_2026";

    if (!isAuthorizedCronRequest(request, expectedSecret)) {
      return NextResponse.json(
        { success: false, message: "Nao autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin;
    if (!db) {
      return NextResponse.json(
        { success: false, message: "Cliente administrativo indisponivel." },
        { status: 503 },
      );
    }

    const { data: premiumLawyers, error: fetchError } = await db
      .from("advogados")
      .select(
        "id, name, email, is_premium, premium_expires_at, plan_type, plan_billing_cycle, subscription_status, stripe_subscription_id",
      )
      .eq("is_premium", true)
      .not("premium_expires_at", "is", null);

    if (fetchError) throw fetchError;

    const now = new Date();
    const nowStr = now.toISOString();
    let processedCount = 0;
    let expiredCount = 0;
    let notifiedCount = 0;
    let emailedCount = 0;
    let reconciledCount = 0;
    let invalidExpirationCount = 0;

    for (const lawyer of premiumLawyers || []) {
      processedCount += 1;

      let expiresAt = parseDate(lawyer.premium_expires_at);
      if (!expiresAt) {
        invalidExpirationCount += 1;
        console.warn(
          `[cron/verificar-planos] Data invalida para advogado ${lawyer.id}: ${lawyer.premium_expires_at}`,
        );
        continue;
      }

      const recurring = isMercadoPagoRecurring(lawyer);

      if (expiresAt.getTime() <= now.getTime() && recurring) {
        const reconciliation = await reconcileRecurringSubscription(db, lawyer);
        if (reconciliation.reconciled) reconciledCount += 1;

        const refreshedExpiry = parseDate(
          reconciliation.refreshed?.premium_expires_at,
        );
        if (refreshedExpiry && refreshedExpiry.getTime() > now.getTime()) {
          continue;
        }

        // Uma assinatura ainda autorizada ganha uma janela operacional de 24h
        // para que a cobrança/notificação assíncrona chegue antes do downgrade.
        if (
          reconciliation.authorized &&
          now.getTime() - expiresAt.getTime() < 86_400_000
        ) {
          continue;
        }
      }

      if (expiresAt.getTime() <= now.getTime()) {
        const { error: downgradeError } = await db
          .from("advogados")
          .update({
            is_premium: false,
            plan_type: "FREE",
            premium_expires_at: null,
          })
          .eq("id", lawyer.id);

        if (downgradeError) {
          console.error(
            `[cron/verificar-planos] Erro ao expirar plano do advogado ${lawyer.id}:`,
            downgradeError,
          );
          continue;
        }

        expiredCount += 1;
        await notifyPlanExpired(db, lawyer, nowStr);
        continue;
      }

      const canceled = [
        "CANCELED",
        "CANCELLED",
        "BLOCKED",
        "UNPAID",
      ].includes(String(lawyer.subscription_status || "").toUpperCase());
      if (canceled) continue;

      // Assinaturas Mercado Pago são renovadas automaticamente. Não enviamos
      // CTA de compra nem alertas de expiração enquanto a recorrência está ativa.
      if (recurring) continue;

      const diffDays = daysUntil(expiresAt, now);
      const daysRemaining = diffDays === 0 ? 1 : diffDays;

      if (daysRemaining === 5) {
        try {
          const sent = await sendRenewalEmail(db, lawyer, nowStr);
          if (sent) emailedCount += 1;
        } catch (error) {
          console.error(
            `[cron/verificar-planos] Erro ao enviar email de renovacao para ${lawyer.id}:`,
            error,
          );
        }
      }

      if (![1, 2, 3].includes(daysRemaining)) continue;

      try {
        const sent = await notifyPlanExpiring(
          db,
          lawyer,
          daysRemaining,
          nowStr,
        );
        if (sent) notifiedCount += 1;
      } catch (error) {
        console.error(
          `[cron/verificar-planos] Erro ao notificar advogado ${lawyer.id}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      expired: expiredCount,
      notified: notifiedCount,
      emailed: emailedCount,
      reconciled: reconciledCount,
      invalidExpiration: invalidExpirationCount,
      message: "Verificacao de expiracao concluida com sucesso.",
    });
  } catch (error) {
    console.error("Erro na API GET /api/cron/verificar-planos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

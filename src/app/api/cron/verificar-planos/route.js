import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { renovacaoPlanoTemplate } from "@/lib/emailTemplates";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";

// Links de assinatura recorrente hospedados na InfinitePay (conta PJ).
const SUBSCRIPTION_LINKS = {
  PRO_MONTHLY: "https://invoice.infinitepay.io/plans/plataforma-social/tkDa1iSpch",
  PRO_ANNUAL: "https://invoice.infinitepay.io/plans/plataforma-social/nrJhBb2yJQ",
  START_MONTHLY: "https://invoice.infinitepay.io/plans/plataforma-social/on4FAZawRE",
  START_ANNUAL: "https://invoice.infinitepay.io/plans/plataforma-social/LFlFfOViE9",
};

const SUBSCRIPTION_VALOR = {
  PRO_MONTHLY: "R$ 150,00/mês",
  PRO_ANNUAL: "R$ 1.440,00/ano",
  START_MONTHLY: "R$ 40,99/mês",
  START_ANNUAL: "R$ 431,88/ano",
};

function resolveSubscription(lawyer) {
  const plan = String(lawyer.plan_type || "").toUpperCase();
  if (!["PRO", "START"].includes(plan)) return null;

  const cycle =
    String(lawyer.plan_billing_cycle || "").toUpperCase() === "ANNUAL"
      ? "ANNUAL"
      : "MONTHLY";
  const key = `${plan}_${cycle}`;

  if (!SUBSCRIPTION_LINKS[key]) return null;
  return { url: SUBSCRIPTION_LINKS[key], valor: SUBSCRIPTION_VALOR[key], planType: plan };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function notifyPlanExpired(db, lawyer, nowStr) {
  await db.from("notificacoes").insert([
    {
      id: crypto.randomUUID(),
      user_id: lawyer.id,
      titulo: "Assinatura expirada",
      mensagem: `Prezado(a) Dr(a), sua assinatura do plano ${lawyer.plan_type} expirou. Renove agora para reativar o acesso as ferramentas premium.`,
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
      message: `Sua assinatura do plano ${lawyer.plan_type} expirou. Renove agora para reativar seu acesso.`,
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
      message: `Prezado(a) ${lawyer.name || "Dr(a)"}, sua assinatura do plano ${lawyer.plan_type} expira em 3 dias. Renove agora para nao perder o acesso as funcionalidades exclusivas.`,
    };
  }

  if (daysRemaining === 2) {
    return {
      title: "Seu plano expira em 2 dias",
      message: `Prezado(a) ${lawyer.name || "Dr(a)"}, sua assinatura do plano ${lawyer.plan_type} expira em 2 dias. Evite a interrupcao no atendimento de novos casos.`,
    };
  }

  return {
    title: "Ultimo dia de assinatura",
    message: `Prezado(a) ${lawyer.name || "Dr(a)"}, hoje e o ultimo dia da sua assinatura do plano ${lawyer.plan_type}. Renove imediatamente para garantir seu acesso.`,
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
  const alreadySent = await alreadySentWarning(
    db,
    lawyer.id,
    daysRemaining,
    lawyer.premium_expires_at,
  );

  if (alreadySent) {
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

  const sub = resolveSubscription(lawyer);
  if (!sub?.url) return false;

  if (await alreadySentRenewalEmail(db, lawyer.id, lawyer.premium_expires_at)) {
    return false;
  }

  await resend.emails.send({
    from: "Social Jurídico <contato@socialjuridico.com.br>",
    to: [lawyer.email],
    subject: `Seu plano ${sub.planType} vence em breve — renove agora`,
    html: renovacaoPlanoTemplate({
      lawyerName: lawyer.name || "Advogado",
      planType: sub.planType,
      daysRemaining: 5,
      valorTexto: sub.valor,
      ctaUrl: sub.url,
    }),
  });

  const { error } = await db.from("notificacoes").insert([
    {
      id: crypto.randomUUID(),
      user_id: lawyer.id,
      titulo: "Lembrete de renovação enviado",
      mensagem: `Enviamos um email lembrando que seu plano ${sub.planType} vence em 5 dias.`,
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
        "id, name, email, is_premium, premium_expires_at, plan_type, plan_billing_cycle, subscription_status",
      )
      .eq("is_premium", true)
      .not("premium_expires_at", "is", null);

    if (fetchError) {
      throw fetchError;
    }

    const now = new Date();
    const nowStr = now.toISOString();
    let processedCount = 0;
    let expiredCount = 0;
    let notifiedCount = 0;
    let emailedCount = 0;
    let invalidExpirationCount = 0;

    for (const lawyer of premiumLawyers || []) {
      processedCount += 1;

      const expiresAt = parseDate(lawyer.premium_expires_at);
      if (!expiresAt) {
        invalidExpirationCount += 1;
        console.warn(
          `[cron/verificar-planos] Data invalida para advogado ${lawyer.id}: ${lawyer.premium_expires_at}`,
        );
        continue;
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

      // Assinatura cancelada: não renova nem envia lembrete de renovação. O
      // acesso segue até expirar (tratado acima); aqui apenas ignoramos os
      // avisos/CTAs de renovação para não incomodar quem já cancelou.
      const canceled = [
        "CANCELED",
        "CANCELLED",
        "BLOCKED",
        "UNPAID",
      ].includes(String(lawyer.subscription_status || "").toUpperCase());
      if (canceled) {
        continue;
      }

      const diffDays = daysUntil(expiresAt, now);
      const daysRemaining = diffDays === 0 ? 1 : diffDays;

      // 5 dias antes: email de renovação com o link da assinatura (Resend).
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

      if (![1, 2, 3].includes(daysRemaining)) {
        continue;
      }

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

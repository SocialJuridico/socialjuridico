import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { sendPushNotification } from "@/lib/pushNotifications";
import { supabaseAdmin } from "@/lib/supabase";

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
      .select("id, name, email, is_premium, premium_expires_at, plan_type")
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

      const diffDays = daysUntil(expiresAt, now);
      const daysRemaining = diffDays === 0 ? 1 : diffDays;

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

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import {
  boasVindasPlanoTemplate,
  jurisCreditadoTemplate,
} from "@/lib/emailTemplates";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

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

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function incrementBalance(userId, amount) {
  const rpcResult = await supabaseAdmin.rpc("increment_lawyer_balance", {
    p_lawyer_id: userId,
    p_amount: amount,
  });

  if (!rpcResult.error) {
    return Number(rpcResult.data || 0);
  }

  const missingFunction =
    rpcResult.error.code === "PGRST202" ||
    String(rpcResult.error.message || "")
      .toLowerCase()
      .includes("increment_lawyer_balance");

  if (!missingFunction) {
    throw new Error("Falha ao atualizar o saldo do advogado.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado não localizado.");
  }

  const newBalance = Number(profile.balance || 0) + amount;
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (error) {
    throw new Error("Falha ao atualizar o saldo do advogado.");
  }

  return newBalance;
}

async function recordManualAudit({
  adminId,
  transactionId,
  justification,
  metadata,
}) {
  const { error } = await supabaseAdmin
    .from("admin_transaction_audit_logs")
    .insert([
      {
        id: crypto.randomUUID(),
        admin_id: adminId,
        transaction_id: transactionId,
        action: "MANUAL_FINANCIAL_ADJUSTMENT",
        purpose: "CUSTOMER_SUPPORT",
        justification,
        metadata,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    const message = String(error.message || "").toLowerCase();
    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      message.includes("admin_transaction_audit_logs");

    if (!missingTable) {
      console.error("[CréditoManual] Falha ao registrar auditoria:", error);
    }

    return false;
  }

  return true;
}

async function sendConfirmationEmail({
  email,
  lawyerName,
  type,
  amount,
  balance,
  planType,
}) {
  if (!process.env.RESEND_API_KEY) return false;

  try {
    if (type === "JURIS") {
      await resend.emails.send({
        from: "Social Jurídico <contato@socialjuridico.com.br>",
        to: [email],
        subject: "Seus Juris foram creditados",
        html: jurisCreditadoTemplate({
          lawyerName,
          amount,
          balance,
        }),
      });
    } else {
      await resend.emails.send({
        from: "Social Jurídico <contato@socialjuridico.com.br>",
        to: [email],
        subject: `Bem-vindo ao Plano ${planType}`,
        html: boasVindasPlanoTemplate({
          lawyerName,
          planType,
          jurisBonus: amount,
        }),
      });
    }

    return true;
  } catch (error) {
    console.error("[CréditoManual] Falha não fatal no e-mail:", error);
    return false;
  }
}

export async function POST(request) {
  let transactionId = null;

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço financeiro indisponível." },
        503,
      );
    }

    const body = await request.json().catch(() => null);
    const email = normalizeText(body?.email, 254).toLowerCase();
    const type = String(body?.type || "").toUpperCase();
    const planType =
      String(body?.planType || "START").toUpperCase() === "PRO"
        ? "PRO"
        : "START";
    const justification = normalizeText(
      body?.justification ||
        "Ajuste manual solicitado pelo administrador responsável.",
      1000,
    );

    if (!email || !["JURIS", "PLAN"].includes(type)) {
      return json({ success: false, message: "Dados incompletos." }, 400);
    }

    if (justification.length < 10) {
      return json(
        {
          success: false,
          message: "Informe uma justificativa administrativa válida.",
        },
        400,
      );
    }

    let bonusJuris;

    if (type === "JURIS") {
      bonusJuris = Number(body?.amount);

      if (
        !Number.isInteger(bonusJuris) ||
        bonusJuris <= 0 ||
        bonusJuris > 1000
      ) {
        return json(
          {
            success: false,
            message: "A quantidade deve estar entre 1 e 1000 Juris.",
          },
          400,
        );
      }
    } else {
      bonusJuris = planType === "PRO" ? 20 : 7;
    }

    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, email, balance")
      .ilike("email", email)
      .maybeSingle();

    if (lawyerError) {
      throw new Error("Falha ao consultar o advogado.");
    }

    if (!lawyer) {
      return json({ success: false, message: "Advogado não encontrado." }, 404);
    }

    const manualReference = `manual_${crypto.randomUUID()}`;
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transacoes")
      .insert([
        {
          advogado_id: lawyer.id,
          tipo: type === "JURIS" ? "JURIS_PURCHASE" : "PRO_SUBSCRIPTION",
          valor: 0,
          moeda: "BRL",
          status: "processing",
          juris_amount: bonusJuris,
          stripe_session_id: manualReference,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (transactionError || !transaction) {
      throw new Error("Falha ao reservar o ajuste financeiro.");
    }

    transactionId = transaction.id;
    const newBalance = await incrementBalance(lawyer.id, bonusJuris);

    if (type === "PLAN") {
      const { error: planError } = await supabaseAdmin
        .from("advogados")
        .update({
          plan_type: planType,
          is_premium: true,
          premium_expires_at: new Date(
            Date.now() + 31 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .eq("id", lawyer.id);

      if (planError) {
        throw new Error("Falha ao ativar o plano manualmente.");
      }
    }

    const { error: statusError } = await supabaseAdmin
      .from("transacoes")
      .update({ status: "succeeded" })
      .eq("id", transactionId);

    if (statusError) {
      throw new Error("Falha ao concluir o lançamento financeiro.");
    }

    const auditRecorded = await recordManualAudit({
      adminId: auth.user.id,
      transactionId,
      justification,
      metadata: {
        lawyerId: lawyer.id,
        operationType: type,
        planType: type === "PLAN" ? planType : null,
        jurisAmount: bonusJuris,
        monetaryValue: 0,
      },
    });

    const emailSent = await sendConfirmationEmail({
      email: lawyer.email || email,
      lawyerName: lawyer.name || "Advogado",
      type,
      amount: bonusJuris,
      balance: newBalance,
      planType,
    });

    return json({
      success: true,
      message:
        type === "PLAN"
          ? `Plano ${planType} ativado manualmente.`
          : `${bonusJuris} Juris creditados manualmente.`,
      data: {
        transactionId,
        balance: newBalance,
        auditRecorded,
        emailSent,
      },
    });
  } catch (error) {
    if (transactionId && supabaseAdmin) {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "error_updating_balance" })
        .eq("id", transactionId);
    }

    console.error("[Admin/CréditoManual][POST] Erro:", error);
    return json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível aplicar o ajuste manual.",
      },
      500,
    );
  }
}

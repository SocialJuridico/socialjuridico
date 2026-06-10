import {
  boasVindasPlanoTemplate,
  jurisCreditadoTemplate,
} from "@/lib/emailTemplates";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { forgotPasswordAction } from "@/app/actions/passwordActions";

import {
  ALLOWED_OAB_STATUSES,
  ALLOWED_PLAN_TYPES,
  ALLOWED_STATES,
  executeDelete,
  executeUpdate,
  getLawyerOrNull,
  isValidUuid,
  json,
  normalizeOab,
  normalizePositiveInteger,
  requireAdmin,
} from "./adminLawyersUtils";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

async function sendOabVerifiedEmail(lawyer) {
  if (!lawyer.email) return;

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: lawyer.email,
    subject: "Sua OAB foi verificada no Social Jurídico",
    html: `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#d4af37;">OAB verificada</h2>
        <p style="font-size:16px;">Olá${lawyer.name ? `, ${lawyer.name}` : ""}. Sua documentação foi aprovada e sua OAB foi verificada na plataforma.</p>
        <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;">
          <p style="margin:0;font-size:16px;">Seu perfil e seus chats passarão a exibir o selo de OAB verificada.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("[Admin/Advogados] Falha ao enviar e-mail de OAB:", error);
  }
}

async function sendAdministrativeActionEmail(lawyer, action, value, updates) {
  if (!lawyer.email) return;

  try {
    if (action === "ADD_JURIS") {
      await resend.emails.send({
        from: RESEND_FROM,
        to: lawyer.email,
        subject: "Seus Juris foram creditados",
        html: jurisCreditadoTemplate({
          lawyerName: lawyer.name || "Advogado",
          amount: Number(value),
          balance: updates.balance,
        }),
      });
    }

    if (action === "GIVE_PRO" || action === "GIVE_PLAN") {
      const planType = value?.planType || "PRO";

      await resend.emails.send({
        from: RESEND_FROM,
        to: lawyer.email,
        subject: `Bem-vindo ao Plano ${planType}`,
        html: boasVindasPlanoTemplate({
          lawyerName: lawyer.name || "Advogado",
          planType,
          jurisBonus: planType === "PRO" ? 20 : 7,
        }),
      });
    }
  } catch (error) {
    console.error("[Admin/Advogados] Falha não fatal ao enviar e-mail:", error);
  }
}

export async function deleteAdminLawyer(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;
    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get("id");

    if (!isValidUuid(lawyerId)) {
      return json({ success: false, message: "ID do advogado inválido." }, 400);
    }

    const lawyer = await getLawyerOrNull(db, lawyerId);

    if (!lawyer) {
      return json({ success: false, message: "Advogado não encontrado." }, 404);
    }

    await executeDelete(
      db,
      "mensagens",
      (query) => query.eq("sender_id", lawyerId),
      "Falha ao excluir mensagens",
    );
    await executeDelete(
      db,
      "case_interests",
      (query) => query.eq("lawyer_id", lawyerId),
      "Falha ao excluir interesses",
    );
    await executeDelete(
      db,
      "notificacoes",
      (query) => query.eq("user_id", lawyerId),
      "Falha ao excluir notificações",
    );

    await executeUpdate(
      db,
      "casos",
      {
        advogado_id: null,
        status: "ABERTO",
        updated_at: new Date().toISOString(),
      },
      (query) => query.eq("advogado_id", lawyerId),
      "Falha ao reabrir casos vinculados",
    );

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(lawyerId);

    if (authDeleteError) {
      throw new Error(`Falha ao excluir usuário do Auth: ${authDeleteError.message}`);
    }

    await executeDelete(
      db,
      "advogados",
      (query) => query.eq("id", lawyerId),
      "Falha ao excluir perfil do advogado",
    );

    return json({
      success: true,
      message: "Advogado excluído com sucesso.",
    });
  } catch (error) {
    console.error("[Admin/Advogados][DELETE] Erro:", error);

    return json(
      {
        success: false,
        message:
          "Não foi possível concluir a exclusão. Verifique os logs do servidor antes de tentar novamente.",
      },
      500,
    );
  }
}

export async function sendAdminLawyerPasswordReset(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;
    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get("id");

    if (!isValidUuid(lawyerId)) {
      return json({ success: false, message: "ID do advogado inválido." }, 400);
    }

    const lawyer = await getLawyerOrNull(db, lawyerId);

    if (!lawyer) {
      return json({ success: false, message: "Advogado não encontrado." }, 404);
    }

    const result = await forgotPasswordAction(lawyer.email);

    if (!result?.success) {
      return json(
        {
          success: false,
          message: result?.message || "Não foi possível enviar o link.",
        },
        500,
      );
    }

    return json({
      success: true,
      message: "Link de redefinição enviado ao e-mail do advogado.",
    });
  } catch (error) {
    console.error("[Admin/Advogados][PATCH] Erro:", error);

    return json(
      {
        success: false,
        message: "Não foi possível enviar o link de redefinição.",
      },
      500,
    );
  }
}

export async function updateAdminLawyer(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;
    const body = await request.json().catch(() => null);
    const lawyerId = body?.lawyerId;
    const action = body?.action;
    const value = body?.value;

    if (!isValidUuid(lawyerId) || typeof action !== "string") {
      return json({ success: false, message: "Parâmetros inválidos." }, 400);
    }

    const lawyer = await getLawyerOrNull(db, lawyerId);

    if (!lawyer) {
      return json({ success: false, message: "Advogado não encontrado." }, 404);
    }

    const updates = {};
    let sendVerifiedEmail = false;

    if (action === "GIVE_PRO" || action === "GIVE_PLAN") {
      const planType = String(value?.planType || "PRO").toUpperCase();
      const days = normalizePositiveInteger(value?.days || 30, {
        min: 1,
        max: 365,
      });

      if (!ALLOWED_PLAN_TYPES.has(planType) || !days) {
        return json(
          { success: false, message: "Plano ou duração inválidos." },
          400,
        );
      }

      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getUTCDate() + days);

      updates.is_premium = true;
      updates.plan_type = planType;
      updates.premium_expires_at = expiresAt.toISOString();
    } else if (action === "REMOVE_PRO") {
      updates.is_premium = false;
      updates.plan_type = "FREE";
      updates.premium_expires_at = null;
    } else if (action === "ADD_JURIS") {
      const amount = normalizePositiveInteger(value);

      if (!amount) {
        return json({ success: false, message: "Valor de Juris inválido." }, 400);
      }

      updates.balance = Number(lawyer.balance || 0) + amount;
    } else if (action === "REMOVE_JURIS") {
      const amount = normalizePositiveInteger(value);

      if (!amount) {
        return json({ success: false, message: "Valor de Juris inválido." }, 400);
      }

      updates.balance = Math.max(0, Number(lawyer.balance || 0) - amount);
    } else if (action === "SET_OAB_STATUS") {
      const status = String(value || "").toUpperCase();

      if (!ALLOWED_OAB_STATUSES.has(status)) {
        return json({ success: false, message: "Status de OAB inválido." }, 400);
      }

      updates.oab_verification_status = status;
      sendVerifiedEmail =
        status === "VERIFIED" &&
        lawyer.oab_verification_status !== "VERIFIED";
    } else if (action === "UPDATE_OAB") {
      const oab = normalizeOab(value?.oab);
      const state = String(value?.estado || "").toUpperCase();

      if (!oab || !ALLOWED_STATES.has(state)) {
        return json(
          { success: false, message: "OAB ou estado inválidos." },
          400,
        );
      }

      updates.oab = oab;
      updates.estado = state;
    } else {
      return json({ success: false, message: "Ação administrativa inválida." }, 400);
    }

    const { error: updateError } = await db
      .from("advogados")
      .update(updates)
      .eq("id", lawyerId);

    if (updateError) {
      throw new Error(`Falha ao atualizar advogado: ${updateError.message}`);
    }

    if (sendVerifiedEmail) {
      await sendOabVerifiedEmail(lawyer);
    }

    await sendAdministrativeActionEmail(lawyer, action, value, updates);

    if (action === "REMOVE_JURIS" && updates.balance !== undefined) {
      try {
        await checkAndNotifyLowBalance(
          lawyerId,
          Number(lawyer.balance || 0),
          updates.balance,
        );
      } catch (error) {
        console.error(
          "[Admin/Advogados] Falha não fatal no alerta de saldo:",
          error,
        );
      }
    }

    return json({
      success: true,
      message: "Advogado atualizado com sucesso.",
      data: { updates },
    });
  } catch (error) {
    console.error("[Admin/Advogados][PUT] Erro:", error);

    return json(
      { success: false, message: "Não foi possível atualizar o advogado." },
      500,
    );
  }
}

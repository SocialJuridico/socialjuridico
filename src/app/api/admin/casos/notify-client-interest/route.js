import { interesseCasoTemplate } from "@/lib/emailTemplates";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import {
  fetchGovernanceMap,
  isValidUuid,
  json,
  recordCaseAudit,
  requireAdminCaseAccess,
  upsertGovernance,
} from "../adminCases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_COOLDOWN_HOURS = 24;
const MAX_AUTOMATED_REMINDERS = 3;

function hoursSince(value) {
  const timestamp = new Date(value || 0).getTime();
  if (!timestamp) return Infinity;
  return (Date.now() - timestamp) / 3_600_000;
}

function formatLawyerNames(lawyers) {
  const names = lawyers.map((lawyer) => lawyer.name).filter(Boolean);
  if (!names.length) return "advogado interessado";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

export async function POST(request) {
  try {
    const access = await requireAdminCaseAccess();
    if (!access.ok) return access.response;

    if (!process.env.RESEND_API_KEY) {
      return json(
        {
          success: false,
          message: "O serviço de e-mail não está configurado.",
        },
        503,
      );
    }

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || body?.casoId || "").trim();

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    const [caseResult, governanceResult] = await Promise.all([
      access.db
        .from("casos")
        .select("id, titulo, cliente_id, status")
        .eq("id", caseId)
        .maybeSingle(),
      fetchGovernanceMap(access.db, [caseId]),
    ]);

    if (caseResult.error) {
      throw new Error(`Falha ao consultar caso: ${caseResult.error.message}`);
    }

    const caseItem = caseResult.data;
    if (!caseItem) {
      return json({ success: false, message: "Caso não encontrado." }, 404);
    }

    const governance = governanceResult.map.get(caseId);

    if (governance?.archived_at) {
      return json(
        { success: false, message: "Casos arquivados não podem receber lembretes." },
        409,
      );
    }

    if ((governance?.notification_count || 0) >= MAX_AUTOMATED_REMINDERS) {
      return json(
        {
          success: false,
          message:
            "O limite de três lembretes automáticos foi atingido. Revise o caso antes de novo contato.",
        },
        429,
      );
    }

    if (
      governance?.last_client_notification_at &&
      hoursSince(governance.last_client_notification_at) < REMINDER_COOLDOWN_HOURS
    ) {
      return json(
        {
          success: false,
          message: "Aguarde 24 horas entre lembretes para o mesmo cliente.",
        },
        429,
      );
    }

    const [clientResult, interestsResult] = await Promise.all([
      access.db
        .from("clientes")
        .select("id, email, name")
        .eq("id", caseItem.cliente_id)
        .maybeSingle(),
      access.db
        .from("case_interests")
        .select("lawyer_id, status")
        .eq("case_id", caseId)
        .in("status", ["PENDING", "NEGOTIATING"]),
    ]);

    if (clientResult.error) {
      throw new Error(`Falha ao consultar cliente: ${clientResult.error.message}`);
    }

    if (interestsResult.error) {
      throw new Error(`Falha ao consultar interesses: ${interestsResult.error.message}`);
    }

    const client = clientResult.data;
    const interests = interestsResult.data || [];

    if (!client?.email) {
      return json(
        { success: false, message: "O cliente não possui e-mail cadastrado." },
        400,
      );
    }

    if (!interests.length) {
      return json(
        { success: false, message: "O caso não possui interesses pendentes." },
        400,
      );
    }

    const lawyerIds = [...new Set(interests.map((item) => item.lawyer_id).filter(Boolean))];
    const { data: lawyers, error: lawyersError } = await access.db
      .from("advogados")
      .select("id, name")
      .in("id", lawyerIds);

    if (lawyersError) {
      throw new Error(`Falha ao consultar advogados: ${lawyersError.message}`);
    }

    const activeLawyers = lawyers || [];
    if (!activeLawyers.length) {
      return json(
        { success: false, message: "Nenhum advogado ativo foi localizado." },
        400,
      );
    }

    const interestedCount = interests.length;
    const trackId = crypto.randomUUID();
    const sentAt = new Date().toISOString();

    const { error: trackingError } = await access.db
      .from("email_tracking_logs")
      .insert([
        {
          id: trackId,
          recipient_email: client.email,
          user_id: client.id,
          email_type: "INTERESSE",
          destination_url: "https://socialjuridico.com.br/dashboard/cliente",
          case_id: caseId,
          client_id: client.id,
          interested_count: interestedCount,
          sent_at: sentAt,
        },
      ]);

    if (trackingError) {
      throw new Error(`Falha ao registrar jornada do e-mail: ${trackingError.message}`);
    }

    const emailSubject =
      interestedCount > 1
        ? `⚖️ ${interestedCount} advogados querem analisar seu caso "${caseItem.titulo || "Caso"}"`
        : `⚖️ Um advogado quer analisar seu caso "${caseItem.titulo || "Caso"}"`;

    const { error: emailError } = await resend.emails.send({
      from: "Social Jurídico <contato@socialjuridico.com.br>",
      to: client.email,
      subject: emailSubject,
      html: interesseCasoTemplate({
        clientName: client.name || "Cliente",
        titulo: caseItem.titulo || "Caso sem título",
        interestedCount,
        lawyerName: formatLawyerNames(activeLawyers),
        trackId,
      }),
    });

    if (emailError) {
      throw new Error(`Falha ao enviar e-mail: ${emailError.message}`);
    }

    let pushSent = false;
    try {
      await sendPushNotification({
        userIds: [client.id],
        roles: [],
        title:
          interestedCount > 1
            ? "⚖️ Advogados interessados no seu caso"
            : "⚖️ Novo interesse no seu caso",
        message: `Há interesse no caso "${caseItem.titulo || "Caso"}".`,
        url: "/dashboard/cliente",
      });
      pushSent = true;
    } catch (pushError) {
      console.error("[Admin/Casos/Lembrete] Falha no push:", pushError);
    }

    const nextNotificationCount = (governance?.notification_count || 0) + 1;
    const nextActionAt = new Date(Date.now() + 48 * 3_600_000).toISOString();

    await upsertGovernance(access.db, caseId, {
      operational_stage: "WAITING_CLIENT",
      assigned_admin_id: access.auth.user.id,
      last_client_notification_at: sentAt,
      notification_count: nextNotificationCount,
      next_action_at: nextActionAt,
    });

    await recordCaseAudit(access.db, request, {
      adminId: access.auth.user.id,
      caseId,
      action: "CLIENT_REENGAGEMENT_SENT",
      purpose: "CASE_CONVERSION",
      metadata: {
        interestedCount,
        reminderNumber: nextNotificationCount,
        emailTrackingId: trackId,
        pushSent,
      },
    });

    return json({
      success: true,
      message: "Cliente notificado com sucesso.",
      data: {
        reminderNumber: nextNotificationCount,
        remainingAutomatedReminders:
          MAX_AUTOMATED_REMINDERS - nextNotificationCount,
        nextActionAt,
        pushSent,
      },
    });
  } catch (error) {
    console.error("[Admin/Casos/Lembrete][POST] Erro:", error);

    if (error?.code === "GOVERNANCE_MIGRATION_REQUIRED") {
      return json({ success: false, message: error.message }, 503);
    }

    return json(
      {
        success: false,
        message: "Não foi possível notificar o cliente.",
      },
      500,
    );
  }
}

import { comunicadoAdminTemplate } from "@/lib/emailTemplates";
import { resend } from "@/lib/resend";
import {
  EMAIL_TARGET_MODES,
  deduplicateRecipients,
  escapeHtml,
  isValidUuid,
  json,
  normalizeText,
  requireAdminCommunicationAccess,
} from "../communication/adminCommunication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES_MS = 1500;
const FROM_EMAIL = "Social Jurídico <contato@socialjuridico.com.br>";

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function mapAdvertiserRecipient(item) {
  const email = isEmail(item.email)
    ? item.email
    : isEmail(item.username)
      ? item.username
      : "";

  return {
    name: item.nome_empresa || item.username || "Anunciante",
    email,
  };
}

async function queryAdvertisers(db, targetId = null) {
  let withEmail = db
    .from("anunciantes")
    .select("nome_empresa, username, email");

  if (targetId) withEmail = withEmail.eq("id", targetId).maybeSingle();

  const primary = await withEmail;
  if (!primary.error) return primary;

  let fallback = db
    .from("anunciantes")
    .select("nome_empresa, username");

  if (targetId) fallback = fallback.eq("id", targetId).maybeSingle();

  return fallback;
}

async function listRecipients(db, targetMode, targetId) {
  switch (targetMode) {
    case "EMAIL_TODOS_ADVOGADOS": {
      const { data, error } = await db
        .from("advogados")
        .select("name, email")
        .not("email", "is", null);
      if (error) throw new Error(`Falha ao consultar advogados: ${error.message}`);
      return data || [];
    }
    case "EMAIL_TODOS_CLIENTES": {
      const { data, error } = await db
        .from("clientes")
        .select("name, email")
        .not("email", "is", null);
      if (error) throw new Error(`Falha ao consultar clientes: ${error.message}`);
      return data || [];
    }
    case "EMAIL_TODOS_ANUNCIANTES": {
      const { data, error } = await queryAdvertisers(db);
      if (error) throw new Error(`Falha ao consultar anunciantes: ${error.message}`);
      return (data || []).map(mapAdvertiserRecipient);
    }
    case "EMAIL_ADVOGADO_ESPECIFICO": {
      if (!isValidUuid(targetId)) return [];
      const { data, error } = await db
        .from("advogados")
        .select("name, email")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Falha ao consultar advogado: ${error.message}`);
      return data?.email ? [data] : [];
    }
    case "EMAIL_CLIENTE_ESPECIFICO": {
      if (!isValidUuid(targetId)) return [];
      const { data, error } = await db
        .from("clientes")
        .select("name, email")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Falha ao consultar cliente: ${error.message}`);
      return data?.email ? [data] : [];
    }
    case "EMAIL_ANUNCIANTE_ESPECIFICO": {
      if (!isValidUuid(targetId)) return [];
      const { data, error } = await queryAdvertisers(db, targetId);
      if (error) throw new Error(`Falha ao consultar anunciante: ${error.message}`);
      return data ? [mapAdvertiserRecipient(data)] : [];
    }
    default:
      return [];
  }
}

async function sendEmailBatches(recipients, title, message) {
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < recipients.length; index += BATCH_SIZE) {
    const batch = recipients.slice(index, index + BATCH_SIZE);
    const payloads = batch.map((recipient) => ({
      from: FROM_EMAIL,
      to: [recipient.email],
      subject: `⚖️ ${title}`,
      html: comunicadoAdminTemplate({
        recipientName: escapeHtml(recipient.name),
        titulo: escapeHtml(title),
        mensagem: escapeHtml(message),
      }),
    }));

    try {
      const { error } = await resend.batch.send(payloads);
      if (error) {
        failed += batch.length;
        console.error("[Admin/Email] Falha no lote:", error);
      } else {
        sent += batch.length;
      }
    } catch (error) {
      failed += batch.length;
      console.error("[Admin/Email] Exceção no lote:", error);
    }

    if (index + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  return { sent, failed };
}

export async function POST(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    if (!process.env.RESEND_API_KEY) {
      return json(
        {
          success: false,
          message: "O serviço de envio de e-mails não está configurado.",
        },
        503,
      );
    }

    const body = await request.json().catch(() => null);
    const targetMode = String(body?.targetMode || "").trim();
    const targetId = String(body?.targetId || "").trim();
    const title = normalizeText(body?.title, 100);
    const message = normalizeText(body?.message, 10000);

    if (!EMAIL_TARGET_MODES.has(targetMode)) {
      return json({ success: false, message: "Público-alvo inválido." }, 400);
    }

    if (!title || !message) {
      return json(
        { success: false, message: "Título e mensagem são obrigatórios." },
        400,
      );
    }

    const recipients = deduplicateRecipients(
      await listRecipients(access.db, targetMode, targetId),
    );

    if (!recipients.length) {
      return json(
        {
          success: false,
          message: "Nenhum destinatário com e-mail válido foi encontrado.",
        },
        404,
      );
    }

    const result = await sendEmailBatches(recipients, title, message);

    if (result.sent === 0) {
      return json(
        {
          success: false,
          message: "O serviço não confirmou o envio de nenhum e-mail.",
          data: {
            totalDestinatarios: recipients.length,
            enviados: 0,
            falhas: result.failed,
          },
        },
        502,
      );
    }

    return json({
      success: true,
      message:
        result.failed > 0
          ? `${result.sent} e-mails enviados; ${result.failed} apresentaram falha.`
          : `${result.sent} e-mails enviados com sucesso.`,
      data: {
        totalDestinatarios: recipients.length,
        enviados: result.sent,
        falhas: result.failed,
      },
    });
  } catch (error) {
    console.error("[Admin/Email][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível enviar os e-mails administrativos.",
      },
      500,
    );
  }
}

import { sendPushNotification } from "@/lib/pushNotifications";
import {
  isValidUuid,
  json,
  normalizeText,
  requireAdminCommunicationAccess,
} from "../communication/adminCommunication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCES = new Set([
  "all-users",
  "all-lawyers",
  "all-clients",
  "single-lawyer",
  "single-client",
]);

const INSERT_BATCH_SIZE = 500;

async function countTable(db, table, applyFilters) {
  let query = db
    .from(table)
    .select("id", { count: "exact", head: true });

  if (applyFilters) query = applyFilters(query);

  const { count, error } = await query;
  if (error) {
    throw new Error(`Falha ao contar registros de ${table}: ${error.message}`);
  }

  return count || 0;
}

async function fetchIds(db, table, applyFilters) {
  let query = db.from(table).select("id");
  if (applyFilters) query = applyFilters(query);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Falha ao consultar destinatários de ${table}: ${error.message}`);
  }

  return (data || []).map((item) => item.id).filter(Boolean);
}

async function validateSpecificRecipient(db, audience, recipientId) {
  if (!isValidUuid(recipientId)) return null;

  const table = audience === "single-lawyer" ? "advogados" : "clientes";
  const { data, error } = await db
    .from(table)
    .select("id")
    .eq("id", recipientId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar destinatário: ${error.message}`);
  }

  return data?.id || null;
}

async function resolveRecipients(db, audience, recipientId) {
  if (audience === "single-lawyer" || audience === "single-client") {
    const validatedId = await validateSpecificRecipient(db, audience, recipientId);
    return validatedId ? [validatedId] : [];
  }

  if (audience === "all-lawyers") {
    return fetchIds(db, "advogados");
  }

  if (audience === "all-clients") {
    return fetchIds(db, "clientes");
  }

  const [clients, lawyers, admins] = await Promise.all([
    fetchIds(db, "clientes"),
    fetchIds(db, "advogados"),
    fetchIds(db, "admins", (query) => query.eq("role", "ADMIN")),
  ]);

  return [...new Set([...clients, ...lawyers, ...admins])];
}

async function insertNotificationBatch(db, rows) {
  const { error } = await db.from("notificacoes").insert(rows);

  if (error?.code === "PGRST204") {
    const fallbackRows = rows.map(
      ({ id, user_id, titulo, mensagem, lida, created_at }) => ({
        id,
        user_id,
        titulo,
        mensagem,
        lida,
        created_at,
      }),
    );
    const { error: fallbackError } = await db
      .from("notificacoes")
      .insert(fallbackRows);

    if (fallbackError) {
      throw new Error(`Falha ao registrar comunicados: ${fallbackError.message}`);
    }
    return;
  }

  if (error) {
    throw new Error(`Falha ao registrar comunicados: ${error.message}`);
  }
}

async function insertNotifications(db, rows) {
  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    await insertNotificationBatch(
      db,
      rows.slice(index, index + INSERT_BATCH_SIZE),
    );
  }
}

export async function GET() {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const [clients, lawyers, admins] = await Promise.all([
      countTable(access.db, "clientes"),
      countTable(access.db, "advogados"),
      countTable(access.db, "admins", (query) => query.eq("role", "ADMIN")),
    ]);

    return json({
      success: true,
      data: {
        counts: {
          clients,
          lawyers,
          admins,
          total: clients + lawyers + admins,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Comunicados][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar os dados de comunicados.",
      },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const audience = String(body?.audience || "").trim();
    const recipientId = String(body?.recipientId || "").trim();
    const title = normalizeText(body?.title, 100);
    const message = normalizeText(body?.message, 5000);

    if (!AUDIENCES.has(audience)) {
      return json({ success: false, message: "Público inválido." }, 400);
    }

    if (!title || !message) {
      return json(
        { success: false, message: "Título e mensagem são obrigatórios." },
        400,
      );
    }

    const recipients = await resolveRecipients(
      access.db,
      audience,
      recipientId,
    );

    if (!recipients.length) {
      return json(
        {
          success: false,
          message: "Nenhum destinatário válido foi encontrado.",
        },
        404,
      );
    }

    const now = new Date().toISOString();
    const notifications = recipients.map((userId) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      titulo: title,
      mensagem: message,
      lida: false,
      created_at: now,
      tipo: "ADMIN_BROADCAST",
      meta: JSON.stringify({
        audience,
        sent_by: access.auth.user.id,
      }),
    }));

    await insertNotifications(access.db, notifications);

    let pushResult = null;
    try {
      pushResult = await sendPushNotification({
        userIds: recipients,
        roles: [],
        title,
        message: message.slice(0, 180),
        url: "/dashboard",
      });
    } catch (pushError) {
      console.error("[Admin/Comunicados] Falha no push:", pushError);
    }

    return json({
      success: true,
      message: `Comunicado enviado para ${recipients.length} usuário${
        recipients.length === 1 ? "" : "s"
      }.`,
      data: {
        recipients: recipients.length,
        push: pushResult,
      },
    });
  } catch (error) {
    console.error("[Admin/Comunicados][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível enviar o comunicado.",
      },
      500,
    );
  }
}

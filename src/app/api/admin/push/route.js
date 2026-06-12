import { sendPushNotification } from "@/lib/pushNotifications";
import {
  PUSH_TARGET_MODES,
  isValidUuid,
  json,
  normalizeText,
  requireAdminCommunicationAccess,
} from "../communication/adminCommunication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPECIFIC_TARGETS = {
  ADVOGADO_ESPECIFICO: "advogados",
  CLIENTE_ESPECIFICO: "clientes",
};

async function validateSpecificTarget(db, targetMode, targetId) {
  const table = SPECIFIC_TARGETS[targetMode];
  if (!table) return true;

  if (!isValidUuid(targetId)) return false;

  const { data, error } = await db
    .from(table)
    .select("id")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar destinatário: ${error.message}`);
  }

  return Boolean(data);
}

function resolveAudience(targetMode, targetId) {
  switch (targetMode) {
    case "TODOS_ADVOGADOS":
      return { userIds: [], roles: ["LAWYER"] };
    case "TODOS_CLIENTES":
      return { userIds: [], roles: ["CLIENT"] };
    case "ADVOGADO_ESPECIFICO":
    case "CLIENTE_ESPECIFICO":
      return { userIds: [targetId], roles: [] };
    case "TODOS":
      return { userIds: [], roles: ["LAWYER", "CLIENT", "ADMIN"] };
    default:
      return null;
  }
}

export async function POST(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const targetMode = String(body?.targetMode || "").trim();
    const targetId = String(body?.targetId || "").trim();
    const title = normalizeText(body?.title, 60);
    const message = normalizeText(body?.message, 180);

    if (!PUSH_TARGET_MODES.has(targetMode)) {
      return json({ success: false, message: "Público-alvo inválido." }, 400);
    }

    if (!title || !message) {
      return json(
        { success: false, message: "Título e mensagem são obrigatórios." },
        400,
      );
    }

    if (SPECIFIC_TARGETS[targetMode]) {
      const targetExists = await validateSpecificTarget(
        access.db,
        targetMode,
        targetId,
      );

      if (!targetExists) {
        return json(
          { success: false, message: "Destinatário não encontrado." },
          404,
        );
      }
    }

    const audience = resolveAudience(targetMode, targetId);
    const result = await sendPushNotification({
      ...audience,
      title,
      message,
      url: "/",
    });

    return json({
      success: true,
      message: "Notificação push enviada com sucesso.",
      data: result || null,
    });
  } catch (error) {
    console.error("[Admin/Push][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível enviar a notificação push.",
      },
      500,
    );
  }
}

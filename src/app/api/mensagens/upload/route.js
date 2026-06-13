import {
  ACTIVE_MESSAGE_INTEREST_STATUSES,
  isValidMessageUuid,
} from "@/lib/messages/messagePresentation";
import {
  messageJson,
  requireMessageUser,
  resolveMessageConversation,
  validateMessageMutationOrigin,
} from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["application/pdf", "pdf"],
  ["audio/webm", "webm"],
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["text/plain", "txt"],
]);

function safeOriginalName(value) {
  return (
    String(value || "Arquivo")
      .replace(/[\\/\0<>:"|?*]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "Arquivo"
  );
}

async function hasFallbackNegotiationAccess(db, userId, caseId) {
  const { data: caseItem, error: caseError } = await db
    .from("casos")
    .select("id, cliente_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) throw caseError;
  if (!caseItem) return false;

  let query = db
    .from("case_interests")
    .select("id")
    .eq("case_id", caseId)
    .in("status", ACTIVE_MESSAGE_INTEREST_STATUSES)
    .limit(1);

  if (String(caseItem.cliente_id) !== String(userId)) {
    query = query.eq("lawyer_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Boolean(data?.length);
}

export async function POST(request) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireMessageUser(request);
    if (!access.ok) return access.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const caseId = String(formData.get("casoId") || "").trim();
    const interestId = String(formData.get("interestId") || "").trim() || null;

    if (!(file instanceof File) || file.size <= 0) {
      return messageJson(
        { success: false, message: "Selecione um arquivo válido." },
        400,
      );
    }

    if (!isValidMessageUuid(caseId)) {
      return messageJson({ success: false, message: "Caso inválido." }, 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return messageJson(
        { success: false, message: "O arquivo excede o limite de 15 MB." },
        413,
      );
    }

    const mimeType = String(file.type || "")
      .toLowerCase()
      .split(";")[0]
      .trim();
    const extension = MIME_EXTENSIONS.get(mimeType);
    if (!extension) {
      return messageJson(
        {
          success: false,
          message:
            "Formato não permitido. Envie imagem, PDF, áudio, vídeo ou TXT.",
        },
        415,
      );
    }

    const resolved = await resolveMessageConversation(
      access.db,
      access.user.id,
      caseId,
      interestId,
    );

    if (!resolved.ok) {
      const fallbackAllowed =
        !interestId &&
        resolved.status === 403 &&
        (await hasFallbackNegotiationAccess(access.db, access.user.id, caseId));

      if (!fallbackAllowed) {
        return messageJson(
          { success: false, message: resolved.message },
          resolved.status,
        );
      }
    }

    const filePath = `chat-attachments/${caseId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await access.db.storage
      .from("cases")
      .upload(filePath, file, {
        upsert: false,
        contentType: mimeType,
        cacheControl: "3600",
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = access.db.storage.from("cases").getPublicUrl(filePath);

    return messageJson(
      {
        success: true,
        url: publicUrl,
        fileName: safeOriginalName(file.name),
        fileType: mimeType,
        size: file.size,
      },
      201,
    );
  } catch (error) {
    console.error("[Mensagens/Upload] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível enviar o arquivo." },
      500,
    );
  }
}

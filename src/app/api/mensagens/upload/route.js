import crypto from "node:crypto";

import { isValidMessageUuid } from "@/lib/messages/messagePresentation";
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
  ["application/msword", "doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["application/vnd.ms-excel", "xls"],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx",
  ],
  ["application/vnd.ms-powerpoint", "ppt"],
  [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "pptx",
  ],
  ["application/rtf", "rtf"],
  ["text/rtf", "rtf"],
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

    if (interestId && !isValidMessageUuid(interestId)) {
      return messageJson(
        { success: false, message: "Negociação inválida." },
        400,
      );
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
            "Formato não permitido. Envie imagem, PDF, documento Office, áudio, vídeo, RTF ou TXT.",
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
      return messageJson(
        { success: false, message: resolved.message },
        resolved.status,
      );
    }

    const filePath = `chat-attachments/${caseId}/${
      interestId || "case"
    }/${access.user.id}/${crypto.randomUUID()}.${extension}`;
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
    console.error("[Mensagens/Upload Legado] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível enviar o arquivo." },
      500,
    );
  }
}

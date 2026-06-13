import crypto from "node:crypto";

import { notifyChatMessage } from "@/lib/messages/chatNotifications";
import {
  auditChatAction,
  chatJson,
  resolveChatAccess,
} from "@/lib/messages/chatServer";
import {
  CHAT_MAX_FILE_BYTES,
  chatAttachmentKind,
  getChatFileExtension,
  normalizeChatFileName,
  normalizeChatRequestId,
  normalizeMimeType,
} from "@/lib/messages/chatValidation";
import { validateMessageMutationOrigin } from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "chat-attachments";

async function serializeAttachment(db, attachment) {
  const { data, error } = await db.storage
    .from(attachment.bucket_name)
    .createSignedUrl(attachment.object_path, 60 * 60);

  return {
    id: attachment.id,
    name: attachment.original_name,
    mimeType: attachment.mime_type,
    kind: chatAttachmentKind(attachment.mime_type),
    size: Number(attachment.size_bytes || 0),
    url: error ? null : data?.signedUrl || null,
    available: !error && Boolean(data?.signedUrl),
  };
}

export async function POST(request, context) {
  let uploadedPath = null;
  let db = null;

  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const { casoId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const requestId = normalizeChatRequestId(formData.get("requestId"));
    const interestId = String(formData.get("interestId") || "").trim() || null;

    const access = await resolveChatAccess(
      request,
      String(casoId || ""),
      interestId,
    );
    if (!access.ok) return access.response;
    db = access.db;

    if (!access.canSend) {
      return chatJson(
        { success: false, message: "Esta conversa está somente para leitura." },
        409,
      );
    }

    if (!requestId) {
      return chatJson(
        { success: false, message: "Identificador do envio inválido." },
        400,
      );
    }

    if (!(file instanceof File) || file.size <= 0) {
      return chatJson(
        { success: false, message: "Selecione um arquivo válido." },
        400,
      );
    }

    if (file.size > CHAT_MAX_FILE_BYTES) {
      return chatJson(
        { success: false, message: "O arquivo excede o limite de 20 MB." },
        413,
      );
    }

    const mimeType = normalizeMimeType(file.type);
    const extension = getChatFileExtension(mimeType);
    if (!extension) {
      return chatJson(
        {
          success: false,
          message:
            "Formato não permitido. Envie imagem, áudio, vídeo, PDF, Word, Excel, PowerPoint, RTF ou TXT.",
        },
        415,
      );
    }

    const { data: existing, error: existingError } = await access.db
      .from("chat_attachments")
      .select(
        "id, message_id, bucket_name, object_path, original_name, mime_type, size_bytes, status",
      )
      .eq("uploader_id", access.user.id)
      .eq("request_id", requestId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const { data: existingMessage, error: messageError } = await access.db
        .from("mensagens")
        .select("id, sender_id, is_read, created_at")
        .eq("id", existing.message_id)
        .maybeSingle();
      if (messageError) throw messageError;

      return chatJson({
        success: true,
        alreadyProcessed: true,
        data: {
          id: existingMessage?.id || existing.message_id,
          senderId: access.user.id,
          own: true,
          read: Boolean(existingMessage?.is_read),
          createdAt: existingMessage?.created_at || null,
          deleted: false,
          type: "ATTACHMENT",
          attachment: await serializeAttachment(access.db, existing),
        },
      });
    }

    const safeName = normalizeChatFileName(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const attachmentId = crypto.randomUUID();
    const objectPath = `${access.caseId}/${access.interestId || "case"}/${access.user.id}/${attachmentId}.${extension}`;
    uploadedPath = objectPath;

    const { error: uploadError } = await access.db.storage
      .from(BUCKET)
      .upload(objectPath, bytes, {
        upsert: false,
        contentType: mimeType,
        cacheControl: "3600",
      });
    if (uploadError) throw uploadError;

    const now = new Date().toISOString();
    const { data: attachment, error: attachmentError } = await access.db
      .from("chat_attachments")
      .insert([
        {
          id: attachmentId,
          request_id: requestId,
          case_id: access.caseId,
          interest_id: access.interestId,
          uploader_id: access.user.id,
          bucket_name: BUCKET,
          object_path: objectPath,
          original_name: safeName,
          mime_type: mimeType,
          size_bytes: file.size,
          sha256,
          status: "ACTIVE",
          created_at: now,
        },
      ])
      .select()
      .single();
    if (attachmentError) throw attachmentError;

    const { data: message, error: messageError } = await access.db
      .from("mensagens")
      .insert([
        {
          caso_id: access.caseId,
          interest_id: access.interestId,
          sender_id: access.user.id,
          content: safeName,
          message_type: "ATTACHMENT",
          metadata: { attachment_id: attachment.id },
          client_request_id: requestId,
          is_read: false,
          created_at: now,
        },
      ])
      .select("id, sender_id, is_read, created_at")
      .single();
    if (messageError) throw messageError;

    const { error: linkError } = await access.db
      .from("chat_attachments")
      .update({ message_id: message.id })
      .eq("id", attachment.id)
      .eq("uploader_id", access.user.id);
    if (linkError) throw linkError;

    await auditChatAction(access, request, {
      action: "ATTACHMENT_UPLOADED",
      requestId,
      messageId: message.id,
      metadata: {
        attachment_id: attachment.id,
        mime_type: mimeType,
        size_bytes: file.size,
        sha256,
      },
    });

    await notifyChatMessage({
      db: access.db,
      senderId: access.user.id,
      senderRole: access.role,
      caseItem: access.caseItem,
      interest: access.interest,
    }).catch((notificationError) => {
      console.error("[Chat/Anexo] Upload concluído; notificação pendente:", notificationError);
    });

    return chatJson(
      {
        success: true,
        alreadyProcessed: false,
        data: {
          id: message.id,
          senderId: message.sender_id,
          own: true,
          read: Boolean(message.is_read),
          createdAt: message.created_at,
          deleted: false,
          type: "ATTACHMENT",
          attachment: await serializeAttachment(access.db, {
            ...attachment,
            message_id: message.id,
          }),
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Chat/Anexos][POST] Erro:", error);
    if (db && uploadedPath) {
      await db.storage.from(BUCKET).remove([uploadedPath]).catch(() => null);
    }
    return chatJson(
      { success: false, message: "Não foi possível enviar o arquivo." },
      500,
    );
  }
}

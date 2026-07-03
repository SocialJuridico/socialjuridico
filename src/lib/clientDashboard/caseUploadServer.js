import crypto from "node:crypto";
import path from "node:path";

const CATEGORY_RULES = {
  ATTACHMENT: {
    bucket: "cases",
    maxSize: 10 * 1024 * 1024,
    maxCount: 5,
    mimeTypes: new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
  },
  VIDEO: {
    bucket: "cases-media",
    maxSize: 180 * 1024 * 1024,
    maxCount: 1,
    mimeTypes: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  },
  AUDIO: {
    bucket: "cases-media",
    maxSize: 25 * 1024 * 1024,
    maxCount: 1,
    mimeTypes: new Set([
      "audio/webm",
      "audio/ogg",
      "audio/mpeg",
      "audio/mp4",
    ]),
  },
};

const MIME_EXTENSION = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

function publicUploadError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function safeOriginalName(value) {
  return String(value || "arquivo")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, "-")
    .trim()
    .slice(0, 180);
}

function folderFor(userId, category, date = new Date()) {
  return [
    userId,
    category.toLowerCase(),
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
  ].join("/");
}

export function validateUploadMetadata(input) {
  const category = String(input?.category || "").trim().toUpperCase();
  const mimeType = String(input?.mime_type || "").trim().toLowerCase();
  const sizeBytes = Number(input?.size_bytes);
  const originalName = safeOriginalName(input?.original_name);
  const rules = CATEGORY_RULES[category];

  if (!rules) {
    throw publicUploadError("Categoria de arquivo inválida.");
  }

  if (!rules.mimeTypes.has(mimeType)) {
    throw publicUploadError("Formato de arquivo não permitido.", 415);
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw publicUploadError("Tamanho do arquivo inválido.");
  }

  if (sizeBytes > rules.maxSize) {
    throw publicUploadError(
      category === "VIDEO"
        ? "O vídeo excede o limite de 180 MB."
        : category === "AUDIO"
          ? "O áudio excede o limite de 25 MB."
          : "O arquivo excede o limite de 10 MB.",
      413,
    );
  }

  return {
    category,
    mimeType,
    sizeBytes,
    originalName,
    rules,
    extension: MIME_EXTENSION[mimeType],
  };
}

export async function auditCaseUpload(
  db,
  { uploadId, userId, action, bucket, objectPath, metadata = {} },
) {
  const { error } = await db.from("client_case_upload_audit_logs").insert([
    {
      upload_id: uploadId,
      user_id: userId,
      action,
      bucket,
      object_path: objectPath,
      metadata,
    },
  ]);

  if (error) {
    const auditError = new Error(`Falha ao auditar upload: ${error.message}`);
    auditError.status = ["42P01", "PGRST205"].includes(error.code) ? 503 : 500;
    throw auditError;
  }
}

export async function cleanupExpiredUploads(db, userId) {
  const { data, error } = await db
    .from("client_case_uploads")
    .select("id, bucket, object_path")
    .eq("user_id", userId)
    .eq("status", "PENDING")
    .lte("expires_at", new Date().toISOString())
    .limit(50);

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return;
    throw new Error(`Falha ao consultar uploads expirados: ${error.message}`);
  }

  for (const item of data || []) {
    await db.storage.from(item.bucket).remove([item.object_path]).catch(() => null);
    await db
      .from("client_case_uploads")
      .update({ status: "EXPIRED", removed_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "PENDING");

    await auditCaseUpload(db, {
      uploadId: item.id,
      userId,
      action: "EXPIRED",
      bucket: item.bucket,
      objectPath: item.object_path,
    }).catch(() => null);
  }
}

// Categorias de slot único (VIDEO/AUDIO): um novo upload substitui o anterior
// que ficou em preparação (PENDING), evitando o bloqueio de "já existe" quando
// o cliente reenvia sem ter publicado o caso.
async function purgePendingSingleSlot(db, userId, category) {
  const { data, error } = await db
    .from("client_case_uploads")
    .select("id, bucket, object_path")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("status", "PENDING");

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return;
    return;
  }

  for (const item of data || []) {
    await db.storage.from(item.bucket).remove([item.object_path]).catch(() => null);
    await db
      .from("client_case_uploads")
      .update({ status: "REMOVED", removed_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "PENDING");
    await auditCaseUpload(db, {
      uploadId: item.id,
      userId,
      action: "REMOVED",
      bucket: item.bucket,
      objectPath: item.object_path,
      metadata: { reason: "REPLACED_PENDING_SINGLE_SLOT" },
    }).catch(() => null);
  }
}

export async function issueCaseUploadTicket(db, userId, input) {
  const normalized = validateUploadMetadata(input);
  await cleanupExpiredUploads(db, userId);

  // Slot único: limpa o pendente anterior antes de contar (permite substituir).
  if (normalized.rules.maxCount === 1) {
    await purgePendingSingleSlot(db, userId, normalized.category);
  }

  const { count, error: countError } = await db
    .from("client_case_uploads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category", normalized.category)
    .eq("status", "PENDING")
    .gt("expires_at", new Date().toISOString());

  if (countError) {
    const migrationMissing = ["42P01", "PGRST205"].includes(countError.code);
    throw publicUploadError(
      migrationMissing
        ? "Execute a migração de governança do dashboard do cliente."
        : "Não foi possível validar os uploads em andamento.",
      migrationMissing ? 503 : 500,
    );
  }

  if (Number(count || 0) >= normalized.rules.maxCount) {
    throw publicUploadError(
      normalized.category === "ATTACHMENT"
        ? "O limite de cinco anexos em preparação foi atingido."
        : `Já existe um ${normalized.category === "VIDEO" ? "vídeo" : "áudio"} em preparação.`,
      409,
    );
  }

  const uploadId = crypto.randomUUID();
  const objectPath = `${folderFor(userId, normalized.category)}/${uploadId}.${normalized.extension}`;
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: signed, error: signedError } = await db.storage
    .from(normalized.rules.bucket)
    .createSignedUploadUrl(objectPath);

  if (signedError || !signed?.token) {
    throw new Error(
      `Falha ao emitir autorização de upload: ${signedError?.message || "token ausente"}`,
    );
  }

  const row = {
    id: uploadId,
    user_id: userId,
    bucket: normalized.rules.bucket,
    object_path: objectPath,
    category: normalized.category,
    original_name: normalized.originalName,
    declared_mime: normalized.mimeType,
    size_bytes: normalized.sizeBytes,
    status: "PENDING",
    expires_at: expiresAt,
  };

  const { error: insertError } = await db.from("client_case_uploads").insert([row]);
  if (insertError) {
    throw publicUploadError(
      ["42P01", "PGRST205"].includes(insertError.code)
        ? "Execute a migração de governança do dashboard do cliente."
        : `Falha ao registrar upload: ${insertError.message}`,
      ["42P01", "PGRST205"].includes(insertError.code) ? 503 : 500,
    );
  }

  try {
    await auditCaseUpload(db, {
      uploadId,
      userId,
      action: "ISSUED",
      bucket: row.bucket,
      objectPath,
      metadata: {
        category: row.category,
        mime_type: row.declared_mime,
        size_bytes: row.size_bytes,
      },
    });
  } catch (error) {
    await db.from("client_case_uploads").delete().eq("id", uploadId);
    throw error;
  }

  return {
    id: uploadId,
    bucket: row.bucket,
    path: objectPath,
    token: signed.token,
    mime_type: row.declared_mime,
    size_bytes: row.size_bytes,
    original_name: row.original_name,
    category: row.category,
    expires_at: expiresAt,
  };
}

async function objectExists(db, item) {
  const folder = path.posix.dirname(item.object_path);
  const filename = path.posix.basename(item.object_path);
  const { data, error } = await db.storage.from(item.bucket).list(folder, {
    search: filename,
    limit: 10,
  });

  if (error) {
    throw new Error(`Falha ao verificar arquivo armazenado: ${error.message}`);
  }

  const object = (data || []).find((entry) => entry.name === filename);
  if (!object) return false;

  const storedSize = Number(object.metadata?.size || object.metadata?.contentLength || 0);
  if (storedSize && storedSize !== Number(item.size_bytes)) return false;

  return true;
}

export async function resolveCaseUploads(db, userId, uploadIds) {
  const ids = [...new Set((uploadIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    return { attachments: [], videoUrl: null, audioUrl: null, tickets: [] };
  }

  if (ids.length > 7) {
    throw publicUploadError("Quantidade de arquivos superior ao permitido.");
  }

  const { data, error } = await db
    .from("client_case_uploads")
    .select(
      "id, user_id, bucket, object_path, category, original_name, declared_mime, size_bytes, status, expires_at, transcricao",
    )
    .in("id", ids)
    .eq("user_id", userId);

  if (error) {
    throw publicUploadError(
      ["42P01", "PGRST205"].includes(error.code)
        ? "Execute a migração de governança do dashboard do cliente."
        : `Falha ao consultar uploads: ${error.message}`,
      ["42P01", "PGRST205"].includes(error.code) ? 503 : 500,
    );
  }

  if ((data || []).length !== ids.length) {
    throw publicUploadError("Um ou mais uploads não pertencem ao usuário.", 403);
  }

  const now = Date.now();
  const categoryCounts = { ATTACHMENT: 0, VIDEO: 0, AUDIO: 0 };

  for (const item of data) {
    if (item.status !== "PENDING") {
      throw publicUploadError("Um dos arquivos já foi utilizado ou removido.", 409);
    }
    if (new Date(item.expires_at).getTime() <= now) {
      throw publicUploadError("A autorização de um dos arquivos expirou.", 409);
    }
    if (!item.object_path.startsWith(`${userId}/`)) {
      throw publicUploadError("Caminho de armazenamento inválido.", 403);
    }

    categoryCounts[item.category] += 1;
    if (categoryCounts[item.category] > CATEGORY_RULES[item.category].maxCount) {
      throw publicUploadError("Quantidade de arquivos por categoria inválida.");
    }

    if (!(await objectExists(db, item))) {
      throw publicUploadError(
        `O arquivo “${item.original_name}” não foi localizado ou está incompleto.`,
        409,
      );
    }
  }

  const attachments = [];
  let videoUrl = null;
  let audioUrl = null;

  for (const item of data) {
    const {
      data: { publicUrl },
    } = db.storage.from(item.bucket).getPublicUrl(item.object_path);

    const descriptor = {
      name: item.original_name,
      url: publicUrl,
      bucket: item.bucket,
      path: item.object_path,
      mime: item.declared_mime,
      size: Number(item.size_bytes),
    };

    if (item.category === "ATTACHMENT") attachments.push(descriptor);
    if (item.category === "VIDEO") videoUrl = publicUrl;
    if (item.category === "AUDIO") audioUrl = publicUrl;
  }

  return { attachments, videoUrl, audioUrl, tickets: data };
}

export async function attachCaseUploads(db, userId, caseId, tickets) {
  if (!tickets?.length) return;
  const ids = tickets.map((item) => item.id);
  const attachedAt = new Date().toISOString();

  const { error } = await db
    .from("client_case_uploads")
    .update({
      status: "ATTACHED",
      case_id: caseId,
      attached_at: attachedAt,
    })
    .in("id", ids)
    .eq("user_id", userId)
    .eq("status", "PENDING");

  if (error) {
    throw new Error(`Falha ao vincular uploads ao caso: ${error.message}`);
  }

  for (const item of tickets) {
    await auditCaseUpload(db, {
      uploadId: item.id,
      userId,
      action: "ATTACHED",
      bucket: item.bucket,
      objectPath: item.object_path,
      metadata: { case_id: caseId },
    });
  }
}

export async function removeCaseUpload(db, userId, uploadId) {
  const { data, error } = await db
    .from("client_case_uploads")
    .select("id, bucket, object_path, status")
    .eq("id", uploadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar upload: ${error.message}`);
  }
  if (!data) return { removed: false, alreadyMissing: true };
  if (data.status === "ATTACHED") {
    throw publicUploadError("Arquivos já vinculados não podem ser removidos por esta rota.", 409);
  }

  const { error: storageError } = await db.storage
    .from(data.bucket)
    .remove([data.object_path]);
  if (storageError) {
    throw new Error(`Falha ao remover arquivo: ${storageError.message}`);
  }

  await db
    .from("client_case_uploads")
    .update({ status: "REMOVED", removed_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("user_id", userId);

  await auditCaseUpload(db, {
    uploadId,
    userId,
    action: "REMOVED",
    bucket: data.bucket,
    objectPath: data.object_path,
  });

  return { removed: true, alreadyMissing: false };
}

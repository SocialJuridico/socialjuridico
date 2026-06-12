import {
  BANNER_BUCKET,
  json,
  registerBannerAudit,
  removeStoredBanner,
  requireBannerAdmin,
  safeErrorResponse,
  validateMutationOrigin,
} from "../bannerAdminUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILE_TYPES = {
  "image/jpeg": { extension: "jpg", signature: "jpeg" },
  "image/png": { extension: "png", signature: "png" },
  "image/webp": { extension: "webp", signature: "webp" },
  "image/gif": { extension: "gif", signature: "gif" },
};

function matchesSignature(buffer, signature) {
  if (signature === "jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (signature === "png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  if (signature === "webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (signature === "gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }

  return false;
}

function validateFile(file, buffer) {
  if (!file || typeof file.arrayBuffer !== "function") {
    const error = new Error("Nenhum arquivo válido foi enviado.");
    error.status = 400;
    throw error;
  }

  if (!file.size || file.size > MAX_FILE_SIZE) {
    const error = new Error("A imagem deve ter no máximo 5 MB.");
    error.status = 413;
    throw error;
  }

  const type = FILE_TYPES[file.type];
  if (!type) {
    const error = new Error(
      "Formato não permitido. Use JPG, PNG, WebP ou GIF.",
    );
    error.status = 415;
    throw error;
  }

  if (!matchesSignature(buffer, type.signature)) {
    const error = new Error(
      "O conteúdo do arquivo não corresponde ao formato informado.",
    );
    error.status = 415;
    throw error;
  }

  return type;
}

export async function POST(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 512_000) {
      return json(
        { success: false, message: "A imagem deve ter no máximo 5 MB." },
        413,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json(
        { success: false, message: "Nenhum arquivo válido foi enviado." },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = validateFile(file, buffer);
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const storagePath = `banners/${year}/${month}/${crypto.randomUUID()}.${type.extension}`;

    const { error: uploadError } = await access.db.storage
      .from(BANNER_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      const missingBucket = String(uploadError.message || "")
        .toLowerCase()
        .includes("bucket");
      const error = new Error(
        missingBucket
          ? "Execute a migração de governança para criar o bucket de banners."
          : `Falha ao armazenar imagem: ${uploadError.message}`,
      );
      error.status = missingBucket ? 503 : 500;
      throw error;
    }

    const {
      data: { publicUrl },
    } = access.db.storage.from(BANNER_BUCKET).getPublicUrl(storagePath);

    return json(
      {
        success: true,
        data: {
          publicUrl,
          storagePath,
          mimeType: file.type,
          sizeBytes: file.size,
        },
        publicUrl,
        storagePath,
        message: "Imagem enviada com segurança.",
      },
      201,
    );
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível enviar a imagem.");
  }
}

export async function DELETE(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const storagePath = String(body?.storagePath || "").trim();

    if (!storagePath.startsWith("banners/")) {
      return json(
        { success: false, message: "Caminho de armazenamento inválido." },
        400,
      );
    }

    const { count, error: usageError } = await access.db
      .from("admin_banners")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", storagePath);

    if (usageError) {
      throw new Error(`Falha ao validar uso da imagem: ${usageError.message}`);
    }

    if (Number(count || 0) > 0) {
      return json(
        {
          success: false,
          message: "A imagem está vinculada a um banner e não pode ser removida.",
        },
        409,
      );
    }

    const removed = await removeStoredBanner(access.db, storagePath);
    if (!removed) {
      throw new Error("Não foi possível remover a imagem do Storage.");
    }

    try {
      await registerBannerAudit(access.db, {
        bannerId: null,
        adminId: access.auth.admin.id,
        action: "UPLOAD_DELETE",
        reason: "Upload não utilizado removido pelo administrador.",
        snapshot: { storagePath },
      });
    } catch (auditError) {
      console.warn(
        "[Admin/Banners/Upload] Arquivo removido sem auditoria disponível:",
        auditError.message,
      );
    }

    return json({
      success: true,
      message: "Upload não utilizado removido.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível remover a imagem.");
  }
}

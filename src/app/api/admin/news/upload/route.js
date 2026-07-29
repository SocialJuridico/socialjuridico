/**
 * Upload de imagem de capa para matérias da Central de Notícias.
 * Reutiliza o padrão de segurança da rota de banners (validação de assinatura
 * do arquivo, limite de tamanho, verificação de origem) mas usa o guard de
 * notícias (requireNewsAdmin) e o bucket próprio `news`.
 *
 * POST   → envia imagem, retorna { publicUrl, storagePath }
 * DELETE → remove upload órfão (não vinculado a nenhuma matéria)
 */

import { supabaseAdmin } from "@/lib/supabase";
import { jsonResponse, requireNewsAdmin } from "@/lib/news/newsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const NEWS_BUCKET = "news";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
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
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
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
    return { valid: false, status: 400, message: "Nenhum arquivo válido foi enviado." };
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    return { valid: false, status: 413, message: "A imagem deve ter no máximo 5 MB." };
  }
  const type = FILE_TYPES[file.type];
  if (!type) {
    return {
      valid: false,
      status: 415,
      message: "Formato não permitido. Use JPG, PNG, WebP ou GIF.",
    };
  }
  if (!matchesSignature(buffer, type.signature)) {
    return {
      valid: false,
      status: 415,
      message: "O conteúdo do arquivo não corresponde ao formato informado.",
    };
  }
  return { valid: true, type };
}

function db() {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  }
  return supabaseAdmin;
}

// POST /api/admin/news/upload — envia imagem de capa
export async function POST(request) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 512_000) {
      return jsonResponse(
        { success: false, message: "A imagem deve ter no máximo 5 MB." },
        413,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const buffer =
      file && typeof file.arrayBuffer === "function"
        ? Buffer.from(await file.arrayBuffer())
        : null;

    const validation = validateFile(file, buffer);
    if (!validation.valid) {
      return jsonResponse(
        { success: false, message: validation.message },
        validation.status,
      );
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const storagePath = `news/${year}/${month}/${crypto.randomUUID()}.${validation.type.extension}`;

    const { error: uploadError } = await db()
      .storage.from(NEWS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      const missingBucket = String(uploadError.message || "")
        .toLowerCase()
        .includes("bucket");
      return jsonResponse(
        {
          success: false,
          message: missingBucket
            ? "Bucket de notícias inexistente. Crie o bucket público 'news' no Supabase Storage."
            : `Falha ao armazenar imagem: ${uploadError.message}`,
        },
        missingBucket ? 503 : 500,
      );
    }

    const {
      data: { publicUrl },
    } = db().storage.from(NEWS_BUCKET).getPublicUrl(storagePath);

    return jsonResponse(
      {
        success: true,
        data: { publicUrl, storagePath, mimeType: file.type, sizeBytes: file.size },
        publicUrl,
        storagePath,
        message: "Imagem enviada com sucesso.",
      },
      201,
    );
  } catch (error) {
    console.error("[Admin News Upload] Falha no upload:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível enviar a imagem." },
      500,
    );
  }
}

// DELETE /api/admin/news/upload — remove upload órfão
export async function DELETE(request) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const storagePath = String(body?.storagePath || "").trim();

    if (!storagePath.startsWith("news/")) {
      return jsonResponse(
        { success: false, message: "Caminho de armazenamento inválido." },
        400,
      );
    }

    // Segurança: só remove uploads que não estejam em uso por nenhuma matéria.
    const publicUrl = db().storage.from(NEWS_BUCKET).getPublicUrl(storagePath)
      .data.publicUrl;
    const { count } = await db()
      .from("news_articles")
      .select("id", { count: "exact", head: true })
      .eq("cover_image_url", publicUrl);

    if (Number(count || 0) > 0) {
      return jsonResponse(
        {
          success: false,
          message: "A imagem está vinculada a uma matéria e não pode ser removida.",
        },
        409,
      );
    }

    const { error: removeError } = await db()
      .storage.from(NEWS_BUCKET)
      .remove([storagePath]);
    if (removeError) {
      throw new Error(`Não foi possível remover a imagem: ${removeError.message}`);
    }

    return jsonResponse({ success: true, message: "Upload não utilizado removido." });
  } catch (error) {
    console.error("[Admin News Upload] Falha ao remover:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível remover a imagem." },
      500,
    );
  }
}
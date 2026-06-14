import crypto from "node:crypto";

import {
  DOCUMENTATION_BUCKET,
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { slugifyPlatformContent } from "@/lib/platformContent/contentValidation";
import {
  MAX_DOCUMENTATION_PDF_BYTES,
  validateDocumentationPdf,
} from "@/lib/platformContent/documentationAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(value) {
  return String(value || "documentacao.pdf")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, "-")
    .trim()
    .slice(0, 180) || "documentacao.pdf";
}

export async function POST(request) {
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }

    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENTATION_PDF_BYTES + 512_000) {
      return platformJson({ success: false, message: "O PDF deve possuir no máximo 30 MB." }, 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return platformJson({ success: false, message: "Nenhum PDF válido foi enviado." }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateDocumentationPdf(file, buffer);
    if (!validation.success) {
      return platformJson({ success: false, message: validation.message }, validation.status);
    }

    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const { data: duplicate, error: duplicateError } = await access.db
      .from("platform_documentation")
      .select("id, title, status")
      .eq("source_pdf_sha256", hash)
      .is("deleted_at", null)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return platformJson(
        {
          success: false,
          duplicate: true,
          data: duplicate,
          message: "Este PDF já foi enviado para a documentação.",
        },
        409,
      );
    }

    const fileName = safeFileName(file.name);
    const baseTitle = fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "Nova documentação";
    const now = new Date();
    const storagePath = `documentation/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await access.db.storage
      .from(DOCUMENTATION_BUCKET)
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      const error = new Error(`Falha ao armazenar PDF: ${uploadError.message}`);
      error.status = String(uploadError.message || "").toLowerCase().includes("bucket") ? 503 : 500;
      throw error;
    }

    const requestId = getPlatformRequestId(request);
    const slug = `${slugifyPlatformContent(baseTitle)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: document, error: insertError } = await access.db
      .from("platform_documentation")
      .insert([
        {
          slug,
          title: baseTitle.slice(0, 180),
          status: "UPLOADED",
          target_audience: "LAWYER",
          source_pdf_path: storagePath,
          source_pdf_sha256: hash,
          source_file_name: fileName,
          source_mime_type: "application/pdf",
          source_size_bytes: buffer.length,
          created_by: access.admin.id,
          updated_by: access.admin.id,
        },
      ])
      .select("id, slug, title, status, updated_at")
      .single();
    if (insertError) {
      await access.db.storage.from(DOCUMENTATION_BUCKET).remove([storagePath]);
      throw insertError;
    }

    await recordPlatformAudit(access, request, {
      table: "platform_documentation_audit_logs",
      entityColumn: "documentation_id",
      entityId: document.id,
      action: "UPLOAD",
      requestId,
      metadata: {
        file_name: fileName,
        size_bytes: buffer.length,
        sha256: hash,
      },
    });

    return platformJson(
      {
        success: true,
        data: document,
        message: "PDF enviado. A análise da IA pode ser iniciada.",
      },
      201,
    );
  } catch (error) {
    return safePlatformError(error, "Não foi possível enviar o PDF.");
  }
}

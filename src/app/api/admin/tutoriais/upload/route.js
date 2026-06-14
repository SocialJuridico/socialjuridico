import crypto from "node:crypto";

import {
  TUTORIAL_BUCKET,
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import {
  validateTutorialInput,
  validateTutorialVideo,
} from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let storagePath = "";
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const input = {
      title: formData.get("title"),
      description: formData.get("description"),
      audience: formData.get("audience"),
      routeKey: formData.get("routeKey"),
      version: formData.get("version") || 1,
      sortOrder: formData.get("sortOrder") || 0,
      autoOpen: formData.get("autoOpen") !== "false",
    };
    const validation = validateTutorialInput(input);
    if (!validation.success) {
      return platformJson(
        { success: false, message: "Revise os campos informados.", errors: validation.errors },
        400,
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return platformJson({ success: false, message: "Nenhum vídeo válido foi enviado." }, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileValidation = validateTutorialVideo(file, buffer);
    if (!fileValidation.success) {
      return platformJson(
        { success: false, message: fileValidation.message },
        fileValidation.status,
      );
    }

    const now = new Date();
    const publishedAt = now.toISOString();
    storagePath = `tutorials/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${fileValidation.extension}`;
    const { error: uploadError } = await access.db.storage
      .from(TUTORIAL_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      const error = new Error(`Falha ao armazenar vídeo: ${uploadError.message}`);
      error.status = String(uploadError.message || "").toLowerCase().includes("bucket")
        ? 503
        : 500;
      throw error;
    }

    const { error: unpublishError } = await access.db
      .from("platform_tutorials")
      .update({
        status: "DRAFT",
        published_at: null,
        published_by: null,
        updated_by: access.admin.id,
        updated_at: publishedAt,
      })
      .eq("audience", validation.data.audience)
      .eq("route_key", validation.data.route_key)
      .eq("status", "PUBLISHED")
      .is("deleted_at", null);
    if (unpublishError) throw unpublishError;

    const { data: tutorial, error: insertError } = await access.db
      .from("platform_tutorials")
      .insert([
        {
          ...validation.data,
          video_path: storagePath,
          video_mime_type: file.type,
          video_size_bytes: buffer.length,
          status: "PUBLISHED",
          published_at: publishedAt,
          published_by: access.admin.id,
          created_by: access.admin.id,
          updated_by: access.admin.id,
        },
      ])
      .select("*")
      .single();
    if (insertError) {
      await access.db.storage.from(TUTORIAL_BUCKET).remove([storagePath]);
      storagePath = "";
      throw insertError;
    }

    await recordPlatformAudit(access, request, {
      table: "platform_tutorial_audit_logs",
      entityColumn: "tutorial_id",
      entityId: tutorial.id,
      action: "UPLOAD",
      requestId: getPlatformRequestId(request),
      metadata: {
        route_key: tutorial.route_key,
        audience: tutorial.audience,
        status: tutorial.status,
        video_mime_type: file.type,
        video_size_bytes: buffer.length,
      },
    });

    return platformJson(
      {
        success: true,
        data: tutorial,
        message: "Tutorial enviado e publicado.",
      },
      201,
    );
  } catch (error) {
    if (storagePath) {
      const access = await requirePlatformAdmin().catch(() => null);
      if (access?.ok) {
        await access.db.storage.from(TUTORIAL_BUCKET).remove([storagePath]);
      }
    }
    return safePlatformError(error, "Não foi possível enviar o tutorial.");
  }
}

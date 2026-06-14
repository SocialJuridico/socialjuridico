import {
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import {
  isPlatformUuid,
  normalizePlatformText,
  validateTutorialInput,
} from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getTutorial(access, tutorialId) {
  const { data, error } = await access.db
    .from("platform_tutorials")
    .select("*")
    .eq("id", tutorialId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function PATCH(request, context) {
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;
    const { tutorialId } = await context.params;
    if (!isPlatformUuid(tutorialId)) {
      return platformJson({ success: false, message: "Tutorial inválido." }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const current = await getTutorial(access, tutorialId);
    if (!current) return platformJson({ success: false, message: "Tutorial não encontrado." }, 404);
    if (!body.updatedAt || new Date(body.updatedAt).getTime() !== new Date(current.updated_at).getTime()) {
      return platformJson(
        { success: false, conflict: true, message: "O tutorial foi atualizado em outra sessão." },
        409,
      );
    }

    const validation = validateTutorialInput(body, { partial: true });
    if (!validation.success) {
      return platformJson(
        { success: false, message: "Revise os campos informados.", errors: validation.errors },
        400,
      );
    }

    const publishRequested = body.publish;
    const nextAudience = validation.data.audience || current.audience;
    const nextRouteKey = validation.data.route_key || current.route_key;
    if (publishRequested === true) {
      const { error: unpublishError } = await access.db
        .from("platform_tutorials")
        .update({
          status: "DRAFT",
          published_at: null,
          published_by: null,
          updated_by: access.admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq("audience", nextAudience)
        .eq("route_key", nextRouteKey)
        .eq("status", "PUBLISHED")
        .neq("id", tutorialId)
        .is("deleted_at", null);
      if (unpublishError) throw unpublishError;
    }

    const updates = {
      ...validation.data,
      ...(publishRequested === true
        ? {
            status: "PUBLISHED",
            published_at: new Date().toISOString(),
            published_by: access.admin.id,
          }
        : {}),
      ...(publishRequested === false
        ? { status: "DRAFT", published_at: null, published_by: null }
        : {}),
      updated_by: access.admin.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await access.db
      .from("platform_tutorials")
      .update(updates)
      .eq("id", tutorialId)
      .eq("updated_at", current.updated_at)
      .select("*")
      .maybeSingle();
    if (error?.code === "23505") {
      return platformJson(
        { success: false, conflict: true, message: "Já existe um tutorial publicado para esta rota." },
        409,
      );
    }
    if (error) throw error;
    if (!updated) {
      return platformJson(
        { success: false, conflict: true, message: "O tutorial foi atualizado em outra sessão." },
        409,
      );
    }

    const action = publishRequested === true
      ? "PUBLISH"
      : publishRequested === false
        ? "UNPUBLISH"
        : "UPDATE";
    await recordPlatformAudit(access, request, {
      table: "platform_tutorial_audit_logs",
      entityColumn: "tutorial_id",
      entityId: tutorialId,
      action,
      requestId: getPlatformRequestId(request, body),
      metadata: {
        route_key: updated.route_key,
        audience: updated.audience,
        version: updated.version,
      },
    });

    return platformJson({ success: true, data: updated, message: "Tutorial atualizado." });
  } catch (error) {
    return safePlatformError(error, "Não foi possível atualizar o tutorial.");
  }
}

export async function DELETE(request, context) {
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;
    const { tutorialId } = await context.params;
    if (!isPlatformUuid(tutorialId)) {
      return platformJson({ success: false, message: "Tutorial inválido." }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const reason = normalizePlatformText(body.reason, 500);
    if (reason.length < 10) {
      return platformJson(
        { success: false, message: "Informe uma justificativa com pelo menos 10 caracteres." },
        400,
      );
    }
    const current = await getTutorial(access, tutorialId);
    if (!current) return platformJson({ success: false, message: "Tutorial não encontrado." }, 404);

    const { error } = await access.db
      .from("platform_tutorials")
      .update({
        status: "ARCHIVED",
        deleted_at: new Date().toISOString(),
        updated_by: access.admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tutorialId)
      .is("deleted_at", null);
    if (error) throw error;

    await recordPlatformAudit(access, request, {
      table: "platform_tutorial_audit_logs",
      entityColumn: "tutorial_id",
      entityId: tutorialId,
      action: "DELETE",
      requestId: getPlatformRequestId(request, body),
      metadata: { reason, title: current.title, video_path_preserved: true },
    });

    return platformJson({ success: true, message: "Tutorial arquivado com histórico preservado." });
  } catch (error) {
    return safePlatformError(error, "Não foi possível arquivar o tutorial.");
  }
}

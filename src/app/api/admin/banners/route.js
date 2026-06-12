import {
  BANNER_SELECT,
  isValidUuid,
  json,
  normalizeBannerInput,
  registerBannerAudit,
  removeStoredBanner,
  requireBannerAdmin,
  resolveSlotIndex,
  safeErrorResponse,
  validateMutationOrigin,
} from "./bannerAdminUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVED_BANNER_NAME = "ADVOGADO_MES";
const MUTABLE_FIELDS = [
  "name",
  "image_url",
  "link_url",
  "alt_text",
  "position",
  "slot_index",
  "is_active",
  "starts_at",
  "ends_at",
  "storage_path",
  "updated_by",
  "updated_at",
];

function publicationStatus(banner, now = Date.now()) {
  if (!banner.is_active) return "inactive";

  const startsAt = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const endsAt = banner.ends_at ? new Date(banner.ends_at).getTime() : null;

  if (startsAt && startsAt > now) return "scheduled";
  if (endsAt && endsAt <= now) return "expired";
  return "active";
}

function serializeBanner(banner) {
  return {
    ...banner,
    publication_status: publicationStatus(banner),
  };
}

function pickMutableBannerFields(source) {
  return Object.fromEntries(
    MUTABLE_FIELDS.filter((field) => source[field] !== undefined).map((field) => [
      field,
      source[field],
    ]),
  );
}

async function loadBanner(db, id) {
  const { data, error } = await db
    .from("admin_banners")
    .select(BANNER_SELECT)
    .eq("id", id)
    .neq("name", RESERVED_BANNER_NAME)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar banner: ${error.message}`);
  }

  return data || null;
}

async function loadRecentAudit(db) {
  const { data, error } = await db
    .from("admin_banner_audit_logs")
    .select("id, banner_id, admin_id, action, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { available: false, items: [] };
    }
    throw new Error(`Falha ao consultar auditoria: ${error.message}`);
  }

  return { available: true, items: data || [] };
}

export async function GET() {
  try {
    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const [bannersResult, audit] = await Promise.all([
      access.db
        .from("admin_banners")
        .select(BANNER_SELECT)
        .neq("name", RESERVED_BANNER_NAME)
        .order("position", { ascending: true })
        .order("slot_index", { ascending: true })
        .order("created_at", { ascending: true }),
      loadRecentAudit(access.db),
    ]);

    if (bannersResult.error) {
      const migrationMissing = ["42703", "PGRST204"].includes(
        bannersResult.error.code,
      );
      const error = new Error(
        migrationMissing
          ? "Execute a migração de governança dos banners no Supabase."
          : `Falha ao consultar banners: ${bannersResult.error.message}`,
      );
      error.status = migrationMissing ? 503 : 500;
      throw error;
    }

    const banners = (bannersResult.data || []).map(serializeBanner);
    const summary = banners.reduce(
      (accumulator, banner) => {
        accumulator.total += 1;
        accumulator[banner.publication_status] += 1;
        if (banner.position === "right") accumulator.right += 1;
        else accumulator.left += 1;
        return accumulator;
      },
      {
        total: 0,
        active: 0,
        scheduled: 0,
        inactive: 0,
        expired: 0,
        left: 0,
        right: 0,
      },
    );

    return json({
      success: true,
      data: banners,
      summary,
      recentAudit: audit.items,
      auditAvailable: audit.available,
      governance: {
        dedicatedStorageBucket: true,
        scheduledPublishing: true,
        publicHttpsImagesOnly: true,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível carregar os banners.");
  }
}

export async function POST(request) {
  let createdBanner = null;

  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const normalized = normalizeBannerInput(body);

    if (!normalized.ok) {
      return json({ success: false, message: normalized.message }, 400);
    }

    const input = normalized.value;
    const displayMode = input.display_mode === "keep" ? "new" : input.display_mode;
    const slotIndex = await resolveSlotIndex(access.db, {
      position: input.position,
      displayMode,
      targetBannerId: input.target_banner_id,
    });
    const now = new Date().toISOString();
    const payload = {
      id: crypto.randomUUID(),
      name: input.name,
      image_url: input.image_url,
      link_url: input.link_url,
      alt_text: input.alt_text,
      position: input.position,
      slot_index: slotIndex,
      is_active: input.is_active,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      storage_path: input.storage_path,
      created_by: access.auth.admin.id,
      updated_by: access.auth.admin.id,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await access.db
      .from("admin_banners")
      .insert([payload])
      .select(BANNER_SELECT)
      .single();

    if (error) {
      const migrationMissing = ["42703", "PGRST204"].includes(error.code);
      const insertError = new Error(
        migrationMissing
          ? "Execute a migração de governança dos banners no Supabase."
          : `Falha ao criar banner: ${error.message}`,
      );
      insertError.status = migrationMissing ? 503 : 500;
      throw insertError;
    }

    createdBanner = data;

    try {
      await registerBannerAudit(access.db, {
        bannerId: data.id,
        adminId: access.auth.admin.id,
        action: "CREATE",
        snapshot: data,
      });
    } catch (auditError) {
      await access.db.from("admin_banners").delete().eq("id", data.id);
      await removeStoredBanner(access.db, data.storage_path);
      throw auditError;
    }

    return json(
      {
        success: true,
        data: serializeBanner(data),
        message: "Banner criado com sucesso.",
      },
      201,
    );
  } catch (error) {
    if (createdBanner?.storage_path) {
      console.warn(
        "[Admin/Banners][POST] Criação revertida; arquivo tratado pelo rollback.",
      );
    }
    return safeErrorResponse(error, "Não foi possível criar o banner.");
  }
}

export async function PUT(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID do banner inválido." }, 400);
    }

    const existing = await loadBanner(access.db, id);
    if (!existing) {
      return json({ success: false, message: "Banner não encontrado." }, 404);
    }

    const body = await request.json().catch(() => null);
    const normalized = normalizeBannerInput(body);

    if (!normalized.ok) {
      return json({ success: false, message: normalized.message }, 400);
    }

    const input = normalized.value;
    const displayMode =
      input.display_mode === "keep" && input.position !== existing.position
        ? "new"
        : input.display_mode;
    const slotIndex = await resolveSlotIndex(access.db, {
      position: input.position,
      displayMode,
      targetBannerId: input.target_banner_id,
      excludeBannerId: id,
      currentSlotIndex: existing.slot_index,
    });
    const updates = {
      name: input.name,
      image_url: input.image_url,
      link_url: input.link_url,
      alt_text: input.alt_text,
      position: input.position,
      slot_index: slotIndex,
      is_active: input.is_active,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      storage_path: input.storage_path,
      updated_by: access.auth.admin.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await access.db
      .from("admin_banners")
      .update(updates)
      .eq("id", id)
      .neq("name", RESERVED_BANNER_NAME)
      .select(BANNER_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar banner: ${error.message}`);
    }

    if (!data) {
      return json({ success: false, message: "Banner não encontrado." }, 404);
    }

    try {
      await registerBannerAudit(access.db, {
        bannerId: id,
        adminId: access.auth.admin.id,
        action: "UPDATE",
        snapshot: existing,
        changes: updates,
      });
    } catch (auditError) {
      await access.db
        .from("admin_banners")
        .update(pickMutableBannerFields(existing))
        .eq("id", id);

      if (data.storage_path && data.storage_path !== existing.storage_path) {
        await removeStoredBanner(access.db, data.storage_path);
      }
      throw auditError;
    }

    if (existing.storage_path && existing.storage_path !== data.storage_path) {
      await removeStoredBanner(access.db, existing.storage_path);
    }

    return json({
      success: true,
      data: serializeBanner(data),
      message: "Banner atualizado com sucesso.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível atualizar o banner.");
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID do banner inválido." }, 400);
    }

    const body = await request.json().catch(() => null);
    if (typeof body?.is_active !== "boolean") {
      return json(
        { success: false, message: "Estado de publicação inválido." },
        400,
      );
    }

    const existing = await loadBanner(access.db, id);
    if (!existing) {
      return json({ success: false, message: "Banner não encontrado." }, 404);
    }

    const updates = {
      is_active: body.is_active,
      updated_by: access.auth.admin.id,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await access.db
      .from("admin_banners")
      .update(updates)
      .eq("id", id)
      .neq("name", RESERVED_BANNER_NAME)
      .select(BANNER_SELECT)
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        `Falha ao alterar publicação: ${error?.message || "banner não encontrado"}`,
      );
    }

    try {
      await registerBannerAudit(access.db, {
        bannerId: id,
        adminId: access.auth.admin.id,
        action: "UPDATE",
        snapshot: existing,
        changes: updates,
      });
    } catch (auditError) {
      await access.db
        .from("admin_banners")
        .update({
          is_active: existing.is_active,
          updated_by: existing.updated_by,
          updated_at: existing.updated_at,
        })
        .eq("id", id);
      throw auditError;
    }

    return json({
      success: true,
      data: serializeBanner(data),
      message: body.is_active ? "Banner ativado." : "Banner pausado.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível alterar a publicação.");
  }
}

export async function DELETE(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID do banner inválido." }, 400);
    }

    const existing = await loadBanner(access.db, id);
    if (!existing) {
      return json({ success: false, message: "Banner não encontrado." }, 404);
    }

    const body = await request.json().catch(() => null);
    const reason = String(body?.reason || "").trim().slice(0, 1000);

    if (reason.length < 10) {
      return json(
        {
          success: false,
          message: "Informe uma justificativa com pelo menos 10 caracteres.",
        },
        400,
      );
    }

    const { data, error } = await access.db.rpc("delete_admin_banner", {
      p_banner_id: id,
      p_admin_id: access.auth.admin.id,
      p_reason: reason,
    });

    if (error) {
      const migrationMissing = ["42883", "PGRST202"].includes(error.code);
      const deleteError = new Error(
        migrationMissing
          ? "Execute a migração de governança dos banners no Supabase."
          : `Falha ao excluir banner: ${error.message}`,
      );
      deleteError.status = migrationMissing ? 503 : 500;
      throw deleteError;
    }

    if (!data?.deleted) {
      return json({ success: false, message: "Banner não encontrado." }, 404);
    }

    const storageRemoved = await removeStoredBanner(
      access.db,
      data.storagePath,
    );

    return json({
      success: true,
      message: "Banner excluído com sucesso.",
      data: {
        bannerId: id,
        storageRemoved,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível excluir o banner.");
  }
}

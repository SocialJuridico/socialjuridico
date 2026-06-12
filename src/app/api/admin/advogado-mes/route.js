import {
  BANNER_BUCKET,
  BANNER_SELECT,
  json,
  registerBannerAudit,
  removeStoredBanner,
  requireBannerAdmin,
  safeErrorResponse,
  validateMutationOrigin,
} from "../banners/bannerAdminUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVED_NAME = "ADVOGADO_MES";
const LEGACY_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const DEDICATED_STORAGE_PREFIX = "banners/advogado-mes/";

function normalizeHttpsUrl(value, { required = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return required ? null : "";

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeDestination(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw.slice(0, 1000);
  }

  return normalizeHttpsUrl(raw);
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isLegacyStatus(value) {
  return LEGACY_STATUSES.has(String(value || "").trim().toUpperCase());
}

function conflictError(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function assertCurrentVersion(existing, expectedUpdatedAt) {
  if (!existing?.updated_at) return;

  const expected = normalizeDate(expectedUpdatedAt);
  const current = normalizeDate(existing.updated_at);

  if (!expected || expected !== current) {
    throw conflictError(
      "A configuração foi alterada por outro administrador. Atualize a página antes de salvar novamente.",
    );
  }
}

async function validateStorageBinding(db, input, existing) {
  if (!input.storage_path) return;

  const reusingCurrentPath =
    Boolean(existing?.storage_path) && input.storage_path === existing.storage_path;

  if (!reusingCurrentPath && !input.storage_path.startsWith(DEDICATED_STORAGE_PREFIX)) {
    const error = new Error(
      "Novos arquivos do Advogado do Mês devem usar o armazenamento dedicado.",
    );
    error.status = 400;
    throw error;
  }

  const {
    data: { publicUrl },
  } = db.storage.from(BANNER_BUCKET).getPublicUrl(input.storage_path);
  const expectedUrl = normalizeHttpsUrl(publicUrl, { required: true });

  if (!expectedUrl || expectedUrl !== input.image_url) {
    const error = new Error(
      "A URL da imagem não corresponde ao arquivo informado no Storage.",
    );
    error.status = 400;
    throw error;
  }
}

function normalizeInput(body) {
  const imageUrl = normalizeHttpsUrl(body?.image_url, { required: true });
  const destination = normalizeDestination(body?.link_url);
  const altText = String(body?.alt_text || "")
    .trim()
    .slice(0, 240);
  const startsAt = normalizeDate(body?.starts_at);
  const endsAt = normalizeDate(body?.ends_at);
  const storagePath = String(body?.storage_path || "").trim().slice(0, 500) || null;

  if (!imageUrl) {
    return { ok: false, message: "Informe uma imagem válida usando HTTPS." };
  }

  if (!altText) {
    return {
      ok: false,
      message: "Informe um texto alternativo para a imagem.",
    };
  }

  if (body?.link_url && !destination) {
    return {
      ok: false,
      message: "O destino deve ser uma URL HTTPS ou uma rota interna iniciada por /.",
    };
  }

  if (startsAt === undefined || endsAt === undefined) {
    return { ok: false, message: "Período de publicação inválido." };
  }

  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return {
      ok: false,
      message: "A data final deve ser posterior à data inicial.",
    };
  }

  if (storagePath && !storagePath.startsWith("banners/")) {
    return {
      ok: false,
      message: "Caminho de armazenamento do destaque inválido.",
    };
  }

  return {
    ok: true,
    value: {
      name: RESERVED_NAME,
      image_url: imageUrl,
      link_url: destination,
      alt_text: altText,
      position: "left",
      slot_index: 0,
      is_active: body?.is_active === true,
      starts_at: startsAt,
      ends_at: endsAt,
      storage_path: storagePath,
    },
  };
}

function publicationStatus(banner, now = Date.now()) {
  if (!banner) return "missing";
  if (!banner.is_active) return "inactive";

  const startsAt = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const endsAt = banner.ends_at ? new Date(banner.ends_at).getTime() : null;

  if (startsAt && startsAt > now) return "scheduled";
  if (endsAt && endsAt <= now) return "expired";
  return "active";
}

function serializeBanner(banner) {
  if (!banner) return null;

  const legacyStatus = String(banner.link_url || "").trim().toUpperCase();
  const legacy = LEGACY_STATUSES.has(legacyStatus);
  const normalized = {
    ...banner,
    link_url: legacy ? null : banner.link_url,
    is_active: legacy ? legacyStatus === "ACTIVE" : banner.is_active !== false,
  };

  return {
    ...normalized,
    publication_status: publicationStatus(normalized),
  };
}

async function loadReservedBanner(db) {
  const { data, error } = await db
    .from("admin_banners")
    .select(BANNER_SELECT)
    .eq("name", RESERVED_NAME)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const migrationMissing = ["42703", "PGRST204"].includes(error.code);
    const loadError = new Error(
      migrationMissing
        ? "Execute as migrações de governança dos banners no Supabase."
        : `Falha ao consultar o destaque: ${error.message}`,
    );
    loadError.status = migrationMissing ? 503 : 500;
    throw loadError;
  }

  return data || null;
}

async function loadRecentAudit(db, bannerId) {
  let query = db
    .from("admin_banner_audit_logs")
    .select("id, banner_id, admin_id, action, reason, changes, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  query = query.eq("banner_id", bannerId || EMPTY_UUID);
  const { data, error } = await query;

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { available: false, items: [] };
    }
    throw new Error(`Falha ao consultar auditoria: ${error.message}`);
  }

  return { available: true, items: bannerId ? data || [] : [] };
}

function mutableSnapshot(banner) {
  return {
    image_url: banner.image_url,
    link_url: banner.link_url,
    alt_text: banner.alt_text,
    position: banner.position,
    slot_index: banner.slot_index,
    is_active: banner.is_active,
    starts_at: banner.starts_at,
    ends_at: banner.ends_at,
    storage_path: banner.storage_path,
    updated_by: banner.updated_by,
    updated_at: banner.updated_at,
  };
}

export async function GET() {
  try {
    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const banner = await loadReservedBanner(access.db);
    const audit = await loadRecentAudit(access.db, banner?.id);

    return json({
      success: true,
      data: serializeBanner(banner),
      recentAudit: audit.items,
      auditAvailable: audit.available,
      governance: {
        dedicatedEndpoint: true,
        reservedRecord: true,
        dedicatedStorage: true,
        scheduledPublishing: true,
        publicDataMinimized: true,
        optimisticConcurrency: true,
        storageBinding: true,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível carregar o Advogado do Mês.");
  }
}

export async function PUT(request) {
  let createdBanner = null;

  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const normalized = normalizeInput(body);
    if (!normalized.ok) {
      return json({ success: false, message: normalized.message }, 400);
    }

    const existing = await loadReservedBanner(access.db);
    if (existing) assertCurrentVersion(existing, body?.updated_at);
    await validateStorageBinding(access.db, normalized.value, existing);

    const now = new Date().toISOString();
    const payload = {
      ...normalized.value,
      updated_by: access.auth.admin.id,
      updated_at: now,
    };

    if (!existing) {
      const createPayload = {
        id: crypto.randomUUID(),
        ...payload,
        created_by: access.auth.admin.id,
        created_at: now,
      };

      const { data, error } = await access.db
        .from("admin_banners")
        .insert([createPayload])
        .select(BANNER_SELECT)
        .single();

      if (error) {
        const conflict = error.code === "23505";
        const createError = new Error(
          conflict
            ? "O registro reservado já existe. Atualize a página e tente novamente."
            : `Falha ao criar o destaque: ${error.message}`,
        );
        createError.status = conflict ? 409 : 500;
        throw createError;
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
          message: "Advogado do Mês configurado com sucesso.",
        },
        201,
      );
    }

    const existingNormalized = serializeBanner(existing);
    let updateQuery = access.db
      .from("admin_banners")
      .update(payload)
      .eq("id", existing.id)
      .eq("name", RESERVED_NAME);

    if (existing.updated_at) {
      updateQuery = updateQuery.eq("updated_at", existing.updated_at);
    }

    const { data, error } = await updateQuery
      .select(BANNER_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar o destaque: ${error.message}`);
    }

    if (!data) {
      throw conflictError(
        "A configuração mudou durante a edição. Atualize a página e tente novamente.",
      );
    }

    try {
      await registerBannerAudit(access.db, {
        bannerId: existing.id,
        adminId: access.auth.admin.id,
        action: "UPDATE",
        snapshot: existingNormalized,
        changes: payload,
      });
    } catch (auditError) {
      let rollbackQuery = access.db
        .from("admin_banners")
        .update(mutableSnapshot(existing))
        .eq("id", existing.id);

      if (data.updated_at) rollbackQuery = rollbackQuery.eq("updated_at", data.updated_at);
      await rollbackQuery;

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
      message: "Configuração atualizada com sucesso.",
    });
  } catch (error) {
    if (createdBanner?.storage_path) {
      console.warn(
        "[Admin/AdvogadoMes] Criação revertida; arquivo tratado pelo rollback.",
      );
    }
    return safeErrorResponse(error, "Não foi possível salvar o Advogado do Mês.");
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireBannerAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    if (typeof body?.is_active !== "boolean") {
      return json({ success: false, message: "Estado de publicação inválido." }, 400);
    }

    const existing = await loadReservedBanner(access.db);
    if (!existing) {
      return json(
        {
          success: false,
          message: "Configure uma imagem antes de alterar a publicação.",
        },
        404,
      );
    }

    assertCurrentVersion(existing, body?.updated_at);

    const legacyLinkStatus = isLegacyStatus(existing.link_url);
    const updates = {
      is_active: body.is_active,
      ...(legacyLinkStatus ? { link_url: null } : {}),
      updated_by: access.auth.admin.id,
      updated_at: new Date().toISOString(),
    };

    let updateQuery = access.db
      .from("admin_banners")
      .update(updates)
      .eq("id", existing.id)
      .eq("name", RESERVED_NAME);

    if (existing.updated_at) {
      updateQuery = updateQuery.eq("updated_at", existing.updated_at);
    }

    const { data, error } = await updateQuery
      .select(BANNER_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao alterar a publicação: ${error.message}`);
    }

    if (!data) {
      throw conflictError(
        "A configuração mudou durante a operação. Atualize a página e tente novamente.",
      );
    }

    try {
      await registerBannerAudit(access.db, {
        bannerId: existing.id,
        adminId: access.auth.admin.id,
        action: "UPDATE",
        snapshot: serializeBanner(existing),
        changes: updates,
      });
    } catch (auditError) {
      let rollbackQuery = access.db
        .from("admin_banners")
        .update({
          is_active: existing.is_active,
          ...(legacyLinkStatus ? { link_url: existing.link_url } : {}),
          updated_by: existing.updated_by,
          updated_at: existing.updated_at,
        })
        .eq("id", existing.id);

      if (data.updated_at) rollbackQuery = rollbackQuery.eq("updated_at", data.updated_at);
      await rollbackQuery;
      throw auditError;
    }

    return json({
      success: true,
      data: serializeBanner(data),
      message: body.is_active ? "Popup ativado." : "Popup pausado.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível alterar a publicação.");
  }
}

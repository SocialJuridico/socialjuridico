import {
  COUPON_SELECT,
  json,
  loadRecentCouponAudit,
  normalizeCouponInput,
  registerCouponAudit,
  requireCouponAdmin,
  safeErrorResponse,
  serializeCoupon,
  validateMutationOrigin,
} from "./couponAdminUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function assertCurrentVersion(existing, expectedUpdatedAt) {
  if (!existing.updated_at) return;

  const expected = safeIso(expectedUpdatedAt);
  const current = safeIso(existing.updated_at);

  if (!expected || !current || expected !== current) {
    const error = new Error(
      "Este cupom foi alterado por outro administrador. Atualize a página antes de continuar.",
    );
    error.status = 409;
    throw error;
  }
}

async function loadCoupon(db, id) {
  const { data, error } = await db
    .from("cupons")
    .select(COUPON_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const missingMigration = ["42703", "PGRST204"].includes(error.code);
    const loadError = new Error(
      missingMigration
        ? "Execute a migração de governança dos cupons."
        : `Falha ao consultar cupom: ${error.message}`,
    );
    loadError.status = missingMigration ? 503 : 500;
    throw loadError;
  }

  if (!data) {
    const notFound = new Error("Cupom não encontrado.");
    notFound.status = 404;
    throw notFound;
  }

  return data;
}

async function assertCodeAvailable(db, codigo, excludeId = null) {
  let query = db
    .from("cupons")
    .select("id")
    .eq("codigo", codigo)
    .is("archived_at", null)
    .limit(1);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao validar código: ${error.message}`);

  if (data?.length) {
    const conflict = new Error("Já existe um cupom ativo com este código.");
    conflict.status = 409;
    throw conflict;
  }
}

async function assertUsageLimit(db, couponId, limit) {
  if (limit === null || limit === undefined) return;

  const { count, error } = await db
    .from("cupom_usos")
    .select("id", { count: "exact", head: true })
    .eq("cupom_id", couponId);

  if (error) throw new Error(`Falha ao consultar utilizações: ${error.message}`);

  if (Number(limit) < Number(count || 0)) {
    const conflict = new Error(
      `O limite total não pode ser menor que os ${count || 0} usos já registrados.`,
    );
    conflict.status = 409;
    throw conflict;
  }
}

export async function GET() {
  try {
    const access = await requireCouponAdmin();
    if (!access.ok) return access.response;

    const [{ data, error }, audit] = await Promise.all([
      access.db.rpc("get_admin_coupon_overview"),
      loadRecentCouponAudit(access.db),
    ]);

    if (error) {
      const migrationMissing = ["PGRST202", "42883"].includes(error.code);
      const overviewError = new Error(
        migrationMissing
          ? "Execute a migração de governança dos cupons."
          : `Falha ao carregar cupons: ${error.message}`,
      );
      overviewError.status = migrationMissing ? 503 : 500;
      throw overviewError;
    }

    const coupons = (data || []).map(serializeCoupon);
    const summary = coupons.reduce(
      (acc, coupon) => {
        acc.total += 1;
        acc[coupon.publication_status] =
          Number(acc[coupon.publication_status] || 0) + 1;
        acc.totalUses += coupon.total_usos;
        acc.activeReservations += coupon.reservas_ativas;
        return acc;
      },
      {
        total: 0,
        active: 0,
        scheduled: 0,
        inactive: 0,
        expired: 0,
        exhausted: 0,
        archived: 0,
        totalUses: 0,
        activeReservations: 0,
      },
    );

    return json({
      success: true,
      data: coupons,
      summary,
      recentAudit: audit.items,
      auditAvailable: audit.available,
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível carregar os cupons.");
  }
}

export async function POST(request) {
  let createdCouponId = null;

  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCouponAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const normalized = normalizeCouponInput(body);
    if (!normalized.ok) {
      return json({ success: false, message: normalized.message }, 400);
    }

    const input = normalized.value;
    if (input.expira_em && new Date(input.expira_em) <= new Date()) {
      return json(
        { success: false, message: "A validade do novo cupom deve estar no futuro." },
        400,
      );
    }

    await assertCodeAvailable(access.db, input.codigo);

    const now = new Date().toISOString();
    const payload = {
      ...input,
      id: crypto.randomUUID(),
      stripe_coupon_id: null,
      created_by: access.auth.admin.id,
      updated_by: access.auth.admin.id,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await access.db
      .from("cupons")
      .insert([payload])
      .select(COUPON_SELECT)
      .single();

    if (error) {
      const conflict = error.code === "23505";
      const createError = new Error(
        conflict
          ? "Já existe um cupom ativo com este código."
          : `Falha ao salvar cupom: ${error.message}`,
      );
      createError.status = conflict ? 409 : 500;
      throw createError;
    }

    createdCouponId = data.id;

    try {
      await registerCouponAudit(access.db, {
        couponId: data.id,
        adminId: access.auth.admin.id,
        action: "CREATE",
        snapshot: data,
      });
    } catch (auditError) {
      await access.db.from("cupons").delete().eq("id", data.id);
      throw auditError;
    }

    return json(
      {
        success: true,
        data: serializeCoupon(data),
        message: "Cupom criado com sucesso.",
      },
      201,
    );
  } catch (error) {
    if (createdCouponId) {
      console.warn("[Admin/Cupons] Criação revertida:", createdCouponId);
    }
    return safeErrorResponse(error, "Não foi possível criar o cupom.");
  }
}

export async function PUT(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCouponAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!id) {
      return json({ success: false, message: "Identificador do cupom ausente." }, 400);
    }

    const normalized = normalizeCouponInput(body);
    if (!normalized.ok) {
      return json({ success: false, message: normalized.message }, 400);
    }

    const existing = await loadCoupon(access.db, id);
    if (existing.archived_at) {
      return json(
        { success: false, message: "Cupons arquivados não podem ser editados." },
        409,
      );
    }

    assertCurrentVersion(existing, body?.updated_at);
    await assertCodeAvailable(access.db, normalized.value.codigo, id);
    await assertUsageLimit(access.db, id, normalized.value.limite_total);

    if (
      normalized.value.ativo &&
      normalized.value.expira_em &&
      new Date(normalized.value.expira_em) <= new Date()
    ) {
      return json(
        { success: false, message: "Atualize a validade antes de ativar o cupom." },
        409,
      );
    }

    const now = new Date().toISOString();
    const updates = {
      ...normalized.value,
      stripe_coupon_id: null,
      updated_by: access.auth.admin.id,
      updated_at: now,
    };

    let updateQuery = access.db
      .from("cupons")
      .update(updates)
      .eq("id", id)
      .is("archived_at", null);

    if (existing.updated_at) updateQuery = updateQuery.eq("updated_at", existing.updated_at);

    const { data, error } = await updateQuery.select(COUPON_SELECT).maybeSingle();
    if (error) throw new Error(`Falha ao atualizar cupom: ${error.message}`);

    if (!data) {
      const conflict = new Error(
        "O cupom mudou durante a edição. Atualize a página e tente novamente.",
      );
      conflict.status = 409;
      throw conflict;
    }

    try {
      await registerCouponAudit(access.db, {
        couponId: id,
        adminId: access.auth.admin.id,
        action: "UPDATE",
        reason: "Regras comerciais internas atualizadas.",
        snapshot: existing,
        changes: updates,
      });
    } catch (auditError) {
      await access.db
        .from("cupons")
        .update({
          codigo: existing.codigo,
          tipo: existing.tipo,
          desconto_tipo: existing.desconto_tipo,
          valor: existing.valor,
          limite_por_usuario: existing.limite_por_usuario,
          limite_total: existing.limite_total,
          starts_at: existing.starts_at,
          expira_em: existing.expira_em,
          ativo: existing.ativo,
          description: existing.description,
          stripe_coupon_id: existing.stripe_coupon_id,
          updated_by: existing.updated_by,
          updated_at: existing.updated_at,
        })
        .eq("id", id)
        .eq("updated_at", data.updated_at);
      throw auditError;
    }

    return json({
      success: true,
      data: serializeCoupon(data),
      message: "Cupom atualizado com sucesso.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível atualizar o cupom.");
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCouponAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!id || typeof body?.ativo !== "boolean") {
      return json({ success: false, message: "Estado de publicação inválido." }, 400);
    }

    const existing = await loadCoupon(access.db, id);
    if (existing.archived_at) {
      return json(
        { success: false, message: "Cupons arquivados não podem ser reativados." },
        409,
      );
    }

    assertCurrentVersion(existing, body?.updated_at);

    if (body.ativo && existing.expira_em && new Date(existing.expira_em) <= new Date()) {
      return json(
        { success: false, message: "Atualize a validade antes de ativar o cupom." },
        409,
      );
    }

    const updates = {
      ativo: body.ativo,
      updated_by: access.auth.admin.id,
      updated_at: new Date().toISOString(),
    };

    let updateQuery = access.db
      .from("cupons")
      .update(updates)
      .eq("id", id)
      .is("archived_at", null);

    if (existing.updated_at) updateQuery = updateQuery.eq("updated_at", existing.updated_at);

    const { data, error } = await updateQuery.select(COUPON_SELECT).maybeSingle();
    if (error) throw new Error(`Falha ao alterar cupom: ${error.message}`);

    if (!data) {
      const conflict = new Error(
        "O cupom mudou durante a operação. Atualize a página e tente novamente.",
      );
      conflict.status = 409;
      throw conflict;
    }

    try {
      await registerCouponAudit(access.db, {
        couponId: id,
        adminId: access.auth.admin.id,
        action: body.ativo ? "ACTIVATE" : "PAUSE",
        snapshot: existing,
        changes: updates,
      });
    } catch (auditError) {
      await access.db
        .from("cupons")
        .update({
          ativo: existing.ativo,
          updated_by: existing.updated_by,
          updated_at: existing.updated_at,
        })
        .eq("id", id)
        .eq("updated_at", data.updated_at);
      throw auditError;
    }

    return json({
      success: true,
      data: serializeCoupon(data),
      message: body.ativo ? "Cupom ativado." : "Cupom pausado.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível alterar o cupom.");
  }
}

export async function DELETE(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCouponAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const id = String(body?.id || "").trim();
    const reason = String(body?.reason || "").trim();

    if (!id) {
      return json({ success: false, message: "Identificador do cupom ausente." }, 400);
    }

    if (reason.length < 10) {
      return json(
        {
          success: false,
          message: "Informe uma justificativa com pelo menos 10 caracteres.",
        },
        400,
      );
    }

    const existing = await loadCoupon(access.db, id);
    if (existing.archived_at) {
      return json({ success: true, message: "Cupom já estava arquivado." });
    }

    assertCurrentVersion(existing, body?.updated_at);

    const updates = {
      ativo: false,
      archived_at: new Date().toISOString(),
      archived_by: access.auth.admin.id,
      archive_reason: reason,
      updated_by: access.auth.admin.id,
      updated_at: new Date().toISOString(),
      stripe_coupon_id: null,
    };

    let updateQuery = access.db.from("cupons").update(updates).eq("id", id);
    if (existing.updated_at) updateQuery = updateQuery.eq("updated_at", existing.updated_at);

    const { data, error } = await updateQuery.select(COUPON_SELECT).maybeSingle();
    if (error) throw new Error(`Falha ao arquivar cupom: ${error.message}`);

    if (!data) {
      const conflict = new Error(
        "O cupom mudou durante a operação. Atualize a página e tente novamente.",
      );
      conflict.status = 409;
      throw conflict;
    }

    try {
      await registerCouponAudit(access.db, {
        couponId: id,
        adminId: access.auth.admin.id,
        action: "ARCHIVE",
        reason,
        snapshot: existing,
        changes: updates,
      });
    } catch (auditError) {
      await access.db
        .from("cupons")
        .update({
          ativo: existing.ativo,
          archived_at: existing.archived_at,
          archived_by: existing.archived_by,
          archive_reason: existing.archive_reason,
          stripe_coupon_id: existing.stripe_coupon_id,
          updated_by: existing.updated_by,
          updated_at: existing.updated_at,
        })
        .eq("id", id)
        .eq("updated_at", data.updated_at);
      throw auditError;
    }

    return json({
      success: true,
      data: serializeCoupon(data),
      message: "Cupom arquivado com sucesso.",
    });
  } catch (error) {
    return safeErrorResponse(error, "Não foi possível arquivar o cupom.");
  }
}

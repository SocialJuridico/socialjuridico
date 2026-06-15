import {
  isValidUuid,
  json,
  normalizeText,
  requireAdminCommunicationAccess,
} from "../communication/adminCommunication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTICE_SELECT =
  "id, title, message, cta_label, cta_url, severity, is_active, starts_at, ends_at, created_at, updated_at";
const SEVERITIES = new Set(["INFO", "SUCCESS", "WARNING", "CRITICAL"]);

function parseNullableDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeNoticePayload(body, partial = false) {
  const payload = {};

  if (!partial || body?.title !== undefined) {
    const title = normalizeText(body?.title, 90);
    if (!title) return { ok: false, message: "Informe o titulo do aviso." };
    payload.title = title;
  }

  if (!partial || body?.message !== undefined) {
    const message = normalizeText(body?.message, 700);
    if (!message) return { ok: false, message: "Informe a mensagem do aviso." };
    payload.message = message;
  }

  if (!partial || body?.severity !== undefined) {
    const severity = String(body?.severity || "INFO").trim().toUpperCase();
    if (!SEVERITIES.has(severity)) {
      return { ok: false, message: "Tipo de aviso invalido." };
    }
    payload.severity = severity;
  }

  if (!partial || body?.cta_label !== undefined) {
    payload.cta_label = normalizeText(body?.cta_label, 40) || null;
  }

  if (!partial || body?.cta_url !== undefined) {
    const ctaUrl = normalizeText(body?.cta_url, 300);
    payload.cta_url = ctaUrl || null;
    if (
      payload.cta_url &&
      !payload.cta_url.startsWith("/") &&
      !/^https?:\/\//i.test(payload.cta_url)
    ) {
      return { ok: false, message: "Link do botao deve ser uma URL ou rota interna." };
    }
  }

  if (!partial || body?.is_active !== undefined) {
    payload.is_active = body?.is_active !== false;
  }

  if (!partial || body?.starts_at !== undefined) {
    const startsAt = parseNullableDate(body?.starts_at);
    if (startsAt === undefined) {
      return { ok: false, message: "Data inicial invalida." };
    }
    payload.starts_at = startsAt;
  }

  if (!partial || body?.ends_at !== undefined) {
    const endsAt = parseNullableDate(body?.ends_at);
    if (endsAt === undefined) {
      return { ok: false, message: "Data final invalida." };
    }
    if (!endsAt) {
      return { ok: false, message: "Informe ate quando o aviso sera mostrado." };
    }
    payload.ends_at = endsAt;
  }

  const starts = payload.starts_at ? new Date(payload.starts_at).getTime() : null;
  const ends = payload.ends_at ? new Date(payload.ends_at).getTime() : null;
  if (starts && ends && ends <= starts) {
    return { ok: false, message: "Data final deve ser posterior a data inicial." };
  }

  return { ok: true, payload };
}

function serializeNotice(row) {
  if (!row) return null;
  const now = Date.now();
  const starts = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const ends = row.ends_at ? new Date(row.ends_at).getTime() : null;
  const activeNow =
    row.is_active !== false &&
    (!starts || starts <= now) &&
    (!ends || ends >= now);

  return {
    ...row,
    activeNow,
    expired: Boolean(ends && ends < now),
    scheduled: Boolean(starts && starts > now),
  };
}

export async function GET() {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("platform_internal_notices")
      .select(NOTICE_SELECT)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return json({
      success: true,
      notices: (data || []).map(serializeNotice),
    });
  } catch (error) {
    console.error("[Admin/AvisosInternos][GET] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel carregar os avisos." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const validation = normalizeNoticePayload(body);
    if (!validation.ok) {
      return json({ success: false, message: validation.message }, 400);
    }

    const { data, error } = await access.db
      .from("platform_internal_notices")
      .insert([
        {
          ...validation.payload,
          created_by: access.auth.user.id,
          updated_by: access.auth.user.id,
        },
      ])
      .select(NOTICE_SELECT)
      .maybeSingle();

    if (error) throw error;

    return json({
      success: true,
      message: "Aviso cadastrado com sucesso.",
      notice: serializeNotice(data),
    });
  } catch (error) {
    console.error("[Admin/AvisosInternos][POST] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel cadastrar o aviso." },
      500,
    );
  }
}

export async function PUT(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!isValidUuid(id)) {
      return json({ success: false, message: "Aviso invalido." }, 400);
    }

    const validation = normalizeNoticePayload(body, true);
    if (!validation.ok) {
      return json({ success: false, message: validation.message }, 400);
    }

    const { data, error } = await access.db
      .from("platform_internal_notices")
      .update({
        ...validation.payload,
        updated_by: access.auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(NOTICE_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ success: false, message: "Aviso nao encontrado." }, 404);

    return json({
      success: true,
      message: "Aviso atualizado com sucesso.",
      notice: serializeNotice(data),
    });
  } catch (error) {
    console.error("[Admin/AvisosInternos][PUT] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel atualizar o aviso." },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const id = new URL(request.url).searchParams.get("id");
    if (!isValidUuid(id)) {
      return json({ success: false, message: "Aviso invalido." }, 400);
    }

    const { error } = await access.db
      .from("platform_internal_notices")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return json({ success: true, message: "Aviso apagado com sucesso." });
  } catch (error) {
    console.error("[Admin/AvisosInternos][DELETE] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel apagar o aviso." },
      500,
    );
  }
}

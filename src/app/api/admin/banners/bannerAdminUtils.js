import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const BANNER_BUCKET = "admin-banners";
export const BANNER_SELECT =
  "id, name, image_url, link_url, alt_text, position, slot_index, is_active, starts_at, ends_at, storage_path, created_by, updated_by, created_at, updated_at";
export const RESERVED_BANNER_NAMES = new Set(["ADVOGADO_MES"]);

const ALLOWED_POSITIONS = new Set(["left", "right"]);
const ALLOWED_DISPLAY_MODES = new Set(["keep", "new", "loop"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function isValidUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

export function isReservedBannerName(value) {
  return RESERVED_BANNER_NAMES.has(String(value || "").trim().toUpperCase());
}

export function validateMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

export async function requireBannerAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

function normalizeHttpsUrl(value, { required = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return required ? null : "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeLinkUrl(value) {
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
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function normalizeBannerInput(body) {
  const name = String(body?.name || "").trim().slice(0, 120);
  const imageUrl = normalizeHttpsUrl(body?.image_url, { required: true });
  const linkUrl = normalizeLinkUrl(body?.link_url);
  const altText = String(body?.alt_text || name).trim().slice(0, 240);
  const position = String(body?.position || "left").trim().toLowerCase();
  const displayMode = String(body?.display_mode || "new").trim().toLowerCase();
  const targetBannerId = String(body?.target_banner_id || "").trim();
  const startsAt = normalizeDate(body?.starts_at);
  const endsAt = normalizeDate(body?.ends_at);
  const storagePath = String(body?.storage_path || "").trim().slice(0, 500) || null;

  if (!name || !imageUrl) {
    return { ok: false, message: "Nome e imagem HTTPS são obrigatórios." };
  }

  if (isReservedBannerName(name)) {
    return {
      ok: false,
      message: "Este nome é reservado para uma funcionalidade interna do sistema.",
    };
  }

  if (body?.link_url && !linkUrl) {
    return {
      ok: false,
      message: "O link deve ser uma URL HTTPS ou uma rota interna iniciada por /.",
    };
  }

  if (!ALLOWED_POSITIONS.has(position)) {
    return { ok: false, message: "Posição do banner inválida." };
  }

  if (!ALLOWED_DISPLAY_MODES.has(displayMode)) {
    return { ok: false, message: "Comportamento de exibição inválido." };
  }

  if (displayMode === "loop" && !isValidUuid(targetBannerId)) {
    return {
      ok: false,
      message: "Selecione um banner válido para o bloco de rotação.",
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
    return { ok: false, message: "Caminho de armazenamento inválido." };
  }

  return {
    ok: true,
    value: {
      name,
      image_url: imageUrl,
      link_url: linkUrl,
      alt_text: altText || name,
      position,
      display_mode: displayMode,
      target_banner_id: targetBannerId || null,
      is_active: body?.is_active !== false,
      starts_at: startsAt,
      ends_at: endsAt,
      storage_path: storagePath,
    },
  };
}

export async function resolveSlotIndex(
  db,
  {
    position,
    displayMode,
    targetBannerId,
    excludeBannerId = null,
    currentSlotIndex = 0,
  },
) {
  if (displayMode === "keep") {
    return Math.max(0, Number(currentSlotIndex || 0));
  }

  if (displayMode === "loop") {
    let targetQuery = db
      .from("admin_banners")
      .select("id, position, slot_index")
      .eq("id", targetBannerId)
      .eq("position", position)
      .neq("name", "ADVOGADO_MES");

    if (excludeBannerId) targetQuery = targetQuery.neq("id", excludeBannerId);

    const { data: target, error } = await targetQuery.maybeSingle();

    if (error) {
      throw new Error(`Falha ao validar bloco de rotação: ${error.message}`);
    }

    if (!target) {
      const invalidTarget = new Error(
        "O banner selecionado para rotação não existe nesta posição.",
      );
      invalidTarget.status = 409;
      throw invalidTarget;
    }

    return Math.max(0, Number(target.slot_index || 0));
  }

  let query = db
    .from("admin_banners")
    .select("slot_index")
    .eq("position", position)
    .neq("name", "ADVOGADO_MES")
    .order("slot_index", { ascending: false })
    .limit(1);

  if (excludeBannerId) query = query.neq("id", excludeBannerId);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Falha ao calcular o bloco do banner: ${error.message}`);
  }

  return data?.length ? Math.max(0, Number(data[0].slot_index || 0)) + 1 : 0;
}

export async function registerBannerAudit(
  db,
  { bannerId, adminId, action, reason = null, snapshot = {}, changes = {} },
) {
  const { error } = await db.from("admin_banner_audit_logs").insert([
    {
      banner_id: bannerId,
      admin_id: adminId,
      action,
      reason,
      snapshot,
      changes,
    },
  ]);

  if (error) {
    const auditError = new Error(`Falha ao registrar auditoria: ${error.message}`);
    auditError.status = ["42P01", "PGRST205"].includes(error.code) ? 503 : 500;
    throw auditError;
  }
}

export async function removeStoredBanner(db, storagePath) {
  if (!storagePath || !storagePath.startsWith("banners/")) return false;

  const { error } = await db.storage.from(BANNER_BUCKET).remove([storagePath]);
  if (error) {
    console.warn("[Admin/Banners] Arquivo não removido do Storage:", {
      storagePath,
      message: error.message,
    });
    return false;
  }

  return true;
}

export function safeErrorResponse(error, fallbackMessage) {
  console.error("[Admin/Banners] Erro:", error);

  const status = Number(error?.status) || 500;
  const message = [400, 401, 403, 404, 409, 413, 415, 503].includes(status)
    ? error?.message
    : fallbackMessage;

  return json({ success: false, message: message || fallbackMessage }, status);
}

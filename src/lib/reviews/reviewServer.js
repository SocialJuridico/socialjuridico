import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const REVIEW_STATUS = Object.freeze({
  PUBLISHED: "PUBLISHED",
  HIDDEN: "HIDDEN",
  INVALID: "INVALID",
});

export function reviewJson(payload, status = 200, headers = {}) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function validateReviewMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return reviewJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return reviewJson(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

export function normalizeReviewRating(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
    ? rating
    : null;
}

export function normalizeReviewComment(value) {
  const comment = String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  return comment ? comment.slice(0, 2000) : null;
}

export function isReviewUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function hashValue(value) {
  const secret =
    process.env.REVIEW_AUDIT_HASH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "social-juridico-review-audit";

  return crypto
    .createHmac("sha256", secret)
    .update(String(value || "unknown"))
    .digest("hex");
}

export function getReviewRequestHashes(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    ipHash: hashValue(ip),
    userAgentHash: hashValue(userAgent),
  };
}

export async function requireReviewAdmin() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return {
      ok: false,
      response: reviewJson(
        { success: false, message: auth.message },
        auth.status,
      ),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: reviewJson(
        {
          success: false,
          message: "Serviço administrativo de avaliações indisponível.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

export function reviewRpcError(error, fallbackMessage) {
  const message = String(error?.message || fallbackMessage);
  const wrapped = new Error(message);

  if (["P0001", "P0002", "P0003", "23505"].includes(error?.code)) {
    wrapped.status = 409;
  } else if (
    ["PGRST202", "PGRST204", "PGRST205", "42703", "42883", "42P01"].includes(
      error?.code,
    )
  ) {
    wrapped.message = "Execute a migração de governança das avaliações.";
    wrapped.status = 503;
  }

  return wrapped;
}

export function serializeReview(item, maps = {}) {
  return {
    id: item.id,
    nota: Number(item.nota || 0),
    justificativa: item.justificativa || null,
    status: item.status || REVIEW_STATUS.PUBLISHED,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
    version: Number(item.version || 1),
    moderated_at: item.moderated_at || null,
    moderation_reason: item.moderation_reason || null,
    cliente_id: item.cliente_id,
    advogado_id: item.advogado_id,
    caso_id: item.caso_id,
    advogado_nome:
      maps.lawyers?.get(item.advogado_id) || "Advogado removido",
    cliente_nome: maps.clients?.get(item.cliente_id) || "Cliente removido",
    caso_titulo: maps.cases?.get(item.caso_id) || "Caso removido",
  };
}

export function safeReviewError(error, fallbackMessage) {
  console.error("[Avaliações] Erro:", {
    code: error?.code || null,
    message: error?.message || "unknown",
  });

  const status = Number(error?.status) || 500;
  const publicMessage = [400, 401, 403, 404, 409, 413, 422, 503].includes(
    status,
  )
    ? error.message
    : fallbackMessage;

  return reviewJson(
    { success: false, message: publicMessage || fallbackMessage },
    status,
  );
}

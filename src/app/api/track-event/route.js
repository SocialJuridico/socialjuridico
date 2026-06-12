import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_RULES = {
  hero_client_cta_click: {
    allowedPaths: new Set(["/"]),
  },
  hero_lawyer_cta_click: {
    allowedPaths: new Set(["/"]),
  },
};

const ALLOWED_PROPERTY_KEYS = new Set([
  "placement",
  "destination",
  "variant",
]);

const MAX_BODY_BYTES = 8_192;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 30;
const RATE_LIMIT_PRUNE_THRESHOLD = 2_000;
const rateLimitStore = new Map();

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getRequestIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getRateLimitKey(request) {
  return createHash("sha256").update(getRequestIp(request)).digest("hex");
}

function pruneRateLimitStore(now) {
  if (rateLimitStore.size < RATE_LIMIT_PRUNE_THRESHOLD) return;

  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}

function isRateLimited(request) {
  const now = Date.now();
  pruneRateLimitStore(now);

  const key = getRateLimitKey(request);
  const current = rateLimitStore.get(key);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return current.count > RATE_LIMIT_MAX_EVENTS;
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

function normalizePath(value) {
  if (typeof value !== "string") return "";

  const path = value.trim();
  if (!path.startsWith("/") || path.length > 500) return "";
  if (path.startsWith("/api") || path.startsWith("/_next")) return "";

  return path;
}

function sanitizeProperties(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value)
    .filter(([key, item]) => {
      if (!ALLOWED_PROPERTY_KEYS.has(key)) return false;
      return ["string", "number", "boolean"].includes(typeof item);
    })
    .slice(0, 5)
    .map(([key, item]) => [
      key,
      typeof item === "string" ? item.slice(0, 120) : item,
    ]);

  return Object.fromEntries(entries);
}

function bodyIsTooLarge(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

export async function POST(request) {
  try {
    if (!validateOrigin(request)) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    if (bodyIsTooLarge(request)) {
      return json(
        { success: false, message: "Evento acima do tamanho permitido." },
        413,
      );
    }

    if (isRateLimited(request)) {
      return json(
        { success: false, message: "Muitos eventos em pouco tempo." },
        429,
      );
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço de eventos indisponível." },
        503,
      );
    }

    const body = await request.json().catch(() => null);
    const eventName = String(body?.event || "").trim().slice(0, 80);
    const path = normalizePath(body?.path);
    const rule = EVENT_RULES[eventName];

    if (!rule || !path || !rule.allowedPaths.has(path)) {
      return json({ success: false, message: "Evento inválido." }, 400);
    }

    const { error } = await supabaseAdmin
      .from("public_conversion_events")
      .insert([
        {
          event_name: eventName,
          path,
          properties: sanitizeProperties(body?.properties),
        },
      ]);

    if (error) {
      console.error("[Track Event] Falha ao registrar evento:", error);
      return json(
        { success: false, message: "Não foi possível registrar o evento." },
        500,
      );
    }

    return json({ success: true }, 202);
  } catch (error) {
    console.error("[Track Event] Erro inesperado:", error);
    return json(
      { success: false, message: "Não foi possível registrar o evento." },
      500,
    );
  }
}

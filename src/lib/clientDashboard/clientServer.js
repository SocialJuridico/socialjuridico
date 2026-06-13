import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { supabaseAdmin } from "@/lib/supabase";

export function clientJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validateClientMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return clientJson(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

export async function requireClientUser(request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      ok: false,
      response: clientJson(
        { success: false, message: "Não autorizado." },
        401,
      ),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: clientJson(
        { success: false, message: "Serviço indisponível no servidor." },
        503,
      ),
    };
  }

  const role = (await getRoleFromDatabase(supabaseAdmin, user.id)) || "CLIENT";
  if (role !== "CLIENT") {
    return {
      ok: false,
      response: clientJson(
        {
          success: false,
          message: "Esta área é exclusiva para clientes.",
        },
        403,
      ),
    };
  }

  return { ok: true, user, db: supabaseAdmin, role };
}

export function normalizeClientText(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function isClientUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function safeClientError(error, fallbackMessage) {
  console.error("[Cliente/Dashboard] Erro:", {
    code: error?.code || null,
    message: error?.message || "unknown",
  });

  const status = Number(error?.status) || 500;
  const message = [400, 401, 403, 404, 409, 413, 422, 503].includes(status)
    ? error.message
    : fallbackMessage;

  return clientJson(
    { success: false, message: message || fallbackMessage },
    status,
  );
}

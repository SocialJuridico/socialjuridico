import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";
import { isPlatformUuid } from "./contentValidation";

export const DOCUMENTATION_BUCKET = "documentation-sources";
export const TUTORIAL_BUCKET = "tutorial-videos";

export function platformJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidPlatformMutationOrigin(request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return true;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || referer;
  if (!candidate) return request.headers.get("sec-fetch-site") !== "cross-site";

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  try {
    return Boolean(host && new URL(candidate).host === host);
  } catch {
    return false;
  }
}

export function getPlatformRequestId(request, body = {}) {
  const candidate =
    body.requestId ||
    body.request_id ||
    request.headers.get("x-idempotency-key") ||
    request.headers.get("x-request-id");
  return isPlatformUuid(candidate) ? String(candidate) : crypto.randomUUID();
}

export async function requirePlatformAdmin() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return {
      ok: false,
      response: platformJson({ success: false, message: auth.message }, auth.status),
    };
  }
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: platformJson(
        { success: false, message: "Serviço administrativo indisponível." },
        503,
      ),
    };
  }
  return { ok: true, db: supabaseAdmin, auth, admin: auth.admin };
}

export async function requireLawyerDocumentationAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: platformJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select("id, name, cargo, permissoes, escritorio_id, oab_verification_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: platformJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: platformJson(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
        },
        403,
      ),
    };
  }

  return { ok: true, db: supabaseAdmin, user, profile };
}

export async function requireTutorialUser(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: platformJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const role = String((await getRoleFromDatabase(supabaseAdmin, user.id)) || "")
    .trim()
    .toUpperCase();
  const audience = role === "CLIENT" ? "CLIENT" : role === "LAWYER" ? "LAWYER" : null;
  if (!audience) {
    return {
      ok: false,
      response: platformJson(
        { success: false, message: "Perfil sem acesso aos tutoriais." },
        403,
      ),
    };
  }

  if (audience === "LAWYER") {
    const { data: lawyer, error } = await supabaseAdmin
      .from("advogados")
      .select("id, oab_verification_status")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!lawyer || lawyer.oab_verification_status === "ERROR") {
      return {
        ok: false,
        response: platformJson(
          { success: false, message: "Acesso ao perfil de advogado indisponível." },
          403,
        ),
      };
    }
  }

  return { ok: true, db: supabaseAdmin, user, audience };
}

export async function recordPlatformAudit(
  access,
  request,
  { table, entityColumn, entityId = null, action, requestId, metadata = {} },
) {
  const payload = {
    [entityColumn]: entityId,
    admin_id: access.admin.id,
    request_id: isPlatformUuid(requestId) ? requestId : crypto.randomUUID(),
    action,
    metadata,
    ip_hash: getRequestIpHash(request),
    user_agent: getRequestUserAgent(request),
    created_at: new Date().toISOString(),
  };
  const { error } = await access.db.from(table).insert([payload]);
  if (error && error.code !== "23505") throw error;
}

export async function createPrivateSignedUrl(db, bucket, path, expiresIn = 900) {
  if (!path) return null;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function removePrivateFile(db, bucket, path) {
  if (!path) return false;
  const { error } = await db.storage.from(bucket).remove([path]);
  if (error) {
    console.warn("[PlatformContent] Falha ao remover arquivo:", {
      bucket,
      path,
      message: error.message,
    });
    return false;
  }
  return true;
}

export function safePlatformError(error, fallbackMessage) {
  console.error("[PlatformContent] Erro:", {
    code: error?.code || null,
    message: error?.message || "unknown",
  });
  const status = Number(error?.status) || 500;
  const safeStatuses = new Set([400, 401, 403, 404, 409, 413, 415, 422, 503]);
  return platformJson(
    {
      success: false,
      message: safeStatuses.has(status)
        ? error.message || fallbackMessage
        : fallbackMessage,
    },
    status,
  );
}

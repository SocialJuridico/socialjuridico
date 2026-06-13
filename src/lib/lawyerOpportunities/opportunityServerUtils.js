import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { isLawyer } from "@/lib/securityUtils";
import { supabaseAdmin } from "@/lib/supabase";

import { normalizeSearch } from "./opportunityValidation";

export function opportunityJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidMutationOrigin(request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return true;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function getRequestIpHash(request) {
  const rawIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const salt =
    process.env.AUDIT_IP_HASH_SALT ||
    process.env.SUPABASE_JWT_SECRET ||
    "sj";

  return createHash("sha256").update(`${salt}:${rawIp}`).digest("hex");
}

export function getRequestUserAgent(request) {
  return normalizeSearch(request.headers.get("user-agent"), 500);
}

export async function requireLawyerAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      ok: false,
      response: opportunityJson(
        { success: false, message: "Não autorizado." },
        401,
      ),
    };
  }

  if (!supabaseAdmin || !(await isLawyer(supabaseAdmin, user.id))) {
    return {
      ok: false,
      response: opportunityJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }

  return { ok: true, user, db: supabaseAdmin };
}

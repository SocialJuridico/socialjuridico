import { createHmac } from "node:crypto";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAdminAdvertiserAccess() {
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
        { success: false, message: "Serviço administrativo indisponível." },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
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

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function normalizeUsername(value) {
  return normalizeText(value, 40).toLowerCase();
}

export function isValidUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(value);
}

export function normalizeWhatsapp(value) {
  const raw = normalizeText(value, 40);
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "").slice(0, 15);
  return digits ? `+${digits}` : "";
}

export function maskWhatsapp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `•••• ${digits.slice(-4)}` : "Não informado";
}

export function normalizeAdStatus(value) {
  return String(value || "ATIVO").toUpperCase() === "ARQUIVADO"
    ? "ARQUIVADO"
    : "ATIVO";
}

export function isMissingAdvertiserGovernanceColumn(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("could not find the 'status' column") ||
    message.includes("could not find the 'contato' column") ||
    message.includes("column anuncios.status does not exist") ||
    message.includes("column anuncios.contato does not exist")
  );
}

function hashIp(request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const secret =
    process.env.ADMIN_AUDIT_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-audit-secret";

  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function recordAdvertiserAudit(db, request, event) {
  const { error } = await db.from("admin_advertiser_audit_logs").insert([
    {
      id: crypto.randomUUID(),
      admin_id: event.adminId,
      advertiser_id: event.advertiserId || null,
      ad_id: event.adId || null,
      action: event.action,
      purpose: event.purpose,
      justification: event.justification || null,
      metadata: event.metadata || {},
      ip_hash: hashIp(request),
      user_agent: normalizeText(request.headers.get("user-agent"), 500),
      created_at: new Date().toISOString(),
    },
  ]);

  if (!error) return true;

  const message = String(error.message || "").toLowerCase();
  const migrationPending =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("admin_advertiser_audit_logs");

  if (!migrationPending) {
    console.error("[Admin/Anunciantes] Falha na auditoria:", error);
  }

  return false;
}

export async function getAdvertiser(db, advertiserId) {
  const { data, error } = await db
    .from("anunciantes")
    .select("id, username, nome_empresa, whatsapp, ativo, created_at")
    .eq("id", advertiserId)
    .maybeSingle();

  if (error) throw new Error("Falha ao consultar o anunciante.");
  return data || null;
}

export async function getAd(db, adId) {
  const currentSchemaResult = await db
    .from("anuncios")
    .select(
      "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
    )
    .eq("id", adId)
    .maybeSingle();

  if (!currentSchemaResult.error) {
    return currentSchemaResult.data || null;
  }

  if (!isMissingAdvertiserGovernanceColumn(currentSchemaResult.error)) {
    console.error(
      "[Admin/Anunciantes] Erro Supabase ao consultar anúncio:",
      currentSchemaResult.error,
    );
    throw new Error("Falha ao consultar o anúncio.");
  }

  const legacyResult = await db
    .from("anuncios")
    .select(
      "id, anunciante_id, titulo, descricao, categoria, link_contato, em_destaque, created_at",
    )
    .eq("id", adId)
    .maybeSingle();

  if (legacyResult.error) {
    console.error(
      "[Admin/Anunciantes] Erro no fallback de anúncio:",
      legacyResult.error,
    );
    throw new Error("Falha ao consultar o anúncio.");
  }

  if (!legacyResult.data) return null;

  return {
    ...legacyResult.data,
    contato: legacyResult.data.link_contato || null,
    status: "ATIVO",
    legacySchema: true,
  };
}

export function calculateAdvertiserSummary(advertisers) {
  return advertisers.reduce(
    (summary, advertiser) => {
      summary.totalAdvertisers += 1;
      if (advertiser.active) summary.activeAdvertisers += 1;
      else summary.suspendedAdvertisers += 1;

      summary.totalAds += advertiser.ads.length;
      summary.activeAds += advertiser.ads.filter(
        (ad) => ad.status === "ATIVO",
      ).length;
      summary.archivedAds += advertiser.ads.filter(
        (ad) => ad.status === "ARQUIVADO",
      ).length;
      summary.featuredAds += advertiser.ads.filter(
        (ad) => ad.featured && ad.status === "ATIVO",
      ).length;
      summary.supportMessages += advertiser.support.messageCount;
      return summary;
    },
    {
      totalAdvertisers: 0,
      activeAdvertisers: 0,
      suspendedAdvertisers: 0,
      totalAds: 0,
      activeAds: 0,
      archivedAds: 0,
      featuredAds: 0,
      supportMessages: 0,
    },
  );
}

import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";
import { supabaseAdmin } from "@/lib/supabase";

import {
  buildDigitalCardPublicUrl,
  getDigitalCardLinkMap,
  slugifyDigitalCard,
} from "./digitalCardValidation";

const CARD_TABLE = "lawyer_digital_cards";
const EVENT_TABLE = "lawyer_digital_card_events";
const AUDIT_TABLE = "lawyer_digital_card_audit_logs";

export function digitalCardJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidDigitalCardMutationOrigin(request) {
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

function appOrigin(request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin
  ).replace(/\/+$/, "");
}

function defaultSlug(profile) {
  const base = slugifyDigitalCard(profile.name || "advogado") || "advogado";
  const suffix = String(profile.id || "").replace(/-/g, "").slice(-6).toLowerCase();
  return `${base.slice(0, Math.max(3, 43 - suffix.length))}-${suffix}`.replace(/-+$/g, "");
}

function defaultHeadline(profile) {
  const specialties = String(profile.specialties || "")
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
  return specialties.length
    ? `Advocacia em ${specialties.join(" e ")}`
    : "Advocacia estratégica e atendimento jurídico";
}

function cardRowToDomain(row, profile, origin, { publicView = false } = {}) {
  const showEmail = row.show_email === true;
  const showPhone = row.show_phone !== false;
  const showLocation = row.show_location !== false;
  const showRating = row.show_rating !== false;
  const customLinks = (Array.isArray(row.custom_links) ? row.custom_links : []).filter(
    (link) => !publicView || link?.enabled !== false,
  );
  const publicEmail = row.public_email || profile.email || "";
  const phone = row.phone || String(profile.phone || "").replace(/\D/g, "");
  const location = row.location || profile.estado || "";

  return {
    id: row.id,
    lawyerId: row.lawyer_id,
    slug: row.slug,
    displayName: row.display_name || profile.name || "Advogado(a)",
    headline: row.headline || defaultHeadline(profile),
    bio: row.bio || profile.bio || "",
    avatarUrl: row.avatar_url || profile.avatar || "",
    publicEmail: publicView && !showEmail ? "" : publicEmail,
    phone: publicView && !showPhone ? "" : phone,
    whatsapp: row.whatsapp || String(profile.phone || "").replace(/\D/g, ""),
    website: row.website || "",
    instagram: row.instagram || "",
    linkedin: row.linkedin || "",
    youtube: row.youtube || "",
    location: publicView && !showLocation ? "" : location,
    theme: row.theme || "midnight",
    accentColor: row.accent_color || "#D4AF37",
    backgroundStyle: row.background_style || "aurora",
    customLinks,
    showEmail,
    showPhone,
    showLocation,
    showRating,
    showBrand: row.show_brand !== false,
    isPublished: row.is_published === true,
    publicUrl: buildDigitalCardPublicUrl(origin, row.slug),
    version: Number(row.version || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || null,
    profile: {
      oab: profile.oab || "",
      estado: profile.estado || "",
      verified:
        profile.verified === true || profile.oab_verification_status === "VERIFIED",
      rating: publicView && !showRating ? 0 : Number(profile.avg_rating || 0),
      totalRatings: publicView && !showRating ? 0 : Number(profile.total_ratings || 0),
      specialties: profile.specialties || "",
      consulta: profile.consulta || "",
      tempo: profile.tempo || "",
      officeName: profile.officeName || "",
    },
  };
}

export function toPublicDigitalCardPayload(card) {
  return {
    slug: card.slug,
    displayName: card.displayName,
    headline: card.headline,
    bio: card.bio,
    avatarUrl: card.avatarUrl,
    publicEmail: card.publicEmail,
    phone: card.phone,
    whatsapp: card.whatsapp,
    website: card.website,
    instagram: card.instagram,
    linkedin: card.linkedin,
    youtube: card.youtube,
    location: card.location,
    theme: card.theme,
    accentColor: card.accentColor,
    backgroundStyle: card.backgroundStyle,
    customLinks: card.customLinks,
    showEmail: card.showEmail,
    showPhone: card.showPhone,
    showLocation: card.showLocation,
    showRating: card.showRating,
    showBrand: card.showBrand,
    publicUrl: card.publicUrl,
    profile: card.profile,
  };
}

async function getOfficeName(db, officeId) {
  if (!officeId) return "";
  const { data } = await db
    .from("escritorios")
    .select("nome")
    .eq("id", officeId)
    .maybeSingle();
  return data?.nome || "";
}

export async function requireLawyerDigitalCardAccess(request) {
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: digitalCardJson({ success: false, message: "Serviço indisponível." }, 503),
    };
  }
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      ok: false,
      response: digitalCardJson({ success: false, message: "Não autorizado." }, 401),
    };
  }
  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, phone, avatar, bio, oab, estado, specialties, verified, avg_rating, total_ratings, consulta, tempo, escritorio_id, oab_verification_status",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: digitalCardJson({ success: false, message: "Acesso exclusivo para advogados." }, 403),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: digitalCardJson(
        { success: false, blocked: true, message: "Acesso suspenso por inconsistências na OAB." },
        403,
      ),
    };
  }
  profile.officeName = await getOfficeName(supabaseAdmin, profile.escritorio_id);
  return {
    ok: true,
    user,
    profile,
    db: supabaseAdmin,
    origin: appOrigin(request),
  };
}

export async function ensureDigitalCard(access) {
  const { data: existing, error: existingError } = await access.db
    .from(CARD_TABLE)
    .select("*")
    .eq("lawyer_id", access.profile.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { row: existing, created: false };

  const seed = {
    lawyer_id: access.profile.id,
    slug: defaultSlug(access.profile),
    display_name: access.profile.name || "Advogado(a)",
    headline: defaultHeadline(access.profile),
    bio: access.profile.bio || "",
    avatar_url: access.profile.avatar || "",
    public_email: access.profile.email || "",
    phone: String(access.profile.phone || "").replace(/\D/g, ""),
    whatsapp: String(access.profile.phone || "").replace(/\D/g, ""),
    location: access.profile.estado || "",
    is_published: false,
  };
  const { data: inserted, error } = await access.db
    .from(CARD_TABLE)
    .insert([seed])
    .select("*")
    .single();
  if (error?.code === "23505") {
    const { data: retry, error: retryError } = await access.db
      .from(CARD_TABLE)
      .select("*")
      .eq("lawyer_id", access.profile.id)
      .single();
    if (retryError) throw retryError;
    return { row: retry, created: false };
  }
  if (error) throw error;
  return { row: inserted, created: true };
}

export async function getDigitalCardMetrics(access, cardId) {
  const { data, error } = await access.db.rpc("get_lawyer_digital_card_metrics", {
    p_card_id: cardId,
    p_days: 30,
  });
  if (error) throw error;
  return (
    data || {
      views: 0,
      uniqueVisitors: 0,
      clicks: 0,
      shares: 0,
      vcardDownloads: 0,
      pdfDownloads: 0,
      topLinks: [],
    }
  );
}

export function serializeDigitalCard(row, access) {
  return cardRowToDomain(row, access.profile, access.origin);
}

export async function recordDigitalCardAudit(
  access,
  request,
  { requestId, cardId, action, metadata = {} },
) {
  const { error } = await access.db.from(AUDIT_TABLE).insert([
    {
      request_id: requestId || crypto.randomUUID(),
      card_id: cardId,
      lawyer_id: access.profile.id,
      action,
      metadata,
      ip_hash: getRequestIpHash(request),
      user_agent: getRequestUserAgent(request),
      created_at: new Date().toISOString(),
    },
  ]);
  if (error && error.code !== "23505") throw error;
}

export async function getPublicDigitalCardBySlug(slug, origin) {
  if (!supabaseAdmin) return null;
  const { data: row, error } = await supabaseAdmin
    .from(CARD_TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, phone, avatar, bio, oab, estado, specialties, verified, avg_rating, total_ratings, consulta, tempo, escritorio_id, oab_verification_status",
    )
    .eq("id", row.lawyer_id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.oab_verification_status === "ERROR") return null;
  profile.officeName = await getOfficeName(supabaseAdmin, profile.escritorio_id);
  return cardRowToDomain(row, profile, origin.replace(/\/+$/, ""), { publicView: true });
}

function referrerDomain(request) {
  const value = request.headers.get("referer") || request.headers.get("referrer");
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 160);
  } catch {
    return null;
  }
}

export async function recordPublicDigitalCardEvent(
  request,
  card,
  { eventType, linkKey = null, metadata = {} },
) {
  if (!supabaseAdmin) return { inserted: false };
  const allowedTypes = new Set(["VIEW", "CLICK", "SHARE", "VCARD_DOWNLOAD"]);
  if (!allowedTypes.has(eventType)) return { inserted: false };
  if (eventType === "CLICK") {
    const links = getDigitalCardLinkMap(card);
    if (!linkKey || !links.has(linkKey)) return { inserted: false };
  }
  const ipHash = getRequestIpHash(request);
  const minute = new Date();
  minute.setSeconds(0, 0);
  const dedupeKey = crypto
    .createHash("sha256")
    .update(`${card.id}:${eventType}:${linkKey || ""}:${ipHash}:${minute.toISOString()}`)
    .digest("hex");
  const { error } = await supabaseAdmin.from(EVENT_TABLE).insert([
    {
      card_id: card.id,
      event_type: eventType,
      link_key: linkKey,
      dedupe_key: dedupeKey,
      ip_hash: ipHash,
      user_agent: getRequestUserAgent(request),
      referrer_domain: referrerDomain(request),
      metadata,
      created_at: new Date().toISOString(),
    },
  ]);
  if (error?.code === "23505") return { inserted: false, duplicate: true };
  if (error) throw error;
  return { inserted: true };
}

export function digitalCardFailure(error, fallback) {
  if (["42P01", "42703", "PGRST202", "PGRST204", "PGRST205"].includes(error?.code)) {
    return {
      status: 503,
      message: "A migration do Cartão Digital precisa ser aplicada antes de continuar.",
    };
  }
  if (error?.code === "23505") {
    return { status: 409, message: "Este endereço público já está em uso." };
  }
  const status = Number(error?.status || 500);
  return { status, message: status >= 500 ? fallback : error?.message || fallback };
}

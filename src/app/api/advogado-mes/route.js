import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVED_NAME = "ADVOGADO_MES";
const LEGACY_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidHttpsUrl(value) {
  try {
    return new URL(String(value || "")).protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeDestination(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw.slice(0, 1000);
  return isValidHttpsUrl(raw) ? raw : null;
}

function isPublished(banner, now = Date.now()) {
  if (!banner?.is_active) return false;

  const startsAt = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const endsAt = banner.ends_at ? new Date(banner.ends_at).getTime() : null;

  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt <= now) return false;
  return true;
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço temporariamente indisponível." },
        503,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("admin_banners")
      .select(
        "id, image_url, link_url, alt_text, is_active, starts_at, ends_at, updated_at",
      )
      .eq("name", RESERVED_NAME)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (["42703", "PGRST204"].includes(error.code)) {
        return json(
          {
            success: false,
            message: "Configuração pública ainda não migrada.",
          },
          503,
        );
      }
      throw error;
    }

    if (!data || !isValidHttpsUrl(data.image_url)) {
      return json({ success: true, banner: null });
    }

    const legacyStatus = String(data.link_url || "").trim().toUpperCase();
    const isLegacy = LEGACY_STATUSES.has(legacyStatus);
    const normalized = {
      ...data,
      link_url: isLegacy ? null : data.link_url,
      is_active: isLegacy ? legacyStatus === "ACTIVE" : data.is_active === true,
    };

    if (!isPublished(normalized)) {
      return json({ success: true, banner: null });
    }

    return json({
      success: true,
      banner: {
        id: normalized.id,
        image_url: normalized.image_url,
        link_url: sanitizeDestination(normalized.link_url),
        alt_text:
          String(normalized.alt_text || "").trim().slice(0, 240) ||
          "Destaque Advogado do Mês",
        version: normalized.updated_at || normalized.id,
      },
    });
  } catch (error) {
    console.error("[AdvogadoMes/Public] Falha ao carregar destaque:", error);
    return json(
      { success: false, message: "Não foi possível carregar o destaque." },
      500,
    );
  }
}

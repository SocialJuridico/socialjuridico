import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePublicLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw.slice(0, 1000);
  }

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizePublicImage(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Serviço de banners indisponível." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("admin_banners")
      .select(
        "id, name, image_url, link_url, alt_text, position, slot_index, starts_at, ends_at",
      )
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .neq("name", "ADVOGADO_MES")
      .order("position", { ascending: true })
      .order("slot_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      const migrationMissing = ["42703", "PGRST204"].includes(error.code);
      console.error("[Banners][GET] Erro:", error);

      return NextResponse.json(
        {
          success: false,
          message: migrationMissing
            ? "A configuração de publicação dos banners ainda não foi migrada."
            : "Não foi possível carregar os banners.",
        },
        {
          status: migrationMissing ? 503 : 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const banners = (data || [])
      .map((banner) => ({
        id: banner.id,
        name: String(banner.name || "Banner").slice(0, 120),
        image_url: normalizePublicImage(banner.image_url),
        link_url: normalizePublicLink(banner.link_url),
        alt_text: String(banner.alt_text || banner.name || "Banner").slice(
          0,
          240,
        ),
        position: banner.position === "right" ? "right" : "left",
        slot_index: Math.max(0, Number(banner.slot_index || 0)),
      }))
      .filter((banner) => Boolean(banner.image_url));

    return NextResponse.json(
      { success: true, banners },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[Banners][GET] Erro inesperado:", error);
    return NextResponse.json(
      { success: false, message: "Não foi possível carregar os banners." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return json({ success: false, message: "Servico indisponivel." }, 503);
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ success: false, message: "Nao autorizado." }, 401);

    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (lawyerError) throw lawyerError;
    if (!lawyer) {
      return json({ success: false, message: "Acesso restrito a advogados." }, 403);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("platform_internal_notices")
      .select("id, title, message, cta_label, cta_url, severity, ends_at, created_at")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return json({ success: true, notices: data || [] });
  } catch (error) {
    console.error("[Advogado/AvisosInternos][GET] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel carregar os avisos internos." },
      500,
    );
  }
}

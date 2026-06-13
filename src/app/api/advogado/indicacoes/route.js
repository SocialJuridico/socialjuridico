import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const { data, error } = await supabase
      .from("indicacoes")
      .select("id, nome_indicado, status, valor_comissao, created_at")
      .eq("indicador_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    return json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[Advogado/Indicacoes/Legacy] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar suas indicações." },
      500,
    );
  }
}

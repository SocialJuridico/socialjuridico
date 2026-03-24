import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isLawyer } from "@/lib/securityUtils";
import { NextResponse } from "next/server";

// GET /api/advogado/interesses
// Retorna os interesses do advogado logado
export async function GET(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    if (!(await isLawyer(db, user.id))) {
      return NextResponse.json(
        { success: false, message: "Apenas advogados utilizam esta rota" },
        { status: 403 },
      );
    }

    // Buscar os interesses do advogado (apenas os ativos: PENDING e NEGOTIATING)
    const { data: interests, error: iError } = await db
      .from("case_interests")
      .select("id, case_id, status, created_at")
      .eq("lawyer_id", user.id)
      .in("status", ["PENDING", "NEGOTIATING"])
      .order("created_at", { ascending: false });

    if (iError) throw iError;

    return NextResponse.json({ success: true, data: interests || [] });
  } catch (error) {
    console.error("Erro na API GET /api/advogado/interesses:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

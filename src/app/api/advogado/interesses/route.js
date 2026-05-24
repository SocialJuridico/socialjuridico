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

    const caseIds = [
      ...new Set(
        (interests || []).map((interest) => interest.case_id).filter(Boolean),
      ),
    ];
    let casosById = {};

    if (caseIds.length > 0) {
      const { data: casos, error: cError } = await db
        .from("casos")
        .select("id, titulo, area_atuacao, cidade, estado, status, created_at")
        .in("id", caseIds);

      if (cError) throw cError;

      casosById = Object.fromEntries(
        (casos || []).map((caso) => [caso.id, caso]),
      );
    }

    const enrichedInterests = (interests || []).map((interest) => {
      const caso = casosById[interest.case_id];
      return {
        ...interest,
        caso_titulo: caso?.titulo || "Caso desconhecido",
        caso_area: caso?.area_atuacao || "",
        caso_cidade: caso?.cidade || "",
        caso_estado: caso?.estado || "",
        caso_status: caso?.status || null,
        caso_created_at: caso?.created_at || interest.created_at,
      };
    });

    return NextResponse.json({ success: true, data: enrichedInterests });
  } catch (error) {
    console.error("Erro na API GET /api/advogado/interesses:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

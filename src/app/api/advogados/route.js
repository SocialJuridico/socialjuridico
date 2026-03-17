import { supabaseAdmin } from "@/lib/supabase";
import { formatStoredOAB } from "@/lib/oab";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, avatar, oab, estado, avg_rating, total_ratings, verified, specialties, is_premium, consulta, tempo, valor",
      )
      .order("is_premium", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: (data || []).map((lawyer) => ({
        ...lawyer,
        oab: formatStoredOAB(lawyer.oab, lawyer.estado),
      })),
    });
  } catch (error) {
    console.error("Erro na API de Advogados:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao buscar advogados" },
      { status: 500 },
    );
  }
}

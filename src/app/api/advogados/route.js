import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, avatar, oab, estado, avg_rating, total_ratings, verified, specialties, is_premium",
      )
      .order("is_premium", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API de Advogados:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao buscar advogados" },
      { status: 500 },
    );
  }
}

import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = supabaseAdmin;
    const email = "gabriellysm.adv@hotmail.com";

    // 1. Buscar o advogado pelo email
    const { data: lawyer, error: lError } = await db
      .from("advogados")
      .select("id, name, email, balance, is_premium, created_at")
      .eq("email", email)
      .single();

    if (lError || !lawyer) {
      return NextResponse.json({ success: false, message: "Advogado não encontrado no banco de dados." });
    }

    // 2. Buscar transações
    const { data: transactions, error: tError } = await db
      .from("transacoes")
      .select("*")
      .eq("advogado_id", lawyer.id)
      .order("created_at", { ascending: false });

    // 3. Buscar usos de juris (interesses em casos)
    const { data: interests, count: interestsCount } = await db
      .from("case_interests")
      .select("id", { count: "exact" })
      .eq("lawyer_id", lawyer.id);

    return NextResponse.json({
      success: true,
      data: {
        perfil: lawyer,
        transacoes: transactions || [],
        interesses: interestsCount || 0
      }
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

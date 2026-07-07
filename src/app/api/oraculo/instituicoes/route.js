import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

// Lista pública das instituições de ensino que participam do programa
// Oráculo Acadêmico — alimenta o select da Etapa 2 do cadastro. Instituições
// INDICADA/INATIVA nunca aparecem aqui.
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, message: "Serviço indisponível no servidor." },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .select("id, nome")
      .eq("status", "PARTICIPANTE")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao listar instituições: ${error.message}`);
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Oraculo/Instituicoes][GET] Erro:", error);
    return NextResponse.json(
      { success: false, message: "Não foi possível listar as instituições." },
      { status: 500 },
    );
  }
}

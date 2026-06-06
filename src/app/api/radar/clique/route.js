import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/radar/clique
// Registra o clique de um advogado elegível em uma oportunidade pública
export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Validação de elegibilidade (START, PRO ou is_premium = true, ativo)
    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, plan_type, is_premium, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (lawyerError || !lawyer) {
      return NextResponse.json(
        { success: false, message: "Apenas advogados têm acesso ao Radar Jurídico" },
        { status: 403 }
      );
    }

    const isStartOrPro = lawyer.plan_type === "START" || lawyer.plan_type === "PRO" || lawyer.is_premium === true;
    const isBlocked = ["canceled", "cancelled", "unpaid", "blocked"].includes(
      (lawyer.subscription_status || "").toLowerCase()
    );

    if (!isStartOrPro || isBlocked) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a advogados START e PRO ativos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { radar_oportunidade_id } = body || {};

    if (!radar_oportunidade_id) {
      return NextResponse.json(
        { success: false, message: "radar_oportunidade_id é obrigatório" },
        { status: 400 }
      );
    }

    // Inserção da métrica de clique
    const { error: insertError } = await supabaseAdmin
      .from("radar_cliques")
      .insert([
        {
          radar_oportunidade_id,
          advogado_id: user.id,
          criado_em: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error("Erro ao inserir clique no banco:", insertError.message);
      return NextResponse.json(
        { success: false, message: "Erro ao registrar clique" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Clique registrado com sucesso" });
  } catch (error) {
    console.error("Erro geral na API POST /api/radar/clique:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";

export const dynamic = "force-dynamic";

// POST /api/radar/clique
// Registra o clique de um advogado elegível em uma oportunidade pública e cobra Juris se for plano START
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
      .select("id, plan_type, is_premium, subscription_status, balance")
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

    // 1. Verificar se o advogado já clicou anteriormente neste caso (duplicação)
    const { data: existingClick, error: existingError } = await supabaseAdmin
      .from("radar_cliques")
      .select("id")
      .eq("radar_oportunidade_id", radar_oportunidade_id)
      .eq("advogado_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("Erro ao verificar clique existente:", existingError.message);
    }

    if (existingClick) {
      // Se já clicou, o acesso é gratuito (deduplicado) e não incrementa novamente
      return NextResponse.json({
        success: true,
        message: "Clique já registrado anteriormente. Acesso liberado."
      });
    }

    // 2. Determinar custo do clique (START = 3 Juris, PRO = 0 Juris)
    const cost = (lawyer.plan_type === "START" && lawyer.is_premium !== true) ? 3 : 0;

    if (cost > 0) {
      if ((lawyer.balance || 0) < cost) {
        return NextResponse.json(
          {
            success: false,
            message: `Saldo insuficiente. Você precisa de pelo menos ${cost} Juris para acessar os detalhes de contato deste caso.`
          },
          { status: 402 } // Payment Required
        );
      }

      // Debita os Juris do saldo do advogado
      const newBalance = lawyer.balance - cost;
      const { error: updateBalError } = await supabaseAdmin
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (updateBalError) {
        console.error("Erro ao atualizar saldo de Juris:", updateBalError.message);
        return NextResponse.json(
          { success: false, message: "Erro ao processar débito de Juris" },
          { status: 500 }
        );
      }

      // Executa alerta de saldo baixo se aplicável
      await checkAndNotifyLowBalance(user.id, lawyer.balance, newBalance);
    }

    // 3. Registrar o clique no banco
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

    // 4. Incrementa o contador cliques_count na oportunidade
    try {
      const { data: opData } = await supabaseAdmin
        .from("radar_oportunidades")
        .select("cliques_count")
        .eq("id", radar_oportunidade_id)
        .single();

      const currentCount = opData?.cliques_count || 0;

      await supabaseAdmin
        .from("radar_oportunidades")
        .update({ cliques_count: currentCount + 1 })
        .eq("id", radar_oportunidade_id);
    } catch (opErr) {
      console.error("Erro ao atualizar cliques_count no radar:", opErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Clique registrado e cobrado com sucesso",
      deducted: cost
    });
  } catch (error) {
    console.error("Erro geral na API POST /api/radar/clique:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

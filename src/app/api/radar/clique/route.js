import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";

export const dynamic = "force-dynamic";

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function isOpportunityExpired(publishedAt) {
  const publishedDate = new Date(publishedAt || 0);
  if (Number.isNaN(publishedDate.getTime())) return true;

  return publishedDate.getTime() <= Date.now() - 5 * 24 * 60 * 60 * 1000;
}

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
        { status: 401 },
      );
    }

    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, plan_type, is_premium, subscription_status, balance")
      .eq("id", user.id)
      .maybeSingle();

    if (lawyerError || !lawyer) {
      return NextResponse.json(
        {
          success: false,
          message: "Apenas advogados têm acesso ao Radar Jurídico",
        },
        { status: 403 },
      );
    }

    const isStartOrPro =
      lawyer.plan_type === "START" ||
      lawyer.plan_type === "PRO" ||
      lawyer.is_premium === true;
    const isBlocked = ["canceled", "cancelled", "unpaid", "blocked"].includes(
      (lawyer.subscription_status || "").toLowerCase(),
    );

    if (!isStartOrPro || isBlocked) {
      return NextResponse.json(
        {
          success: false,
          message: "Acesso restrito a advogados START e PRO ativos.",
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const opportunityId = body?.radar_oportunidade_id;

    if (!isValidUuid(opportunityId)) {
      return NextResponse.json(
        { success: false, message: "Oportunidade inválida." },
        { status: 400 },
      );
    }

    const { data: opportunity, error: opportunityError } = await supabaseAdmin
      .from("radar_oportunidades")
      .select("id, status, publicado_em, cliques_count")
      .eq("id", opportunityId)
      .maybeSingle();

    if (opportunityError) {
      console.error(
        "Erro ao validar oportunidade do Radar:",
        opportunityError.message,
      );
      return NextResponse.json(
        { success: false, message: "Erro ao validar oportunidade." },
        { status: 500 },
      );
    }

    if (
      !opportunity ||
      opportunity.status !== "aprovado" ||
      isOpportunityExpired(opportunity.publicado_em)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta oportunidade expirou ou não está mais disponível.",
        },
        { status: 410 },
      );
    }

    const { data: existingClick, error: existingError } = await supabaseAdmin
      .from("radar_cliques")
      .select("id")
      .eq("radar_oportunidade_id", opportunityId)
      .eq("advogado_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Erro ao verificar clique existente:",
        existingError.message,
      );
    }

    if (existingClick) {
      return NextResponse.json({
        success: true,
        message: "Clique já registrado anteriormente. Acesso liberado.",
      });
    }

    if (Number(opportunity.cliques_count || 0) >= 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta oportunidade atingiu o limite de acessos.",
        },
        { status: 409 },
      );
    }

    const cost = lawyer.plan_type === "START" ? 1 : 0;
    const previousBalance = Number(lawyer.balance || 0);
    const newBalance = previousBalance - cost;

    if (cost > 0 && previousBalance < cost) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Saldo insuficiente. Você precisa de pelo menos 1 Juris para acessar os detalhes deste caso.",
        },
        { status: 402 },
      );
    }

    if (cost > 0) {
      const { error: updateBalanceError } = await supabaseAdmin
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (updateBalanceError) {
        console.error(
          "Erro ao atualizar saldo de Juris:",
          updateBalanceError.message,
        );
        return NextResponse.json(
          { success: false, message: "Erro ao processar débito de Juris" },
          { status: 500 },
        );
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("radar_cliques")
      .insert([
        {
          radar_oportunidade_id: opportunityId,
          advogado_id: user.id,
          criado_em: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      if (cost > 0) {
        const { error: refundError } = await supabaseAdmin
          .from("advogados")
          .update({ balance: previousBalance })
          .eq("id", user.id);

        if (refundError) {
          console.error(
            "Erro crítico ao estornar Juris após falha no clique:",
            refundError.message,
          );
        }
      }

      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "Clique já registrado anteriormente. Acesso liberado.",
        });
      }

      console.error("Erro ao inserir clique no banco:", insertError.message);
      return NextResponse.json(
        {
          success: false,
          message: "A oportunidade não está mais disponível para acesso.",
        },
        { status: 409 },
      );
    }

    if (cost > 0) {
      await checkAndNotifyLowBalance(user.id, previousBalance, newBalance);
    }

    const currentCount = Number(opportunity.cliques_count || 0);
    const { error: countError } = await supabaseAdmin
      .from("radar_oportunidades")
      .update({ cliques_count: currentCount + 1 })
      .eq("id", opportunityId);

    if (countError) {
      console.error(
        "Erro ao atualizar cliques_count no radar:",
        countError.message,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Clique registrado com sucesso",
      deducted: cost,
    });
  } catch (error) {
    console.error("Erro geral na API POST /api/radar/clique:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

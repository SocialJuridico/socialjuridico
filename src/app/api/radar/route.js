import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/radar
// Retorna apenas oportunidades públicas aprovadas para advogados START e PRO ativos.
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

    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, role, plan_type, is_premium, subscription_status")
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

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count_only") === "true";
    const approvedCutoff = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();

    if (countOnly) {
      const { count, error: countError } = await supabaseAdmin
        .from("radar_oportunidades")
        .select("id", { count: "exact", head: true })
        .eq("status", "aprovado")
        .gt("publicado_em", approvedCutoff)
        .lt("cliques_count", 5);

      if (countError) {
        console.error(
          "Erro ao obter contagem de oportunidades:",
          countError.message,
        );
        return NextResponse.json(
          { success: false, message: "Erro ao obter contagem de oportunidades" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        count: count || 0,
      });
    }

    const isStartOrPro =
      lawyer.plan_type === "START" ||
      lawyer.plan_type === "PRO" ||
      lawyer.is_premium === true;
    const isBlocked = ["canceled", "cancelled", "unpaid", "blocked"].includes(
      (lawyer.subscription_status || "").toLowerCase(),
    );

    const categoria = searchParams.get("categoria");
    const estado = searchParams.get("estado");
    const cidade = searchParams.get("cidade");
    const fonte = searchParams.get("fonte");
    const urgencia = searchParams.get("urgencia");
    const scoreMin = searchParams.get("score_min");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let query = supabaseAdmin
      .from("radar_oportunidades")
      .select(
        "id, titulo, categoria, fonte, url_original, trecho_publico, cidade, estado, score_intencao, urgencia, resumo_ia, status, criado_em, detectado_em, publicado_em, fonte_tipo, reportado",
        { count: "exact" },
      )
      .eq("status", "aprovado")
      .gt("publicado_em", approvedCutoff)
      .lt("cliques_count", 5);

    if (categoria) query = query.eq("categoria", categoria);
    if (estado) query = query.eq("estado", estado.toUpperCase());
    if (cidade) query = query.ilike("cidade", `%${cidade}%`);
    if (fonte) query = query.eq("fonte", fonte);
    if (urgencia) query = query.eq("urgencia", urgencia);
    if (scoreMin) query = query.gte("score_intencao", parseInt(scoreMin, 10));

    query = query.order("detectado_em", { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Erro ao buscar no radar_oportunidades:", error.message);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar oportunidades públicas" },
        { status: 500 },
      );
    }

    if (!isStartOrPro || isBlocked) {
      const sanitizedData = (data || []).map((item) => ({
        id: item.id,
        titulo: item.titulo,
        categoria: item.categoria,
        cidade: item.cidade,
        estado: item.estado,
        score_intencao: item.score_intencao,
        urgencia: item.urgencia,
        criado_em: item.criado_em,
        detectado_em: item.detectado_em,
        publicado_em: item.publicado_em,
        url_original: "#",
        trecho_publico:
          "Trecho ocultado. Assine o plano START ou PRO para ver os detalhes e links de contato deste caso.",
        resumo_ia: "Resumo da inteligência artificial ocultado.",
        fonte: "Ocultada",
        fonte_tipo: "Ocultada",
        reportado: false,
      }));

      return NextResponse.json({
        success: true,
        data: sanitizedData,
        is_demo: true,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit),
        },
      });
    }

    let clickedIds = [];
    if (data && data.length > 0) {
      const opportunityIds = data.map((opportunity) => opportunity.id);
      const { data: clicks, error: clicksError } = await supabaseAdmin
        .from("radar_cliques")
        .select("radar_oportunidade_id")
        .eq("advogado_id", user.id)
        .in("radar_oportunidade_id", opportunityIds);

      if (!clicksError && clicks) {
        clickedIds = clicks.map((click) => click.radar_oportunidade_id);
      }
    }

    const dataWithClicked = (data || []).map((item) => ({
      ...item,
      clicado: clickedIds.includes(item.id),
    }));

    return NextResponse.json({
      success: true,
      data: dataWithClicked,
      is_demo: false,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Erro geral na API GET /api/radar:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

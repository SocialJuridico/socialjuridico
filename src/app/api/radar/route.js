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
        { status: 401 }
      );
    }

    // Validação de elegibilidade (START, PRO ou is_premium = true, ativo)
    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, role, plan_type, is_premium, subscription_status")
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
        { success: false, message: "O Radar Jurídico é de uso exclusivo para advogados START e PRO ativos." },
        { status: 403 }
      );
    }

    // Leitura dos parâmetros de busca e filtros
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get("categoria");
    const estado = searchParams.get("estado");
    const cidade = searchParams.get("cidade");
    const fonte = searchParams.get("fonte");
    const urgencia = searchParams.get("urgencia");
    const scoreMin = searchParams.get("score_min");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Construção da query
    // SEGURANÇA: Não selecionar aprovado_por nem rejeitado_motivo
    let query = supabaseAdmin
      .from("radar_oportunidades")
      .select(
        "id, titulo, categoria, fonte, url_original, trecho_publico, cidade, estado, score_intencao, urgencia, resumo_ia, status, criado_em, detectado_em, publicado_em, fonte_tipo, reportado",
        { count: "exact" }
      )
      .eq("status", "aprovado");

    if (categoria) {
      query = query.eq("categoria", categoria);
    }
    if (estado) {
      query = query.eq("estado", estado.toUpperCase());
    }
    if (cidade) {
      query = query.ilike("cidade", `%${cidade}%`);
    }
    if (fonte) {
      query = query.eq("fonte", fonte);
    }
    if (urgencia) {
      query = query.eq("urgencia", urgencia);
    }
    if (scoreMin) {
      query = query.gte("score_intencao", parseInt(scoreMin));
    }

    // Ordenação e Paginação
    query = query.order("detectado_em", { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Erro ao buscar no radar_oportunidades:", error.message);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar oportunidades públicas" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
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
      { status: 500 }
    );
  }
}

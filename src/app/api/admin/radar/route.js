import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Auxiliar para verificar se o usuário atual é admin
async function checkAdmin(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { errorStatus: 401, message: "Não autorizado" };
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("id, role")
    .eq("id", user.id)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (adminError || !admin) {
    return { errorStatus: 403, message: "Acesso restrito a administradores" };
  }

  return { user, admin };
}

// GET /api/admin/radar
// Retorna todas as oportunidades públicas com paginação e filtros para o administrador.
export async function GET(request) {
  try {
    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: adminCheck.errorStatus }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoria = searchParams.get("categoria");
    const fonte = searchParams.get("fonte");
    const fonteTipo = searchParams.get("fonte_tipo");
    const reportado = searchParams.get("reportado");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = supabaseAdmin
      .from("radar_oportunidades")
      .select("*, cliques:radar_cliques(criado_em, advogados(id, name, email))", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }
    if (categoria) {
      query = query.eq("categoria", categoria);
    }
    if (fonte) {
      query = query.eq("fonte", fonte);
    }
    if (fonteTipo) {
      query = query.eq("fonte_tipo", fonteTipo);
    }
    if (reportado === "true") {
      query = query.eq("reportado", true);
    }

    query = query.order("criado_em", { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Erro admin radar GET:", error.message);
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
    console.error("Erro geral na API GET /api/admin/radar:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

// POST /api/admin/radar
// Cria uma oportunidade manualmente pelo administrador
export async function POST(request) {
  try {
    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: adminCheck.errorStatus }
      );
    }

    const body = await request.json();
    const {
      titulo,
      categoria,
      fonte,
      url_original,
      trecho_publico,
      cidade,
      estado,
      score_intencao,
      urgencia,
      resumo_ia,
      status,
    } = body || {};

    // Validações básicas
    if (!titulo?.trim()) {
      return NextResponse.json({ success: false, message: "O título é obrigatório" }, { status: 400 });
    }
    if (!categoria?.trim()) {
      return NextResponse.json({ success: false, message: "A categoria é obrigatória" }, { status: 400 });
    }
    if (!fonte?.trim()) {
      return NextResponse.json({ success: false, message: "A fonte é obrigatória" }, { status: 400 });
    }
    if (!url_original?.trim()) {
      return NextResponse.json({ success: false, message: "A URL original é obrigatória" }, { status: 400 });
    }

    // Validação da URL
    try {
      new URL(url_original);
    } catch {
      return NextResponse.json({ success: false, message: "A URL original é inválida" }, { status: 400 });
    }

    // Validação do limite de 500 caracteres para o trecho público (proteção LGPD)
    if (trecho_publico && trecho_publico.length > 500) {
      return NextResponse.json(
        { success: false, message: "O trecho público não pode exceder 500 caracteres para fins de conformidade LGPD." },
        { status: 400 }
      );
    }

    // Validação de score e urgência
    const parsedScore = score_intencao !== undefined ? parseInt(score_intencao) : 0;
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return NextResponse.json({ success: false, message: "O score de intenção deve ser entre 0 e 100" }, { status: 400 });
    }

    const normalizedUrgency = (urgencia || "media").toLowerCase();
    if (!["baixa", "media", "alta"].includes(normalizedUrgency)) {
      return NextResponse.json({ success: false, message: "A urgência deve ser 'baixa', 'media' ou 'alta'" }, { status: 400 });
    }

    const normalizedStatus = (status || "pendente").toLowerCase();
    if (!["pendente", "aprovado", "rejeitado", "arquivado"].includes(normalizedStatus)) {
      return NextResponse.json({ success: false, message: "Status inválido" }, { status: 400 });
    }

    // Mapeia o tipo da fonte
    const fType = mapearFonteTipo(fonte);

    // Salvar no banco
    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .insert([
        {
          titulo: titulo.trim(),
          categoria: categoria.trim(),
          fonte: fonte.trim(),
          url_original: url_original.trim(),
          trecho_publico: trecho_publico?.trim() || null,
          cidade: cidade?.trim() || null,
          estado: estado?.trim() || null,
          score_intencao: parsedScore,
          urgencia: normalizedUrgency,
          resumo_ia: resumo_ia?.trim() || null,
          status: normalizedStatus,
          aprovado_por: normalizedStatus === "aprovado" ? adminCheck.user.id : null,
          publicado_em: normalizedStatus === "aprovado" ? new Date().toISOString() : null,
          fonte_tipo: fType,
          detectado_em: new Date().toISOString(),
          criado_em: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json(
          { success: false, message: "Esta URL original já está cadastrada.", isDuplicate: true },
          { status: 409 }
        );
      }
      console.error("Erro ao inserir radar_oportunidade:", error.message);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    console.log(`[Radar Admin] Oportunidade criada manualmente: ${data.id} - ${data.titulo}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro geral na API POST /api/admin/radar:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

function mapearFonteTipo(fonte) {
  if (!fonte) return "Outros";
  const f = fonte.toLowerCase().trim();
  if (f.includes("facebook")) return "Facebook";
  if (f.includes("google")) return "Google";
  if (f.includes("reddit")) return "Reddit";
  if (f.includes("twitter") || f === "x") return "X";
  if (f.includes("instagram")) return "Instagram";
  if (f.includes("jusbrasil")) return "JusBrasil";
  return "Outros";
}

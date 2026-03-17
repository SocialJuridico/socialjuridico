import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// POST /api/casos/interesse
// Body: { interestId, action: 'ACCEPT' | 'DECLINE' }
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

    const { interestId, action } = await request.json();

    if (!interestId || !["ACCEPT", "DECLINE"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Parâmetros inválidos" },
        { status: 400 },
      );
    }

    // 1. Buscar o interesse com dados do caso
    const { data: interest, error: iError } = await supabaseAdmin
      .from("case_interests")
      .select("id, case_id, lawyer_id")
      .eq("id", interestId)
      .single();

    if (iError || !interest) {
      return NextResponse.json(
        { success: false, message: "Interesse não encontrado" },
        { status: 404 },
      );
    }

    // 2. Verificar que o usuário logado é o cliente dono do caso
    const { data: caso, error: cError } = await supabaseAdmin
      .from("casos")
      .select("id, cliente_id, titulo, advogado_id")
      .eq("id", interest.case_id)
      .single();

    if (cError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    if (caso.cliente_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Você não tem permissão para responder a este interesse",
        },
        { status: 403 },
      );
    }

    if (action === "DECLINE") {
      // 3a. Recusar: tenta atualizar status, ignora se coluna não existir
      const { error: declineError } = await supabaseAdmin
        .from("case_interests")
        .update({ status: "DECLINED" })
        .eq("id", interestId);

      if (declineError && declineError.code !== "PGRST204") throw declineError;

      return NextResponse.json({
        success: true,
        message: "Interesse recusado.",
      });
    }

    // 3b. Aceitar: vincular advogado ao caso
    if (caso.advogado_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Este caso já possui um advogado vinculado",
        },
        { status: 400 },
      );
    }

    // Atualizar case_interests — ignora PGRST204 se coluna status não existir
    const { error: acceptError } = await supabaseAdmin
      .from("case_interests")
      .update({ status: "ACCEPTED" })
      .eq("id", interestId);

    if (acceptError && acceptError.code !== "PGRST204") throw acceptError;

    // Recusar automaticamente outros interesses pendentes — só se coluna status existir
    if (!acceptError) {
      await supabaseAdmin
        .from("case_interests")
        .update({ status: "DECLINED" })
        .eq("case_id", interest.case_id)
        .eq("status", "PENDING")
        .neq("id", interestId);
    }

    // Vincular advogado ao caso
    const { error: updateError } = await supabaseAdmin
      .from("casos")
      .update({
        advogado_id: interest.lawyer_id,
        status: "EM_ANDAMENTO",
        updated_at: new Date().toISOString(),
      })
      .eq("id", interest.case_id);

    if (updateError) throw updateError;

    // Notificar o advogado que foi aceito — fallback se colunas tipo/meta não existirem
    const aceitNotifBase = {
      user_id: interest.lawyer_id,
      titulo: "Proposta aceita!",
      mensagem: `O cliente aceitou o seu interesse no caso "${caso.titulo}". Você já pode iniciar o atendimento via chat.`,
      lida: false,
      created_at: new Date().toISOString(),
    };

    const { error: aceitNotifError } = await supabaseAdmin
      .from("notificacoes")
      .insert([
        {
          ...aceitNotifBase,
          tipo: "ACEITE",
          meta: JSON.stringify({ case_id: interest.case_id }),
        },
      ]);

    if (aceitNotifError?.code === "PGRST204") {
      await supabaseAdmin.from("notificacoes").insert([aceitNotifBase]);
    }

    return NextResponse.json({
      success: true,
      message: "Advogado aceito com sucesso! O chat está disponível.",
      casoId: interest.case_id,
    });
  } catch (error) {
    console.error("Erro ao processar interesse:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// GET /api/casos/interesse?clienteId=xxx
// Retorna todos os interesses pendentes dos casos do cliente logado
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

    // Buscar todos os casos do cliente
    const { data: casos, error: casosError } = await supabaseAdmin
      .from("casos")
      .select("id, titulo, area_atuacao")
      .eq("cliente_id", user.id)
      .is("advogado_id", null);

    if (casosError) throw casosError;

    if (!casos || casos.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const caseIds = casos.map((c) => c.id);

    // Buscar interesses — tenta filtrar por status PENDING, fallback sem filtro se coluna não existir
    let interests = [];
    const { data: interestsWithStatus, error: intError } = await supabaseAdmin
      .from("case_interests")
      .select("id, case_id, lawyer_id, status, created_at")
      .in("case_id", caseIds)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (intError?.code === "PGRST204") {
      // Coluna status não existe ainda — busca todos e assume todos como PENDING
      const { data: allInterests, error: fallbackError } = await supabaseAdmin
        .from("case_interests")
        .select("id, case_id, lawyer_id, created_at")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false });
      if (fallbackError) throw fallbackError;
      interests = (allInterests || []).map((i) => ({
        ...i,
        status: "PENDING",
      }));
    } else {
      if (intError) throw intError;
      interests = interestsWithStatus || [];
    }

    const lawyerIds = [
      ...new Set((interests || []).map((i) => i.lawyer_id).filter(Boolean)),
    ];
    let lawyerNamesById = {};

    if (lawyerIds.length > 0) {
      const { data: lawyers } = await supabaseAdmin
        .from("advogados")
        .select("id, name")
        .in("id", lawyerIds);

      lawyerNamesById = Object.fromEntries(
        (lawyers || []).map((l) => [l.id, l.name]),
      );
    }

    // Adicionar título do caso e nome do advogado a cada interesse
    const casosMap = Object.fromEntries(casos.map((c) => [c.id, c]));
    const enriched = (interests || []).map((i) => ({
      ...i,
      lawyer_name: lawyerNamesById[i.lawyer_id] || "Advogado",
      caso_titulo: casosMap[i.case_id]?.titulo || "Caso desconhecido",
      caso_area: casosMap[i.case_id]?.area_atuacao || "",
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Erro ao buscar interesses:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

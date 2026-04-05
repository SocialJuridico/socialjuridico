import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// POST /api/avaliacoes — Cliente avalia um advogado após negociação
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

    const { advogado_id, caso_id, nota, justificativa } = await request.json();

    if (!advogado_id || !caso_id || nota === undefined || nota === null) {
      return NextResponse.json(
        { success: false, message: "Dados obrigatórios ausentes: advogado_id, caso_id, nota" },
        { status: 400 }
      );
    }

    if (nota < 0 || nota > 5 || !Number.isInteger(Number(nota))) {
      return NextResponse.json(
        { success: false, message: "Nota deve ser um número inteiro entre 0 e 5" },
        { status: 400 }
      );
    }

    const db = supabaseAdmin;

    // Verificar que o usuário é cliente dono do caso
    const { data: caso, error: caseError } = await db
      .from("casos")
      .select("id, cliente_id, advogado_id, status")
      .eq("id", caso_id)
      .single();

    if (caseError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 }
      );
    }

    if (caso.cliente_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Você não tem permissão para avaliar este caso" },
        { status: 403 }
      );
    }

    // Verificar que o advogado_id bate com o caso (ou é alguém que negociou)
    if (caso.advogado_id && caso.advogado_id !== advogado_id) {
      // Aceitar avaliação de qualquer advogado que negociou
      const { data: interest } = await db
        .from("case_interests")
        .select("id")
        .eq("case_id", caso_id)
        .eq("lawyer_id", advogado_id)
        .in("status", ["NEGOTIATING", "HIRED", "DECLINED"])
        .maybeSingle();

      if (!interest) {
        return NextResponse.json(
          { success: false, message: "Este advogado não negociou neste caso" },
          { status: 400 }
        );
      }
    }

    // Verificar que o cliente ainda não avaliou este advogado para este caso (1 avaliação por par)
    const { data: existente } = await db
      .from("avaliacoes_advogado")
      .select("id")
      .eq("cliente_id", user.id)
      .eq("advogado_id", advogado_id)
      .eq("caso_id", caso_id)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        { success: false, message: "Você já avaliou este advogado para este caso" },
        { status: 409 }
      );
    }

    // Inserir avaliação
    const { data: avaliacao, error: insertError } = await db
      .from("avaliacoes_advogado")
      .insert([
        {
          cliente_id: user.id,
          advogado_id,
          caso_id,
          nota: Number(nota),
          justificativa: justificativa?.trim() || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: "Avaliação registrada com sucesso!",
      id: avaliacao.id,
    });
  } catch (error) {
    console.error("Erro ao salvar avaliação:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao salvar avaliação" },
      { status: 500 }
    );
  }
}

// GET /api/avaliacoes — Admin: lista todas as avaliações com detalhes
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

    const db = supabaseAdmin;

    // Verificar se é admin
    const { data: admin } = await db
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const advogadoId = searchParams.get("advogado_id");

    let query = db
      .from("avaliacoes_advogado")
      .select(`
        id,
        nota,
        justificativa,
        created_at,
        cliente_id,
        advogado_id,
        caso_id
      `)
      .order("created_at", { ascending: false });

    if (advogadoId) {
      query = query.eq("advogado_id", advogadoId);
    }

    const { data: avaliacoes, error } = await query;
    if (error) throw error;

    // Enriquecer com nomes de advogados e clientes
    const advIds = [...new Set(avaliacoes.map((a) => a.advogado_id))];
    const cliIds = [...new Set(avaliacoes.map((a) => a.cliente_id))];
    const caseIds = [...new Set(avaliacoes.map((a) => a.caso_id))];

    const [{ data: advogados }, { data: clientes }, { data: casos }] = await Promise.all([
      db.from("advogados").select("id, name").in("id", advIds),
      db.from("clientes").select("id, name").in("id", cliIds),
      db.from("casos").select("id, titulo").in("id", caseIds),
    ]);

    const advMap = Object.fromEntries((advogados || []).map((a) => [a.id, a.name]));
    const cliMap = Object.fromEntries((clientes || []).map((c) => [c.id, c.name]));
    const caseMap = Object.fromEntries((casos || []).map((c) => [c.id, c.titulo]));

    const enriched = avaliacoes.map((a) => ({
      ...a,
      advogado_nome: advMap[a.advogado_id] || "Advogado",
      cliente_nome: cliMap[a.cliente_id] || "Cliente",
      caso_titulo: caseMap[a.caso_id] || "Caso",
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno" },
      { status: 500 }
    );
  }
}

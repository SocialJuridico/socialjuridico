import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isLawyer } from "@/lib/securityUtils";
import { NextResponse } from "next/server";

// POST /api/casos/chat-start
// Body: { casoId }
// Cobra 4 Juris do advogado ao iniciar atendimento via chat pela primeira vez.
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

    const db = supabaseAdmin || supabase;
    if (!(await isLawyer(db, user.id))) {
      return NextResponse.json(
        { success: false, message: "Apenas advogados utilizam esta rota" },
        { status: 403 },
      );
    }

    const { casoId, interestId } = await request.json();

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "casoId é obrigatório" },
        { status: 400 },
      );
    }

    // Se houver interestId, é um chat de NEGOCIAÇÃO
    if (interestId) {
      const { data: interest, error: iError } = await db
        .from("case_interests")
        .select("id, lawyer_id")
        .eq("id", interestId)
        .single();
        
      if (iError || !interest) {
        console.error("Erro ao buscar case_interests:", iError);
        return NextResponse.json(
          { success: false, message: "Interesse não encontrado" },
          { status: 404 },
        );
      }

      // Verificar se o usuário é o advogado do interesse OU o cliente dono do caso
      const { data: casoOwner } = await db
        .from("casos")
        .select("cliente_id, chat_started")
        .eq("id", casoId)
        .single();

      const isInterestLawyer = interest.lawyer_id === user.id;
      const isCaseClient = casoOwner?.cliente_id === user.id;

      if (!isInterestLawyer && !isCaseClient) {
        return NextResponse.json(
          { success: false, message: "Interesse inválido ou não autorizado" },
          { status: 403 },
        );
      }

      // O advogado já pagou 1 Juri na hora de manifestar o interesse (rota /vincular).
      // O cliente não paga.
      // E a tabela 'case_interests' não possui coluna 'chat_started', portanto não precisa atualizar nada.
      return NextResponse.json({
        success: true,
        alreadyStarted: true,
        message: "Acesso autorizado ao chat de negociação.",
      });
    }

    // 1. Verificar se o caso pertence ao advogado logado (fluxo contratado tradicional)
    const { data: caso, error: cError } = await db
      .from("casos")
      .select("id, advogado_id, chat_started, titulo, cliente_id")
      .eq("id", casoId)
      .single();

    if (cError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    if (caso.advogado_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Você não é o advogado vinculado a este caso",
        },
        { status: 403 },
      );
    }

    // 2. Se já foi iniciado, pode prosseguir sem cobrar novamente
    if (caso.chat_started) {
      return NextResponse.json({
        success: true,
        alreadyStarted: true,
        message: "Chat já iniciado anteriormente.",
      });
    }

    // 3. Verificar saldo do advogado (precisa de 4 Juris)
    const { data: advogado, error: advError } = await db
      .from("advogados")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (advError || !advogado) {
      return NextResponse.json(
        { success: false, message: "Perfil de advogado não encontrado" },
        { status: 404 },
      );
    }

    if ((advogado.balance || 0) < 4) {
      return NextResponse.json(
        {
          success: false,
          message: `Saldo insuficiente. Você precisa de 4 Juris para iniciar o atendimento. Saldo atual: ${advogado.balance || 0} Juri(s).`,
          balance: advogado.balance || 0,
        },
        { status: 402 },
      );
    }

    // 4. Debitar 4 Juris e marcar chat_started
    const newBalance = advogado.balance - 4;

    await Promise.all([
      db.from("advogados").update({ balance: newBalance }).eq("id", user.id),
      db.from("casos").update({ chat_started: true }).eq("id", casoId),
    ]);

    return NextResponse.json({
      success: true,
      alreadyStarted: false,
      message: "Chat iniciado! 4 Juris debitados.",
      newBalance,
    });
  } catch (error) {
    console.error("Erro ao iniciar chat:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

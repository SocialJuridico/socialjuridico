import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
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

    const role = user.user_metadata?.role;
    if (role !== "LAWYER") {
      return NextResponse.json(
        { success: false, message: "Apenas advogados utilizam esta rota" },
        { status: 403 },
      );
    }

    const { casoId } = await request.json();

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "casoId é obrigatório" },
        { status: 400 },
      );
    }

    // 1. Verificar se o caso pertence ao advogado logado
    const { data: caso, error: cError } = await supabaseAdmin
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
    const { data: advogado, error: advError } = await supabaseAdmin
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
      supabaseAdmin
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", user.id),
      supabaseAdmin
        .from("casos")
        .update({ chat_started: true })
        .eq("id", casoId),
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

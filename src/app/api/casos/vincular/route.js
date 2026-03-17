import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isLawyer } from "@/lib/securityUtils";
import { NextResponse } from "next/server";

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

    const { casoId } = await request.json();

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    // 1. Verificar se o usuário é um advogado PRO
    const db = supabaseAdmin || supabase;
    if (!(await isLawyer(db, user.id))) {
      return NextResponse.json(
        {
          success: false,
          message: "Apenas advogados podem manifestar interesse em casos",
        },
        { status: 403 },
      );
    }

    // 2. Buscar perfil do advogado (is_premium + balance + name)
    const { data: advogado, error: advError } = await db
      .from("advogados")
      .select("id, name, is_premium, balance")
      .eq("id", user.id)
      .single();

    if (advError || !advogado) {
      return NextResponse.json(
        { success: false, message: "Perfil de advogado não encontrado" },
        { status: 404 },
      );
    }

    if (!advogado.is_premium) {
      return NextResponse.json(
        {
          success: false,
          message: "Apenas advogados PRO podem manifestar interesse em casos",
        },
        { status: 403 },
      );
    }

    if ((advogado.balance || 0) < 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Saldo insuficiente. Você precisa de pelo menos 1 Juri para manifestar interesse.",
        },
        { status: 402 },
      );
    }

    // 3. Verificar se o caso ainda está disponível
    const { data: caso, error: fetchError } = await db
      .from("casos")
      .select("id, status, advogado_id, cliente_id, titulo")
      .eq("id", casoId)
      .single();

    if (fetchError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    if (caso.advogado_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Este caso já possui um advogado vinculado",
        },
        { status: 400 },
      );
    }

    if (caso.status !== "ABERTO") {
      return NextResponse.json(
        { success: false, message: "Este caso não está mais disponível" },
        { status: 400 },
      );
    }

    // 4. Verificar se já manifestou interesse neste caso
    const { data: existingInterest } = await db
      .from("case_interests")
      .select("id")
      .eq("case_id", casoId)
      .eq("lawyer_id", user.id)
      .single();

    if (existingInterest) {
      return NextResponse.json(
        { success: false, message: "Você já manifestou interesse neste caso." },
        { status: 400 },
      );
    }

    // 5. Registrar o interesse — tenta com 'status', faz fallback se coluna não existir
    const now = new Date().toISOString();
    const interestId = crypto.randomUUID();

    const { error: interestError } = await db.from("case_interests").insert([
      {
        id: interestId,
        case_id: casoId,
        lawyer_id: user.id,
        status: "PENDING",
        created_at: now,
      },
    ]);

    if (interestError) {
      // Se a coluna 'status' ainda não existe no banco, insere sem ela
      if (
        interestError.code === "PGRST204" &&
        interestError.message?.includes("status")
      ) {
        const { error: fallbackError } = await db
          .from("case_interests")
          .insert([
            {
              id: interestId,
              case_id: casoId,
              lawyer_id: user.id,
              created_at: now,
            },
          ]);
        if (fallbackError) throw fallbackError;
      } else {
        throw interestError;
      }
    }

    // 6. Debitar 1 Juri do saldo do advogado
    const { error: balanceError } = await db
      .from("advogados")
      .update({ balance: advogado.balance - 1 })
      .eq("id", user.id);

    if (balanceError) throw balanceError;

    // 7. Notificar o cliente — fallback se colunas tipo/meta não existirem
    const notifBase = {
      user_id: caso.cliente_id,
      titulo: "Advogado interessado no seu caso!",
      mensagem: `O advogado ${advogado.name} manifestou interesse no seu caso "${caso.titulo}". Acesse o Painel para aceitar ou recusar.`,
      lida: false,
      created_at: now,
    };

    const { error: notifError } = await db.from("notificacoes").insert([
      {
        ...notifBase,
        tipo: "INTERESSE",
        meta: JSON.stringify({ case_id: casoId, lawyer_id: user.id }),
      },
    ]);

    if (notifError?.code === "PGRST204") {
      // Colunas tipo/meta não existem ainda — insere sem elas
      await db.from("notificacoes").insert([notifBase]);
    }

    return NextResponse.json({
      success: true,
      message: "Interesse manifestado com sucesso! O cliente foi notificado.",
      newBalance: advogado.balance - 1,
    });
  } catch (error) {
    console.error("Erro ao manifestar interesse:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

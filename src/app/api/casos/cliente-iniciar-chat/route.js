import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// POST /api/casos/cliente-iniciar-chat
// Caso o cliente escolha um advogado PRO para falar diretamente
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

    const { caseId, lawyerId } = await request.json();

    if (!caseId || !lawyerId) {
      return NextResponse.json(
        { success: false, message: "Parâmetros obrigatórios ausentes" },
        { status: 400 },
      );
    }

    // 1. Buscar Perfil do Advogado
    const { data: lawyer, error: lError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, is_premium, balance")
      .eq("id", lawyerId)
      .single();

    if (lError || !lawyer) {
      return NextResponse.json(
        { success: false, message: "Advogado não encontrado" },
        { status: 404 },
      );
    }

    // Apenas PRO podem ser contatados diretamente
    if (!lawyer.is_premium) {
      return NextResponse.json(
        {
          success: false,
          message: "Este advogado não aceita contatos diretos no momento.",
        },
        { status: 403 },
      );
    }

    // 2. Buscar o Caso
    const { data: caso, error: cError } = await supabaseAdmin
      .from("casos")
      .select("id, cliente_id, titulo, advogado_id, status")
      .eq("id", caseId)
      .single();

    if (cError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    if (caso.cliente_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Você não tem permissão neste caso" },
        { status: 403 },
      );
    }

    // Já vinculado?
    if (caso.advogado_id) {
      if (caso.advogado_id === lawyerId) {
        return NextResponse.json({
          success: true,
          message: "Você já está em contato com este advogado.",
        });
      }
      return NextResponse.json(
        { success: false, message: "Este caso já possui um advogado vinculado" },
        { status: 400 },
      );
    }

    // 4. Executar Vinculação (Sem débito para o advogado quando o cliente inicia)
    const now = new Date().toISOString();

    const { error: updateCaseError } = await supabaseAdmin
      .from("casos")
      .update({
        advogado_id: lawyerId,
        status: "EM_ANDAMENTO",
        chat_started: true,
        updated_at: now,
      })
      .eq("id", caseId);

    if (updateCaseError) throw updateCaseError;

    // 5. Notificar o Advogado
    const notifBase = {
      user_id: lawyerId,
      titulo: "Novo chat iniciado por cliente!",
      mensagem: `Um cliente iniciou um contato direto sobre o caso: "${caso.titulo}".`,
      lida: false,
      created_at: now,
    };

    const { error: notifError } = await supabaseAdmin
      .from("notificacoes")
      .insert([
        {
          ...notifBase,
          tipo: "CHAT_INICIADO",
          meta: JSON.stringify({ case_id: caseId }),
        },
      ]);

    if (notifError?.code === "PGRST204") {
      await supabaseAdmin.from("notificacoes").insert([notifBase]);
    }

    return NextResponse.json({
      success: true,
      message: "Chat iniciado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao iniciar chat via cliente:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

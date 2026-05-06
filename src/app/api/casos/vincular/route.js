import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isLawyer } from "@/lib/securityUtils";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { interesseCasoTemplate } from "@/lib/emailTemplates";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";

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

    // 1. Verificar se o usuário é um advogado
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
      .select("id, name, avatar, is_premium, balance")
      .eq("id", user.id)
      .single();

    if (advError || !advogado) {
      return NextResponse.json(
        { success: false, message: "Perfil de advogado não encontrado" },
        { status: 404 },
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

    // 3. Verificar se o caso está disponível (ABERTO ou NEGOCIANDO)
    const { data: caso, error: fetchError } = await db
      .from("casos")
      .select("id, status, advogado_id, cliente_id, titulo, negotiating_lawyers")
      .eq("id", casoId)
      .single();

    if (fetchError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    // Caso CONTRATADO ou com advogado já definido não aceita mais interesses
    if (caso.advogado_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Este caso já possui um advogado contratado",
        },
        { status: 400 },
      );
    }

    // Agora aceita ABERTO e NEGOCIANDO
    if (!["ABERTO", "NEGOCIANDO"].includes(caso.status)) {
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

    // 5. Registrar o interesse
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

    if (interestError) throw interestError;

    // 6. Debitar 1 Juri do saldo do advogado
    const newBalance = advogado.balance - 1;
    const { error: balanceError } = await db
      .from("advogados")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (balanceError) throw balanceError;

    // Verificar e notificar estoque baixo de Juris
    await checkAndNotifyLowBalance(user.id, advogado.balance, newBalance);

    // 7. Notificar o cliente
    const notifBase = {
      user_id: caso.cliente_id,
      titulo: "Advogado interessado no seu caso!",
      mensagem: `O advogado ${advogado.name} manifestou interesse no seu caso "${caso.titulo}". Acesse o Painel para aceitar ou recusar.`,
      lida: false,
      created_at: now,
      tipo: "INTERESSE",
      meta: JSON.stringify({ case_id: casoId, lawyer_id: user.id }),
    };

    await db.from("notificacoes").insert([notifBase]);

    // 📣 ENVIAR PUSH NOTIFICATION PARA O CLIENTE
    await sendPushNotification({
      userIds: [caso.cliente_id],
      title: "Interesse no seu caso! ⚖️",
      message: `O advogado ${advogado.name} manifestou interesse no seu caso "${caso.titulo}".`,
      url: "/dashboard/cliente"
    });

    // 📧 ENVIAR EMAIL PARA O CLIENTE VIA RESEND
    try {
      const { data: cliente } = await db
        .from("clientes")
        .select("name, email")
        .eq("id", caso.cliente_id)
        .single();

      if (cliente?.email) {
        await resend.emails.send({
          from: 'Social Jurídico <contato@socialjuridico.com.br>',
          to: cliente.email,
          subject: `⚖️ Advogado interessado no seu caso "${caso.titulo}"`,
          html: interesseCasoTemplate({
            titulo: caso.titulo,
            lawyerName: advogado.name || 'Um advogado',
            clientName: cliente.name || 'Cliente',
          }),
        });
        console.log(`📧 Email de interesse enviado para ${cliente.email}`);
      }
    } catch (emailErr) {
      console.error("⚠️ Erro ao enviar email de interesse (não-fatal):", emailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Interesse manifestado com sucesso! O cliente foi notificado.",
      newBalance: newBalance,
    });
  } catch (error) {
    console.error("Erro ao manifestar interesse:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

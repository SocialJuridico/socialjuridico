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

    const { searchParams } = new URL(request.url);
    const casoId = searchParams.get("casoId");

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    const db = supabaseAdmin || supabase;
    const { count, error } = await db
      .from("case_interests")
      .select("*", { count: "exact", head: true })
      .eq("case_id", casoId)
      .in("status", ["PENDING", "NEGOTIATING"]);

    if (error) throw error;

    return NextResponse.json({ success: true, count: count || 0 });
  } catch (error) {
    console.error("Erro ao obter contagem de interesses:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const casoId = searchParams.get("casoId");

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    const db = supabaseAdmin || supabase;
    if (!(await isLawyer(db, user.id))) {
      return NextResponse.json(
        { success: false, message: "Apenas advogados podem desfazer interesse" },
        { status: 403 },
      );
    }

    // 1. Buscar a manifestação de interesse deste advogado para este caso
    const { data: interest, error: interestError } = await db
      .from("case_interests")
      .select("id, status, lawyer_id, case_id")
      .eq("case_id", casoId)
      .eq("lawyer_id", user.id)
      .single();

    if (interestError || !interest) {
      return NextResponse.json(
        { success: false, message: "Manifestação de interesse não encontrada neste caso" },
        { status: 404 },
      );
    }

    // 2. Verificar exigência 1: O Cliente não pode ter aceitado o interesse do advogado que manifestou o interesse (status PENDING)
    if (interest.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Você não pode desfazer interesse pois ele já foi respondido ou aceito pelo cliente.",
        },
        { status: 400 },
      );
    }

    // 3. Verificar exigência 2: O Cliente não pode ter aceitado o interesse de NENHUM outro advogado (nenhum outro interesse NEGOTIATING ou HIRED)
    const { data: otherInterests, error: otherError } = await db
      .from("case_interests")
      .select("id")
      .eq("case_id", casoId)
      .in("status", ["NEGOTIATING", "HIRED"]);

    if (otherError) throw otherError;

    if (otherInterests && otherInterests.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Não é possível desfazer o interesse pois o cliente já iniciou negociação com outro advogado.",
        },
        { status: 400 },
      );
    }

    // 4. Deletar a manifestação de interesse
    const { error: deleteError } = await db
      .from("case_interests")
      .delete()
      .eq("id", interest.id);

    if (deleteError) throw deleteError;

    // 5. Buscar caso para deletar notificação correspondente
    const { data: caso } = await db
      .from("casos")
      .select("cliente_id")
      .eq("id", casoId)
      .single();

    if (caso?.cliente_id) {
      await db
        .from("notificacoes")
        .delete()
        .eq("user_id", caso.cliente_id)
        .eq("tipo", "INTERESSE")
        .like("meta", `%${user.id}%`)
        .like("meta", `%${casoId}%`);
    }

    // 6. Devolver 1 Juri para o saldo do advogado
    const { data: advogado, error: advError } = await db
      .from("advogados")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (advError || !advogado) {
      return NextResponse.json(
        { success: false, message: "Perfil do advogado não encontrado" },
        { status: 404 },
      );
    }

    const newBalance = (advogado.balance || 0) + 1;
    const { error: balanceError } = await db
      .from("advogados")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (balanceError) throw balanceError;

    return NextResponse.json({
      success: true,
      message: "Manifestação de interesse desfeita e 1 Juri foi reembolsado com sucesso.",
      newBalance: newBalance,
    });
  } catch (error) {
    console.error("Erro ao desfazer interesse:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

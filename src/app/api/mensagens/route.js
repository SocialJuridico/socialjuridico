import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { novaMensagemTemplate, novaMensagemClienteTemplate } from "@/lib/emailTemplates";

// GET /api/mensagens?caso_id=xxx&interest_id=yyy
export async function GET(request) {
  try {
    let user = null;

    // 1. Tentar Bearer Token (para mobile)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user: tokenUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (tokenUser && !error) {
        user = tokenUser;
      }
    }

    // 2. Fallback para cookies (web)
    if (!user) {
      const supabase = createClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const caso_id = searchParams.get("caso_id");
    const interest_id = searchParams.get("interest_id");

    if (!caso_id) {
      return NextResponse.json(
        { success: false, message: "caso_id é obrigatório" },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from("mensagens")
      .select("*")
      .eq("caso_id", caso_id)
      .order("created_at", { ascending: true });

    // Se interest_id fornecido, filtrar mensagens dessa negociação
    if (interest_id) {
      query = query.eq("interest_id", interest_id);
    } else {
      // Sem interest_id, mostrar apenas mensagens sem interest_id (chat pós-contratação)
      // OU todas as mensagens se o caso já está contratado (backward compat)
      query = query.is("interest_id", null);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/mensagens:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// POST /api/mensagens
export async function POST(request) {
  try {
    let user = null;

    // 1. Tentar Bearer Token (para mobile)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user: tokenUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (tokenUser && !error) {
        user = tokenUser;
      }
    }

    // 2. Fallback para cookies (web)
    if (!user) {
      const supabase = createClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { caso_id, content, interest_id } = body;

    if (!caso_id || !content?.trim()) {
      return NextResponse.json(
        { success: false, message: "caso_id e conteúdo são obrigatórios" },
        { status: 400 },
      );
    }

    // Se interest_id, validar que o usuário é parte dessa negociação
    if (interest_id) {
      const { data: interest } = await supabaseAdmin
        .from("case_interests")
        .select("id, lawyer_id, case_id, status")
        .eq("id", interest_id)
        .single();

      if (!interest) {
        return NextResponse.json(
          { success: false, message: "Negociação não encontrada" },
          { status: 404 },
        );
      }

      // Verificar se o interesse está ativo (NEGOTIATING ou HIRED)
      if (!["NEGOTIATING", "HIRED"].includes(interest.status)) {
        return NextResponse.json(
          { success: false, message: "Esta negociação não está mais ativa" },
          { status: 403 },
        );
      }

      // Verificar se é o advogado ou o cliente do caso
      const { data: casoCheck } = await supabaseAdmin
        .from("casos")
        .select("cliente_id")
        .eq("id", caso_id)
        .single();

      if (user.id !== interest.lawyer_id && user.id !== casoCheck?.cliente_id) {
        return NextResponse.json(
          { success: false, message: "Você não tem acesso a esta negociação" },
          { status: 403 },
        );
      }
    }

    const insertData = {
      caso_id,
      sender_id: user.id,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Adicionar interest_id se fornecido
    if (interest_id) {
      insertData.interest_id = interest_id;
    }

    const { data, error } = await supabaseAdmin
      .from("mensagens")
      .insert([insertData])
      .select();

    if (error) throw error;

    // Notificar o outro participante
    const { data: caso } = await supabaseAdmin
      .from("casos")
      .select("id, titulo, cliente_id, advogado_id")
      .eq("id", caso_id)
      .single();

    if (caso) {
      let recipientId;

      if (interest_id) {
        // Chat de negociação: notificar o outro lado
        const { data: interest } = await supabaseAdmin
          .from("case_interests")
          .select("lawyer_id")
          .eq("id", interest_id)
          .single();

        if (interest) {
          recipientId = user.id === caso.cliente_id 
            ? interest.lawyer_id 
            : caso.cliente_id;
        }
      } else {
        // Chat normal (pós-contratação)
        recipientId =
          user.id === caso.cliente_id ? caso.advogado_id : caso.cliente_id;
      }

      if (recipientId && recipientId !== user.id) {
        await supabaseAdmin.from("notificacoes").insert([{
          id: crypto.randomUUID(),
          user_id: recipientId,
          titulo: "Nova mensagem no chat",
          mensagem: `Você recebeu uma nova mensagem no caso "${caso.titulo}".`,
          lida: false,
          created_at: new Date().toISOString(),
          tipo: "MENSAGEM",
          meta: JSON.stringify({ case_id: caso_id, interest_id: interest_id || null }),
        }]);

        // 📣 ENVIAR PUSH NOTIFICATION (MENSAGEM)
        await sendPushNotification({
          userIds: [recipientId],
          title: "Nova mensagem! 💬",
          message: `Você recebeu uma nova mensagem no caso "${caso.titulo}".`,
          url: interest_id 
            ? `/dashboard/${user.id === caso.cliente_id ? 'advogado' : 'cliente'}` 
            : `/chat/${caso_id}`
        });

        // 📧 ENVIAR EMAIL SE O CLIENTE MANDOU MSG PARA O ADVOGADO
        if (user.id === caso.cliente_id) {
          try {
            const { data: advMsg } = await supabaseAdmin
              .from("advogados")
              .select("name, email")
              .eq("id", recipientId)
              .single();
            if (advMsg?.email) {
              await resend.emails.send({
                from: 'Social Jurídico <contato@socialjuridico.com.br>',
                to: advMsg.email,
                subject: `💬 Nova mensagem no caso "${caso.titulo}"`,
                html: novaMensagemTemplate({ lawyerName: advMsg.name || 'Advogado(a)', casoTitulo: caso.titulo }),
              });
              console.log(`📧 Email de nova mensagem enviado para ${advMsg.email}`);
            }
          } catch (emailErr) {
            console.error("⚠️ Erro ao enviar email de mensagem (não-fatal):", emailErr.message);
          }
        }

        // 📧 ENVIAR EMAIL SE O ADVOGADO MANDOU MSG PARA O CLIENTE
        if (user.id !== caso.cliente_id) {
          try {
            // Buscar nome do advogado remetente
            const { data: advSender } = await supabaseAdmin
              .from("advogados")
              .select("name")
              .eq("id", user.id)
              .single();
            // Buscar dados do cliente destinatário
            const { data: clienteMsg } = await supabaseAdmin
              .from("clientes")
              .select("name, email")
              .eq("id", recipientId)
              .single();
            if (clienteMsg?.email) {
              await resend.emails.send({
                from: 'Social Jurídico <contato@socialjuridico.com.br>',
                to: clienteMsg.email,
                subject: `💬 Nova mensagem do advogado no caso "${caso.titulo}"`,
                html: novaMensagemClienteTemplate({
                  clientName: clienteMsg.name || 'Cliente',
                  casoTitulo: caso.titulo,
                  lawyerName: advSender?.name || 'Seu advogado',
                }),
              });
              console.log(`📧 Email de nova mensagem enviado para cliente ${clienteMsg.email}`);
            }
          } catch (emailErr) {
            console.error("⚠️ Erro ao enviar email de mensagem ao cliente (não-fatal):", emailErr.message);
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Erro na API POST /api/mensagens:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

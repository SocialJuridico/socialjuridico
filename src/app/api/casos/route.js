import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { novoCasoTemplate, casoCanceladoTemplate, oportunidadeLocalTemplate } from "@/lib/emailTemplates";

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
    const role = (await getRoleFromDatabase(db, user.id)) || "CLIENT";
    if (role !== "CLIENT") {
      return NextResponse.json(
        { success: false, message: "Apenas clientes podem publicar casos" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { titulo, descricao, area_atuacao, anexos, cidade, estado } = body || {};

    if (!titulo?.trim() || !descricao?.trim() || !area_atuacao?.trim() || !cidade?.trim() || !estado?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Título, descrição, área de atuação, cidade e estado em que se encontra o caso são obrigatórios",
        },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("casos")
      .insert([
        {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          area_atuacao: area_atuacao.trim(),
          cidade: cidade.trim(),
          estado: estado.trim(),
          cliente_id: user.id,
          anexos: Array.isArray(anexos) ? anexos : [],
          status: "ABERTO",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro Supabase ao criar caso:", error);
      throw error;
    }

    // 📣 ENVIAR PUSH NOTIFICATION PARA ADVOGADOS (ONESIGNAL)
    await sendPushNotification({
      roles: ["LAWYER"],
      title: "SocialJurídico 📍",
      message: `🚩 Nova Oportunidade: ${titulo.substring(0, 50)}... em ${cidade}/${estado}.`,
      url: "/dashboard/advogado"
    });

    // 📧 ENVIAR EMAIL PARA TODOS OS ADVOGADOS VIA RESEND (BATCH API)
    try {
      const { data: advogados, error: advError } = await db
        .from("advogados")
        .select("name, email, estado")
        .not("email", "is", null);

      if (!advError && advogados && advogados.length > 0) {
        // Deduplicar emails (evita envios duplicados)
        const seenEmails = new Set();
        const uniqueAdvogados = advogados.filter(adv => {
          const email = adv.email?.trim().toLowerCase();
          if (!email || seenEmails.has(email)) return false;
          seenEmails.add(email);
          return true;
        });

        const localAdvogados = uniqueAdvogados.filter(a => a.estado === estado);
        const otherAdvogados = uniqueAdvogados.filter(a => a.estado !== estado);

        console.log(`📧 Enviando email de novo caso: ${localAdvogados.length} locais (${estado}) e ${otherAdvogados.length} de outros estados...`);

        // Usar Resend Batch API: até 100 emails por chamada, com delay entre lotes
        const BATCH_SIZE = 100;
        const DELAY_BETWEEN_BATCHES_MS = 1500; // 1.5s entre lotes para respeitar rate limit

        // ============================================
        // 1. ENVIAR EMAILS LOCAIS (TEMPLATE ESPECÍFICO)
        // ============================================
        for (let i = 0; i < localAdvogados.length; i += BATCH_SIZE) {
          const batch = localAdvogados.slice(i, i + BATCH_SIZE);
          
          const emailPayloads = batch.map((adv) => ({
            from: 'Social Jurídico <contato@socialjuridico.com.br>',
            to: [adv.email.trim()],
            subject: `📍 Oportunidade Exclusiva: Novo caso em ${cidade} / ${estado}`,
            html: oportunidadeLocalTemplate({
              titulo: titulo.trim(),
              area_atuacao: area_atuacao.trim(),
              cidade: cidade.trim(),
              estado: estado.trim(),
              lawyerName: adv.name || 'Advogado(a)',
            }),
          }));

          try {
            const { error: batchError } = await resend.batch.send(emailPayloads);
            if (batchError) console.error(`⚠️ Erro no lote local:`, batchError);
          } catch (batchErr) {
            console.error(`❌ Falha no lote local:`, batchErr.message);
          }

          if (i + BATCH_SIZE < localAdvogados.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
          }
        }

        // Delay antes de iniciar os envios gerais
        if (localAdvogados.length > 0 && otherAdvogados.length > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }

        // ============================================
        // 2. ENVIAR EMAILS GERAIS (TEMPLATE PADRÃO)
        // ============================================
        for (let i = 0; i < otherAdvogados.length; i += BATCH_SIZE) {
          const batch = otherAdvogados.slice(i, i + BATCH_SIZE);
          
          const emailPayloads = batch.map((adv) => ({
            from: 'Social Jurídico <contato@socialjuridico.com.br>',
            to: [adv.email.trim()],
            subject: `📍 Nova Oportunidade: ${area_atuacao} em ${cidade}/${estado}`,
            html: novoCasoTemplate({
              titulo: titulo.trim(),
              area_atuacao: area_atuacao.trim(),
              cidade: cidade.trim(),
              estado: estado.trim(),
              lawyerName: adv.name || 'Advogado(a)',
            }),
          }));

          try {
            const { error: batchError } = await resend.batch.send(emailPayloads);
            if (batchError) console.error(`⚠️ Erro no lote geral:`, batchError);
          } catch (batchErr) {
            console.error(`❌ Falha no lote geral:`, batchErr.message);
          }

          if (i + BATCH_SIZE < otherAdvogados.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
          }
        }

        console.log(`✅ Todos os emails de novo caso foram processados.`);
      }
    } catch (emailErr) {
      console.error("⚠️ Erro ao enviar emails de novo caso (não-fatal):", emailErr.message);
      // Não bloqueia a criação do caso se o email falhar
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API POST /api/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
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
      // ⚠️ SEGURANÇA: Não logar detalhes de autenticação
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const role = (await getRoleFromDatabase(db, user.id)) || "CLIENT";
    // ⚠️ SEGURANÇA: Não logar user.id ou user.email

    let query = db.from("casos").select("*");

    if (role === "LAWYER") {
      // Advogado vê:
      // - Casos vinculados a ele (contratados)
      // - Casos ABERTOS sem advogado (oportunidades)
      // - Casos NEGOCIANDO sem advogado definido (em negociação)
      const { data, error } = await db
        .from("casos")
        .select("*")
        .or(
          `advogado_id.eq.${user.id},and(status.eq.ABERTO,advogado_id.is.null),and(status.eq.NEGOCIANDO,advogado_id.is.null)`,
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    } else {
      // Cliente vê apenas os próprios casos
      const { data, error } = await db
        .from("casos")
        .select("*")
        .eq("cliente_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Se não achou nada, verificamos por email (debug)
      if (data.length === 0) {
        const { data: profile } = await db
          .from("clientes")
          .select("id")
          .eq("email", user.email)
          .single();
        if (profile && profile.id !== user.id) {
          const { data: emailData } = await db
            .from("casos")
            .select("*")
            .eq("cliente_id", profile.id);
          if (emailData && emailData.length > 0)
            return NextResponse.json({ success: true, data: emailData });
        }
      }
      return NextResponse.json({ success: true, data: data || [] });
    }
  } catch (error) {
    console.error("Erro na API de Casos:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
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

    const body = await request.json();
    const { id, titulo, descricao, area_atuacao, cidade, estado } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    // ⚠️ SEGURANÇA: Não logar user.id

    const { data, error } = await supabaseAdmin
      .from("casos")
      .update({
        titulo,
        descricao,
        area_atuacao,
        cidade,
        estado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("cliente_id", user.id) // Garante que o cliente só edite os próprios casos
      .select();

    if (error) {
      console.error("Erro Supabase ao atualizar caso:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado ou sem permissão" },
        { status: 404 },
      );
    }

    // ⚠️ SEGURANÇA: Não logar dados sensíveis do caso
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Erro na API PUT /api/casos:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
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

    const body = await request.json();
    const { id, status } = body || {};

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "ID e status são obrigatórios" },
        { status: 400 },
      );
    }

    const normalizedStatus = String(status).trim().toUpperCase();
    if (!["ABERTO", "FECHADO", "CANCELADO"].includes(normalizedStatus)) {
      return NextResponse.json(
        { success: false, message: "Status inválido" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("casos")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("cliente_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API PATCH /api/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
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
    const casoId = searchParams.get("id");

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    // 1. Verificar se o caso tem advogado vinculado antes de apagar
    const { data: caso, error: casoError } = await supabaseAdmin
      .from("casos")
      .select("id, cliente_id, advogado_id, titulo")
      .eq("id", casoId)
      .eq("cliente_id", user.id)
      .single();

    if (casoError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado ou sem permissão" },
        { status: 404 },
      );
    }

    // 2. Se houver advogado, apenas CANCELA para que ele tenha feedback
    if (caso.advogado_id) {
      const { error: cancelError } = await supabaseAdmin
        .from("casos")
        .update({
          status: "CANCELADO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", casoId);

      if (cancelError) throw cancelError;

      // Notificar o advogado explicitamente
      await supabaseAdmin.from("notificacoes").insert([
        {
          user_id: caso.advogado_id,
          titulo: "Um caso foi cancelado",
          mensagem:
            `O cliente decidiu encerrar o caso "${caso.titulo}" que você estava atendendo.`,
          tipo: "CASO_CANCELADO",
          meta: JSON.stringify({ case_id: casoId }),
        },
      ]);

      // 📣 ENVIAR PUSH NOTIFICATION PARA O ADVOGADO CONTRATADO
      await sendPushNotification({
        userIds: [caso.advogado_id],
        title: "Caso cancelado 🚫",
        message: `O cliente decidiu encerrar o caso "${caso.titulo}" que você estava atendendo.`,
        url: "/dashboard/advogado"
      });

      // 📧 ENVIAR EMAIL DE CANCELAMENTO PARA O ADVOGADO
      try {
        const { data: advCancel } = await supabaseAdmin.from("advogados").select("name, email").eq("id", caso.advogado_id).single();
        if (advCancel?.email) {
          await resend.emails.send({
            from: 'Social Jurídico <contato@socialjuridico.com.br>',
            to: advCancel.email,
            subject: `🚫 Caso "${caso.titulo}" foi cancelado`,
            html: casoCanceladoTemplate({ lawyerName: advCancel.name || 'Advogado(a)', casoTitulo: caso.titulo }),
          });
          console.log(`📧 Email de cancelamento enviado para ${advCancel.email}`);
        }
      } catch (emailErr) {
        console.error("⚠️ Erro ao enviar email de cancelamento (não-fatal):", emailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: "Caso cancelado e arquivado para o advogado.",
      });
    }

    // 3. Se não houver advogado, notificar advogados com interesse e apagar
    // Buscar advogados que tinham interesse antes de deletar
    const { data: interessados } = await supabaseAdmin
      .from("case_interests")
      .select("lawyer_id")
      .eq("case_id", casoId)
      .in("status", ["PENDING", "NEGOTIATING"]);

    // Notificar e enviar email para advogados com interesse
    if (interessados && interessados.length > 0) {
      try {
        const lawyerIds = [...new Set(interessados.map(i => i.lawyer_id))];

        // 1. Inserir notificações de banco para todos os advogados interessados
        const now = new Date().toISOString();
        const dbNotifs = lawyerIds.map(lawyerId => ({
          id: crypto.randomUUID(),
          user_id: lawyerId,
          titulo: "Caso removido",
          mensagem: `O cliente removeu o caso "${caso.titulo}" no qual você tinha interesse.`,
          tipo: "CASO_CANCELADO",
          meta: JSON.stringify({ case_id: casoId }),
          lida: false,
          created_at: now
        }));
        await supabaseAdmin.from("notificacoes").insert(dbNotifs);

        // 2. Enviar push notification para todos os interessados
        await sendPushNotification({
          userIds: lawyerIds,
          title: "Caso removido 🚫",
          message: `O cliente removeu o caso "${caso.titulo}" no qual você tinha interesse.`,
          url: "/dashboard/advogado"
        });

        // 3. Enviar email de cancelamento aos interessados
        const { data: advs } = await supabaseAdmin.from("advogados").select("name, email").in("id", lawyerIds);
        if (advs?.length > 0) {
          const emailPayloads = advs.filter(a => a.email).map(a => ({
            from: 'Social Jurídico <contato@socialjuridico.com.br>',
            to: [a.email],
            subject: `🚫 Caso "${caso.titulo}" foi removido`,
            html: casoCanceladoTemplate({ lawyerName: a.name || 'Advogado(a)', casoTitulo: caso.titulo }),
          }));
          if (emailPayloads.length > 0) {
            await resend.batch.send(emailPayloads);
            console.log(`📧 Email de cancelamento enviado para ${emailPayloads.length} advogado(s) interessado(s)`);
          }
        }
      } catch (err) {
        console.error("⚠️ Erro ao notificar interessados sobre cancelamento do caso:", err.message);
      }
    }

    await supabaseAdmin.from("mensagens").delete().eq("caso_id", casoId);
    await supabaseAdmin.from("case_interests").delete().eq("case_id", casoId);

    const { error: deleteError } = await supabaseAdmin
      .from("casos")
      .delete()
      .eq("id", casoId)
      .eq("cliente_id", user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Caso removido com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

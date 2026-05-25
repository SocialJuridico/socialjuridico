import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import {
  interesseRecusadoTemplate,
  interesseAceitoTemplate,
  advogadoContratadoTemplate,
  casoEncerradoTemplate,
  clienteCadastradoCrmTemplate,
} from "@/lib/emailTemplates";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const base64 = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(request) {
  const authHeader = request?.headers?.get("Authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const fallbackToken =
    request?.headers?.get("x-access-token") ||
    new URL(request.url).searchParams.get("token");
  const token = headerToken || fallbackToken;

  if (token) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (user && !error) return user;

    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      const {
        data: { user: adminUser },
        error: adminError,
      } = await supabaseAdmin.auth.admin.getUserById(payload.sub);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (
        adminUser &&
        !adminError &&
        (!payload.exp || payload.exp > nowInSeconds)
      ) {
        return adminUser;
      }
    }
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!authError && user) return user;

  return null;
}

// POST /api/casos/interesse
// Body: { interestId, action: 'ACCEPT' | 'DECLINE' | 'HIRE' }
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { interestId, action } = await request.json();

    if (!interestId || !["ACCEPT", "DECLINE", "HIRE"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Parâmetros inválidos" },
        { status: 400 },
      );
    }

    const db = supabaseAdmin;

    // 1. Buscar o interesse
    const { data: interest, error: iError } = await db
      .from("case_interests")
      .select("id, case_id, lawyer_id, status")
      .eq("id", interestId)
      .single();

    if (iError || !interest) {
      return NextResponse.json(
        { success: false, message: "Interesse não encontrado" },
        { status: 404 },
      );
    }

    // 2. Verificar que o usuário logado é o cliente dono do caso
    const { data: caso, error: cError } = await db
      .from("casos")
      .select("id, cliente_id, titulo, advogado_id, status, descricao, anexos")
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

    // ========== DECLINE ==========
    if (action === "DECLINE") {
      await db
        .from("case_interests")
        .update({ status: "DECLINED" })
        .eq("id", interestId);

      // Notificar advogado
      await db.from("notificacoes").insert([
        {
          user_id: interest.lawyer_id,
          titulo: "Proposta não aceita",
          mensagem: `O cliente decidiu não prosseguir com a negociação no caso "${caso.titulo}".`,
          lida: false,
          created_at: new Date().toISOString(),
          tipo: "RECUSA",
          meta: JSON.stringify({ case_id: interest.case_id }),
        },
      ]);

      // 📣 ENVIAR PUSH NOTIFICATION (RECUSA)
      await sendPushNotification({
        userIds: [interest.lawyer_id],
        title: "Proposta não aceita ❌",
        message: `O cliente decidiu não prosseguir com a negociação no caso "${caso.titulo}".`,
        url: "/dashboard/advogado",
      });

      // 📧 ENVIAR EMAIL DE RECUSA PARA O ADVOGADO
      try {
        const { data: advRecusa } = await db
          .from("advogados")
          .select("name, email")
          .eq("id", interest.lawyer_id)
          .single();
        if (advRecusa?.email) {
          await resend.emails.send({
            from: "Social Jurídico <contato@socialjuridico.com.br>",
            to: advRecusa.email,
            subject: `📋 Atualização sobre o caso "${caso.titulo}"`,
            html: interesseRecusadoTemplate({
              lawyerName: advRecusa.name || "Advogado(a)",
              casoTitulo: caso.titulo,
            }),
          });
          console.log(`📧 Email de recusa enviado para ${advRecusa.email}`);
        }
      } catch (emailErr) {
        console.error(
          "⚠️ Erro ao enviar email de recusa (não-fatal):",
          emailErr.message,
        );
      }

      // Atualizar cache de negotiating_lawyers no caso
      await updateNegotiatingLawyers(db, interest.case_id);

      return NextResponse.json({
        success: true,
        message: "Interesse recusado.",
      });
    }

    // ========== ACCEPT (Iniciar Negociação) ==========
    if (action === "ACCEPT") {
      // Muda status do interesse para NEGOTIATING
      await db
        .from("case_interests")
        .update({ status: "NEGOTIATING" })
        .eq("id", interestId);

      // Muda status do caso para NEGOCIANDO (se ainda não estiver)
      if (caso.status !== "NEGOCIANDO") {
        await db
          .from("casos")
          .update({
            status: "NEGOCIANDO",
            updated_at: new Date().toISOString(),
          })
          .eq("id", interest.case_id);
      }

      // Atualizar cache de negotiating_lawyers no caso
      await updateNegotiatingLawyers(db, interest.case_id);

      // Notificar advogado que entrou em negociação
      await db.from("notificacoes").insert([
        {
          user_id: interest.lawyer_id,
          titulo: "Você entrou em negociação!",
          mensagem: `O cliente aceitou sua proposta no caso "${caso.titulo}". Vocês estão agora em fase de negociação.`,
          lida: false,
          created_at: new Date().toISOString(),
          tipo: "NEGOCIACAO",
          meta: JSON.stringify({ case_id: interest.case_id }),
        },
      ]);

      // 📣 ENVIAR PUSH NOTIFICATION (ACEITE/NEGOCIAÇÃO)
      await sendPushNotification({
        userIds: [interest.lawyer_id],
        title: "Você entrou em negociação! 🤝",
        message: `O cliente aceitou sua proposta no caso "${caso.titulo}".`,
        url: `/dashboard/advogado`,
      });

      // 📧 ENVIAR EMAIL DE ACEITE PARA O ADVOGADO
      try {
        const { data: advAceito } = await db
          .from("advogados")
          .select("name, email")
          .eq("id", interest.lawyer_id)
          .single();
        if (advAceito?.email) {
          await resend.emails.send({
            from: "Social Jurídico <contato@socialjuridico.com.br>",
            to: advAceito.email,
            subject: `🤝 Proposta aceita no caso "${caso.titulo}"`,
            html: interesseAceitoTemplate({
              lawyerName: advAceito.name || "Advogado(a)",
              casoTitulo: caso.titulo,
            }),
          });
          console.log(`📧 Email de aceite enviado para ${advAceito.email}`);
        }
      } catch (emailErr) {
        console.error(
          "⚠️ Erro ao enviar email de aceite (não-fatal):",
          emailErr.message,
        );
      }

      return NextResponse.json({
        success: true,
        message: "Negociação iniciada! O advogado foi notificado.",
      });
    }

    // ========== HIRE (Contratar Advogado) ==========
    if (action === "HIRE") {
      // Verificar se já não tem advogado contratado
      if (caso.advogado_id) {
        return NextResponse.json(
          {
            success: false,
            message: "Já existe um advogado contratado para este caso.",
          },
          { status: 400 },
        );
      }

      // Verificar saldo do advogado (precisa de 3 Juris)
      const { data: advogado, error: advError } = await db
        .from("advogados")
        .select("balance")
        .eq("id", interest.lawyer_id)
        .single();

      if (advError || !advogado) {
        return NextResponse.json(
          { success: false, message: "Perfil de advogado não encontrado" },
          { status: 404 },
        );
      }

      if ((advogado.balance || 0) < 3) {
        return NextResponse.json(
          {
            success: false,
            message:
              "O advogado selecionado não possui saldo de Juri suficiente (3 Juris) para fechar o contrato.",
          },
          { status: 402 },
        );
      }

      // Debitar 3 Juris do advogado
      const newBalance = advogado.balance - 3;
      await db
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", interest.lawyer_id);

      // Verificar e notificar estoque baixo de Juris
      await checkAndNotifyLowBalance(
        interest.lawyer_id,
        advogado.balance,
        newBalance,
      );

      // Mudar interest status para HIRED
      await db
        .from("case_interests")
        .update({ status: "HIRED" })
        .eq("id", interestId);

      // Recusar todos os outros interesses (PENDING e NEGOTIATING)
      await db
        .from("case_interests")
        .update({ status: "DECLINED" })
        .eq("case_id", interest.case_id)
        .neq("id", interestId)
        .in("status", ["PENDING", "NEGOTIATING"]);

      // Vincular advogado ao caso e mudar status para CONTRATADO
      await db
        .from("casos")
        .update({
          advogado_id: interest.lawyer_id,
          status: "CONTRATADO",
          negotiating_lawyers: null,
          chat_started: true, // Já inicia o chat principal
          updated_at: new Date().toISOString(),
        })
        .eq("id", interest.case_id);

      // Adicionar o cliente e a contratação automaticamente ao CRM do advogado
      try {
        const { data: cliente } = await db
          .from("clientes")
          .select("*")
          .eq("id", caso.cliente_id)
          .single();

        const { data: advogado } = await db
          .from("advogados")
          .select("name, email")
          .eq("id", interest.lawyer_id)
          .single();

        if (cliente) {
          const { data: crmClientExist } = await db
            .from("crm_clients")
            .select("id")
            .eq("lawyer_id", interest.lawyer_id)
            .eq("email", cliente.email)
            .maybeSingle();

          let crmClientId;

          if (crmClientExist) {
            crmClientId = crmClientExist.id;
            await db
              .from("crm_clients")
              .update({
                notes: `Cliente recontratou para um novo caso.\nCaso: ${caso.titulo}\nStatus: Ativo`,
              })
              .eq("id", crmClientId);
          } else {
            crmClientId = crypto.randomUUID();
            await db.from("crm_clients").insert([
              {
                id: crmClientId,
                lawyer_id: interest.lawyer_id,
                name: cliente.name || "Cliente sem Nome",
                email: cliente.email,
                phone: cliente.phone || "",
                status: "Ativo",
                type: "Pessoa Física",
                notes: `Adicionado automaticamente via contratação do caso "${caso.titulo}".\nDescrição do Caso: ${caso.descricao || "Sem descrição"}`,
                risk_score: Math.floor(Math.random() * 100),
                created_at: new Date().toISOString(),
              },
            ]);
          }

          // Registrar interação no CRM
          await db.from("crm_interactions").insert([
            {
              id: crypto.randomUUID(),
              client_id: crmClientId,
              lawyer_id: interest.lawyer_id,
              type: "CONTRATO",
              content: `Cliente contratou o advogado para o caso "${caso.titulo}".`,
              created_at: new Date().toISOString(),
            },
          ]);

          // Sincronizar anexos (documentos) para crm_documents se houver
          if (caso.anexos && Array.isArray(caso.anexos)) {
            const docsToInsert = caso.anexos
              .map((anexo) => ({
                id: crypto.randomUUID(),
                client_id: crmClientId,
                file_name: anexo.name || anexo.fileName || "Documento sem nome",
                file_url: anexo.url || anexo.fileUrl || "",
                created_at: new Date().toISOString(),
              }))
              .filter((doc) => doc.file_url);

            if (docsToInsert.length > 0) {
              await db.from("crm_documents").insert(docsToInsert);
            }
          }

          // Disparar e-mail ao advogado informando que o cliente foi cadastrado no CRM
          if (advogado?.email) {
            try {
              await resend.emails.send({
                from: "Social Jurídico <contato@socialjuridico.com.br>",
                to: advogado.email,
                subject: `👤 Cliente "${cliente.name || "Cliente"}" cadastrado no seu CRM`,
                html: clienteCadastradoCrmTemplate({
                  lawyerName: advogado.name || "Advogado(a)",
                  clientName: cliente.name || "Cliente",
                  casoTitulo: caso.titulo,
                }),
              });
              console.log(
                `📧 E-mail de cadastro de CRM enviado para ${advogado.email}`,
              );
            } catch (emailErr) {
              console.error(
                "⚠️ Erro ao enviar e-mail de CRM (não-fatal):",
                emailErr.message,
              );
            }
          }
        }
      } catch (crmErr) {
        console.error(
          "⚠️ Erro ao sincronizar dados no CRM (não-fatal):",
          crmErr.message,
        );
      }

      // Migrar as mensagens do chat de negociação para o chat principal (interest_id = null)
      await db
        .from("mensagens")
        .update({ interest_id: null })
        .eq("interest_id", interestId);

      // Excluir ou ocultar as mensagens de outras negociações perdidas para este caso
      await db
        .from("mensagens")
        .delete()
        .eq("caso_id", interest.case_id)
        .not("interest_id", "is", null);

      // Notificar o advogado contratado
      await db.from("notificacoes").insert([
        {
          user_id: interest.lawyer_id,
          titulo: "Você foi contratado! 🎉",
          mensagem: `Parabéns! O cliente contratou seus serviços no caso "${caso.titulo}". Você já pode iniciar o atendimento via chat.`,
          lida: false,
          created_at: new Date().toISOString(),
          tipo: "CONTRATACAO",
          meta: JSON.stringify({ case_id: interest.case_id }),
        },
      ]);

      // 📣 ENVIAR PUSH NOTIFICATION (CONTRATAÇÃO)
      await sendPushNotification({
        userIds: [interest.lawyer_id],
        title: "Você foi contratado! 🎉",
        message: `Parabéns! O cliente escolheu você para o caso "${caso.titulo}".`,
        url: "/dashboard/advogado",
      });

      // 📧 ENVIAR EMAIL DE CONTRATAÇÃO PARA O ADVOGADO
      try {
        const { data: advContratado } = await db
          .from("advogados")
          .select("name, email")
          .eq("id", interest.lawyer_id)
          .single();
        if (advContratado?.email) {
          await resend.emails.send({
            from: "Social Jurídico <contato@socialjuridico.com.br>",
            to: advContratado.email,
            subject: `🎉 Parabéns! Você foi contratado no caso "${caso.titulo}"`,
            html: advogadoContratadoTemplate({
              lawyerName: advContratado.name || "Advogado(a)",
              casoTitulo: caso.titulo,
            }),
          });
          console.log(
            `📧 Email de contratação enviado para ${advContratado.email}`,
          );
        }
      } catch (emailErr) {
        console.error(
          "⚠️ Erro ao enviar email de contratação (não-fatal):",
          emailErr.message,
        );
      }

      // Notificar advogados que perderam
      const { data: declinedInterests } = await db
        .from("case_interests")
        .select("lawyer_id")
        .eq("case_id", interest.case_id)
        .eq("status", "DECLINED")
        .neq("lawyer_id", interest.lawyer_id);

      if (declinedInterests && declinedInterests.length > 0) {
        const declineNotifs = declinedInterests.map((di) => ({
          user_id: di.lawyer_id,
          titulo: "Caso encerrado para negociação",
          mensagem: `O cliente escolheu outro profissional para o caso "${caso.titulo}". Continue buscando novas oportunidades!`,
          lida: false,
          created_at: new Date().toISOString(),
          tipo: "CASO_ENCERRADO",
          meta: JSON.stringify({ case_id: interest.case_id }),
        }));
        await db.from("notificacoes").insert(declineNotifs);

        // 📧 ENVIAR EMAIL PARA ADVOGADOS QUE PERDERAM A VAGA
        try {
          const loserIds = declinedInterests.map((di) => di.lawyer_id);
          const { data: losers } = await db
            .from("advogados")
            .select("name, email")
            .in("id", loserIds);
          if (losers?.length > 0) {
            const emailPayloads = losers
              .filter((l) => l.email)
              .map((l) => ({
                from: "Social Jurídico <contato@socialjuridico.com.br>",
                to: [l.email],
                subject: `📌 Atualização: caso "${caso.titulo}" encerrado`,
                html: casoEncerradoTemplate({
                  lawyerName: l.name || "Advogado(a)",
                  casoTitulo: caso.titulo,
                }),
              }));
            if (emailPayloads.length > 0) {
              await resend.batch.send(emailPayloads);
              console.log(
                `📧 Email de caso encerrado enviado para ${emailPayloads.length} advogado(s)`,
              );
            }
          }
        } catch (emailErr) {
          console.error(
            "⚠️ Erro ao enviar email de caso encerrado (não-fatal):",
            emailErr.message,
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Advogado contratado com sucesso! O chat está disponível.",
        casoId: interest.case_id,
      });
    }
  } catch (error) {
    console.error("Erro ao processar interesse:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// Função auxiliar: Atualiza o cache de advogados negociando no caso
async function updateNegotiatingLawyers(db, caseId) {
  try {
    // Buscar todos os interesses NEGOTIATING deste caso
    const { data: negotiatingInterests } = await db
      .from("case_interests")
      .select("lawyer_id")
      .eq("case_id", caseId)
      .eq("status", "NEGOTIATING");

    if (!negotiatingInterests || negotiatingInterests.length === 0) {
      await db
        .from("casos")
        .update({ negotiating_lawyers: [] })
        .eq("id", caseId);
      return;
    }

    const lawyerIds = negotiatingInterests.map((ni) => ni.lawyer_id);

    // Buscar dados dos advogados
    const { data: lawyers } = await db
      .from("advogados")
      .select("id, name, avatar")
      .in("id", lawyerIds);

    const lawyerData = (lawyers || []).map((l) => ({
      id: l.id,
      name: l.name,
      avatar: l.avatar,
      initials: (l.name || "AD").substring(0, 2).toUpperCase(),
    }));

    await db
      .from("casos")
      .update({ negotiating_lawyers: lawyerData })
      .eq("id", caseId);
  } catch (err) {
    console.error("Erro ao atualizar negotiating_lawyers:", err);
  }
}

// GET /api/casos/interesse?type=all
// Retorna interesses PENDING e NEGOTIATING dos casos do cliente logado
export async function GET(request) {
  try {
    let user = null;

    // Tentar autenticação via Bearer token (mobile)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const {
        data: { user: tokenUser },
        error,
      } = await supabaseAdmin.auth.getUser(token);
      if (tokenUser && !error) {
        user = tokenUser;
      }
    }

    // Fallback para sessão web (cookies)
    if (!user) {
      const supabase = createClient();
      const {
        data: { user: cookieUser },
        error: authError,
      } = await supabase.auth.getUser();
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

    const db = supabaseAdmin;

    // Buscar todos os casos do cliente (com ou sem advogado, status ABERTO ou NEGOCIANDO)
    const { data: casos, error: casosError } = await db
      .from("casos")
      .select("id, titulo, area_atuacao, status")
      .eq("cliente_id", user.id)
      .in("status", ["ABERTO", "NEGOCIANDO"]);

    if (casosError) throw casosError;

    if (!casos || casos.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const caseIds = casos.map((c) => c.id);

    // Buscar interesses PENDING e NEGOTIATING
    const { data: interests, error: intError } = await db
      .from("case_interests")
      .select("id, case_id, lawyer_id, status, created_at")
      .in("case_id", caseIds)
      .in("status", ["PENDING", "NEGOTIATING"])
      .order("created_at", { ascending: false });

    if (intError) throw intError;

    const lawyerIds = [
      ...new Set((interests || []).map((i) => i.lawyer_id).filter(Boolean)),
    ];
    let lawyerNamesById = {};

    if (lawyerIds.length > 0) {
      const { data: lawyers } = await db
        .from("advogados")
        .select("id, name, avatar")
        .in("id", lawyerIds);

      lawyerNamesById = Object.fromEntries(
        (lawyers || []).map((l) => [l.id, { name: l.name, avatar: l.avatar }]),
      );
    }

    // Adicionar título do caso e nome do advogado a cada interesse
    const casosMap = Object.fromEntries(casos.map((c) => [c.id, c]));
    const enriched = (interests || []).map((i) => ({
      ...i,
      lawyer_name: lawyerNamesById[i.lawyer_id]?.name || "Advogado",
      lawyer_avatar: lawyerNamesById[i.lawyer_id]?.avatar || null,
      caso_titulo: casosMap[i.case_id]?.titulo || "Caso desconhecido",
      caso_area: casosMap[i.case_id]?.area_atuacao || "",
      caso_status: casosMap[i.case_id]?.status || "ABERTO",
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

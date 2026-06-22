import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { monitoramentoProcessualTemplate } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return json({ success: false, message: "Banco de dados indisponível." }, 503);
    }

    // 1. Authentication / Signature Validation
    const signature = 
      request.headers.get("x-social-juridico-signature") || 
      request.headers.get("x-signature") || 
      request.headers.get("x-hub-signature-256") || 
      "";

    const apiKeyHeader = request.headers.get("x-api-key") || "";
    const systemApiKey = process.env.API_SOCIAL_JURIDICO_KEY || "";

    const rawBody = await request.text();
    let isAuthed = false;

    // Validate using HMAC signature if provided
    if (signature && systemApiKey) {
      try {
        const cleanSig = signature.replace(/^sha256=/i, "").trim();
        const computedSig = crypto
          .createHmac("sha256", systemApiKey)
          .update(rawBody)
          .digest("hex");

        isAuthed = crypto.timingSafeEqual(
          Buffer.from(computedSig, "hex"),
          Buffer.from(cleanSig, "hex")
        );
      } catch (sigErr) {
        console.error("[Webhook Processual] Erro na validação de assinatura HMAC:", sigErr);
      }
    }

    // Fallback: Validate using direct API key header comparison
    if (!isAuthed && apiKeyHeader && systemApiKey) {
      isAuthed = apiKeyHeader.trim() === systemApiKey.trim();
    }

    // In development or if mocks are enabled, allow auth bypass if no api key is configured
    if (!isAuthed && !systemApiKey && process.env.ENABLE_MONITORAMENTO_MOCKS === "true") {
      console.warn("[Webhook Processual] Autenticação ignorada devido a ambiente de teste e falta de API_SOCIAL_JURIDICO_KEY.");
      isAuthed = true;
    }

    if (!isAuthed) {
      return json({ success: false, message: "Assinatura ou API Key inválida." }, 401);
    }

    // Parse Body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ success: false, message: "JSON inválido." }, 400);
    }

    // Extract basic properties
    const lawyerId = body.plataforma_ref || body.advogado_id;
    const deliveryId = body.delivery_id || body.deliveryId || "";
    const eventId = body.event_id || body.eventId || "";
    
    // Normalização de tipo
    // Tipos suportados: oab_citation, process_movement, monitoring_failed
    const rawTipo = String(body.tipo || body.tipo_monitoramento || "").toLowerCase();
    let tipoEvento = "process_movement";
    if (rawTipo.includes("oab") || rawTipo.includes("citacao") || rawTipo.includes("citação")) {
      tipoEvento = "oab_citation";
    } else if (rawTipo.includes("falha") || rawTipo.includes("failed") || rawTipo.includes("erro")) {
      tipoEvento = "monitoring_failed";
    }

    const numeroCnj = body.numero_cnj || body.numeroProcesso || "";
    const oabNumero = body.oab_numero || body.oab || "";
    const oabUf = body.oab_uf || body.estado || "";
    const dataEvento = body.data_evento || body.event_date || body.timestamp || new Date().toISOString();

    if (!lawyerId || !isValidUuid(lawyerId)) {
      return json({ success: false, message: "plataforma_ref inválido ou ausente." }, 400);
    }

    // 2. Identify Lawyer Profile
    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, email")
      .eq("id", lawyerId)
      .maybeSingle();

    if (lawyerError) {
      console.error("[Webhook Processual] Erro ao buscar advogado:", lawyerError);
      return json({ success: false, message: "Erro ao buscar advogado no banco de dados." }, 500);
    }

    if (!lawyer) {
      return json({ success: false, message: `Advogado com ID ${lawyerId} não localizado.` }, 404);
    }

    // 3. Deduplication Check (Idempotency)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingNotifs, error: notifCheckError } = await supabaseAdmin
      .from("notificacoes")
      .select("id, meta")
      .eq("user_id", lawyerId)
      .eq("tipo", "processual_webhook")
      .gte("created_at", cutoffDate);

    if (notifCheckError) {
      console.error("[Webhook Processual] Erro ao verificar duplicados:", notifCheckError);
    } else {
      const isDuplicate = (existingNotifs || []).some((n) => {
        try {
          const meta = typeof n.meta === "string" ? JSON.parse(n.meta) : n.meta;
          if (!meta) return false;
          return (
            (deliveryId && meta.delivery_id === deliveryId) ||
            (eventId && meta.event_id === eventId)
          );
        } catch {
          return false;
        }
      });

      if (isDuplicate) {
        return json({
          success: true,
          message: "Evento já processado anteriormente.",
          duplicate: true,
        });
      }
    }

    // 4. Construct Notification Text
    let title = "Evento de Monitoramento Processual";
    let message = "";
    let detalhesText = "";

    if (tipoEvento === "oab_citation") {
      const snippet = body.snippet || body.trecho || body.mensagem || "";
      title = "⚖️ Nova Citação / Publicação (OAB)";
      message = `Uma nova citação/publicação foi identificada no diário oficial para a OAB ${oabNumero}-${oabUf}. CNJ: ${numeroCnj || "Não informado"}.`;
      detalhesText = snippet ? `Trecho:\n"${snippet}"` : "Verifique os detalhes e o inteiro teor no seu painel de monitoramento.";
    } else if (tipoEvento === "monitoring_failed") {
      const motivo = body.erro_motivo || body.motivo || body.mensagem || "Falha de conexão com os tribunais.";
      title = "⚠️ Falha no Monitoramento de Processo";
      message = `Ocorreu uma falha ao atualizar o processo monitorado ${numeroCnj}.`;
      detalhesText = `Motivo do alerta:\n${motivo}`;
    } else {
      // process_movement
      const movTitulo = body.mov_titulo || body.titulo || "Nova movimentação registrada";
      const movDetalhe = body.mov_detalhe || body.detalhe || body.mensagem || "";
      title = `🔔 Nova Movimentação no Processo ${numeroCnj}`;
      message = `O processo monitorado ${numeroCnj} sofreu uma nova movimentação.`;
      detalhesText = `${movTitulo}${movDetalhe ? `\n\nDetalhes:\n${movDetalhe}` : ""}`;
    }

    // 5. Insert Notification
    const newNotif = {
      id: crypto.randomUUID(),
      user_id: lawyerId,
      titulo: title,
      mensagem: message + (detalhesText ? ` ${detalhesText.substring(0, 100)}...` : ""),
      link: "/dashboard/advogado/monitoramento",
      lida: false,
      created_at: new Date().toISOString(),
      tipo: "processual_webhook",
      meta: JSON.stringify({
        event_id: eventId || null,
        delivery_id: deliveryId || null,
        tipo_evento: tipoEvento,
        numero_cnj: numeroCnj || null,
        oab_numero: oabNumero || null,
        oab_uf: oabUf || null,
        data_evento: dataEvento,
        detalhes: detalhesText
      })
    };

    const { error: insertError } = await supabaseAdmin
      .from("notificacoes")
      .insert([newNotif]);

    if (insertError) {
      console.error("[Webhook Processual] Erro ao salvar notificação:", insertError);
      return json({ success: false, message: "Erro ao registrar notificação no banco de dados." }, 500);
    }

    // 6. Send Email Notification via Resend
    if (process.env.RESEND_API_KEY && lawyer.email) {
      try {
        console.log(`[Webhook Processual] Enviando e-mail para ${lawyer.email} via Resend...`);
        const { error: emailError } = await resend.emails.send({
          from: "Social Jurídico <contato@socialjuridico.com.br>",
          to: [lawyer.email],
          subject: title,
          html: monitoramentoProcessualTemplate({
            lawyerName: lawyer.name || "Advogado",
            tipoEvento,
            numeroCnj,
            detalhes: detalhesText,
            dataEvento,
            oabInfo: oabNumero ? `${oabNumero}/${oabUf}` : null
          })
        });

        if (emailError) {
          console.error("[Webhook Processual] Erro no Resend ao disparar e-mail:", emailError);
        }
      } catch (err) {
        console.error("[Webhook Processual] Falha não fatal ao enviar e-mail:", err);
      }
    }

    return json({
      success: true,
      message: "Evento processado com sucesso.",
      notificationId: newNotif.id
    }, 200);

  } catch (error) {
    console.error("[Webhook Processual][POST] Erro catastrófico:", error);
    return json({ success: false, message: "Erro interno no servidor." }, 500);
  }
}

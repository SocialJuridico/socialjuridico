import OpenAI from "openai";
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getUserPlanLimits, incrementUsage } from "@/lib/planUtils";
import { getAuthenticatedUser } from "@/lib/authServerUtils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getSessionUser(request) {
  if (request) {
    const authHeader = request.headers.get("Authorization");
    const fallbackToken =
      request.headers.get("x-access-token") ||
      (request.url ? new URL(request.url).searchParams.get("token") : null);
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : fallbackToken;

    // Se houver indício de token, valida estritamente por token
    if (token && token !== "null" && token !== "undefined") {
      const authUser = await getAuthenticatedUser(request);
      if (!authUser) {
        console.error("[getSessionUser] Bearer token validation failed, blocking request");
        return null;
      }
      const { data: adv, error: advError } = await supabaseAdmin
        .from("advogados")
        .select("id, name, cargo, escritorio_id")
        .eq("id", authUser.id)
        .single();
      
      if (adv && !advError) {
        return {
          id: adv.id,
          name: adv.name,
          cargo: adv.cargo || "advogado",
          escritorio_id: adv.escritorio_id || null,
          isOfficeAdmin: false
        };
      }
      return null;
    }
  }

  // Fallback apenas para cookies (sem token)
  const cookieStore = await cookies();
  
  // 1. Verificação via Cookie do Escritório (Administrador / Gestor)
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return {
        id: decoded.id,
        name: `${decoded.nome} (Gestor)`,
        cargo: "admin",
        escritorio_id: decoded.id,
        isOfficeAdmin: true
      };
    } catch (e) {
      console.error("Erro ao decodificar cookie de escritorio:", e);
    }
  }

  // 2. Verificação via Supabase Auth (Advogado / Membro Normal)
  const authUser = await getAuthenticatedUser(request);
  if (authUser) {
    const { data: adv, error: advError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, cargo, escritorio_id")
      .eq("id", authUser.id)
      .single();
    
    if (adv && !advError) {
      return {
        id: adv.id,
        name: adv.name,
        cargo: adv.cargo || "advogado",
        escritorio_id: adv.escritorio_id || null,
        isOfficeAdmin: false
      };
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { message, clientData, history, useType } = await request.json();

    if (!message || !clientData) {
      return NextResponse.json({ success: false, message: "Dados insuficientes" }, { status: 400 });
    }

    const planLimits = await getUserPlanLimits(supabaseAdmin, user.id);

    // Tipos de análise de agenda não consomem limites, então se planLimits for null,
    // verificamos se é uma requisição de agenda e permitimos prosseguir
    const isAgendaRequest = clientData?.name && clientData.name.includes('Agenda');
    if (!planLimits && !isAgendaRequest) {
      return NextResponse.json({ success: false, message: "Erro ao ler limites do plano." }, { status: 400 });
    }

    // 1. Bloqueio de Jurisprudência para START
    const isJuris = useType === 'JURIS' || clientData.name === "Análise Jurisprudencial Geral";
    if (isJuris && planLimits && !planLimits.hasJurisprudencia) {
      return NextResponse.json({ success: false, message: "Funcionalidade disponível apenas no Plano PRO", error_type: "UPGRADE_REQUIRED" }, { status: 403 });
    }

    // 2. Limite de Triagem para START
    const isTriagem = useType === 'TRIAGEM' || clientData.name === "Triagem Rápida";
    if (isTriagem && planLimits) {
      if (!planLimits.canUseTriagem()) {
        return NextResponse.json({ success: false, message: "LIMIT_REACHED", error_type: "QUOTA_EXCEEDED" }, { status: 403 });
      }
    }

    // 3. Outros usos de IA no CRM (Agenda, Chat com Cliente)
    // Por enquanto não limitamos severamente além do Redator IA, 
    // mas se quiser limitar o chat geral, faríamos aqui.

    let systemPrompt = `Você é um especialista sênior em direito brasileiro (SocialJurídico AI). 
    Analise estrategicamente o caso para o cliente: ${clientData.name}.
    ÁREAS DE ATUAÇÃO: Direito do Consumidor, Civil, Família, Penal, Trabalho, Previdenciário, Tributário, Empresarial, Administrativo, Bancário.
    OBJETIVOS:
    1. Identifique PRAZOS CRÍTICOS (prescrição, notificações).
    2. Detecte VÍCIOS PROCESSUAIS ou NULIDADES.
    3. Sugira TESES JURÍDICAS e JURISPRUDÊNCIA (STJ/STF) relevante.
    4. Avalie VIABILIDADE e RISCOS.`;

    if (clientData.name && (
      clientData.name.includes("Agenda") || 
      clientData.name.includes("Agenda do Escritório") || 
      clientData.name.includes("Agenda do Advogado")
    )) {
      systemPrompt = `Você é o assistente inteligente de gestão jurídica do SocialJurídico (SocialJurídico AI).
      Seu objetivo é analisar ou resumir a agenda de compromissos e prazos de um advogado ou escritório jurídico.
      
      Diretrizes de Resposta:
      1. Agrupe ou apresente as informações de forma clara, organizada e profissional em formato markdown.
      2. Identifique conflitos de horários, acúmulo de prazos no mesmo dia e compromissos críticos (urgência alta).
      3. Forneça recomendações práticas sobre o que deve ser priorizado ou preparado com antecedência.
      4. Mantenha um tom profissional, corporativo e encorajador.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ... (history || []).map(m => ({ role: m.role || 'user', content: m.content })),
        { role: "user", content: message }
      ],
    });

    const responseText = completion.choices[0].message.content || "Sem resposta da IA.";

    // Incrementar uso se for Triagem
    if (isTriagem) {
      await incrementUsage(supabaseAdmin, user.id, 'uso_triagem', 1);
    }

    return NextResponse.json({ 
      success: true, 
      response: responseText 
    });

  } catch (error) {
    console.error("Erro Chat IA:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Erro ao processar resposta da IA" 
    }, { status: 500 });
  }
}

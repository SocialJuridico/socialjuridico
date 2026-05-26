import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
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
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { type, clientName, facts, tone, clientData, advocateData } =
      await request.json();

    const planLimits = await getUserPlanLimits(supabaseAdmin, user.id);
    if (!planLimits) {
      return NextResponse.json({ success: false, message: "Erro ao ler limites do plano." }, { status: 400 });
    }

    if (!planLimits.canUseRedatorIa()) {
      return NextResponse.json({ 
        success: false, 
        message: "LIMIT_REACHED", 
        error_type: "QUOTA_EXCEEDED" 
      }, { status: 403 });
    }

    if (!type || !facts) {
      return NextResponse.json(
        { success: false, message: "Tipo e Fatos são obrigatórios" },
        { status: 400 },
      );
    }

    // ⚠️ SEGURANÇA: Nunca enviar dados sensíveis para API externa (OpenAI)
    // Apenas nome do cliente é genérico o suficiente
    const clientInfo = clientData
      ? `
    QUALIFICAÇÃO DA PARTE (Contratante/Requerente):
    - Parte: ${clientData.name || "Parte Contratante"}
    `
      : `QUALIFICAÇÃO DA PARTE: ${clientName || "PARTE INTERESSADA"}`;

    // Buscar informações do advogado ou escritório direto do banco para segurança
    let resolvedAdvName = advocateData?.name || "Advogado";
    let resolvedAdvOab = advocateData?.oab || "Não informado";

    const { data: realAdv } = await supabaseAdmin
      .from("advogados")
      .select("name, oab")
      .eq("id", user.id)
      .maybeSingle();

    if (realAdv) {
      resolvedAdvName = realAdv.name || resolvedAdvName;
      resolvedAdvOab = realAdv.oab || resolvedAdvOab;
    } else {
      const { data: realOffice } = await supabaseAdmin
        .from("escritorios")
        .select("nome")
        .eq("id", user.id)
        .maybeSingle();

      if (realOffice) {
        resolvedAdvName = realOffice.nome || resolvedAdvName;
      }
    }

    const advocateInfo = `
    QUALIFICAÇÃO DO ADVOGADO (Contratado/Patrono):
    - Advogado(a): ${resolvedAdvName}
    - OAB: ${resolvedAdvOab}
    `;

    const systemPrompt = `Você é um Redator Jurídico Sênior especializado em Direito Brasileiro. 
    Sua tarefa é gerar uma minuta de alta qualidade técnica, seguindo as normas da ABNT e o padrão culto da língua portuguesa.
    
    TIPO DE DOCUMENTO: ${type}
    TOM DE VOZ: ${tone || "Formal"}
    
    ${clientInfo}
    ${advocateInfo}
    
    DIRETRIZES:
    1. Utilize os dados fornecidos acima para preencher o cabeçalho e as qualificações. NÃO use placeholders como [Nome do Cliente] se o dado foi fornecido acima.
    2. Utilize termos jurídicos precisos (latim jurídico quando pertinente).
    3. Estruture com cabeçalho, fatos, fundamentos jurídicos e pedidos/conclusão.
    4. Adapte o tom solicitado:
       - Formal: Padrão, respeitoso e neutro.
       - Agressivo: Enfático nos direitos violados, assertivo nas punições e pedidos.
       - Conciliador: Foca em propostas, boa-fé e resolução amigável.
       - Técnico: Linguagem densa, foco em doutrina e jurisprudência.
    5. NÃO utilize nenhuma formatação Markdown no texto (como asteriscos ** para negrito, hashtags # para títulos, ou divisores ---). Escreva o texto de forma limpa, utilizando caixa alta para destacar títulos e seções, pois ele será impresso diretamente em PDF.
    
    FATOS E CONTEXTO:
    ${facts}
    
    Gere apenas o texto da minuta finalizada.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Gere a minuta de ${type} para o caso descrito.`,
        },
      ],
      temperature: 0.7,
    });

    const draft = completion.choices[0].message.content;

    // Incrementar uso após geração de sucesso
    await incrementUsage(supabaseAdmin || supabase, user.id, 'uso_redator_ia', 1);

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    console.error("Erro Redator IA:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro ao gerar minuta" },
      { status: 500 },
    );
  }
}

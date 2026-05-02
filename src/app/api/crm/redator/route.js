import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserPlanLimits, incrementUsage } from "@/lib/planUtils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const { type, clientName, facts, tone, clientData, advocateData } =
      await request.json();

    const planLimits = await getUserPlanLimits(supabaseAdmin || supabase, user.id);
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

    // ⚠️ SEGURANÇA: Apenas informações públicas (OAB) e nome
    const advocateInfo = advocateData
      ? `
    QUALIFICAÇÃO DO ADVOGADO (Contratado/Patrono):
    - Advogado(a): ${advocateData.name}
    - OAB: ${advocateData.oab || "Não informado"}
    `
      : "";

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

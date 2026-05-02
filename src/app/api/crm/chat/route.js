import OpenAI from "openai";
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserPlanLimits, incrementUsage } from "@/lib/planUtils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { message, clientData, history, useType } = await request.json();

    if (!message || !clientData) {
      return NextResponse.json({ success: false, message: "Dados insuficientes" }, { status: 400 });
    }

    const planLimits = await getUserPlanLimits(supabaseAdmin || supabase, user.id);
    if (!planLimits) {
      return NextResponse.json({ success: false, message: "Erro ao ler limites do plano." }, { status: 400 });
    }

    // 1. Bloqueio de Jurisprudência para START
    const isJuris = useType === 'JURIS' || clientData.name === "Análise Jurisprudencial Geral";
    if (isJuris && !planLimits.hasJurisprudencia) {
      return NextResponse.json({ success: false, message: "Funcionalidade disponível apenas no Plano PRO", error_type: "UPGRADE_REQUIRED" }, { status: 403 });
    }

    // 2. Limite de Triagem para START
    const isTriagem = useType === 'TRIAGEM' || clientData.name === "Triagem Rápida";
    if (isTriagem) {
      if (!planLimits.canUseTriagem()) {
        return NextResponse.json({ success: false, message: "LIMIT_REACHED", error_type: "QUOTA_EXCEEDED" }, { status: 403 });
      }
    }

    // 3. Outros usos de IA no CRM (Agenda, Chat com Cliente)
    // Por enquanto não limitamos severamente além do Redator IA, 
    // mas se quiser limitar o chat geral, faríamos aqui.

    const systemPrompt = `Você é um especialista sênior em direito brasileiro (SocialJurídico AI). 
    Analise estrategicamente o caso para o cliente: ${clientData.name}.
    ÁREAS DE ATUAÇÃO: Direito do Consumidor, Civil, Família, Penal, Trabalho, Previdenciário, Tributário, Empresarial, Administrativo, Bancário.
    OBJETIVOS:
    1. Identifique PRAZOS CRÍTICOS (prescrição, notificações).
    2. Detecte VÍCIOS PROCESSUAIS ou NULIDADES.
    3. Sugira TESES JURÍDICAS e JURISPRUDÊNCIA (STJ/STF) relevante.
    4. Avalie VIABILIDADE e RISCOS.`;

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
      await incrementUsage(supabaseAdmin || supabase, user.id, 'uso_triagem', 1);
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

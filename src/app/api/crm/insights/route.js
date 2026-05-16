import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ success: false, message: "clientId é obrigatório" }, { status: 400 });
    }

    // 0. Verificar Plano e Limites
    const { data: profile } = await supabaseAdmin
      .from('advogados')
      .select('plan_type, uso_triagem')
      .eq('id', user.id)
      .single();

    if (profile?.plan_type === 'START' && (profile?.uso_triagem || 0) >= 5) {
      return NextResponse.json({ 
        success: false, 
        limitReached: true, 
        message: "Limite de Insights atingido no Plano START. Faça upgrade para o PRO para acesso ilimitado." 
      }, { status: 403 });
    }

    // 1. Buscar dados do cliente
    const { data: client, error: clientError } = await supabaseAdmin
      .from('crm_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ success: false, message: "Cliente não encontrado" }, { status: 404 });
    }

    // 2. Buscar interações
    const { data: interactions } = await supabaseAdmin
      .from('crm_interactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Buscar financeiro
    const { data: finance } = await supabaseAdmin
      .from('crm_finance')
      .select('*')
      .eq('client_id', clientId);

    // Preparar contexto para a IA
    const context = {
      client: {
        name: client.name,
        type: client.type,
        profession: client.profession,
        notes: client.notes,
        risk_score: client.risk_score
      },
      recent_interactions: interactions?.map(i => ({ type: i.type, content: i.content, date: i.created_at })) || [],
      financial_summary: {
        total_payments: finance?.filter(f => f.status === 'PAGO').length || 0,
        pending_payments: finance?.filter(f => f.status === 'PENDENTE').length || 0,
        total_amount: finance?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0
      }
    };

    const prompt = `Você é um consultor jurídico de IA especializado em KYC (Know Your Customer).
Analise os dados abaixo de um cliente de um escritório de advocacia e forneça um insight estratégico curto (máximo 2 frases).
Foque em: perfil de comportamento, risco litigioso, prontidão no envio de documentos e lucratividade.

DADOS DO CLIENTE:
${JSON.stringify(context, null, 2)}

RESPONDA APENAS O INSIGHT, sem introduções.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um assistente jurídico experiente." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const insight = completion.choices[0].message.content;

    // Incrementar uso
    await supabaseAdmin.rpc('increment_usage_triagem', { lawyer_id: user.id });
    // Fallback se o RPC não existir
    if (!supabaseAdmin.rpc) {
       await supabaseAdmin
        .from('advogados')
        .update({ uso_triagem: (profile?.uso_triagem || 0) + 1 })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true, insight });

  } catch (error) {
    console.error("Erro no Insights API:", error);
    return NextResponse.json({ success: false, message: "Erro ao gerar insight" }, { status: 500 });
  }
}

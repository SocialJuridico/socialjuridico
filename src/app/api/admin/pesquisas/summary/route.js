import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import OpenAI from "openai";

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

    // Verify Admin
    const { data: admin } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    // Fetch pesquisas_satisfacao_advogados
    const { data: advData, error: advErr } = await supabaseAdmin
      .from("pesquisas_satisfacao_advogados")
      .select(`
        *,
        advogados:user_id (name, email)
      `);

    // Fetch pesquisas_satisfacao_clientes
    const { data: cliData, error: cliErr } = await supabaseAdmin
      .from("pesquisas_satisfacao_clientes")
      .select(`
        *,
        clientes:user_id (name, email)
      `);

    if (advErr || cliErr) {
      console.error("Erro ao buscar pesquisas para resumo:", advErr, cliErr);
      return NextResponse.json({ success: false, message: "Erro ao buscar dados." }, { status: 500 });
    }

    // Formatar os feedbacks para a IA
    const advFeedbacks = advData
      .filter(item => item.feedback)
      .map(item => `[Advogado - Nota Geral Média: ${((
        (item.q1_velocidade || 0) +
        (item.q2_marketplace || 0) +
        (item.q3_ia_redator || 0) +
        (item.q4_ia_personalidade || 0) +
        (item.q5_seguranca || 0) +
        (item.q6_prazos || 0) +
        (item.q7_crm || 0) +
        (item.q8_smartdocs || 0) +
        (item.q9_suporte || 0) +
        (item.q10_roi || 0)
      ) / 10).toFixed(1)}]: "${item.feedback}"`);

    const cliFeedbacks = cliData
      .filter(item => item.feedback)
      .map(item => `[Cliente - Nota Geral Média: ${((
        (item.q1_cadastro || 0) +
        (item.q2_clareza || 0) +
        (item.q3_velocidade || 0) +
        (item.q4_confianca || 0) +
        (item.q5_qualidade || 0) +
        (item.q6_chat || 0) +
        (item.q7_transparencia || 0) +
        (item.q8_seguranca || 0) +
        (item.q9_pwa || 0) +
        (item.q10_recomendacao || 0)
      ) / 10).toFixed(1)}]: "${item.feedback}"`);

    const context = {
      totalAdvogados: advData.length,
      totalClientes: cliData.length,
      feedbacksAdvogados: advFeedbacks,
      feedbacksClientes: cliFeedbacks,
    };

    const prompt = `Você é um diretor de marketing e copywriter especialista em SaaS B2B jurídico.
Analise os feedbacks reais fornecidos pelos usuários (advogados e clientes) da nossa plataforma "SocialJurídico v3.0".
Gere um resumo inteligente, focado em insights úteis para o nosso marketing, anúncios e landing page.

DADOS DE AVALIAÇÕES E FEEDBACKS:
${JSON.stringify(context, null, 2)}

Sua resposta deve ser estritamente em formato JSON válido, contendo as seguintes propriedades:
- "summary" (string): Um resumo geral de 3 a 4 frases do sentimento geral da plataforma e a percepção de valor principal (ex: o que mais se destaca).
- "strengths" (array de strings): Exatamente 3 principais diferenciais/pontos fortes mais elogiados pelos usuários jurídicos.
- "quotes" (array de strings): Exatamente 3 das melhores frases de feedback curtas e impactantes para usar como "Prova Social" (depoimentos de clientes) em redes sociais. Ajuste ligeiramente apenas para corrigir digitação e torná-las mais diretas e marcantes, mantendo a voz original do usuário.
- "marketingHooks" (array de strings): Exatamente 3 ideias/slogans/ganchos de copy para usar em anúncios de tráfego pago baseados nos elogios reais deles.

Não adicione textos explicativos antes ou depois do JSON. A resposta deve ser apenas o JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um assistente especialista em marketing e geração de JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const resultText = completion.choices[0].message.content;
    const summaryData = JSON.parse(resultText);

    return NextResponse.json({ success: true, data: summaryData });

  } catch (error) {
    console.error("Erro ao gerar resumo de avaliações via IA:", error);
    return NextResponse.json({ success: false, message: "Erro interno ao processar resumo de IA" }, { status: 500 });
  }
}

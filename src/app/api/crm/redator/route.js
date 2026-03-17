import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    const { type, clientName, facts, tone, clientData, advocateData } = await request.json();

    if (!type || !facts) {
      return NextResponse.json({ success: false, message: "Tipo e Fatos são obrigatórios" }, { status: 400 });
    }

    const clientInfo = clientData ? `
    DADOS DO CLIENTE (Contratante/Requerente):
    - Nome: ${clientData.name}
    - CPF/CNPJ: ${clientData.cpf_cnpj || 'Não informado'}
    - RG: ${clientData.rg || 'Não informado'}
    - Estado Civil: ${clientData.civil_status || 'Não informado'}
    - Profissão: ${clientData.profession || 'Não informado'}
    - Endereço: ${clientData.address || 'Não informado'}
    - Email: ${clientData.email || 'Não informado'}
    - Telefone: ${clientData.phone || 'Não informado'}
    ` : `NOME DO CLIENTE: ${clientName || 'PARTE INTERESSADA'}`;

    const advocateInfo = advocateData ? `
    DADOS DO ADVOGADO (Contratado/Patrono):
    - Nome: ${advocateData.name}
    - OAB: ${advocateData.oab || 'Não informado'}
    - Contato: ${advocateData.phone || advocateData.email || 'Não informado'}
    ` : '';

    const systemPrompt = `Você é um Redator Jurídico Sênior especializado em Direito Brasileiro. 
    Sua tarefa é gerar uma minuta de alta qualidade técnica, seguindo as normas da ABNT e o padrão culto da língua portuguesa.
    
    TIPO DE DOCUMENTO: ${type}
    TOM DE VOZ: ${tone || 'Formal'}
    
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
        { role: "user", content: `Gere a minuta de ${type} para o caso descrito.` }
      ],
      temperature: 0.7,
    });

    const draft = completion.choices[0].message.content;

    return NextResponse.json({ success: true, draft });

  } catch (error) {
    console.error("Erro Redator IA:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro ao gerar minuta" }, { status: 500 });
  }
}

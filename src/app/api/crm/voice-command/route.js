import { createClient } from "@/lib/supabaseServer";
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

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ success: false, message: "Nenhum texto fornecido" }, { status: 400 });
    }

    const systemPrompt = "Você é um assistente jurídico inteligente. Sua tarefa é extrair dados de um comando de voz para cadastrar um novo cliente no CRM.";
    const userPrompt = `Analise o comando de voz abaixo e extraia os dados para o formulário do CRM.
Comando de voz: "${text}"

Retorne APENAS um JSON com os seguintes campos (preencha com string vazia se não encontrar):
{
  "nome_completo": "",
  "tipo": "Pessoa Física" ou "Pessoa Jurídica" (tente inferir pelo contexto),
  "cpf_cnpj": "",
  "rg_ie": "",
  "estado_civil": "",
  "profissao": "",
  "telefone": "",
  "endereco_completo": "",
  "email": "",
  "notas_internas": "Resumo do que foi dito no áudio."
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const extractedData = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({ success: true, data: extractedData });

  } catch (error) {
    console.error("Erro no processamento de voz:", error);
    return NextResponse.json({ success: false, message: "Erro ao processar comando: " + error.message }, { status: 500 });
  }
}

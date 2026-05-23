import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/crm/voice-audio
 * Aceita um arquivo de áudio via FormData, transcreve com Whisper
 * e estrutura os dados do cliente com GPT-4o-mini.
 * Compatível com clientes mobile que enviam o token JWT no header Authorization.
 */
export async function POST(request) {
  try {
    // ── Auth: Aceita tanto cookies (web) quanto Bearer token (mobile) ──
    let userId = null;

    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    // ── Parse FormData ──
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return NextResponse.json(
        { success: false, message: "Arquivo de áudio não encontrado na requisição" },
        { status: 400 }
      );
    }

    // ── Transcrever com Whisper ──
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = await OpenAI.toFile(buffer, audioFile.name || "audio.m4a", {
      type: audioFile.type || "audio/m4a",
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pt",
    });

    const transcribedText = transcription.text?.trim();
    if (!transcribedText) {
      return NextResponse.json(
        { success: false, message: "Não foi possível transcrever o áudio. Tente falar mais claramente." },
        { status: 400 }
      );
    }

    // ── Extrair dados estruturados com GPT-4o-mini ──
    const systemPrompt = "Você é um assistente jurídico inteligente. Sua tarefa é extrair dados de um comando de voz para cadastrar um novo cliente no CRM.";
    const userPrompt = `Analise o comando de voz abaixo e extraia os dados para o formulário do CRM.
Comando de voz: "${transcribedText}"

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
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const extractedData = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({
      success: true,
      data: extractedData,
      transcript: transcribedText,
    });
  } catch (error) {
    console.error("Erro no voice-audio API:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao processar áudio: " + error.message },
      { status: 500 }
    );
  }
}

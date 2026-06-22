import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getAuthenticatedUser } from "@/lib/authServerUtils";

const ai = new GoogleGenAI({ apiKey: process.env.OPENAI_API_KEY }); // Utilizando a chave do Gemini configurada no .env

/**
 * POST /api/crm/voice-audio
 * Aceita um arquivo de áudio via FormData e processa com Gemini 2.5 Flash nativo.
 * Extrai transcrição e estrutura os dados do cliente em uma única chamada.
 * Compatível com clientes mobile que enviam o token JWT no header Authorization.
 */
export async function POST(request) {
  try {
    // ── Auth: Aceita tanto cookies (web) quanto Bearer token (mobile) ──
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }
    const userId = user.id;

    // ── Parse FormData ──
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return NextResponse.json(
        { success: false, message: "Arquivo de áudio não encontrado na requisição" },
        { status: 400 }
      );
    }

    // ── Extrair dados estruturados com Gemini 2.5 Flash ──
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Data = buffer.toString('base64');
    const mimeType = audioFile.type || "audio/m4a";

    const systemPrompt = "Você é um assistente jurídico inteligente. Sua tarefa é analisar um áudio com um comando de voz para cadastrar um novo cliente no CRM. Extraia o texto transcrito exato e os dados estruturados do cliente.";
    const userPrompt = `Ouça o áudio anexo e retorne as informações solicitadas.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            systemPrompt,
            userPrompt,
            { inlineData: { mimeType: mimeType, data: base64Data } }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    transcript: { type: Type.STRING, description: "Transcrição exata do que foi dito no áudio." },
                    data: {
                        type: Type.OBJECT,
                        properties: {
                            nome_completo: { type: Type.STRING },
                            tipo: { type: Type.STRING, description: "'Pessoa Física' ou 'Pessoa Jurídica' (tente inferir pelo contexto)" },
                            cpf_cnpj: { type: Type.STRING },
                            rg_ie: { type: Type.STRING },
                            estado_civil: { type: Type.STRING },
                            profissao: { type: Type.STRING },
                            telefone: { type: Type.STRING },
                            endereco_completo: { type: Type.STRING },
                            email: { type: Type.STRING },
                            notas_internas: { type: Type.STRING, description: "Resumo do que foi dito no áudio." }
                        }
                    }
                }
            }
        }
    });

    const result = JSON.parse(response.text);

    if (!result.transcript) {
      return NextResponse.json(
        { success: false, message: "Não foi possível extrair os dados. Tente falar mais claramente." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || {},
      transcript: result.transcript,
    });
  } catch (error) {
    console.error("Erro no voice-audio API:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao processar áudio com o Gemini: " + error.message },
      { status: 500 }
    );
  }
}

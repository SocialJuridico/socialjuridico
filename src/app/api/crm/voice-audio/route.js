import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authServerUtils";
import {
  AI_MODEL,
  AI_TRANSCRIBE_MODEL,
  getAIClientOrNull,
} from "@/lib/ai/aiProvider";

const openai = getAIClientOrNull();

const TRANSCRIBE_MODEL = AI_TRANSCRIBE_MODEL;
const MODEL = AI_MODEL;

/**
 * POST /api/crm/voice-audio
 * Aceita um arquivo de áudio via FormData e processa em duas etapas via o
 * provedor de IA central (migração temporária para a Groq):
 *   1. Transcrição do áudio (AI_TRANSCRIBE_MODEL, ex.: whisper-large-v3-turbo).
 *   2. Estruturação dos dados do cliente a partir da transcrição (AI_MODEL).
 * Compatível com clientes mobile que enviam o token JWT no header Authorization.
 */
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || typeof audioFile === "string") {
      return NextResponse.json(
        { success: false, message: "Arquivo de áudio não encontrado na requisição" },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O assistente jurídico está temporariamente indisponível. Tente novamente em alguns minutos.",
        },
        { status: 503 }
      );
    }

    // ── Etapa 1: transcrição do áudio ──
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIBE_MODEL,
      language: "pt",
    });

    const transcript = (transcription.text || "").trim();

    if (!transcript) {
      return NextResponse.json(
        { success: false, message: "Não foi possível extrair os dados. Tente falar mais claramente." },
        { status: 400 }
      );
    }

    // ── Etapa 2: estruturar os dados do cliente a partir da transcrição ──
    const systemPrompt =
      "Você é um assistente jurídico inteligente. A partir da transcrição de um comando de voz para cadastrar um novo cliente no CRM, extraia os dados estruturados do cliente. Responda SOMENTE com JSON válido no formato: {\"nome_completo\":\"\",\"tipo\":\"Pessoa Física|Pessoa Jurídica\",\"cpf_cnpj\":\"\",\"rg_ie\":\"\",\"estado_civil\":\"\",\"profissao\":\"\",\"telefone\":\"\",\"endereco_completo\":\"\",\"email\":\"\",\"notas_internas\":\"\"}. Use string vazia para campos não mencionados. Em 'tipo', infira pelo contexto. Em 'notas_internas', resuma o que foi dito.";

    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transcrição do áudio:\n"${transcript}"` },
      ],
    });

    let data = {};
    try {
      data = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    } catch {
      data = {};
    }

    return NextResponse.json({
      success: true,
      data: data || {},
      transcript,
    });
  } catch (error) {
    console.error("Erro no voice-audio API:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao processar áudio: " + error.message },
      { status: 500 }
    );
  }
}

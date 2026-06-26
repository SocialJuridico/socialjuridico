import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const fileType = file.type;
    const fileName = file.name;

    let analysis = "";

    if (fileType.startsWith("image/")) {
      // É uma imagem! Usar visão da OpenAI!
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = buffer.toString("base64");

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Você é um perito digital. Analise esta imagem que será usada como prova em um processo judicial. Diga brevemente do que se trata (ex: 'Print de conversa no WhatsApp', 'Comprovante de transferência', etc.) e descreva os pontos principais visíveis." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${fileType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.5,
      });

      analysis = completion.choices[0].message.content;
    } else {
      // Outros tipos de arquivo (PDF, áudio, vídeo)
      const ext = fileName.split('.').pop().toUpperCase();
      analysis = `Arquivo do tipo ${ext} (${fileName}) recebido para blindagem. A blindagem garante a integridade e imutabilidade deste arquivo através de hash criptográfico SHA-512, gerando uma cadeia de custódia válida para uso judicial.`;
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Erro no Analisador:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro ao analisar" }, { status: 500 });
  }
}

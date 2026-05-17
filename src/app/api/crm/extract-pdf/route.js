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

    const contentType = request.headers.get("content-type") || "";
    let buffer;
    let fileType = "";
    let fileName = "arquivo.pdf";

    if (contentType.includes("application/pdf") || contentType.startsWith("image/")) {
      const arrayBuffer = await request.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileType = contentType;
      const rawFileName = request.headers.get("x-file-name");
      if (rawFileName) {
        fileName = decodeURIComponent(rawFileName);
      }
    } else {
      // Fallback para FormData
      const formData = await request.formData();
      const file = formData.get("file");
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        fileType = file.type;
        fileName = file.name;
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const isPDF = fileType.includes("application/pdf") || fileName.endsWith(".pdf");
    const isImage = fileType.startsWith("image/") || fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg");

    let contextData = "";
    let imageBase64 = null;

    if (isPDF) {
      // Extração de texto para PDF usando pdfjs-dist (mais estável)
      try {
        const pdfjs = await eval('import("pdfjs-dist/build/pdf.mjs")');
        
        const uint8Bytes = new Uint8Array(buffer);
        
        const loadingTask = pdfjs.getDocument({
          data: uint8Bytes,
          useSystemFonts: true,
          disableFontFace: true,
        });
        
        const pdfDoc = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
        }
        
        contextData = fullText;

        if (!contextData || contextData.trim().length < 10) {
          throw new Error("PDF sem conteúdo de texto legível (provável imagem/scan).");
        }
      } catch (pdfErr) {
        console.error("Erro no parse do PDF (pdfjs):", pdfErr);
        return NextResponse.json({ 
          success: false, 
          message: "Este PDF parece ser um scan ou imagem. Para extrair os dados, por favor envie uma FOTO clara do documento (JPG/PNG) ao invés do PDF." 
        }, { status: 400 });
      }
    } else if (isImage) {
      // Processamento de Imagem (Base64)
      imageBase64 = buffer.toString("base64");
    } else {
      return NextResponse.json({ success: false, message: "Formato de arquivo não suportado. Use PDF ou Imagem." }, { status: 400 });
    }

    const systemPrompt = "Você é um extrator de dados jurídico preciso. Extraia dados para cadastro de CLIENTE.";
    const userPrompt = `Analise o documento anexo (texto ou imagem) e extraia os dados do CLIENTE (Autor/Contratante).
Retorne APENAS um JSON:
{
  "nome_completo": "",
  "tipo": "Pessoa Física" ou "Pessoa Jurídica",
  "cpf_cnpj": "",
  "rg_ie": "",
  "estado_civil": "",
  "profissao": "",
  "telefone": "",
  "endereco_completo": "",
  "email": "",
  "notas_internas": "Breve resumo do documento."
}`;

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (isImage && imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:${file.type};base64,${imageBase64}` } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `${userPrompt}\n\nTEXTO EXTRAÍDO:\n${contextData.substring(0, 15000)}`
      });
    }

    const completion = await openai.chat.completions.create({
      model: isImage ? "gpt-4o" : "gpt-4o-mini", // GPT-4o é melhor para imagens
      messages: messages,
      response_format: { type: "json_object" }
    });

    const extractedData = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({ success: true, data: extractedData });

  } catch (error) {
    console.error("Erro na extração com OpenAI:", error);
    return NextResponse.json({ success: false, message: "Erro ao processar arquivo: " + error.message }, { status: 500 });
  }
}

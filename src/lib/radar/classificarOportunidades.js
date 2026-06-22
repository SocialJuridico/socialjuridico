import OpenAI from "openai";

/**
 * Classifica oportunidades públicas encontradas pelo Radar Jurídico.
 * A classificação não publica nada automaticamente: itens aceitos entram como
 * pendentes e dependem de curadoria administrativa.
 */
export async function classificarOportunidades(oportunidadesBrutas) {
  if (!Array.isArray(oportunidadesBrutas) || oportunidadesBrutas.length === 0) {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log(
      "[Radar] OPENAI_API_KEY ausente. Usando classificação conservadora local.",
    );

    return oportunidadesBrutas.map((item) => {
      const trecho = cleanHtml(
        item.texto_publico || item.trecho_publico || "",
      ).substring(0, 500);

      return {
        titulo:
          item.titulo ||
          `Oportunidade pública em ${item.fonte || "Internet"}`,
        categoria: "Não classificada",
        fonte: item.fonte || "Internet",
        url_original: item.url_original || "",
        trecho_publico: trecho,
        cidade: item.cidade || null,
        estado: item.estado || null,
        score_intencao:
          item.score_intencao !== undefined ? item.score_intencao : 50,
        urgencia: item.urgencia || "media",
        resumo_ia:
          "Oportunidade pública detectada e pendente de revisão administrativa.",
        fonte_tipo: mapearFonteTipo(item.fonte, item.url_original),
      };
    });
  }

  const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });

  try {
    const listToClassify = oportunidadesBrutas.map((item, index) => ({
      index,
      fonte: item.fonte,
      dominio: item.raw_fonte || null,
      url: item.url_original,
      titulo: item.titulo || "",
      texto: cleanHtml(
        item.texto_publico || item.trecho_publico || "",
      ).substring(0, 900),
    }));

    const prompt = `Você classifica oportunidades públicas para uma plataforma jurídica.

As oportunidades aceitas NÃO serão publicadas automaticamente. Elas entrarão como PENDENTES para revisão humana. Portanto, diferencie claramente propaganda de uma possível demanda real, mas não descarte dúvidas jurídicas plausíveis apenas porque a pessoa ainda não escreveu explicitamente "quero contratar".

Regras:
1. Não invente nomes, cidades ou estados. Use null quando não estiver claro.
2. Remova ou generalize dados pessoais sensíveis no trecho_publico.
3. Score de intenção:
   - 0 a 10: propaganda de advogado, escritório oferecendo serviço, spam, artigo, notícia ou conteúdo institucional.
   - 11 a 29: conteúdo jurídico genérico, sem caso pessoal identificável.
   - 30 a 49: pessoa descreve um problema jurídico próprio ou próximo, mas ainda não pede advogado claramente.
   - 50 a 69: pessoa demonstra necessidade concreta de orientação, ajuda ou possível representação.
   - 70 a 100: pessoa pede indicação, contato, contratação ou busca ativa por advogado.
4. Publicações de advogados oferecendo serviços devem receber score 0.
5. urgencia: somente baixa, media ou alta.
6. fonte_tipo: somente Facebook, Instagram, X, Reddit, JusBrasil ou Outros.
7. Retorne um objeto JSON com a propriedade "oportunidades", contendo um array. Preserve o index de cada item.

Entrada:
${JSON.stringify(listToClassify, null, 2)}

Formato:
{
  "oportunidades": [
    {
      "index": 0,
      "titulo": "Título objetivo",
      "categoria": "Trabalhista",
      "cidade": null,
      "estado": null,
      "score_intencao": 65,
      "urgencia": "media",
      "resumo_ia": "Resumo curto sem dados sensíveis.",
      "trecho_publico": "Trecho resumido, máximo 500 caracteres.",
      "fonte_tipo": "Facebook"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const contentText = response.choices[0]?.message?.content || "{}";
    const parsedData = JSON.parse(contentText);
    const results = Array.isArray(parsedData)
      ? parsedData
      : Array.isArray(parsedData?.oportunidades)
        ? parsedData.oportunidades
        : Object.values(parsedData || {}).find(Array.isArray) || [];

    return oportunidadesBrutas.map((item, index) => {
      const aiResult = results.find(
        (result) => Number(result?.index) === index,
      ) || {};
      const trecho = cleanHtml(
        aiResult.trecho_publico ||
          item.texto_publico ||
          item.trecho_publico ||
          "",
      ).substring(0, 500);
      const score = Number(aiResult.score_intencao);

      return {
        titulo:
          aiResult.titulo ||
          item.titulo ||
          `Oportunidade pública em ${item.fonte || "Internet"}`,
        categoria: aiResult.categoria || "Não classificada",
        fonte: item.fonte || "Internet",
        url_original: item.url_original || "",
        trecho_publico: trecho,
        cidade: aiResult.cidade || item.cidade || null,
        estado: aiResult.estado || item.estado || null,
        score_intencao: Number.isFinite(score) ? score : 50,
        urgencia: ["baixa", "media", "alta"].includes(aiResult.urgencia)
          ? aiResult.urgencia
          : "media",
        resumo_ia:
          aiResult.resumo_ia ||
          "Oportunidade pública detectada e pendente de revisão administrativa.",
        fonte_tipo:
          aiResult.fonte_tipo ||
          mapearFonteTipo(item.fonte, item.url_original),
      };
    });
  } catch (error) {
    console.error("[Radar] Erro ao classificar oportunidades com OpenAI:", error);

    return oportunidadesBrutas.map((item) => ({
      titulo:
        item.titulo ||
        `Oportunidade pública em ${item.fonte || "Internet"}`,
      categoria: "Não classificada",
      fonte: item.fonte || "Internet",
      url_original: item.url_original || "",
      trecho_publico: cleanHtml(
        item.texto_publico || item.trecho_publico || "",
      ).substring(0, 500),
      cidade: item.cidade || null,
      estado: item.estado || null,
      score_intencao: 50,
      urgencia: "media",
      resumo_ia:
        "Oportunidade pública detectada e pendente de revisão administrativa. A classificação por IA não foi concluída.",
      fonte_tipo: mapearFonteTipo(item.fonte, item.url_original),
    }));
  }
}

function mapearFonteTipo(fonte, urlOriginal) {
  const value = `${fonte || ""} ${urlOriginal || ""}`.toLowerCase();

  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("reddit")) return "Reddit";
  if (value.includes("twitter") || value.includes("x.com")) return "X";
  if (value.includes("jusbrasil")) return "JusBrasil";
  return "Outros";
}

function cleanHtml(value) {
  if (!value) return "";
  return String(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

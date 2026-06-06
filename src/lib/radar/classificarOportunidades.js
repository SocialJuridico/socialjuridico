import OpenAI from "openai";

/**
 * Classifica uma lista de oportunidades brutas vindas da internet.
 * 
 * Cada item bruto deve ter o formato:
 * {
 *   "fonte": "Facebook",
 *   "url_original": "https://...",
 *   "texto_publico": "Preciso de advogado trabalhista..."
 * }
 * 
 * Retorna uma lista de oportunidades estruturadas:
 * {
 *   "titulo": "Pessoa busca advogado trabalhista após demissão",
 *   "categoria": "Trabalhista",
 *   "fonte": "Facebook",
 *   "url_original": "https://...",
 *   "trecho_publico": "Preciso de advogado...", // max 500 chars
 *   "cidade": "Porto Alegre",
 *   "estado": "RS",
 *   "score_intencao": 92,
 *   "urgencia": "alta",
 *   "resumo_ia": "Publicação indica busca ativa por advogado trabalhista.",
 *   "fonte_tipo": "Facebook"
 * }
 */
export async function classificarOportunidades(oportunidadesBrutas) {
  if (!Array.isArray(oportunidadesBrutas) || oportunidadesBrutas.length === 0) {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // Se não houver chave OpenAI, usa modo fallback sem IA
  if (!apiKey) {
    console.log("[Radar] OPENAI_API_KEY ausente. Usando modo fallback para classificação.");
    return oportunidadesBrutas.map(item => {
      const trecho = (item.texto_publico || item.trecho_publico || "")
        .substring(0, 500);
      
      const fonte = item.fonte || "Internet";
      const categoria = "Não classificada";
      
      return {
        titulo: `Oportunidade pública em ${fonte}`,
        categoria,
        fonte,
        url_original: item.url_original || "",
        trecho_publico: trecho,
        cidade: item.cidade || null,
        estado: item.estado || null,
        score_intencao: item.score_intencao !== undefined ? item.score_intencao : 50,
        urgencia: item.urgencia || "media",
        resumo_ia: "Oportunidade pública detectada e pendente de revisão.",
        fonte_tipo: mapearFonteTipo(fonte)
      };
    });
  }

  // Inicializa OpenAI
  const openai = new OpenAI({ apiKey });

  try {
    const listToClassify = oportunidadesBrutas.map((item, index) => ({
      index,
      fonte: item.fonte,
      url: item.url_original,
      texto: (item.texto_publico || item.trecho_publico || "").substring(0, 800) // limitar tamanho enviado para a IA
    }));

    const prompt = `Você é um classificador especializado em inteligência jurídica.
Classifique as oportunidades públicas brutas abaixo encontradas na internet.
Regras estritas:
1. Não invente dados de cidades, estados ou nomes. Se não estiver claro no texto, retorne null para cidade e/ou estado.
2. Não copie o texto integral em trecho_publico. Resuma ou traga o exato início útil, limitado a no máximo 500 caracteres.
3. Regra de Intenção Crítica (Clientes vs Profissionais):
   - Avalie rigorosamente se o texto foi escrito por um potencial CLIENTE buscando indicação ou contratação de advogado, OU se foi escrito por um profissional/advogado oferecendo serviços (ex: "Precisa de advogado?", "Fale conosco", publicações informativas de escritórios, posts de artigos, propagandas, etc.).
   - PROPAGANDAS, OFERTAS DE SERVIÇOS DE ADVOGADOS, ARTIGOS INFORMATIVOS, SPAMS E PUBLICAÇÕES DE ADVOGADOS OFERECENDO AJUDA DEVEM RECEBER score_intencao = 0.
   - Dê score_intencao alto (entre 70 e 100) APENAS quando a publicação for de uma pessoa real expressando intenção clara de encontrar, contratar ou pedindo indicação ativa de um profissional para um caso real.
   - Se for uma dúvida jurídica genérica onde a pessoa apenas pergunta algo sobre direito mas não indica que quer contratar ou receber indicações de um advogado, dê um score baixo (menor que 30).
4. O campo urgencia deve aceitar apenas: 'baixa', 'media', 'alta'.
5. O campo fonte_tipo deve classificar de onde a oportunidade se originou. Escolha um dos seguintes valores: 'Facebook', 'Google', 'Reddit', 'X', 'Instagram', ou 'Outros'.
6. Retorne estritamente um JSON no formato de array de objetos. Cada objeto deve corresponder ao índice fornecido na entrada.

Entrada das oportunidades:
${JSON.stringify(listToClassify, null, 2)}

Formato de saída JSON esperado:
[
  {
    "index": 0,
    "titulo": "Título sucinto e atraente sobre o que a pessoa precisa (ex: 'Busca por advogado trabalhista para demissão sem justa causa')",
    "categoria": "Área do direito (ex: 'Trabalhista', 'Família', 'Civil', 'Previdenciário', 'Tributário', 'Consumidor', 'Outros')",
    "cidade": "Nome da cidade por extenso ou null",
    "estado": "Sigla do estado com 2 letras (ex: 'RS', 'SP') ou null",
    "score_intencao": 90,
    "urgencia": "alta",
    "resumo_ia": "Um resumo muito curto gerado por você explicando o caso, sem dados pessoais sensíveis.",
    "trecho_publico": "Trecho recortado e resumido livre de dados sensíveis (max 500 caracteres)",
    "fonte_tipo": "Tipo de fonte mapeada"
  }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const contentText = response.choices[0].message.content;
    const parsedData = JSON.parse(contentText);
    let results = [];
    if (Array.isArray(parsedData)) {
      results = parsedData;
    } else if (parsedData && typeof parsedData === "object") {
      // 1. Procurar por qualquer propriedade que seja um array (ex: 'result', 'results', 'oportunidades', etc.)
      const possibleArray = Object.values(parsedData).find(val => Array.isArray(val));
      if (possibleArray) {
        results = possibleArray;
      } else {
        // 2. Se for um objeto com chaves numéricas ou indexadas (ex: { "0": {...}, "1": {...} })
        results = Object.entries(parsedData).map(([key, val]) => {
          if (val && typeof val === "object") {
            const idx = val.index !== undefined ? val.index : parseInt(key, 10);
            return { ...val, index: isNaN(idx) ? idx : val.index };
          }
          return null;
        }).filter(Boolean);
      }
    }

    // Mapeia de volta para o formato de banco de dados combinando as informações originais (como urls)
    return oportunidadesBrutas.map((item, index) => {
      const aiResult = results.find(r => r.index === index) || {};
      const trecho = (aiResult.trecho_publico || item.texto_publico || item.trecho_publico || "")
        .substring(0, 500);

      return {
        titulo: aiResult.titulo || `Oportunidade pública em ${item.fonte || "Internet"}`,
        categoria: aiResult.categoria || "Não classificada",
        fonte: item.fonte || "Internet",
        url_original: item.url_original || "",
        trecho_publico: trecho,
        cidade: aiResult.cidade || item.cidade || null,
        estado: aiResult.estado || item.estado || null,
        score_intencao: typeof aiResult.score_intencao === "number" ? aiResult.score_intencao : 50,
        urgencia: ["baixa", "media", "alta"].includes(aiResult.urgencia) ? aiResult.urgencia : "media",
        resumo_ia: aiResult.resumo_ia || "Oportunidade pública detectada e pendente de revisão.",
        fonte_tipo: aiResult.fonte_tipo || mapearFonteTipo(item.fonte)
      };
    });

  } catch (error) {
    console.error("[Radar] Erro ao classificar oportunidades com OpenAI:", error);
    // Fallback em caso de erro da chamada da API
    return oportunidadesBrutas.map(item => {
      const trecho = (item.texto_publico || item.trecho_publico || "")
        .substring(0, 500);
      return {
        titulo: `Oportunidade pública em ${item.fonte || "Internet"}`,
        categoria: "Não classificada",
        fonte: item.fonte || "Internet",
        url_original: item.url_original || "",
        trecho_publico: trecho,
        cidade: item.cidade || null,
        estado: item.estado || null,
        score_intencao: 50,
        urgencia: "media",
        resumo_ia: "Oportunidade pública detectada e pendente de revisão (Erro na classificação por IA).",
        fonte_tipo: mapearFonteTipo(item.fonte)
      };
    });
  }
}

function mapearFonteTipo(fonte) {
  if (!fonte) return "Outros";
  const f = fonte.toLowerCase().trim();
  if (f.includes("facebook")) return "Facebook";
  if (f.includes("google")) return "Google";
  if (f.includes("reddit")) return "Reddit";
  if (f.includes("twitter") || f === "x") return "X";
  if (f.includes("instagram")) return "Instagram";
  if (f.includes("jusbrasil")) return "JusBrasil";
  return "Outros";
}

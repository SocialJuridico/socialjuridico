/**
 * O Radar Jurídico coleta apenas referências a conteúdos públicos e links originais,
 * sem coleta de dados pessoais privados. As oportunidades são salvas como pendentes
 * para curadoria administrativa antes da exibição aos advogados.
 */

// Palavras-chave de busca ativa por clientes (usadas para pesquisar no Brave/Google)
export const SEARCH_KEYWORDS = [
  "preciso de advogado",
  "procuro advogado",
  "alguém indica advogado",
  "indicação de advogado",
  "recomenda algum advogado",
  "alguém conhece um advogado",
  "procurando advogado",
  "algum advogado para me ajudar",
  "preciso de um advogado",
  "preciso falar com um advogado",
  "alguém tem contato de advogado",
  "alguém indica um advogado",
  "indicar um advogado",
  "preciso de indicação de advogado"
];

// Palavras-chave gerais de intenção jurídica e áreas (usadas para filtros locais e validação de relevância)
export const KEYWORDS = [
  "preciso de advogado",
  "indicação de advogado",
  "recomenda advogado",
  "advogado trabalhista",
  "advogado previdenciário",
  "advogado família",
  "advogado inventário",
  "advogado consumidor",
  "fui demitido",
  "não recebi rescisão",
  "problema com INSS",
  "aposentadoria negada",
  "pensão alimentícia",
  "guarda dos filhos",
  "empresa não paga",
  "quero processar",
  "direito trabalhista",
  "direito previdenciário",
  "negativação indevida",
  "golpe do pix",
  "cobrança indevida"
];

// Domínios-alvo permitidos
const TARGET_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "jusbrasil.com.br",
  "reddit.com"
];

// Decodifica entidades HTML e XML mais comuns
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'");
}

// Remove tags HTML de forma limpa e decodifica entidades
export function stripHtml(str) {
  if (!str) return "";
  const withoutTags = str.replace(/<[^>]*>/g, " ");
  return decodeHtmlEntities(withoutTags)
    .replace(/\s+/g, " ")
    .trim();
}

// Normaliza URLs removendo parâmetros de tracking de cliques e UTMs
export function normalizeUrl(urlStr) {
  if (!urlStr) return "";
  try {
    const u = new URL(urlStr.trim());
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "fb_action_ids", "fb_action_types", "fb_source",
      "action_object_map", "action_type_map", "action_ref_map"
    ];
    trackingParams.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return urlStr.trim();
  }
}

// Verifica se o texto possui termos de intenção jurídica
export function matchesIntentKeywords(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(term => lowerText.includes(term.toLowerCase()));
}

// Identifica o domínio bruto mapeado para a oportunidade
export function getRawFonteFromUrl(urlStr) {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    if (hostname.includes("facebook.com")) return "facebook.com";
    if (hostname.includes("instagram.com")) return "instagram.com";
    if (hostname.includes("x.com")) return "x.com";
    if (hostname.includes("twitter.com")) return "twitter.com";
    if (hostname.includes("jusbrasil.com.br")) return "jusbrasil.com.br";
    if (hostname.includes("reddit.com")) return "reddit.com";
    return "outros";
  } catch {
    return "outros";
  }
}

// Gera combinações "keyword" site:domain e retorna N aleatórias
function gerarQueriesAleatorias(quantidade) {
  const combinations = [];
  for (const keyword of SEARCH_KEYWORDS) {
    for (const domain of TARGET_DOMAINS) {
      combinations.push(`"${keyword}" site:${domain}`);
    }
  }
  // Fisher-Yates shuffle
  for (let i = combinations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
  }
  return combinations.slice(0, quantidade);
}

/**
 * Busca oportunidades públicas no RSS público do Reddit (r/ConselhosLegais)
 * @returns {Promise<{items: Array, stats: Object}>}
 */
export async function fetchRedditRSS() {
  console.log("[Radar Robot] Iniciando busca no Reddit RSS...");
  const stats = { encontrados: 0, erros: 0 };
  try {
    const response = await fetch("https://www.reddit.com/r/ConselhosLegais/new.rss", {
      headers: {
        "User-Agent": "SocialJuridicoRadarRobot/1.0.0 (SaaS Juridico)"
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.warn(`[Radar Robot] Falha ao ler Reddit RSS: ${response.status}`);
      stats.erros++;
      return { items: [], stats };
    }

    const xmlText = await response.text();
    const items = [];

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryContent = match[1];

      const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
      const title = titleMatch ? stripHtml(titleMatch[1]) : "";

      const linkMatch = entryContent.match(/<link\s+href="([^"]+)"/);
      const url = linkMatch ? normalizeUrl(linkMatch[1]) : "";

      const contentMatch = entryContent.match(/<content[^>]*>([\s\S]*?)<\/content>/);
      const rawHtmlContent = contentMatch ? contentMatch[1] : "";
      const plainContent = stripHtml(rawHtmlContent);

      const updatedMatch = entryContent.match(/<updated>([\s\S]*?)<\/updated>/);
      const publishedAt = updatedMatch ? new Date(updatedMatch[1]).toISOString() : new Date().toISOString();

      if (!url) continue;

      const postDate = new Date(publishedAt);
      const limitDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

      if (postDate >= limitDate) {
        items.push({
          titulo: title || "Oportunidade no Reddit",
          fonte: "Reddit",
          raw_fonte: "reddit.com",
          url_original: url,
          texto_publico: plainContent.substring(0, 1000) || title,
          detectado_em: new Date().toISOString(),
          publicado_em: publishedAt
        });
      }
    }

    stats.encontrados = items.length;
    console.log(`[Radar Robot] Reddit RSS concluído. Encontrados ${items.length} itens relevantes.`);
    return { items, stats };
  } catch (error) {
    console.error("[Radar Robot] Erro no fetchRedditRSS:", error);
    stats.erros++;
    return { items: [], stats };
  }
}

/**
 * Busca oportunidades públicas na Brave Search API (FONTE PRINCIPAL)
 * Respeita BRAVE_QUERIES_PER_RUN (padrão 5). 
 * Em caso de 401/402/403/429 NÃO lança erro fatal — registra e retorna resultado parcial.
 * @returns {Promise<{items: Array, stats: Object}>}
 */
export async function fetchBraveSearch() {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  const queriesPerRun = Math.max(
    1,
    parseInt(process.env.BRAVE_QUERIES_PER_RUN || "5", 10) || 5
  );

  const stats = { encontrados: 0, classificados: 0, duplicados: 0, descartados_baixo_score: 0, inseridos: 0, erros: 0 };

  if (!apiKey) {
    console.log("[Radar Robot] BRAVE_SEARCH_API_KEY não configurada. Pulando Brave Search.");
    return { items: [], stats };
  }

  console.log(`[Radar Robot] Iniciando Brave Search (${queriesPerRun} queries)...`);

  const queriesToRun = gerarQueriesAleatorias(queriesPerRun);
  console.log(`[Radar Robot] Queries Brave: ${JSON.stringify(queriesToRun)}`);

  const items = [];
  const ERROS_FATAIS = [401, 402, 403, 429];

  for (const query of queriesToRun) {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&freshness=pd20`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Subscription-Token": apiKey,
          "Accept": "application/json",
          "Accept-Encoding": "gzip"
        },
        next: { revalidate: 0 }
      });

      if (ERROS_FATAIS.includes(response.status)) {
        console.warn(`[Radar Robot] Brave Search retornou ${response.status} — limite atingido ou erro de autenticação. Parando queries Brave.`);
        stats.erros++;
        console.warn(JSON.stringify({
          fonte: "brave",
          status: "erro",
          codigo: response.status,
          mensagem: "limite atingido ou erro de autenticação"
        }));
        break; // Para as demais queries Brave, mas não quebra o radar
      }

      if (!response.ok) {
        console.warn(`[Radar Robot] Brave Search falhou para query "${query}": ${response.status}`);
        stats.erros++;
        continue;
      }

      const data = await response.json();
      const results = data.web?.results || [];

      for (const res of results) {
        const urlOriginal = normalizeUrl(res.url);
        if (!urlOriginal) continue;

        // Filtrar páginas antigas (mais de 20 dias) quando a data estiver disponível
        if (res.page_age) {
          const ageDate = new Date(res.page_age);
          const limitDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
          if (ageDate < limitDate) continue;
        }

        const title = stripHtml(res.title || "");
        const snippet = stripHtml(res.description || "");
        const fullText = `${title} ${snippet}`;

        if (matchesIntentKeywords(fullText)) {
          const rawFonte = getRawFonteFromUrl(urlOriginal);
          items.push({
            titulo: title || "Oportunidade pública na Web",
            fonte: "Brave Web",
            raw_fonte: rawFonte,
            url_original: urlOriginal,
            texto_publico: snippet.substring(0, 1000),
            detectado_em: new Date().toISOString(),
            publicado_em: res.page_age || new Date().toISOString()
          });
        }
      }
    } catch (queryErr) {
      console.error(`[Radar Robot] Erro ao executar query Brave "${query}":`, queryErr);
      stats.erros++;
    }
  }

  stats.encontrados = items.length;
  console.log(`[Radar Robot] Brave Search concluído. Encontrados ${items.length} itens.`);
  return { items, stats };
}

/**
 * Busca oportunidades públicas no Google Custom Search JSON API (FALLBACK OPCIONAL)
 * Só executa se GOOGLE_CSE_API_KEY e GOOGLE_CSE_ID estiverem configurados.
 * @returns {Promise<{items: Array, stats: Object}>}
 */
export async function fetchGoogleCSE() {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  const stats = { encontrados: 0, erros: 0 };

  if (!apiKey || !cx) {
    console.log("[Radar Robot] Google CSE não configurado. Pulando fallback Google.");
    return { items: [], stats };
  }

  console.log("[Radar Robot] Iniciando Google CSE (fallback)...");

  const queriesPerRun = Math.max(
    1,
    parseInt(process.env.BRAVE_QUERIES_PER_RUN || "5", 10) || 5
  );
  const queriesToRun = gerarQueriesAleatorias(queriesPerRun);
  console.log(`[Radar Robot] Queries Google CSE: ${JSON.stringify(queriesToRun)}`);

  const items = [];

  const promises = queriesToRun.map(async (query) => {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&dateRestrict=d20`;
      const response = await fetch(url, { next: { revalidate: 0 } });

      if (!response.ok) {
        console.warn(`[Radar Robot] Google CSE falhou para query "${query}": ${response.status}`);
        stats.erros++;
        return;
      }

      const data = await response.json();
      const results = data.items || [];

      for (const res of results) {
        const urlOriginal = normalizeUrl(res.link);
        if (!urlOriginal) continue;

        const title = stripHtml(res.title || "");
        const snippet = stripHtml(res.snippet || "");
        const fullText = `${title} ${snippet}`;

        if (matchesIntentKeywords(fullText)) {
          const rawFonte = getRawFonteFromUrl(urlOriginal);
          items.push({
            titulo: title || "Oportunidade pública no Google",
            fonte: "Google CSE",
            raw_fonte: rawFonte,
            url_original: urlOriginal,
            texto_publico: snippet.substring(0, 1000),
            detectado_em: new Date().toISOString(),
            publicado_em: new Date().toISOString()
          });
        }
      }
    } catch (queryErr) {
      console.error(`[Radar Robot] Erro ao executar query Google CSE "${query}":`, queryErr);
      stats.erros++;
    }
  });

  await Promise.all(promises);

  stats.encontrados = items.length;
  console.log(`[Radar Robot] Google CSE concluído. Encontrados ${items.length} itens.`);
  return { items, stats };
}

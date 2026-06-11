/**
 * O Radar Jurídico coleta apenas referências a conteúdos públicos e links originais,
 * sem coleta de dados pessoais privados. As oportunidades são salvas como pendentes
 * para curadoria administrativa antes da exibição aos advogados.
 */

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
  "preciso de indicação de advogado",
];

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
  "problema com inss",
  "aposentadoria negada",
  "pensão alimentícia",
  "guarda dos filhos",
  "empresa não paga",
  "quero processar",
  "direito trabalhista",
  "direito previdenciário",
  "negativação indevida",
  "golpe do pix",
  "cobrança indevida",
];

const TARGET_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "jusbrasil.com.br",
  "reddit.com",
];

const REDDIT_ENDPOINTS = [
  "https://www.reddit.com/r/ConselhosLegais/new.rss",
  "https://old.reddit.com/r/ConselhosLegais/new/.rss",
  "https://www.reddit.com/r/ConselhosLegais/new.json?limit=50&raw_json=1",
];

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

export function stripHtml(str) {
  if (!str) return "";
  return decodeHtmlEntities(str.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(urlStr) {
  if (!urlStr) return "";
  try {
    const url = new URL(urlStr.trim());
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "fb_action_ids",
      "fb_action_types",
      "fb_source",
      "action_object_map",
      "action_type_map",
      "action_ref_map",
    ].forEach((parameter) => url.searchParams.delete(parameter));
    return url.toString();
  } catch {
    return urlStr.trim();
  }
}

export function matchesIntentKeywords(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return KEYWORDS.some((term) => lowerText.includes(term.toLowerCase()));
}

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

function gerarQueriesAleatorias(quantidade) {
  const combinations = [];
  for (const keyword of SEARCH_KEYWORDS) {
    for (const domain of TARGET_DOMAINS) {
      combinations.push(`"${keyword}" site:${domain}`);
    }
  }

  for (let index = combinations.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [combinations[index], combinations[randomIndex]] = [
      combinations[randomIndex],
      combinations[index],
    ];
  }

  return combinations.slice(0, quantidade);
}

function isRecent(dateValue, days = 20) {
  if (!dateValue) return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;
  return date >= new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function parseRedditRss(xmlText) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1];
    const title = stripHtml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const url = normalizeUrl(entry.match(/<link\s+href="([^"]+)"/)?.[1] || "");
    const content = stripHtml(
      entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || "",
    );
    const publishedAt = entry.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] || null;

    if (!url || !isRecent(publishedAt)) continue;

    items.push({
      titulo: title || "Oportunidade no Reddit",
      fonte: "Reddit",
      raw_fonte: "reddit.com",
      url_original: url,
      texto_publico: content.substring(0, 1000) || title,
      detectado_em: new Date().toISOString(),
      publicado_em: publishedAt || new Date().toISOString(),
    });
  }

  return items;
}

function parseRedditJson(payload) {
  const children = payload?.data?.children || [];

  return children
    .map((entry) => entry?.data)
    .filter(Boolean)
    .filter((post) => isRecent(post.created_utc ? post.created_utc * 1000 : null))
    .map((post) => ({
      titulo: stripHtml(post.title || "Oportunidade no Reddit"),
      fonte: "Reddit",
      raw_fonte: "reddit.com",
      url_original: normalizeUrl(
        post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : post.url || "",
      ),
      texto_publico: stripHtml(post.selftext || post.title || "").substring(0, 1000),
      detectado_em: new Date().toISOString(),
      publicado_em: post.created_utc
        ? new Date(post.created_utc * 1000).toISOString()
        : new Date().toISOString(),
    }))
    .filter((item) => item.url_original);
}

export async function fetchRedditRSS() {
  console.log("[Radar Robot] Iniciando busca pública no Reddit...");
  const stats = { encontrados: 0, erros: 0, indisponivel: false };

  for (const endpoint of REDDIT_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SocialJuridicoRadar/1.0; +https://socialjuridico.com.br)",
          Accept: endpoint.includes(".json")
            ? "application/json"
            : "application/atom+xml, application/xml, text/xml",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn(
          `[Radar Robot] Reddit bloqueou ${new URL(endpoint).hostname} com status ${response.status}. Tentando outra origem pública...`,
        );
        continue;
      }

      const items = endpoint.includes(".json")
        ? parseRedditJson(await response.json())
        : parseRedditRss(await response.text());

      stats.encontrados = items.length;
      console.log(
        `[Radar Robot] Reddit concluído via ${new URL(endpoint).hostname}. Encontrados ${items.length} itens.`,
      );
      return { items, stats };
    } catch (error) {
      console.warn(
        `[Radar Robot] Falha ao consultar ${endpoint}: ${error.message}`,
      );
    }
  }

  stats.erros = 1;
  stats.indisponivel = true;
  console.warn(
    "[Radar Robot] Reddit indisponível para o IP do servidor. O Radar continuará com Brave Search.",
  );
  return { items: [], stats };
}

export async function fetchBraveSearch() {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  const queriesPerRun = Math.max(
    1,
    Number.parseInt(process.env.BRAVE_QUERIES_PER_RUN || "8", 10) || 8,
  );
  const stats = {
    encontrados: 0,
    classificados: 0,
    duplicados: 0,
    descartados_baixo_score: 0,
    inseridos: 0,
    erros: 0,
  };

  if (!apiKey) {
    console.log(
      "[Radar Robot] BRAVE_SEARCH_API_KEY não configurada. Pulando Brave Search.",
    );
    return { items: [], stats };
  }

  console.log(
    `[Radar Robot] Iniciando Brave Search (${queriesPerRun} queries)...`,
  );

  const queriesToRun = gerarQueriesAleatorias(queriesPerRun);
  const items = [];
  const fatalStatuses = [401, 402, 403, 429];

  for (const query of queriesToRun) {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&freshness=pd20`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Subscription-Token": apiKey,
          Accept: "application/json",
          "Accept-Encoding": "gzip",
        },
        cache: "no-store",
      });

      if (fatalStatuses.includes(response.status)) {
        console.warn(
          `[Radar Robot] Brave Search retornou ${response.status}. As demais consultas foram interrompidas.`,
        );
        stats.erros += 1;
        break;
      }

      if (!response.ok) {
        console.warn(
          `[Radar Robot] Brave Search falhou para query "${query}": ${response.status}`,
        );
        stats.erros += 1;
        continue;
      }

      const data = await response.json();
      const results = data.web?.results || [];

      for (const result of results) {
        const originalUrl = normalizeUrl(result.url);
        if (!originalUrl || !isRecent(result.page_age)) continue;

        const title = stripHtml(result.title || "");
        const snippet = stripHtml(result.description || "");
        if (!matchesIntentKeywords(`${title} ${snippet}`)) continue;

        items.push({
          titulo: title || "Oportunidade pública na web",
          fonte: "Brave Web",
          raw_fonte: getRawFonteFromUrl(originalUrl),
          url_original: originalUrl,
          texto_publico: snippet.substring(0, 1000),
          detectado_em: new Date().toISOString(),
          publicado_em: result.page_age || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        `[Radar Robot] Erro ao executar query Brave "${query}":`,
        error,
      );
      stats.erros += 1;
    }
  }

  stats.encontrados = items.length;
  console.log(
    `[Radar Robot] Brave Search concluído. Encontrados ${items.length} itens.`,
  );
  return { items, stats };
}

/**
 * O Radar Jurídico coleta apenas referências a conteúdos públicos e links originais,
 * sem coleta de dados pessoais privados. As oportunidades são salvas como pendentes
 * para curadoria administrativa antes da exibição aos advogados.
 */

import { supabaseAdmin } from "@/lib/supabase";
import { classificarOportunidades } from "./classificarOportunidades";
import { fetchBraveSearch, fetchRedditRSS } from "./fetchRadarSources";

function createSourceStats() {
  return {
    encontrados: 0,
    classificados: 0,
    duplicados: 0,
    descartados_baixo_score: 0,
    inseridos: 0,
    erros: 0,
    indisponivel: false,
  };
}

function calcularPorDominio(items) {
  const stats = {
    facebook: 0,
    instagram: 0,
    x_twitter: 0,
    jusbrasil: 0,
    reddit: 0,
    outros: 0,
  };

  for (const item of items) {
    const raw = String(item.raw_fonte || "").toLowerCase();

    if (raw.includes("facebook")) stats.facebook += 1;
    else if (raw.includes("instagram")) stats.instagram += 1;
    else if (raw.includes("x.com") || raw.includes("twitter")) {
      stats.x_twitter += 1;
    } else if (raw.includes("jusbrasil")) stats.jusbrasil += 1;
    else if (raw.includes("reddit")) stats.reddit += 1;
    else stats.outros += 1;
  }

  return stats;
}

function mapearFonteTipo(urlOriginal, fallbackFonte) {
  const url = String(urlOriginal || "").toLowerCase();

  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("x.com") || url.includes("twitter.com")) return "X";
  if (url.includes("reddit.com")) return "Reddit";
  if (url.includes("jusbrasil.com")) return "JusBrasil";

  const allowedFallbacks = new Set([
    "Facebook",
    "Instagram",
    "X",
    "Reddit",
    "JusBrasil",
    "Outros",
  ]);

  return allowedFallbacks.has(fallbackFonte) ? fallbackFonte : "Outros";
}

function getSourceKey(item) {
  const rawSource = String(item.raw_fonte || "").toLowerCase();
  return rawSource.includes("reddit") ? "reddit" : "brave";
}

function getMinimumScore() {
  const configured = Number.parseInt(
    process.env.RADAR_MIN_SCORE || "30",
    10,
  );

  if (!Number.isInteger(configured)) return 30;
  return Math.min(90, Math.max(0, configured));
}

function buildResponse(
  success,
  sourceStats,
  totals,
  porDominio,
  timestamp,
  errorMessage,
) {
  const result = {
    success,
    stats: {
      brave: sourceStats.brave,
      reddit: sourceStats.reddit,
      por_dominio: porDominio,
      ...totals,
    },
    timestamp,
  };

  if (errorMessage) result.error = errorMessage;
  return result;
}

export async function runRadarFetch() {
  const timestamp = new Date().toISOString();
  const minimumScore = getMinimumScore();

  console.log(`[Radar Fetch Runner] Iniciando execução: ${timestamp}`);
  console.log(
    `[Radar Fetch Runner] Score mínimo para entrar na curadoria: ${minimumScore}`,
  );

  const configuredLimit = Number.parseInt(
    process.env.RADAR_FETCH_LIMIT || "20",
    10,
  );
  const maxLimit =
    Number.isNaN(configuredLimit) || configuredLimit <= 0
      ? 20
      : Math.min(configuredLimit, 20);

  const sourceStats = {
    brave: createSourceStats(),
    reddit: createSourceStats(),
  };

  try {
    if (!supabaseAdmin) {
      throw new Error("Cliente administrativo do Supabase não configurado.");
    }

    const [braveResult, redditResult] = await Promise.all([
      fetchBraveSearch(),
      fetchRedditRSS(),
    ]);

    const braveItems = braveResult.items || [];
    const redditItems = redditResult.items || [];

    sourceStats.brave.encontrados =
      braveResult.stats?.encontrados || braveItems.length;
    sourceStats.brave.erros = braveResult.stats?.erros || 0;
    sourceStats.brave.indisponivel = Boolean(
      braveResult.stats?.indisponivel,
    );

    sourceStats.reddit.encontrados =
      redditResult.stats?.encontrados || redditItems.length;
    sourceStats.reddit.erros = redditResult.stats?.erros || 0;
    sourceStats.reddit.indisponivel = Boolean(
      redditResult.stats?.indisponivel,
    );

    const allItems = [...braveItems, ...redditItems];
    const totalEncontrado = allItems.length;

    console.log(
      `[Radar Fetch Runner] Total bruto coletado: ${totalEncontrado}`,
    );

    if (totalEncontrado === 0) {
      return buildResponse(
        true,
        sourceStats,
        {
          score_minimo: minimumScore,
          total_encontrado: 0,
          total_novos: 0,
          total_duplicados: 0,
          total_classificados: 0,
          total_descartados_baixo_score: 0,
          total_inseridos: 0,
          total_erros:
            sourceStats.brave.erros + sourceStats.reddit.erros,
        },
        calcularPorDominio([]),
        timestamp,
      );
    }

    const uniqueByUrl = new Map();

    for (const item of allItems) {
      if (item.url_original && !uniqueByUrl.has(item.url_original)) {
        uniqueByUrl.set(item.url_original, item);
      }
    }

    const uniqueItems = Array.from(uniqueByUrl.values());
    const localDuplicates = totalEncontrado - uniqueItems.length;
    const urls = uniqueItems.map((item) => item.url_original);
    let newItems = [];
    let databaseDuplicates = 0;

    if (urls.length > 0) {
      const { data: existing, error: queryError } = await supabaseAdmin
        .from("radar_oportunidades")
        .select("url_original")
        .in("url_original", urls);

      if (queryError) {
        throw new Error(
          `Falha ao consultar duplicados: ${queryError.message}`,
        );
      }

      const existingUrls = new Set(
        (existing || []).map((record) => record.url_original),
      );

      newItems = uniqueItems.filter((item) => {
        if (existingUrls.has(item.url_original)) {
          databaseDuplicates += 1;
          sourceStats[getSourceKey(item)].duplicados += 1;
          return false;
        }

        return true;
      });
    }

    const totalDuplicates = localDuplicates + databaseDuplicates;
    const totalNew = newItems.length;
    const itemsToClassify = newItems.slice(0, maxLimit);
    const ignoredByLimit = Math.max(
      0,
      newItems.length - itemsToClassify.length,
    );

    console.log(
      `[Radar Fetch Runner] Novos itens após deduplicação: ${totalNew}`,
    );

    if (itemsToClassify.length === 0) {
      return buildResponse(
        true,
        sourceStats,
        {
          score_minimo: minimumScore,
          total_encontrado: totalEncontrado,
          total_novos: 0,
          total_duplicados: totalDuplicates + ignoredByLimit,
          total_classificados: 0,
          total_descartados_baixo_score: 0,
          total_inseridos: 0,
          total_erros:
            sourceStats.brave.erros + sourceStats.reddit.erros,
        },
        calcularPorDominio(allItems),
        timestamp,
      );
    }

    console.log(
      `[Radar Fetch Runner] Classificando ${itemsToClassify.length} itens com IA...`,
    );

    const classifiedItems = await classificarOportunidades(itemsToClassify);
    const itemsToInsert = [];
    let totalDiscarded = 0;

    classifiedItems.forEach((classifiedItem, index) => {
      const originalItem = itemsToClassify[index];
      if (!originalItem) return;

      const sourceKey = getSourceKey(originalItem);
      let score =
        typeof classifiedItem.score_intencao === "number"
          ? classifiedItem.score_intencao
          : 50;
      score = Math.min(100, Math.max(0, score));

      sourceStats[sourceKey].classificados += 1;

      console.log(
        `[Radar Fetch Runner] Classificação: score=${score}, fonte=${originalItem.raw_fonte || originalItem.fonte}, título="${String(originalItem.titulo || "").slice(0, 90)}"`,
      );

      if (score < minimumScore) {
        totalDiscarded += 1;
        sourceStats[sourceKey].descartados_baixo_score += 1;
        return;
      }

      const urgency = ["baixa", "media", "alta"].includes(
        classifiedItem.urgencia,
      )
        ? classifiedItem.urgencia
        : "media";
      const publicExcerpt = String(
        classifiedItem.trecho_publico ||
          originalItem.texto_publico ||
          "",
      ).substring(0, 500);

      itemsToInsert.push({
        titulo:
          classifiedItem.titulo?.trim() ||
          originalItem.titulo ||
          "Oportunidade jurídica pública",
        categoria: classifiedItem.categoria?.trim() || "Não classificada",
        fonte: originalItem.fonte,
        url_original: originalItem.url_original,
        trecho_publico: publicExcerpt,
        cidade: classifiedItem.cidade || null,
        estado: classifiedItem.estado || null,
        score_intencao: score,
        urgencia: urgency,
        resumo_ia:
          classifiedItem.resumo_ia ||
          "Oportunidade pública detectada automaticamente.",
        status: "pendente",
        detectado_em:
          originalItem.detectado_em || new Date().toISOString(),
        publicado_em: originalItem.publicado_em || null,
        fonte_tipo: mapearFonteTipo(
          originalItem.url_original,
          classifiedItem.fonte_tipo,
        ),
        origem_automatica: true,
        raw_fonte: originalItem.raw_fonte || originalItem.fonte,
      });
    });

    let totalInserted = 0;
    let insertErrors = 0;

    if (itemsToInsert.length > 0) {
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from("radar_oportunidades")
        .insert(itemsToInsert)
        .select("id, raw_fonte, fonte");

      if (insertError) {
        throw new Error(`Falha ao inserir oportunidades: ${insertError.message}`);
      }

      totalInserted = insertedData?.length || 0;
      insertErrors = Math.max(0, itemsToInsert.length - totalInserted);

      for (const insertedItem of insertedData || []) {
        sourceStats[getSourceKey(insertedItem)].inseridos += 1;
      }
    }

    const totalErrors =
      sourceStats.brave.erros +
      sourceStats.reddit.erros +
      insertErrors;

    console.log(
      `[Radar Fetch Runner] Concluído. Inseridos: ${totalInserted}, descartados abaixo de ${minimumScore}: ${totalDiscarded}, erros: ${totalErrors}`,
    );

    return buildResponse(
      true,
      sourceStats,
      {
        score_minimo: minimumScore,
        total_encontrado: totalEncontrado,
        total_novos: totalNew,
        total_duplicados: totalDuplicates + ignoredByLimit,
        total_classificados: itemsToClassify.length,
        total_descartados_baixo_score: totalDiscarded,
        total_inseridos: totalInserted,
        total_erros: totalErrors,
      },
      calcularPorDominio(allItems),
      timestamp,
    );
  } catch (error) {
    console.error("[Radar Fetch Runner] Erro fatal:", error);

    return buildResponse(
      false,
      sourceStats,
      {
        score_minimo: minimumScore,
        total_encontrado: 0,
        total_novos: 0,
        total_duplicados: 0,
        total_classificados: 0,
        total_descartados_baixo_score: 0,
        total_inseridos: 0,
        total_erros: 1,
      },
      calcularPorDominio([]),
      timestamp,
      error.message,
    );
  }
}

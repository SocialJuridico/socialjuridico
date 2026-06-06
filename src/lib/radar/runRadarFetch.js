/**
 * O Radar Jurídico coleta apenas referências a conteúdos públicos e links originais,
 * sem coleta de dados pessoais privados. As oportunidades são salvas como pendentes
 * para curadoria administrativa antes da exibição aos advogados.
 */

import { fetchRedditRSS, fetchGoogleCSE, fetchBraveSearch } from "./fetchRadarSources";
import { classificarOportunidades } from "./classificarOportunidades";
import { supabaseAdmin } from "@/lib/supabase";

// Helper para calcular distribuição por domínio
function calcularPorDominio(items) {
  const stats = { facebook: 0, instagram: 0, x_twitter: 0, jusbrasil: 0, reddit: 0, outros: 0 };
  for (const item of items) {
    const raw = (item.raw_fonte || "").toLowerCase();
    if (raw.includes("facebook")) stats.facebook++;
    else if (raw.includes("instagram")) stats.instagram++;
    else if (raw.includes("x.com") || raw.includes("twitter")) stats.x_twitter++;
    else if (raw.includes("jusbrasil")) stats.jusbrasil++;
    else if (raw.includes("reddit")) stats.reddit++;
    else stats.outros++;
  }
  return stats;
}

// Mapeia url_original para fonte_tipo (label do filtro de aba)
function mapearFonteTipo(urlOriginal, fallbackFonte) {
  const url = (urlOriginal || "").toLowerCase();
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("x.com") || url.includes("twitter.com")) return "X";
  if (url.includes("reddit.com")) return "Reddit";
  if (url.includes("jusbrasil.com")) return "JusBrasil";
  return fallbackFonte || "Outros";
}

export async function runRadarFetch() {
  const timestamp = new Date().toISOString();
  console.log(`[Radar Fetch Runner] Iniciando execução do robô: ${timestamp}`);

  // Limite máximo de itens inseridos por execução
  const envLimit = parseInt(process.env.RADAR_FETCH_LIMIT || "20", 10);
  const maxLimit = isNaN(envLimit) || envLimit <= 0 ? 20 : Math.min(envLimit, 20);

  // Stats por fonte (será preenchido progressivamente)
  const sourceStats = {
    brave: { encontrados: 0, classificados: 0, duplicados: 0, descartados_baixo_score: 0, inseridos: 0, erros: 0 },
    reddit: { encontrados: 0, classificados: 0, duplicados: 0, descartados_baixo_score: 0, inseridos: 0, erros: 0 },
    google_cse: { encontrados: 0, classificados: 0, duplicados: 0, descartados_baixo_score: 0, inseridos: 0, erros: 0 }
  };

  try {
    // ── 1. COLETAR: Brave (principal) → Reddit → Google CSE (fallback) ──────────
    const braveResult = await fetchBraveSearch();
    const braveItems = braveResult.items;
    sourceStats.brave.encontrados = braveResult.stats.encontrados;
    sourceStats.brave.erros = braveResult.stats.erros;

    const redditResult = await fetchRedditRSS();
    const redditItems = redditResult.items;
    sourceStats.reddit.encontrados = redditResult.stats.encontrados;
    sourceStats.reddit.erros = redditResult.stats.erros;

    const googleResult = await fetchGoogleCSE();
    const googleItems = googleResult.items;
    sourceStats.google_cse.encontrados = googleResult.stats.encontrados;
    sourceStats.google_cse.erros = googleResult.stats.erros;

    const allItems = [...braveItems, ...redditItems, ...googleItems];
    const totalEncontrado = allItems.length;
    console.log(`[Radar Fetch Runner] Total bruto coletado: ${totalEncontrado}`);

    if (totalEncontrado === 0) {
      return buildResponse(true, sourceStats, { total_encontrado: 0, total_novos: 0, total_duplicados: 0, total_classificados: 0, total_descartados_baixo_score: 0, total_inseridos: 0, total_erros: 0 }, calcularPorDominio([]), timestamp);
    }

    // ── 2. DEDUPLICAR localmente por url_original ────────────────────────────────
    const uniqueMap = new Map();
    for (const item of allItems) {
      if (item.url_original && !uniqueMap.has(item.url_original)) {
        uniqueMap.set(item.url_original, item);
      }
    }
    const uniqueItems = Array.from(uniqueMap.values());
    const localDups = totalEncontrado - uniqueItems.length;

    // ── 3. DEDUPLICAR contra o banco Supabase ────────────────────────────────────
    const urls = uniqueItems.map(i => i.url_original);
    let newItems = [];
    let dbDups = 0;

    if (urls.length > 0) {
      const { data: existing, error: queryError } = await supabaseAdmin
        .from("radar_oportunidades")
        .select("url_original")
        .in("url_original", urls);

      if (queryError) {
        console.error("[Radar Fetch Runner] Falha ao consultar duplicados no Supabase:", queryError.message);
        newItems = [...uniqueItems];
      } else {
        const existingUrls = new Set((existing || []).map(r => r.url_original));
        for (const item of uniqueItems) {
          if (existingUrls.has(item.url_original)) {
            dbDups++;
          } else {
            newItems.push(item);
          }
        }
      }
    }

    const totalDups = localDups + dbDups;
    const totalNovos = newItems.length;
    console.log(`[Radar Fetch Runner] Novos itens após deduplicação: ${totalNovos}`);

    // ── 4. LIMITAR e CLASSIFICAR ─────────────────────────────────────────────────
    const itemsToClassify = newItems.slice(0, maxLimit);
    const ignoredByLimit = newItems.length - itemsToClassify.length;

    if (itemsToClassify.length === 0) {
      return buildResponse(true, sourceStats, { total_encontrado: totalEncontrado, total_novos: 0, total_duplicados: totalDups + ignoredByLimit, total_classificados: 0, total_descartados_baixo_score: 0, total_inseridos: 0, total_erros: 0 }, calcularPorDominio(allItems), timestamp);
    }

    console.log(`[Radar Fetch Runner] Classificando ${itemsToClassify.length} itens com IA...`);
    const classified = await classificarOportunidades(itemsToClassify);

    // ── 5. FILTRO DE QUALIDADE: score_intencao >= 70 ──────────────────────────────
    const itemsToInsert = [];
    let totalDescartadosBaixoScore = 0;

    classified.forEach((item, idx) => {
      const originalItem = itemsToClassify[idx];

      let score = typeof item.score_intencao === "number" ? item.score_intencao : 50;
      if (score < 0) score = 0;
      if (score > 100) score = 100;

      // Identificar a fonte para atribuir ao sourceStats
      const rawFonte = (originalItem.raw_fonte || "").toLowerCase();
      const isReddit = rawFonte.includes("reddit");
      const isBrave = originalItem.fonte === "Brave Web";
      const sourceKey = isReddit ? "reddit" : isBrave ? "brave" : "google_cse";

      // Descartar score < 70
      if (score < 70) {
        totalDescartadosBaixoScore++;
        sourceStats[sourceKey].descartados_baixo_score++;
        console.log(`[Radar Fetch Runner] Descartado (score ${score} < 70): ${originalItem.url_original}`);
        return;
      }

      const trecho = (item.trecho_publico || originalItem.texto_publico || "").substring(0, 500);
      const urgencia = ["baixa", "media", "alta"].includes(item.urgencia) ? item.urgencia : "media";
      const categoria = item.categoria?.trim() || "Não classificada";
      const fType = mapearFonteTipo(originalItem.url_original, item.fonte_tipo);

      itemsToInsert.push({
        titulo: item.titulo?.trim() || originalItem.titulo,
        categoria,
        fonte: originalItem.fonte,
        url_original: originalItem.url_original,
        trecho_publico: trecho,
        cidade: item.cidade || null,
        estado: item.estado || null,
        score_intencao: score,
        urgencia,
        resumo_ia: item.resumo_ia || "Oportunidade pública detectada automaticamente.",
        status: "pendente",
        detectado_em: originalItem.detectado_em || new Date().toISOString(),
        publicado_em: null,
        fonte_tipo: fType,
        origem_automatica: true,
        raw_fonte: originalItem.raw_fonte || originalItem.fonte
      });

      sourceStats[sourceKey].classificados++;
    });

    // ── 6. INSERIR no Supabase ────────────────────────────────────────────────────
    let totalInseridos = 0;
    let totalErros = 0;

    if (itemsToInsert.length > 0) {
      console.log(`[Radar Fetch Runner] Salvando ${itemsToInsert.length} oportunidades...`);
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from("radar_oportunidades")
        .insert(itemsToInsert)
        .select();

      if (insertError) {
        console.error("[Radar Fetch Runner] Erro na inserção em lote:", insertError.message);
        totalErros = itemsToInsert.length;
      } else {
        totalInseridos = (insertedData || []).length;
        totalErros = itemsToInsert.length - totalInseridos;
      }
    }

    // Distribuir inseridos/erros por fonte proporcionalmente
    for (const item of itemsToInsert) {
      const rawF = (item.raw_fonte || "").toLowerCase();
      const sk = rawF.includes("reddit") ? "reddit" : item.fonte === "Brave Web" ? "brave" : "google_cse";
      sourceStats[sk].inseridos++;
    }

    const porDominio = calcularPorDominio(allItems);
    const totalClassificados = itemsToInsert.length + totalDescartadosBaixoScore;

    console.log(`[Radar Fetch Runner] Concluído. Inseridos: ${totalInseridos}, Descartados score<70: ${totalDescartadosBaixoScore}, Erros: ${totalErros}`);

    return buildResponse(true, sourceStats, {
      total_encontrado: totalEncontrado,
      total_novos: totalNovos,
      total_duplicados: totalDups + ignoredByLimit,
      total_classificados: totalClassificados,
      total_descartados_baixo_score: totalDescartadosBaixoScore,
      total_inseridos: totalInseridos,
      total_erros: totalErros
    }, porDominio, timestamp);

  } catch (error) {
    console.error("[Radar Fetch Runner] Erro fatal:", error);
    return buildResponse(false, sourceStats, {
      total_encontrado: 0, total_novos: 0, total_duplicados: 0,
      total_classificados: 0, total_descartados_baixo_score: 0,
      total_inseridos: 0, total_erros: 1
    }, { facebook: 0, instagram: 0, x_twitter: 0, jusbrasil: 0, reddit: 0, outros: 0 }, timestamp, error.message);
  }
}

function buildResponse(success, sourceStats, totals, porDominio, timestamp, errorMsg) {
  const result = {
    success,
    stats: {
      brave: sourceStats.brave,
      reddit: sourceStats.reddit,
      google_cse: sourceStats.google_cse,
      por_dominio: porDominio,
      ...totals
    },
    timestamp
  };
  if (errorMsg) result.error = errorMsg;
  return result;
}

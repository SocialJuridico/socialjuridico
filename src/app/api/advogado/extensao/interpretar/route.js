import { NextResponse } from "next/server";
import OpenAI from "openai";

import { requireInterpretarAccess, serializeAccess } from "@/lib/extensaoInterpretarAccess";
import { recordInterpretarConsulta } from "@/lib/extensaoInterpretarLog";
import { loadAliasMap, parseArticleIntent, findUnitByArticle } from "@/lib/oraculo/legalLibrary/legalLibrarySearch";

const TEXT_MAX_LEN = 4000;
const MAX_CITATIONS = 5;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

function buildPrompt(text) {
  return `Você é um assistente jurídico. Leia o texto abaixo e identifique até ${MAX_CITATIONS} dispositivos legais brasileiros (lei + número de artigo) diretamente relevantes para ele.

Responda SOMENTE em JSON no formato {"citations": ["art. 14 do CDC", "art. 927 do Código Civil"]}.
Se não houver nenhum dispositivo claramente relevante, responda {"citations": []}.
Não invente números de artigo — só cite se tiver razoável certeza.

TEXTO:
"""${text}"""`;
}

/** Pede citações candidatas à IA e resolve cada uma contra o banco real de legislação.
 * Citação que não existir de fato (alucinação da IA) é descartada silenciosamente —
 * nunca devolvemos ao advogado um artigo que não confirmamos no banco. */
async function interpretAndResolve(text, activeSlugs) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [
      { role: "system", content: "Você identifica dispositivos legais brasileiros relevantes a um texto, respondendo estritamente em JSON." },
      { role: "user", content: buildPrompt(text) },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  let citations = [];
  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    if (Array.isArray(parsed.citations)) citations = parsed.citations.slice(0, MAX_CITATIONS);
  } catch {
    citations = [];
  }

  const aliasMap = await loadAliasMap();
  const seen = new Set();
  const resolved = [];
  for (const citation of citations) {
    const intent = parseArticleIntent(String(citation || ""), aliasMap);
    if (!intent) continue;
    const unit = await findUnitByArticle(intent.collectionSlug, intent.number);
    if (!unit || !activeSlugs.has(unit.collectionSlug) || seen.has(unit.unitId)) continue;
    seen.add(unit.unitId);
    resolved.push(unit);
  }
  return resolved;
}

// POST /api/advogado/extensao/interpretar — autenticado (Bearer).
// Único consumidor esperado é a extensão (token, não cookie) — sem checagem de
// Origin de CSRF, que só se aplica a autenticação por cookie ambiente.
export async function POST(request) {
  try {
    const access = await requireInterpretarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
    }

    if (access.quota.remaining <= 0 && !access.wallet.available) {
      return NextResponse.json(
        {
          success: false,
          quotaExceeded: true,
          message: "Cota gratuita esgotada. Compre créditos para continuar usando.",
          ...serializeAccess(access),
        },
        { status: 403 },
      );
    }

    if (!openai) {
      return NextResponse.json({ success: false, message: "A chave da IA não está configurada." }, { status: 503 });
    }

    const body = await request.json();
    const text = String(body?.text || "").trim().slice(0, TEXT_MAX_LEN);
    if (text.length < 10) {
      return NextResponse.json({ success: false, message: "Selecione um texto mais longo." }, { status: 400 });
    }

    const { data: activeCollections } = await access.db
      .from("oraculo_legal_collections")
      .select("slug")
      .eq("status", "ACTIVE");
    const activeSlugs = new Set((activeCollections || []).map((c) => c.slug));

    let results;
    try {
      results = await interpretAndResolve(text, activeSlugs);
    } catch (aiError) {
      console.error("[Extensao/Interpretar][OpenAI] Erro:", aiError?.message);
      return NextResponse.json({ success: false, message: "A IA não respondeu agora. Tente novamente." }, { status: 502 });
    }

    // Ordem de consumo: cota grátis do plano primeiro, depois carteira de créditos
    // comprados. Ao gastar da cota, grava também o período corrente — é isso que
    // faz o contador "resetar" quando o mês vira (reset preguiçoso, sem cron).
    const spendFromQuota = access.quota.remaining > 0;
    const newUsed = spendFromQuota ? access.quota.used + 1 : access.quota.used;
    const newWalletBalance = spendFromQuota ? access.wallet.balance : access.wallet.balance - 1;

    await access.db
      .from("advogados")
      .update(
        spendFromQuota
          ? { uso_interpretar_ia_extensao: newUsed, interpretar_ia_periodo: access.period }
          : { saldo_creditos_ia_extensao: newWalletBalance },
      )
      .eq("id", access.profile.id);

    // Registro de transparência (não-fatal): quando usou e como pagou.
    await recordInterpretarConsulta({
      advogadoId: access.profile.id,
      origem: spendFromQuota ? "FREE" : "CREDITO",
      resultadosCount: results.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        query: text,
        results: results.map((r) => ({
          unitId: r.unitId,
          label: r.label,
          heading: r.heading,
          snippet: r.snippet,
          collectionSlug: r.collectionSlug,
          collectionTitle: r.collectionTitle,
          collectionShort: r.collectionShort,
        })),
        planType: access.planType,
        quota: { ...access.quota, used: newUsed, remaining: Math.max(access.quota.limit - newUsed, 0) },
        wallet: { available: newWalletBalance > 0, balance: newWalletBalance },
      },
    });
  } catch (error) {
    console.error("Erro na API POST /api/advogado/extensao/interpretar:", error);
    return NextResponse.json({ success: false, message: "Não foi possível interpretar o texto." }, { status: 500 });
  }
}

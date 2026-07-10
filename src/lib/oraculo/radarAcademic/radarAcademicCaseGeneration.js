import { supabaseAdmin } from "@/lib/supabase";

import {
  ORACULO_AI_MODEL,
  ORACULO_AI_MODEL_VERSION,
  RADAR_GENERATION_PROMPT_VERSION,
  RADAR_GENERATION_VERSION,
  callOraculoJson,
} from "./oraculoAiClient";
import { scrubIdentifiers } from "./radarAcademicPrivacy";
import { ensureSimulationCanon } from "@/lib/oraculo/ai/simulationCanonStore";

const GENERATION_SCHEMA = {
  name: "oraculo_radar_dossie_academico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "legal_area",
      "academic_full_case_content",
      "academic_summary",
      "available_facts",
      "missing_information",
      "mentioned_documents",
      "known_timeline",
      "open_questions",
      "persona_config",
      "fact_state",
    ],
    properties: {
      title: { type: "string" },
      legal_area: { type: "string" },
      academic_full_case_content: { type: "string" },
      academic_summary: { type: "string" },
      available_facts: { type: "array", items: { type: "string" } },
      missing_information: { type: "array", items: { type: "string" } },
      mentioned_documents: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "status", "detail"],
          properties: {
            name: { type: "string" },
            status: { type: "string" },
            detail: { type: "string" },
          },
        },
      },
      known_timeline: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["when", "event"],
          properties: {
            when: { type: "string" },
            event: { type: "string" },
          },
        },
      },
      open_questions: { type: "array", items: { type: "string" } },
      persona_config: {
        type: "object",
        additionalProperties: false,
        required: [
          "communication_style",
          "verbosity",
          "emotional_tone",
          "legal_knowledge_level",
        ],
        properties: {
          communication_style: { type: "string" },
          verbosity: { type: "string" },
          emotional_tone: { type: "string" },
          legal_knowledge_level: { type: "string" },
        },
      },
      fact_state: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "state", "value"],
          properties: {
            key: { type: "string" },
            state: {
              type: "string",
              enum: [
                "KNOWN_FACT",
                "UNKNOWN_FACT",
                "NOT_PROVIDED",
                "NOT_APPLICABLE",
              ],
            },
            value: { type: "string" },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `Você prepara CASOS DE ESTUDO ACADÊMICOS para estudantes de Direito a partir
de situações jurídicas identificadas publicamente. Sua saída é usada em um
laboratório de prática (entrevista simulada, análise jurídica).

REGRAS OBRIGATÓRIAS:
- Produza uma versão MINIMIZADA/PSEUDONIMIZADA: NUNCA inclua nome real,
  e-mail, telefone, CPF, endereço, links ou perfis. Use "uma pessoa adulta",
  a UF quando relevante, etc.
- Preserve os fatos juridicamente relevantes: datas mencionadas, valores,
  documentos, eventos, dúvidas.
- NÃO invente fatos, datas, valores, documentos ou testemunhas. Se algo não
  está no material, marque como não disponível.
- NÃO apresente conclusão jurídica ("há direito", "cabe ação", "indenização
  estimada"). O dossiê é factual, não é a análise do aluno.
- academic_full_case_content: relato acadêmico integral em 1ª/3ª pessoa
  narrativa, sem identificadores.
- fact_state: cada informação vira uma chave estável (snake_case) com estado
  KNOWN_FACT (existe no caso), UNKNOWN_FACT (a pessoa não sabe/não recorda),
  NOT_PROVIDED (não consta no material) ou NOT_APPLICABLE. É a base factual
  do Cliente Simulado — só o que estiver aqui pode ser respondido.
- persona_config: estilo comunicacional plausível do cliente (não altera fatos).
- Responda SOMENTE no schema JSON solicitado, em português do Brasil.`;

function buildUserPrompt(radar) {
  return `Situação identificada (material de origem — minimize e não copie identificadores):

TÍTULO: ${radar.titulo || "não informado"}
ÁREA/CATEGORIA: ${radar.categoria || "não informada"}
LOCAL: ${[radar.cidade, radar.estado].filter(Boolean).join(" / ") || "não informado"}
TRECHO PÚBLICO: ${scrubIdentifiers(radar.trecho_publico) || "não informado"}
RESUMO PRÉVIO: ${scrubIdentifiers(radar.resumo_ia) || "não informado"}

Gere o dossiê acadêmico completo conforme o schema.`;
}

function factStateArrayToMap(arr) {
  const map = {};
  (Array.isArray(arr) ? arr : []).forEach((item) => {
    if (item?.key) {
      map[item.key] = {
        state: item.state || "NOT_PROVIDED",
        value: item.value || "",
      };
    }
  });
  return map;
}

/**
 * Gera (ou regenera) o caso acadêmico para uma oportunidade do Radar.
 * Retorna o registro salvo, ou null se a IA não produziu conteúdo válido.
 * NÃO cria dados mock: em falha da IA, retorna null e nada é persistido.
 */
export async function generateAcademicCaseForRadar(radar) {
  if (!supabaseAdmin || !radar?.id) return null;

  const result = await callOraculoJson({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(radar),
    schema: GENERATION_SCHEMA,
    temperature: 0.4,
    maxTokens: 1800,
  });

  if (!result.ok || !result.data?.title) {
    return null;
  }

  const data = result.data;
  const payload = {
    radar_source_id: radar.id,
    title: scrubIdentifiers(data.title).slice(0, 240),
    legal_area: (data.legal_area || radar.categoria || "").slice(0, 120),
    academic_full_case_content: scrubIdentifiers(data.academic_full_case_content),
    academic_summary: scrubIdentifiers(data.academic_summary),
    available_facts: data.available_facts || [],
    missing_information: data.missing_information || [],
    mentioned_documents: data.mentioned_documents || [],
    known_timeline: data.known_timeline || [],
    open_questions: data.open_questions || [],
    persona_config: data.persona_config || {},
    fact_state: factStateArrayToMap(data.fact_state),
    status: "READY",
    generated_by_model: ORACULO_AI_MODEL,
    model_version: ORACULO_AI_MODEL_VERSION,
    prompt_version: RADAR_GENERATION_PROMPT_VERSION,
    generation_version: RADAR_GENERATION_VERSION,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .upsert([payload], { onConflict: "radar_source_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[RadarAcademic/Generation] Falha ao salvar caso:", error.message);
    return null;
  }

  // Anjo constrói e congela o CÂNONE DA SIMULAÇÃO antes de qualquer entrevista.
  // Não-fatal: se falhar, o caso existe mas a entrevista fica bloqueada
  // (canon_status != READY) até uma nova preparação.
  try {
    await ensureSimulationCanon(saved);
  } catch (canonError) {
    console.error(
      "[RadarAcademic/Generation] Falha ao construir Cânone:",
      canonError?.message,
    );
  }

  return saved;
}

/**
 * Deriva o caso acadêmico quando a oportunidade do Radar está aprovada.
 * Não-fatal: nunca lança. Retorna true se derivou. Usado nos fluxos de
 * curadoria admin (aprovar/editar/criar), para que a MESMA ação que publica
 * o Radar Jurídico também prepare o Radar Acadêmico.
 */
export async function deriveAcademicIfApproved(radarRow) {
  if (!radarRow?.id || radarRow.status !== "aprovado") return false;
  try {
    const saved = await generateAcademicCaseForRadar(radarRow);
    return Boolean(saved);
  } catch (error) {
    console.error(
      "[RadarAcademic/Generation] Falha ao derivar (aprovação):",
      error?.message,
    );
    return false;
  }
}

/**
 * Deriva casos acadêmicos para oportunidades aprovadas do Radar que ainda não
 * possuem versão acadêmica. Idempotente; limitado por `limit` para custo.
 */
export async function ensureAcademicCasesFromRadar(limit = 5) {
  if (!supabaseAdmin) return { generated: 0 };

  const { data: existing } = await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .select("radar_source_id");
  const derivedIds = new Set(
    (existing || []).map((row) => row.radar_source_id).filter(Boolean),
  );

  const { data: radarItems } = await supabaseAdmin
    .from("radar_oportunidades")
    .select("id, titulo, categoria, trecho_publico, resumo_ia, cidade, estado, publicado_em")
    .eq("status", "aprovado")
    .order("publicado_em", { ascending: false })
    .limit(60);

  const pending = (radarItems || [])
    .filter((item) => !derivedIds.has(item.id))
    .slice(0, limit);

  let generated = 0;
  for (const radar of pending) {
    const saved = await generateAcademicCaseForRadar(radar);
    if (saved) generated += 1;
  }
  return { generated };
}

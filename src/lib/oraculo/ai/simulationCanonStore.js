import { supabaseAdmin } from "@/lib/supabase";

import { buildSimulationCanon } from "./simulationCanonBuilder";
import { validateSimulationCanon } from "./simulationCanonValidator";
import { logAiUsage } from "./oraculoAiAudit";

// Persistência e congelamento do Cânone da Simulação. Vive na linha do caso
// acadêmico (oraculo_radar_academic_cases). Fluxo:
//   BUILD (Anjo) -> VALIDATE (Anjo) -> [regenera 1x] -> SAVE + FREEZE (READY)
//                                   -> 2ª falha -> REJECTED.
// generateClientReply NUNCA chama o builder. O Cânone existe antes da entrevista.

const ACCESS_MODES_WITHOUT_VALUE = new Set([
  "UNKNOWN",
  "UNAVAILABLE",
  "DOES_NOT_REMEMBER",
  "NOT_APPLICABLE",
]);

/**
 * Converte canonical_facts (array rico do Cânone) para o FACT_STATE keyed usado
 * pelo Cliente Simulado: { key: { ...campos ricos } }.
 */
export function canonicalFactsToState(canonicalFacts) {
  const map = {};
  (Array.isArray(canonicalFacts) ? canonicalFacts : []).forEach((f) => {
    if (!f?.key) return;
    map[f.key] = {
      label: f.label || f.key,
      value: f.value ?? "",
      value_type: f.value_type || "TEXT",
      precision: f.precision || "EXACT",
      provenance: f.provenance || "SOURCE_EXPLICIT",
      access_mode: f.access_mode || "REMEMBERED_EXACT",
      access_source: f.access_source || "",
      reveal_conditions: Array.isArray(f.reveal_conditions) ? f.reveal_conditions : [],
      legal_relevance: f.legal_relevance || "MEDIUM",
      student_should_discover: f.student_should_discover !== false,
    };
  });
  return map;
}

function countProvenance(canonicalFacts, provenance) {
  return (Array.isArray(canonicalFacts) ? canonicalFacts : []).filter(
    (f) => f?.provenance === provenance,
  ).length;
}

async function persistRejected(academicCaseId, validation) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .update({
      canon_status: "REJECTED",
      canon_validation_result: validation
        ? { valid: validation.valid, blocking: validation.blocking, violations: validation.violations, notes: validation.notes }
        : { error: "BUILD_FAILED" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", academicCaseId);
}

/**
 * Garante um Cânone congelado (READY) para o caso acadêmico.
 * Idempotente: se já houver canon_status=READY e !force, não refaz.
 * force=true supersede: gera nova versão (entrevistas em curso já têm snapshot).
 *
 * Nunca lança. Retorna { ok, status, version } ou { ok:false, status }.
 */
export async function ensureSimulationCanon(academicCase, { force = false } = {}) {
  if (!supabaseAdmin || !academicCase?.id) {
    return { ok: false, status: "SERVICE_UNAVAILABLE" };
  }

  if (!force && academicCase.canon_status === "READY" && academicCase.canon_frozen_at) {
    return { ok: true, status: "READY", version: academicCase.canon_version };
  }

  const academicCaseId = academicCase.id;
  const ctx = {};

  await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .update({ canon_status: "GENERATING", updated_at: new Date().toISOString() })
    .eq("id", academicCaseId);

  // 1..2 tentativas: BUILD -> VALIDATE, regenera 1x em falha.
  let canonData = null;
  let validation = null;

  // Teto temporal = data de cadastro do caso no Radar (created_at).
  const referenceDate = academicCase.created_at
    ? String(academicCase.created_at).slice(0, 10)
    : undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const build = await buildSimulationCanon(academicCase, { referenceDate });
    if (build.ok && build.usage) {
      await logAiUsage({
        feature: build.feature,
        usage: build.usage,
        promptVersion: build.promptVersion,
        schemaVersion: build.schemaVersion,
        context: ctx,
        academicCaseId,
      });
    }
    if (!build.ok) {
      validation = null;
      continue;
    }

    const check = await validateSimulationCanon({
      sourceCase: academicCase,
      canon: build.data,
    });
    if (check.ok && check.usage) {
      await logAiUsage({
        feature: check.feature,
        usage: check.usage,
        promptVersion: check.promptVersion,
        schemaVersion: check.schemaVersion,
        context: ctx,
        academicCaseId,
      });
    }

    // Validador indisponível: aceita o build (não bloqueia a preparação do caso).
    if (!check.ok) {
      canonData = build.data;
      validation = { ok: false, valid: true, blocking: false, violations: [], notes: "VALIDATOR_UNAVAILABLE" };
      break;
    }

    validation = check;
    if (check.valid) {
      canonData = build.data;
      break;
    }
  }

  if (!canonData) {
    await persistRejected(academicCaseId, validation);
    return { ok: false, status: "REJECTED" };
  }

  // 3. SAVE + FREEZE.
  const canonicalFacts = canonData.canonical_facts || [];
  const factState = canonicalFactsToState(canonicalFacts);
  const nowIso = new Date().toISOString();
  const nextVersion = (Number(academicCase.canon_version) || 0) + 1;

  const usageModel = null; // model info fica em canon_generated_by_model.

  const { error } = await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .update({
      simulation_canon: {
        academic_case_title: canonData.academic_case_title,
        academic_narrative: canonData.academic_narrative,
        legal_area: canonData.legal_area,
        canonical_facts: canonicalFacts,
        documents: canonData.documents || [],
        timeline: canonData.timeline || [],
        available_evidence: canonData.available_evidence || [],
        missing_evidence: canonData.missing_evidence || [],
        open_questions: canonData.open_questions || [],
        professional_intent: canonData.professional_intent || "NONE",
        persona: canonData.simulation_persona || {},
        completeness: canonData.completeness || {},
      },
      // FACT_STATE keyed e persona usados diretamente pelo Cliente/entrevista.
      fact_state: factState,
      persona_config: canonData.simulation_persona || academicCase.persona_config || {},
      canon_status: "READY",
      canon_version: nextVersion,
      canon_frozen_at: nowIso,
      canon_generated_at: nowIso,
      canon_validated_at: validation?.ok ? nowIso : null,
      canon_generated_by_model: usageModel,
      canon_prompt_version: "SIMULATION_CANON_BUILDER_V1",
      canon_schema_version: "V1",
      canon_synthetic_fact_count: countProvenance(canonicalFacts, "SYNTHETIC_CANON"),
      canon_explicit_fact_count: countProvenance(canonicalFacts, "SOURCE_EXPLICIT"),
      canon_normalized_fact_count: countProvenance(canonicalFacts, "SOURCE_NORMALIZED"),
      canon_unavailable_fact_count: countProvenance(canonicalFacts, "UNAVAILABLE_BY_DESIGN"),
      canon_validation_result: validation
        ? { valid: validation.valid, blocking: validation.blocking, violations: validation.violations || [], notes: validation.notes || "" }
        : null,
      canon_generation_notes: canonData.canon_generation_notes || [],
      updated_at: nowIso,
    })
    .eq("id", academicCaseId);

  if (error) {
    console.error("[CanonStore] Falha ao salvar Cânone:", error.message);
    return { ok: false, status: "SAVE_FAILED" };
  }

  return { ok: true, status: "READY", version: nextVersion };
}

/**
 * Retorna o Cânone congelado (metadados) para uso do Cliente Simulado.
 * { id, version, status, frozen_at, canon } ou null se não estiver READY.
 */
export function frozenCanonMetaFromCase(academicCase) {
  if (
    !academicCase ||
    academicCase.canon_status !== "READY" ||
    !academicCase.canon_frozen_at
  ) {
    return null;
  }
  return {
    id: academicCase.id,
    version: academicCase.canon_version,
    status: academicCase.canon_status,
    frozen_at: academicCase.canon_frozen_at,
    canon: academicCase.simulation_canon || null,
  };
}

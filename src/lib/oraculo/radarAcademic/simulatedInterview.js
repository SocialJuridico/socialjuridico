import { supabaseAdmin } from "@/lib/supabase";

import {
  ORACULO_CLIENT_MODEL,
  PROMPT_VERSIONS,
} from "@/lib/oraculo/ai/oraculoOpenAIClients";
import { logAiUsage } from "@/lib/oraculo/ai/oraculoAiAudit";
import {
  generateClientReply,
  getSafeClientFallback,
} from "@/lib/oraculo/ai/simulatedClientAgent";
import { frozenCanonMetaFromCase } from "@/lib/oraculo/ai/simulationCanonStore";
import { evaluateProfessionalSimulationConduct } from "@/lib/oraculo/ai/professionalSimulationEthicsMonitor";
import { recordConductAlert } from "@/lib/oraculo/ai/academicAngelAlertBridge";
import { validateGrounding } from "@/lib/oraculo/ai/academicAngelGroundingGuard";
import {
  evaluateWindow,
  WINDOW_EVAL_EVERY,
} from "@/lib/oraculo/ai/academicAngelWindowEvaluator";
import { generateProfessionalSimulationEvaluation } from "@/lib/oraculo/ai/professionalSimulationFinalEvaluator";

import { getRadarAcademicCaseInternal } from "./radarAcademicCasesRead";
import { recordOraculoAudit } from "./radarAcademicAudit";
import {
  recordInterviewStartActivity,
  finalizeInterviewActivity,
} from "./academicActivityBridge";
import { saveProfessionalSimulationEvaluation } from "./professionalSimulationEvaluationStorage";
import { generateAndSaveRadarConductReport } from "./professionalConductReport";
import { logOraculoEvent, ORACULO_EVENTS } from "@/lib/oraculo/telemetry/oraculoTelemetry";

const OPENING_MESSAGE =
  "Atendimento jurídico simulado iniciado. O cliente é simulado por IA e responde apenas com base no relato disponível. Você pode conduzir a consulta, orientar juridicamente e explicar caminhos possíveis, como em uma primeira consulta simulada.";

function defaultMaxInterviews(context) {
  const configured = context?.programRules?.max_simulated_interviews_per_case;
  const n = Number(configured);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function serializeMessageForStudent(row) {
  return {
    id: row.id,
    senderType: row.sender_type,
    content: row.content,
    sequence: row.sequence_number,
    conductStatus: row.sender_type === "STUDENT" ? row.conduct_status : null,
    conductRisk: row.sender_type === "STUDENT" ? row.conduct_risk_level : null,
    createdAt: row.created_at,
  };
}

async function nextSequence(interviewId) {
  const { count } = await supabaseAdmin
    .from("oraculo_simulated_interview_messages")
    .select("id", { count: "exact", head: true })
    .eq("interview_id", interviewId);
  return (count || 0) + 1;
}

async function insertMessage(interviewId, payload) {
  const sequence = await nextSequence(interviewId);
  const { data, error } = await supabaseAdmin
    .from("oraculo_simulated_interview_messages")
    .insert([{ interview_id: interviewId, sequence_number: sequence, ...payload }])
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function usageContext(interview, context) {
  return {
    institutionId: interview?.instituicao_id || context?.institutionId || null,
    programId: interview?.programa_id || context?.programId || null,
    oraculoId: interview?.oraculo_id || context?.oraculoId || null,
  };
}

export async function getInterviewForCase({ academicCaseId, oraculoId }) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .select("*")
    .eq("academic_case_id", academicCaseId)
    .eq("oraculo_id", oraculoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function startSimulatedInterview({ academicCaseId, context }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const academicCase = await getRadarAcademicCaseInternal(academicCaseId);
  if (!academicCase || !["READY", "ACTIVE"].includes(academicCase.status)) {
    return { ok: false, code: "CASE_NOT_FOUND" };
  }

  // Cânone congelado é obrigatório: o Cliente vive a realidade, não a improvisa.
  const canonMeta = frozenCanonMetaFromCase(academicCase);
  if (!canonMeta) {
    return { ok: false, code: "SIMULATION_CANON_NOT_READY" };
  }

  const existing = await getInterviewForCase({
    academicCaseId,
    oraculoId: context.oraculoId,
  });
  if (existing && ["ACTIVE", "COMPLETED"].includes(existing.status)) {
    return { ok: true, interview: existing };
  }

  const { count: usedCount } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .select("id", { count: "exact", head: true })
    .eq("academic_case_id", academicCaseId)
    .eq("oraculo_id", context.oraculoId)
    .in("status", ["ACTIVE", "COMPLETED"]);

  if ((usedCount || 0) >= defaultMaxInterviews(context)) {
    return { ok: false, code: "INTERVIEW_LIMIT_REACHED" };
  }

  const nowIso = new Date().toISOString();
  const { data: interview, error } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .insert([
      {
        academic_case_id: academicCaseId,
        oraculo_id: context.oraculoId,
        student_program_link_id: context.studentProgramLinkId || null,
        instituicao_id: context.institutionId || null,
        programa_id: context.programId || null,
        status: "ACTIVE",
        persona_snapshot: academicCase.persona_config || {},
        fact_state_snapshot: academicCase.fact_state || {},
        canon_version_snapshot: canonMeta.version,
        canon_frozen_at_snapshot: canonMeta.frozen_at,
        model: ORACULO_CLIENT_MODEL,
        model_version: ORACULO_CLIENT_MODEL,
        prompt_version: PROMPT_VERSIONS.SIMULATED_CLIENT,
        started_at: nowIso,
        message_count: 0,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("[SimInterview] Falha ao iniciar:", error.message);
    return { ok: false, code: "START_FAILED" };
  }

  await insertMessage(interview.id, {
    sender_type: "SYSTEM",
    content: OPENING_MESSAGE,
  });

  await recordOraculoAudit({
    oraculoId: context.oraculoId,
    academicCaseId,
    interviewId: interview.id,
    eventType: "ORACULO_SIMULATED_INTERVIEW_STARTED",
  });

  // Registra a prática na trilha acadêmica da instituição (não-fatal).
  await recordInterviewStartActivity({ interview, academicCase, context });
  await logOraculoEvent({
    context,
    type: ORACULO_EVENTS.INTERVIEW_START,
    surface: "/dashboard/oraculo/casos",
    refType: "CASE",
    refId: academicCaseId,
    metadata: { interviewId: interview.id, title: academicCase?.title || null },
  });

  return { ok: true, interview };
}

export async function loadInterviewState({ interviewId, oraculoId }) {
  if (!supabaseAdmin) return null;
  const { data: interview } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!interview) return null;

  const { data: messages } = await supabaseAdmin
    .from("oraculo_simulated_interview_messages")
    .select("*")
    .eq("interview_id", interviewId)
    .order("sequence_number", { ascending: true });

  return {
    interview,
    messages: (messages || []).map(serializeMessageForStudent),
  };
}

// Fatos já revelados (fact_keys_used acumuladas nas respostas do cliente).
function revealedFactsFrom(messages) {
  const keys = new Set();
  for (const m of messages || []) {
    if (m.sender_type === "SIMULATED_CLIENT" && Array.isArray(m.fact_keys_used)) {
      m.fact_keys_used.forEach((k) => keys.add(k));
    }
  }
  return Array.from(keys);
}

// Grounding determinístico de contingência (usado só se o Anjo estiver indisponível).
// Fact_state agora é o CÂNONE keyed: só aceita chaves declaradas que existem nele.
function deterministicGrounded(factKeysUsed, factState) {
  const keys = Array.isArray(factKeysUsed) ? factKeysUsed : [];
  return keys.every(
    (k) => factState && Object.prototype.hasOwnProperty.call(factState, k),
  );
}

/**
 * Fluxo completo: Conduct Guard (Anjo) -> persiste -> Cliente (ORACULO) ->
 * Grounding Guard (Anjo, regenera 1x -> safe fallback) -> persiste.
 */
export async function sendStudentMessage({ interviewId, oraculoId, content, context }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const text = String(content || "").trim();
  if (!text) return { ok: false, code: "EMPTY_MESSAGE" };

  const { data: interview } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!interview) return { ok: false, code: "INTERVIEW_NOT_FOUND" };
  if (interview.status !== "ACTIVE") return { ok: false, code: "INTERVIEW_NOT_ACTIVE" };

  const ctx = usageContext(interview, context);

  // 1. Ethics Monitor (Anjo) — modo simulação profissional: não bloqueia por
  // atuação como advogado, só riscos críticos universais (RADAR_ACADEMIC).
  const conduct = await evaluateProfessionalSimulationConduct(text);
  if (conduct.usage) {
    await logAiUsage({
      feature: conduct.feature,
      usage: conduct.usage,
      promptVersion: conduct.promptVersion,
      schemaVersion: conduct.schemaVersion,
      context: ctx,
      academicCaseId: interview.academic_case_id,
      interviewId,
    });
  }

  if (conduct.blocked) {
    await recordOraculoAudit({
      oraculoId,
      academicCaseId: interview.academic_case_id,
      interviewId,
      eventType: conduct.escalate
        ? "ORACULO_SIMULATED_INTERVIEW_MESSAGE_BLOCKED_CRITICAL"
        : "ORACULO_SIMULATED_INTERVIEW_MESSAGE_BLOCKED",
      metadata: { flags: conduct.flags, excerpt: conduct.excerpt, action: conduct.action },
    });
    await recordConductAlert({ context, interview, conduct });
    return { ok: false, blocked: true, conduct };
  }

  // 2. Persiste a mensagem do estudante.
  const studentRow = await insertMessage(interviewId, {
    sender_type: "STUDENT",
    content: text,
    conduct_status: conduct.warn ? "WARNING" : "OK",
    conduct_risk_level: conduct.riskLevel,
    conduct_flags: conduct.flags || [],
  });

  if (conduct.warn) {
    await recordOraculoAudit({
      oraculoId,
      academicCaseId: interview.academic_case_id,
      interviewId,
      eventType: "ORACULO_SIMULATED_INTERVIEW_CONDUCT_WARNING",
      metadata: { flags: conduct.flags },
    });
  }

  // 3. Janela de conversa (mensagens brutas).
  const { data: windowMsgs } = await supabaseAdmin
    .from("oraculo_simulated_interview_messages")
    .select("sender_type, content, fact_keys_used")
    .eq("interview_id", interviewId)
    .order("sequence_number", { ascending: true });

  const academicCase = await getRadarAcademicCaseInternal(interview.academic_case_id);
  const persona = interview.persona_snapshot;
  const factState = interview.fact_state_snapshot;
  const revealed = revealedFactsFrom(windowMsgs || []);

  // Cânone congelado usado nesta entrevista (snapshot da versão no início).
  const simulationCanon = {
    id: interview.academic_case_id,
    version: interview.canon_version_snapshot ?? academicCase?.canon_version ?? null,
    frozen_at:
      interview.canon_frozen_at_snapshot || academicCase?.canon_frozen_at || null,
    status: "READY",
  };
  if (!simulationCanon.frozen_at) {
    return { ok: false, code: "SIMULATION_CANON_NOT_READY" };
  }

  // 4. Cliente Simulado (ORACULO).
  const clientCall = await generateClientReply({
    academicCase,
    simulationCanon,
    persona,
    factState,
    revealedFacts: revealed,
    recentMessages: windowMsgs || [],
    studentMessage: text,
  });
  if (clientCall.ok && clientCall.usage) {
    await logAiUsage({
      feature: clientCall.feature,
      usage: clientCall.usage,
      promptVersion: clientCall.promptVersion,
      schemaVersion: clientCall.schemaVersion,
      context: ctx,
      academicCaseId: interview.academic_case_id,
      interviewId,
    });
  }
  if (!clientCall.ok) {
    return {
      ok: false,
      code: "MODEL_ERROR",
      studentMessage: serializeMessageForStudent(studentRow),
    };
  }

  // 5. Grounding Guard (Anjo) + regeneração 1x + safe fallback contextual.
  let finalResponse = clientCall.data.clientResponse;
  let factKeysUsed = clientCall.data.factKeysUsed;
  let accessModeUsed = clientCall.data.accessModeUsed;
  let simulatedLookup = clientCall.data.simulatedLookup;
  let lookupSource = clientCall.data.lookupSource;
  let grounded = true;
  let fallbackUsed = false;
  let regenerated = false;

  const grounding = await validateGrounding({
    factState,
    persona,
    simulationCanon,
    studentMessage: text,
    proposedResponse: finalResponse,
    factKeysUsed,
    accessModeUsed,
    simulatedLookup,
  });
  if (grounding.ok && grounding.usage) {
    await logAiUsage({
      feature: grounding.feature,
      usage: grounding.usage,
      promptVersion: grounding.promptVersion,
      schemaVersion: grounding.schemaVersion,
      context: ctx,
      academicCaseId: interview.academic_case_id,
      interviewId,
    });
  }

  if (grounding.ok) {
    if (!grounding.valid) {
      if (grounding.regenerationRequired) {
        const retry = await generateClientReply({
          academicCase,
          simulationCanon,
          persona,
          factState,
          revealedFacts: revealed,
          recentMessages: windowMsgs || [],
          studentMessage: text,
          correction: true,
        });
        regenerated = true;
        if (retry.ok && retry.usage) {
          await logAiUsage({
            feature: retry.feature,
            usage: retry.usage,
            promptVersion: retry.promptVersion,
            schemaVersion: retry.schemaVersion,
            context: ctx,
            academicCaseId: interview.academic_case_id,
            interviewId,
          });
        }
        let ok2 = false;
        if (retry.ok) {
          const g2 = await validateGrounding({
            factState,
            persona,
            simulationCanon,
            studentMessage: text,
            proposedResponse: retry.data.clientResponse,
            factKeysUsed: retry.data.factKeysUsed,
            accessModeUsed: retry.data.accessModeUsed,
            simulatedLookup: retry.data.simulatedLookup,
          });
          if (g2.ok && g2.valid) {
            finalResponse = retry.data.clientResponse;
            factKeysUsed = retry.data.factKeysUsed;
            accessModeUsed = retry.data.accessModeUsed;
            simulatedLookup = retry.data.simulatedLookup;
            lookupSource = retry.data.lookupSource;
            ok2 = true;
          }
        }
        if (!ok2) {
          finalResponse = getSafeClientFallback({ accessMode: accessModeUsed });
          factKeysUsed = [];
          simulatedLookup = false;
          lookupSource = "";
          grounded = false;
          fallbackUsed = true;
        }
      } else {
        finalResponse = getSafeClientFallback({ accessMode: accessModeUsed });
        factKeysUsed = [];
        simulatedLookup = false;
        lookupSource = "";
        grounded = false;
        fallbackUsed = true;
      }
    }
  } else {
    // Anjo indisponível: contingência determinística (não entrega fato sem suporte).
    if (!deterministicGrounded(factKeysUsed, factState)) {
      finalResponse = getSafeClientFallback({ accessMode: accessModeUsed });
      factKeysUsed = [];
      simulatedLookup = false;
      lookupSource = "";
      grounded = false;
      fallbackUsed = true;
    }
  }

  // 6. Persiste a resposta do Cliente Simulado.
  const clientRow = await insertMessage(interviewId, {
    sender_type: "SIMULATED_CLIENT",
    content: finalResponse,
    ai_model: ORACULO_CLIENT_MODEL,
    ai_model_version: ORACULO_CLIENT_MODEL,
    prompt_version: PROMPT_VERSIONS.SIMULATED_CLIENT,
    fact_keys_used: factKeysUsed,
    access_mode_used: accessModeUsed,
    simulated_lookup: simulatedLookup,
    lookup_source: lookupSource,
    response_fact_state: {
      professionalIntent: clientCall.data.professionalIntent,
      unsupportedFactRisk: clientCall.data.unsupportedFactRisk,
      accessModeUsed,
      simulatedLookup,
      lookupSource,
      grounded,
      fallbackUsed,
    },
  });

  const newCount = (interview.message_count || 0) + 2;
  await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .update({ message_count: newCount, updated_at: new Date().toISOString() })
    .eq("id", interviewId);

  if (fallbackUsed) {
    await recordOraculoAudit({
      oraculoId,
      academicCaseId: interview.academic_case_id,
      interviewId,
      eventType: "ORACULO_SIMULATED_CLIENT_GROUNDING_FALLBACK_USED",
    });
  }
  if (regenerated) {
    await recordOraculoAudit({
      oraculoId,
      academicCaseId: interview.academic_case_id,
      interviewId,
      eventType: "ORACULO_SIMULATED_CLIENT_GROUNDING_REGENERATED",
    });
  }
  await recordOraculoAudit({
    oraculoId,
    academicCaseId: interview.academic_case_id,
    interviewId,
    eventType: "ORACULO_SIMULATED_CLIENT_RESPONSE_GENERATED",
  });
  if (context) {
    await logOraculoEvent({
      context,
      type: ORACULO_EVENTS.INTERVIEW_MESSAGE,
      surface: "/dashboard/oraculo/casos",
      refType: "INTERVIEW",
      refId: interviewId,
      metadata: { sequence: newCount },
    });
  }

  // 7. Window Evaluator a cada N mensagens (não bloqueia a resposta).
  if (newCount > 0 && newCount % WINDOW_EVAL_EVERY === 0) {
    await runWindowEvaluation({ interview, ctx }).catch(() => {});
  }

  return {
    ok: true,
    studentMessage: serializeMessageForStudent(studentRow),
    clientMessage: serializeMessageForStudent(clientRow),
    conduct: conduct.warn ? conduct : null,
  };
}

async function runWindowEvaluation({ interview, ctx }) {
  const { data: msgs } = await supabaseAdmin
    .from("oraculo_simulated_interview_messages")
    .select("sender_type, content, sequence_number")
    .eq("interview_id", interview.id)
    .order("sequence_number", { ascending: true });
  if (!msgs?.length) return;

  const windowMsgs = msgs.slice(-WINDOW_EVAL_EVERY);
  const evalResult = await evaluateWindow(windowMsgs);
  if (!evalResult.ok) return;

  await logAiUsage({
    feature: evalResult.feature,
    usage: evalResult.usage,
    promptVersion: evalResult.promptVersion,
    schemaVersion: evalResult.schemaVersion,
    context: ctx,
    academicCaseId: interview.academic_case_id,
    interviewId: interview.id,
  });

  const d = evalResult.data;
  await supabaseAdmin.from("oraculo_interview_window_evals").insert([
    {
      interview_id: interview.id,
      oraculo_id: interview.oraculo_id,
      window_start_seq: windowMsgs[0]?.sequence_number || null,
      window_end_seq: windowMsgs[windowMsgs.length - 1]?.sequence_number || null,
      clarity_score: d.clarity_score,
      fact_collection_score: d.fact_collection_score,
      interview_structure_score: d.interview_structure_score,
      legal_caution_score: d.legal_caution_score,
      accessible_language_score: d.accessible_language_score,
      conduct_score: d.conduct_score,
      flags: d.flags || [],
      evidence: d.evidence || [],
      window_summary: d.window_summary || "",
      model: evalResult.usage?.model || null,
      prompt_version: evalResult.promptVersion,
    },
  ]);
}

/**
 * Encerra a entrevista: Final Evaluator (Anjo) gera avaliação + Relatório de
 * Conduta Profissional (enviado a Supervisor/Orientador). `context` é o
 * contexto acadêmico do aluno (resolveOraculoStudentContext/
 * getOraculoAcademicContext) — opcional; sem ele o relatório é gerado sem
 * destinatário resolvido.
 */
export async function endSimulatedInterview({ interviewId, oraculoId, context = null }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const { data: interview } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!interview) return { ok: false, code: "INTERVIEW_NOT_FOUND" };
  if (interview.status === "COMPLETED") return { ok: true, interview };

  const { data: messages } = await supabaseAdmin
    .from("oraculo_simulated_interview_messages")
    .select("*")
    .eq("interview_id", interviewId)
    .order("sequence_number", { ascending: true });

  const studentMsgs = (messages || []).filter((m) => m.sender_type === "STUDENT");
  const conductWarnings = studentMsgs.filter((m) => m.conduct_status === "WARNING").length;

  const ctx = usageContext(interview, null);
  const evaluation = await generateProfessionalSimulationEvaluation(messages);
  if (evaluation.ok && evaluation.usage) {
    await logAiUsage({
      feature: evaluation.feature,
      usage: evaluation.usage,
      promptVersion: evaluation.promptVersion,
      schemaVersion: evaluation.schemaVersion,
      context: ctx,
      academicCaseId: interview.academic_case_id,
      interviewId,
    });
  }

  const summaryStats = {
    questions: studentMsgs.length,
    conductWarnings,
    blockedCount: 0,
    messageCount: (messages || []).length,
  };

  const nowIso = new Date().toISOString();
  const { data: updated } = await supabaseAdmin
    .from("oraculo_simulated_interviews")
    .update({
      status: "COMPLETED",
      completed_at: nowIso,
      summary_stats: summaryStats,
      updated_at: nowIso,
    })
    .eq("id", interviewId)
    .select("*")
    .single();

  const savedEvaluation = evaluation.ok
    ? await saveProfessionalSimulationEvaluation({ interview: updated || interview, evaluation })
    : null;

  if (savedEvaluation) {
    const report = await generateAndSaveRadarConductReport({
      interview: updated || interview,
      evaluationRow: savedEvaluation,
      context,
    });
    if (report) {
      await recordOraculoAudit({
        oraculoId,
        academicCaseId: interview.academic_case_id,
        interviewId,
        eventType: "PROFESSIONAL_CONDUCT_REPORT_GENERATED",
      });
    }
  }

  await recordOraculoAudit({
    oraculoId,
    academicCaseId: interview.academic_case_id,
    interviewId,
    eventType: "ORACULO_SIMULATED_INTERVIEW_COMPLETED",
    metadata: summaryStats,
  });
  if (evaluation.ok) {
    await recordOraculoAudit({
      oraculoId,
      academicCaseId: interview.academic_case_id,
      interviewId,
      eventType: "ORACULO_SIMULATED_INTERVIEW_AI_FEEDBACK_GENERATED",
    });
  }

  // Finaliza a atividade acadêmica correspondente (não-fatal).
  await finalizeInterviewActivity({ interview: updated || interview });

  return { ok: true, interview: updated, evaluation: savedEvaluation };
}

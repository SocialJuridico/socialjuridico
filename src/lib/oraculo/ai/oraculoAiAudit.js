import { supabaseAdmin } from "@/lib/supabase";

/**
 * Registra o uso de IA (contabilização por feature/chave). Nunca lança e
 * nunca armazena a chave. `usage` vem dos helpers de callClientJson/callAngelJson.
 */
export async function logAiUsage({
  feature,
  usage = {},
  promptVersion = null,
  schemaVersion = null,
  context = {},
  academicCaseId = null,
  interviewId = null,
  conversationId = null,
}) {
  if (!supabaseAdmin || !feature) return;
  try {
    await supabaseAdmin.from("oraculo_ai_usage_logs").insert([
      {
        feature,
        model: usage.model || null,
        model_snapshot: usage.modelSnapshot || null,
        prompt_version: promptVersion,
        schema_version: schemaVersion,
        instituicao_id: context.institutionId || null,
        programa_id: context.programId || null,
        oraculo_id: context.oraculoId || null,
        academic_case_id: academicCaseId,
        conversation_id: conversationId,
        interview_id: interviewId,
        input_tokens: usage.inputTokens ?? null,
        cached_input_tokens: usage.cachedInputTokens ?? null,
        output_tokens: usage.outputTokens ?? null,
        request_id: usage.requestId || null,
      },
    ]);
  } catch (error) {
    console.error("[OraculoAI/Usage] Falha ao registrar uso:", error?.message);
  }
}

import { supabaseAdmin } from "@/lib/supabase";

// Ponte entre a entrevista simulada do Radar e a trilha acadêmica institucional.
// Uma entrevista => uma atividade em oraculo_atividades_academicas, para que a
// prática do aluno apareça no painel da instituição (lista de atividades +
// contadores do vínculo). Nunca lança: falha aqui não pode quebrar a entrevista.

const ACTIVITY_TYPE = "ENTREVISTA_SIMULADA_RADAR";

function canAttribute(context) {
  return Boolean(
    context?.studentProgramLinkId &&
      context?.institutionId &&
      context?.programId &&
      context?.oraculoId,
  );
}

/**
 * Registra a atividade acadêmica ao INICIAR a entrevista (status EM_ANDAMENTO) e
 * atualiza os contadores do vínculo. Guarda o id da atividade na entrevista.
 * Sem vínculo/instituição/programa resolvidos, não há a quem atribuir: ignora.
 */
export async function recordInterviewStartActivity({ interview, academicCase, context }) {
  if (!supabaseAdmin || !interview?.id || !canAttribute(context)) return;

  try {
    // Idempotência: se a entrevista já tem atividade, não duplica.
    if (interview.academic_activity_id) return;

    const nowIso = new Date().toISOString();
    const payload = {
      instituicao_id: context.institutionId,
      programa_academico_id: context.programId,
      turma_academica_id: context.classId || null,
      estudante_vinculo_id: context.studentProgramLinkId,
      oraculo_profissional_id: context.oraculoId,
      tipo_atividade: ACTIVITY_TYPE,
      titulo: academicCase?.title
        ? `Atendimento jurídico simulado: ${academicCase.title}`.slice(0, 240)
        : "Atendimento jurídico simulado (Radar Acadêmico)",
      codigo_caso: interview.academic_case_id,
      area_juridica: academicCase?.legal_area || null,
      conteudo_resumo: "Atendimento jurídico simulado com cliente por IA (Radar Acadêmico).",
      status: "EM_ANDAMENTO",
      revisao_exigida: false,
      conta_carga_horaria: false,
      tempo_registrado_minutos: 0,
      tempo_reconhecido_minutos: 0,
      reconhecimento_status: "NAO_APLICAVEL",
      completed_at: null,
      created_by_auth_user_id: context.authUserId || null,
    };

    const { data: activity, error } = await supabaseAdmin
      .from("oraculo_atividades_academicas")
      .insert([payload])
      .select("id")
      .single();

    if (error || !activity) {
      console.error("[AcademicActivityBridge] Falha ao criar atividade:", error?.message);
      return;
    }

    await supabaseAdmin
      .from("oraculo_simulated_interviews")
      .update({ academic_activity_id: activity.id })
      .eq("id", interview.id);

    // Contadores do vínculo: +1 atividade e última atividade agora.
    const { data: link } = await supabaseAdmin
      .from("oraculo_estudante_vinculos_academicos")
      .select("atividades_registradas")
      .eq("id", context.studentProgramLinkId)
      .maybeSingle();

    await supabaseAdmin
      .from("oraculo_estudante_vinculos_academicos")
      .update({
        atividades_registradas: (link?.atividades_registradas || 0) + 1,
        ultima_atividade_em: nowIso,
        updated_at: nowIso,
      })
      .eq("id", context.studentProgramLinkId);
  } catch (error) {
    console.error("[AcademicActivityBridge] Erro ao registrar início:", error?.message);
  }
}

/**
 * Finaliza a atividade acadêmica ao ENCERRAR a entrevista: marca conclusão,
 * tempo e resumo. Atualiza a última atividade do vínculo. Nunca lança.
 */
export async function finalizeInterviewActivity({ interview }) {
  if (!supabaseAdmin || !interview?.academic_activity_id) return;

  try {
    const nowIso = new Date().toISOString();
    const startedAt = interview.started_at ? new Date(interview.started_at) : null;
    const minutes = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000))
      : 0;

    const stats = interview.summary_stats || {};
    const resumo = `Atendimento jurídico simulado concluído: ${stats.questions || 0} perguntas, ${stats.messageCount || interview.message_count || 0} mensagens.`;

    await supabaseAdmin
      .from("oraculo_atividades_academicas")
      .update({
        status: "APROVADA",
        completed_at: nowIso,
        tempo_registrado_minutos: minutes,
        conteudo_resumo: resumo.slice(0, 1000),
      })
      .eq("id", interview.academic_activity_id);

    if (interview.student_program_link_id) {
      await supabaseAdmin
        .from("oraculo_estudante_vinculos_academicos")
        .update({ ultima_atividade_em: nowIso, updated_at: nowIso })
        .eq("id", interview.student_program_link_id);
    }
  } catch (error) {
    console.error("[AcademicActivityBridge] Erro ao finalizar:", error?.message);
  }
}

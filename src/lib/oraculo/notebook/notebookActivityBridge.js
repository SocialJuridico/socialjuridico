import { supabaseAdmin } from "@/lib/supabase";

// Ponte entre ações do Caderno Jurídico e a trilha acadêmica institucional
// (mesmo padrão de src/lib/oraculo/radarAcademic/academicActivityBridge.js).
//
// Cria uma atividade em oraculo_atividades_academicas com
// reconhecimento_status = PENDENTE (default da tabela): a hora só passa a
// contar de fato em horas_reconhecidas_minutos quando a instituição
// reconhecer a atividade no painel dela — o Caderno nunca grava
// horas_reconhecidas_minutos diretamente. Nunca lança: falha aqui não pode
// quebrar a ação do aluno no Caderno.

const MINUTES_BY_TYPE = {
  FICHAMENTO_CONCLUIDO: 30,
  QUESTAO_ESTUDO_RESPONDIDA: 10,
  ANOTACAO_CASO_ANALISE: 5,
  FONTE_UTILIZADA_EM_ANALISE: 5,
};

// Limite simples por tipo/24h — evita gerar dezenas de atividades só pra
// inflar contadores (o reconhecimento de horas continua manual, mas o
// contador de atividades e o painel da instituição não devem virar ruído).
const MAX_PER_TYPE_PER_DAY = 5;

function canAttribute(context) {
  return Boolean(
    context?.studentProgramLinkId &&
      context?.institutionId &&
      context?.programId &&
      context?.oraculoId,
  );
}

export async function recordNotebookActivity({
  context,
  tipoAtividade,
  titulo,
  areaJuridica = null,
  resumo = null,
  codigoCaso = null,
}) {
  if (!supabaseAdmin || !canAttribute(context)) return;
  const minutos = MINUTES_BY_TYPE[tipoAtividade];
  if (!minutos) return;

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("oraculo_atividades_academicas")
      .select("id", { count: "exact", head: true })
      .eq("estudante_vinculo_id", context.studentProgramLinkId)
      .eq("tipo_atividade", tipoAtividade)
      .gte("created_at", since);
    if ((count || 0) >= MAX_PER_TYPE_PER_DAY) return;

    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin.from("oraculo_atividades_academicas").insert([
      {
        instituicao_id: context.institutionId,
        programa_academico_id: context.programId,
        turma_academica_id: context.classId || null,
        estudante_vinculo_id: context.studentProgramLinkId,
        oraculo_profissional_id: context.oraculoId,
        tipo_atividade: tipoAtividade,
        titulo: String(titulo || tipoAtividade).slice(0, 240),
        codigo_caso: codigoCaso,
        area_juridica: areaJuridica,
        conteudo_resumo: resumo ? String(resumo).slice(0, 1000) : null,
        status: "APROVADA",
        revisao_exigida: false,
        conta_carga_horaria: true,
        tempo_registrado_minutos: minutos,
        tempo_reconhecido_minutos: 0,
        reconhecimento_status: "PENDENTE",
        completed_at: nowIso,
        created_by_auth_user_id: context.authUserId || null,
      },
    ]);
    if (error) {
      console.error("[NotebookActivityBridge] Falha ao criar atividade:", error.message);
      return;
    }

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
    console.error("[NotebookActivityBridge] Erro ao registrar atividade:", error?.message);
  }
}

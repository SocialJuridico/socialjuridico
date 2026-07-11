import { supabaseAdmin } from "@/lib/supabase";

// Leitura das atividades acadêmicas do aluno (oraculo_atividades_academicas).
// Escrita fica com as pontes específicas (radarAcademic/academicActivityBridge,
// notebook/notebookActivityBridge) e com o painel da instituição.

export const ACTIVITY_TYPE_LABELS = {
  ENTREVISTA_SIMULADA_RADAR: "Entrevista simulada (Radar)",
  FICHAMENTO_CONCLUIDO: "Fichamento concluído",
  QUESTAO_ESTUDO_RESPONDIDA: "Questão de estudo respondida",
  ANOTACAO_CASO_ANALISE: "Nota de caso registrada",
  FONTE_UTILIZADA_EM_ANALISE: "Fonte jurídica utilizada em análise",
};

export const RECOGNITION_STATUS_LABELS = {
  NAO_APLICAVEL: "Não conta horas",
  PENDENTE: "Aguardando reconhecimento",
  RECONHECIDO_AUTOMATICO: "Reconhecida",
  RECONHECIDO_APOS_REVISAO: "Reconhecida (revisada)",
  REJEITADO: "Não reconhecida",
};

export async function listStudentActivities({ oraculoId, limit = 50 }) {
  if (!supabaseAdmin || !oraculoId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_atividades_academicas")
    .select(
      "id, tipo_atividade, titulo, area_juridica, status, conta_carga_horaria, tempo_registrado_minutos, tempo_reconhecido_minutos, reconhecimento_status, completed_at, created_at",
    )
    .eq("oraculo_profissional_id", oraculoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

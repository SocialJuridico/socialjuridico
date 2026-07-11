import { supabaseAdmin } from "@/lib/supabase";
import { countStaffQuestions } from "@/lib/oraculo/notebook/notebookEntries";

// Leitura para o Dashboard do Professor Orientador. Escopo sempre pelo
// institutionUserId resolvido no servidor (oraculo_instituicao_usuarios.id).

async function loadLinks(institutionUserId) {
  if (!supabaseAdmin || !institutionUserId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_estudante_vinculos_academicos")
    .select(
      "id, oraculo_profissional_id, turma_academica_id, periodo_atual, status_academico, atividades_registradas, horas_reconhecidas_minutos, revisoes_pendentes, ultima_atividade_em",
    )
    .eq("professor_orientador_usuario_id", institutionUserId)
    .is("desvinculado_em", null)
    .order("ultima_atividade_em", { ascending: false, nullsFirst: false });
  return data || [];
}

async function withStudentsAndTurmas(links) {
  if (!links.length) return { links, studentsById: new Map(), turmasById: new Map() };

  const studentIds = [...new Set(links.map((l) => l.oraculo_profissional_id).filter(Boolean))];
  const turmaIds = [...new Set(links.map((l) => l.turma_academica_id).filter(Boolean))];

  const [{ data: students }, { data: turmas }] = await Promise.all([
    studentIds.length
      ? supabaseAdmin.from("oraculo_profissionais").select("id, name, email, curso").in("id", studentIds)
      : Promise.resolve({ data: [] }),
    turmaIds.length
      ? supabaseAdmin.from("oraculo_turmas_academicas").select("id, nome, status").in("id", turmaIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    links,
    studentsById: new Map((students || []).map((s) => [s.id, s])),
    turmasById: new Map((turmas || []).map((t) => [t.id, t])),
  };
}

export async function listOrientatorStudents({ institutionUserId }) {
  const links = await loadLinks(institutionUserId);
  const { studentsById, turmasById } = await withStudentsAndTurmas(links);

  return links.map((link) => ({
    linkId: link.id,
    student: studentsById.get(link.oraculo_profissional_id) || null,
    turma: turmasById.get(link.turma_academica_id) || null,
    periodoAtual: link.periodo_atual,
    statusAcademico: link.status_academico,
    atividadesRegistradas: link.atividades_registradas || 0,
    horasReconhecidasMinutos: link.horas_reconhecidas_minutos || 0,
    revisoesPendentes: link.revisoes_pendentes || 0,
    ultimaAtividadeEm: link.ultima_atividade_em,
  }));
}

export async function listOrientatorTurmas({ institutionUserId }) {
  const links = await loadLinks(institutionUserId);
  const { turmasById } = await withStudentsAndTurmas(links);

  const countByTurma = new Map();
  for (const link of links) {
    if (!link.turma_academica_id) continue;
    countByTurma.set(link.turma_academica_id, (countByTurma.get(link.turma_academica_id) || 0) + 1);
  }

  return [...turmasById.values()].map((turma) => ({
    ...turma,
    studentsCount: countByTurma.get(turma.id) || 0,
  }));
}

export async function getOrientatorHomeStats({ institutionUserId, authUserId }) {
  const links = await loadLinks(institutionUserId);
  const turmaIds = new Set(links.map((l) => l.turma_academica_id).filter(Boolean));
  const pendingQuestions = await countStaffQuestions({ authUserId, answered: false });

  return {
    turmasCount: turmaIds.size,
    studentsCount: links.length,
    pendingQuestions,
  };
}

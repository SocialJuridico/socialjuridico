import { supabaseAdmin } from "@/lib/supabase";
import { countStaffQuestions } from "@/lib/oraculo/notebook/notebookEntries";

// Leitura para o Dashboard do Supervisor Jurídico. Supervisor NÃO tem
// vínculo institucional — é indicado pelo aluno (oraculo_supervisores) e
// identificado pela conta que ele ativou (advogado_user_id = auth_user_id).

async function loadSupervisions(authUserId) {
  if (!supabaseAdmin || !authUserId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_supervisores")
    .select("id, oraculo_id, relacao, status, created_at")
    .eq("advogado_user_id", authUserId)
    .eq("status", "APROVADO")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function listSupervisorStudents({ authUserId }) {
  const links = await loadSupervisions(authUserId);
  if (!links.length) return [];

  const oraculoIds = [...new Set(links.map((l) => l.oraculo_id))];
  const { data: students } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name, email, curso, status")
    .in("id", oraculoIds);
  const studentsById = new Map((students || []).map((s) => [s.id, s]));

  return links.map((link) => ({
    linkId: link.id,
    student: studentsById.get(link.oraculo_id) || null,
    relacao: link.relacao,
    since: link.created_at,
  }));
}

export async function getSupervisorHomeStats({ authUserId }) {
  const links = await loadSupervisions(authUserId);
  const pendingQuestions = await countStaffQuestions({ authUserId, answered: false });

  return {
    studentsCount: links.length,
    pendingQuestions,
  };
}

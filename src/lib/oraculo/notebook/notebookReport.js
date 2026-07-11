import { supabaseAdmin } from "@/lib/supabase";

// Relatório do Caderno Jurídico: só contagens e rótulos agregados — nunca o
// conteúdo das notas em si (privacidade, sem regra institucional de exposição).

function topN(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

export async function getNotebookReport({ oraculoId }) {
  const empty = {
    totalNotes: 0,
    totalCaseNotes: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    totalFichamentos: 0,
    completedFichamentos: 0,
    totalSources: 0,
    topCategories: [],
    topTags: [],
  };
  if (!supabaseAdmin || !oraculoId) return empty;

  const [entriesRes, fichamentosRes, sourcesRes] = await Promise.all([
    supabaseAdmin
      .from("oraculo_notebook_entries")
      .select("entry_type, question_status, category, tags")
      .eq("oraculo_id", oraculoId)
      .eq("status", "ACTIVE"),
    supabaseAdmin
      .from("oraculo_fichamentos")
      .select("status, tags")
      .eq("oraculo_id", oraculoId)
      .neq("status", "ARCHIVED"),
    supabaseAdmin
      .from("oraculo_legal_saved_items")
      .select("id", { count: "exact", head: true })
      .eq("oraculo_id", oraculoId),
  ]);

  const entries = entriesRes.data || [];
  const fichamentos = fichamentosRes.data || [];

  const categoryCounts = {};
  const tagCounts = {};

  for (const e of entries) {
    if (e.category) categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    for (const t of e.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  for (const f of fichamentos) {
    for (const t of f.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }

  return {
    totalNotes: entries.filter((e) => e.entry_type === "NOTE").length,
    totalCaseNotes: entries.filter((e) => e.entry_type === "CASE_NOTE").length,
    totalQuestions: entries.filter((e) => e.entry_type === "STUDY_QUESTION").length,
    answeredQuestions: entries.filter(
      (e) => e.entry_type === "STUDY_QUESTION" && e.question_status === "ANSWERED",
    ).length,
    totalFichamentos: fichamentos.length,
    completedFichamentos: fichamentos.filter((f) => f.status === "COMPLETED").length,
    totalSources: sourcesRes.count || 0,
    topCategories: topN(categoryCounts, 5),
    topTags: topN(tagCounts, 8),
  };
}

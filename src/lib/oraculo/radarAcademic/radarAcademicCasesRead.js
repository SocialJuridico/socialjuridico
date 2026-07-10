import { supabaseAdmin } from "@/lib/supabase";

import {
  serializeAcademicCaseCard,
  serializeAcademicCaseForStudent,
} from "./radarAcademicPrivacy";

const STUDENT_VISIBLE_STATUSES = ["READY", "ACTIVE"];

async function safe(query) {
  if (!supabaseAdmin) return [];
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

/**
 * Lista casos acadêmicos do Radar visíveis ao estudante (cards).
 * Nunca retorna campos de origem (radar_source_id, url, etc.).
 */
export async function listRadarAcademicCases({ area, search } = {}) {
  const rows = await safe(
    supabaseAdmin
      .from("oraculo_radar_academic_cases")
      .select(
        "id, title, legal_area, academic_summary, persona_config, fact_state, canon_status, status, created_at",
      )
      .in("status", STUDENT_VISIBLE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(120),
  );

  let cards = rows.map(serializeAcademicCaseCard).filter(Boolean);

  if (area) {
    cards = cards.filter((card) => card.legalArea === area);
  }
  if (search) {
    const needle = search.toLowerCase();
    cards = cards.filter(
      (card) =>
        card.title?.toLowerCase().includes(needle) ||
        card.academicSummary?.toLowerCase().includes(needle) ||
        card.legalArea?.toLowerCase().includes(needle),
    );
  }
  return cards;
}

/**
 * Resumo agregado da aba (somente dados reais).
 */
export async function radarAcademicSummary() {
  const rows = await safe(
    supabaseAdmin
      .from("oraculo_radar_academic_cases")
      .select("legal_area, status")
      .in("status", STUDENT_VISIBLE_STATUSES),
  );

  const areas = new Set(rows.map((row) => row.legal_area).filter(Boolean));
  return {
    totalCases: rows.length,
    totalAreas: areas.size,
  };
}

/**
 * Dossiê completo de um caso acadêmico (para o estudante). Sem fact_state
 * interno nem campos de origem.
 */
export async function getRadarAcademicCaseForStudent(caseId) {
  if (!supabaseAdmin || !caseId) return null;
  const { data, error } = await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .select("*")
    .eq("id", caseId)
    .in("status", STUDENT_VISIBLE_STATUSES)
    .maybeSingle();
  if (error || !data) return null;
  return serializeAcademicCaseForStudent(data);
}

/**
 * Carrega o caso acadêmico COMPLETO (inclui fact_state e persona) para uso
 * interno do servidor (Cliente Simulado). Nunca expor ao cliente HTTP.
 */
export async function getRadarAcademicCaseInternal(caseId) {
  if (!supabaseAdmin || !caseId) return null;
  const { data, error } = await supabaseAdmin
    .from("oraculo_radar_academic_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Lista de áreas jurídicas distintas para o filtro.
 */
export async function listRadarAcademicAreas() {
  const rows = await safe(
    supabaseAdmin
      .from("oraculo_radar_academic_cases")
      .select("legal_area")
      .in("status", STUDENT_VISIBLE_STATUSES),
  );
  return Array.from(
    new Set(rows.map((row) => row.legal_area).filter(Boolean)),
  ).sort();
}

import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { getRadarAcademicCaseInternal } from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";
import { ensureSimulationCanon } from "@/lib/oraculo/ai/simulationCanonStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Backfill do CÂNONE DA SIMULAÇÃO para casos acadêmicos READY que ainda não têm
// Cânone congelado (canon_status != READY). Usa o store real (build->validate->
// freeze). Opcionalmente cancela entrevistas ACTIVE anteriores ao Cânone, para
// que uma nova entrevista faça snapshot do Cânone congelado.
export async function POST(request) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return json({ success: false, message: auth.message }, auth.status);
  if (!supabaseAdmin) {
    return json({ success: false, message: "Serviço indisponível." }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const singleId = body?.id ? String(body.id) : null;
  const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 50);
  const resetStale = body?.resetStaleInterviews !== false;

  // Alvos: um caso específico, ou casos READY sem Cânone congelado.
  let targetIds = [];
  if (singleId) {
    targetIds = [singleId];
  } else {
    const { data } = await supabaseAdmin
      .from("oraculo_radar_academic_cases")
      .select("id")
      .in("status", ["READY", "ACTIVE"])
      .neq("canon_status", "READY")
      .limit(limit);
    targetIds = (data || []).map((r) => r.id);
  }

  const results = [];
  for (const id of targetIds) {
    const academicCase = await getRadarAcademicCaseInternal(id);
    if (!academicCase) {
      results.push({ id, status: "CASE_NOT_FOUND" });
      continue;
    }

    const outcome = await ensureSimulationCanon(academicCase, { force: Boolean(body?.force) });
    let staleCancelled = 0;

    if (resetStale && outcome.ok && outcome.status === "READY") {
      const { data: cancelled } = await supabaseAdmin
        .from("oraculo_simulated_interviews")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .eq("academic_case_id", id)
        .in("status", ["ACTIVE", "COMPLETED"])
        .is("canon_frozen_at_snapshot", null)
        .select("id");
      staleCancelled = (cancelled || []).length;
    }

    results.push({
      id,
      status: outcome.status,
      version: outcome.version || null,
      staleInterviewsCancelled: staleCancelled,
    });
  }

  const ready = results.filter((r) => r.status === "READY").length;
  return json({
    success: true,
    processed: results.length,
    ready,
    results,
  });
}

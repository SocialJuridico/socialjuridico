import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function requireCaseUser(request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      ok: false,
      response: json({ success: false, message: "Não autorizado." }, 401),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        { success: false, message: "Serviço indisponível no servidor." },
        503,
      ),
    };
  }

  return { ok: true, user, db: supabaseAdmin };
}

export function isGovernanceUnavailable(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("admin_case_governance")
  );
}

export async function getCaseGovernance(db, caseId) {
  const { data, error } = await db
    .from("admin_case_governance")
    .select(
      "case_id, operational_stage, risk_level, legal_hold, archived_at, archive_reason, notification_count",
    )
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) {
    if (isGovernanceUnavailable(error)) return null;
    throw new Error(`Falha ao consultar governança: ${error.message}`);
  }

  return data || null;
}

export async function upsertCaseGovernance(db, caseId, values) {
  const { data, error } = await db
    .from("admin_case_governance")
    .upsert(
      {
        case_id: caseId,
        ...values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id" },
    )
    .select()
    .single();

  if (error) {
    if (isGovernanceUnavailable(error)) return null;
    throw new Error(`Falha ao atualizar governança: ${error.message}`);
  }

  return data;
}

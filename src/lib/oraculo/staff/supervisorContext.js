import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

// Contexto do Supervisor Jurídico — NÃO tem vínculo institucional. É
// indicado pelo próprio aluno (oraculo_supervisores) e, ao ativar o serviço
// na conta dele (ver /api/oraculoacademico/supervisor/ativar), vincula
// advogado_user_id = auth.users.id. Diferente do Orientador (institucional,
// ver oraculo/staff/oraculoStaffContext.js).

export async function resolveSupervisorContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabaseAdmin
    .from("oraculo_supervisores")
    .select("id, oraculo_id, nome, email, relacao")
    .eq("advogado_user_id", user.id)
    .eq("status", "APROVADO");
  if (!rows?.length) return null;

  return {
    authUserId: user.id,
    name: rows[0].nome || user.email,
    email: rows[0].email || user.email,
    supervisedOraculoIds: [...new Set(rows.map((r) => r.oraculo_id))],
  };
}

export function supervisorJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireSupervisor() {
  const context = await resolveSupervisorContext();
  if (!context) {
    return {
      ok: false,
      response: supervisorJson(
        { success: false, message: "Não autenticado ou serviço não ativado." },
        403,
      ),
    };
  }
  return { ok: true, context };
}

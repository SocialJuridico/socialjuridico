import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { getInstitutionAccessContext } from "@/lib/oraculoInstitutionAccess";

// Contexto do Supervisor Jurídico / Professor Orientador logado — mesma base
// de auth do painel institucional (oraculo_instituicao_usuarios +
// oraculo_instituicao_user_roles), nunca confia em ids vindos do cliente.

async function loadStaffMembership(authUserId) {
  const { data } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("id, instituicao_id, nome_completo, email, cargo, status")
    .eq("auth_user_id", authUserId)
    .eq("status", "ATIVO")
    .limit(1)
    .maybeSingle();
  return data || null;
}

/**
 * Resolve o contexto do funcionário institucional para PÁGINAS (server
 * components). Retorna null se não autenticado, sem vínculo ativo, ou sem o
 * papel exigido.
 */
export async function resolveOraculoStaffContext({ requiredRole } = {}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await loadStaffMembership(user.id);
  if (!membership) return null;

  const access = await getInstitutionAccessContext({
    authUserId: user.id,
    instituicaoId: membership.instituicao_id,
  });
  if (!access) return null;
  if (requiredRole && !access.roles.includes(requiredRole)) return null;

  return {
    authUserId: user.id,
    institutionUserId: membership.id,
    instituicaoId: membership.instituicao_id,
    name: membership.nome_completo || "Profissional",
    email: membership.email || null,
    cargo: membership.cargo || null,
    roles: access.roles,
    permissions: access.permissions,
  };
}

export function staffJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Resolve o contexto do funcionário institucional para ROTAS DE API.
 * Retorna { ok:true, context } ou { ok:false, response }.
 */
export async function requireOraculoStaff(requiredRole) {
  const context = await resolveOraculoStaffContext({ requiredRole });
  if (!context) {
    return {
      ok: false,
      response: staffJson(
        { success: false, message: "Não autenticado ou sem permissão." },
        403,
      ),
    };
  }
  return { ok: true, context };
}

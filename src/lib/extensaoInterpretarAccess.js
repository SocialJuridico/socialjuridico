import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { supabaseAdmin } from "@/lib/supabase";
import { getInterpretarAvailability } from "@/lib/extensaoInterpretarLimits";

/**
 * Autentica o advogado (token Bearer da extensão) e calcula o acesso ao
 * módulo "Interpretar com Social Jurídico": cota grátis mensal por plano
 * (reset preguiçoso por período) + saldo de créditos comprados.
 */
export async function requireInterpretarAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Não autorizado." };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, plan_type, is_premium, premium_expires_at, uso_interpretar_ia_extensao, interpretar_ia_periodo, saldo_creditos_ia_extensao",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return { ok: false, status: 403, code: "NOT_A_LAWYER", message: "Acesso exclusivo para advogados." };
  }

  const availability = getInterpretarAvailability(profile);

  return {
    ok: true,
    db: supabaseAdmin,
    profile,
    planType: availability.planType,
    period: availability.period,
    quota: availability.quota,
    wallet: availability.wallet,
  };
}

export function serializeAccess(access) {
  return { planType: access.planType, quota: access.quota, wallet: access.wallet };
}

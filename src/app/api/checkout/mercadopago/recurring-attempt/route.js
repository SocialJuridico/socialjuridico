import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { findRecurringAttempt } from "@/lib/billing/mercadoPagoRecurringServer";
import { normalizeRecurringEmail } from "@/lib/billing/mercadoPagoRecurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) return json({ success: false, message: "Serviço financeiro indisponível." }, 503);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ success: false, message: "Não autorizado." }, 401);

    const reference = String(new URL(request.url).searchParams.get("reference") || "").trim();
    if (!/^sjm_[0-9a-f]{32}_[A-Z0-9]{2,4}$/i.test(reference)) {
      return json({ success: false, message: "Referência inválida." }, 400);
    }

    const { data: profile, error } = await supabaseAdmin
      .from("advogados")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !profile) return json({ success: false, message: "Perfil não localizado." }, 404);

    const result = await findRecurringAttempt({
      userId: user.id,
      reference,
      payerEmail: normalizeRecurringEmail(profile.email || user.email),
    });
    return json({ success: true, ...result });
  } catch (error) {
    const status = Number(error?.status) || 502;
    return json({
      success: false,
      message: status < 500 ? error.message : "Não foi possível reconciliar a tentativa. Nenhuma nova cobrança foi iniciada.",
    }, status);
  }
}

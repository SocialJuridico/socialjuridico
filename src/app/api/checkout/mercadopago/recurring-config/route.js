import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeRecurringEmail } from "@/lib/billing/mercadoPagoRecurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) return json({ success: false, message: "Serviço financeiro indisponível." }, 503);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ success: false, message: "Não autorizado." }, 401);

    const { data: profile, error } = await supabaseAdmin
      .from("advogados")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !profile) return json({ success: false, message: "Perfil não localizado." }, 404);

    const publicKey = String(
      process.env.MERCADOPAGO_PUBLIC_KEY || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "",
    ).trim();
    if (!publicKey || !process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return json({ success: false, message: "Credenciais de pagamento não configuradas." }, 503);
    }

    const configured = String(process.env.MERCADOPAGO_SANDBOX || "").trim().toLowerCase();
    const hostname = String(request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
      .split(":")[0].trim().toLowerCase();
    const sandbox = ["1", "true", "yes"].includes(configured) ||
      (!["0", "false", "no"].includes(configured) && ["localhost", "127.0.0.1"].includes(hostname));
    const payerEmail = sandbox
      ? `buyer-${String(user.id).replace(/[^a-z0-9]/gi, "").slice(0, 20).toLowerCase()}@testuser.com`
      : normalizeRecurringEmail(profile.email || user.email);

    return json({ success: true, publicKey, payerEmail, sandbox });
  } catch {
    return json({ success: false, message: "Não foi possível carregar a configuração do pagamento." }, 503);
  }
}

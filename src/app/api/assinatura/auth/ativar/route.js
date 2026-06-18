import { NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import { createSignatureClient } from "@/lib/signatureSupabaseServer";
import {
  normalizeSignatureName,
  normalizeSignaturePhone,
  provisionSignatureAccount,
} from "@/lib/signatureAuth";
import {
  enforceSignatureAuthRateLimit,
  getSignatureRequestIp,
} from "@/lib/signatureAuthRateLimit";

function json(body, status = 200, headers) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return json({ success: false, message: "Origem da solicitação não autorizada." }, 403);
  }

  const rate = enforceSignatureAuthRateLimit({
    scope: "signature-activation",
    key: getSignatureRequestIp(request),
    limit: 5,
    windowMs: 30 * 60 * 1000,
  });

  if (!rate.allowed) {
    return json(
      { success: false, message: "Muitas tentativas. Aguarde antes de tentar novamente." },
      429,
      { "Retry-After": String(rate.retryAfter) },
    );
  }

  if (!supabaseAdmin) {
    return json({ success: false, message: "Serviço temporariamente indisponível." }, 503);
  }

  try {
    const supabase = createSignatureClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authError || !user?.id || !user.email) {
      return json({ success: false, code: "AUTH_REQUIRED", message: "Entre novamente para ativar o produto." }, 401);
    }

    if (!user.email_confirmed_at) {
      return json({ success: false, code: "EMAIL_NOT_CONFIRMED", message: "Confirme seu e-mail antes de ativar o produto." }, 401);
    }

    const body = await request.json();
    const name = normalizeSignatureName(body?.name);
    const phone = normalizeSignaturePhone(body?.phone);

    if (name.length < 3) {
      return json({ success: false, message: "Informe seu nome completo." }, 400);
    }

    if (body?.termsAccepted !== true || body?.privacyAccepted !== true) {
      return json({ success: false, message: "Aceite os Termos de Uso e a Política de Privacidade." }, 400);
    }

    await provisionSignatureAccount(supabaseAdmin, {
      userId: user.id,
      email: user.email,
      name,
      phone,
    });

    return json({ success: true, redirectTo: "/assinatura/app" });
  } catch (error) {
    console.error("[Signature activation] Erro:", error);
    return json({ success: false, message: "Não foi possível ativar o produto agora." }, 500);
  }
}

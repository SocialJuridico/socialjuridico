import { NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  isValidSignatureEmail,
  normalizeSignatureEmail,
  sendSignatureConfirmationEmail,
} from "@/lib/signatureAuth";
import {
  enforceSignatureAuthRateLimit,
  getSignatureRequestIp,
} from "@/lib/signatureAuthRateLimit";

const genericResponse = {
  success: true,
  message: "Se houver uma conta pendente, enviaremos um novo link de confirmação.",
};

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return NextResponse.json({ success: false, message: "Origem não autorizada." }, { status: 403 });
  }

  const rate = enforceSignatureAuthRateLimit({
    scope: "signature-resend",
    key: getSignatureRequestIp(request),
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json({ success: false, message: "Aguarde antes de solicitar outro link." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfter) },
    });
  }

  try {
    const { email: rawEmail } = await request.json();
    const email = normalizeSignatureEmail(rawEmail);
    if (!isValidSignatureEmail(email) || !supabaseAdmin) return NextResponse.json(genericResponse);

    const { data: account } = await supabaseAdmin
      .from("signature_accounts")
      .select("user_id, full_name")
      .eq("email", email)
      .maybeSingle();

    if (!account) return NextResponse.json(genericResponse);

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(account.user_id);
    if (!authData?.user || authData.user.email_confirmed_at) return NextResponse.json(genericResponse);

    await sendSignatureConfirmationEmail({
      admin: supabaseAdmin,
      email,
      name: account.full_name,
    });

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("[Signature resend] Erro:", error);
    return NextResponse.json(genericResponse);
  }
}

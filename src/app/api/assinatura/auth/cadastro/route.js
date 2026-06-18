import { NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import {
  isValidSignatureEmail,
  normalizeSignatureEmail,
  normalizeSignatureName,
  normalizeSignaturePhone,
  provisionSignatureAccount,
  sendSignatureConfirmationEmail,
  validateSignaturePassword,
} from "@/lib/signatureAuth";
import {
  enforceSignatureAuthRateLimit,
  getSignatureRequestIp,
} from "@/lib/signatureAuthRateLimit";

const MAX_BODY_BYTES = 16 * 1024;

function json(body, status = 200, headers) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return json({ success: false, message: "Origem da solicitação não autorizada." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ success: false, message: "Solicitação muito grande." }, 413);
  }

  const ip = getSignatureRequestIp(request);
  const rate = enforceSignatureAuthRateLimit({
    scope: "signature-signup",
    key: ip,
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
    const body = await request.json();
    if (body?.website) return json({ success: true, requiresConfirmation: true });

    const name = normalizeSignatureName(body?.name);
    const email = normalizeSignatureEmail(body?.email);
    const phone = normalizeSignaturePhone(body?.phone);
    const password = String(body?.password || "");

    if (name.length < 3) return json({ success: false, message: "Informe seu nome completo." }, 400);
    if (!isValidSignatureEmail(email)) return json({ success: false, message: "Informe um e-mail válido." }, 400);

    const passwordError = validateSignaturePassword(password);
    if (passwordError) return json({ success: false, message: passwordError }, 400);

    if (body?.termsAccepted !== true || body?.privacyAccepted !== true) {
      return json({ success: false, message: "Aceite os Termos de Uso e a Política de Privacidade." }, 400);
    }

    let createdUser = null;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: name,
        role: "SIGNATURE_CUSTOMER",
        product: "SIGNATURE_SAAS",
      },
    });

    if (!createError) createdUser = created?.user || null;

    if (createError) {
      const alreadyExists = createError.status === 422 || /already|registered|exists/i.test(createError.message || "");
      if (!alreadyExists) throw createError;

      const supabase = createClient();
      const { data: existingAuth, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !existingAuth?.user) {
        return json({
          success: false,
          code: "ACCOUNT_ALREADY_EXISTS",
          message: "Este e-mail já possui uma conta. Entre com a senha atual para ativar o módulo de assinatura.",
        }, 409);
      }

      if (!existingAuth.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return json({
          success: false,
          code: "EMAIL_NOT_CONFIRMED",
          message: "Confirme seu e-mail antes de ativar o módulo de assinatura.",
        }, 401);
      }

      await provisionSignatureAccount(supabaseAdmin, {
        userId: existingAuth.user.id,
        email,
        name,
        phone,
      });

      return json({ success: true, activated: true, redirectTo: "/assinatura/app" });
    }

    if (!createdUser) throw new Error("Usuário não foi criado.");

    try {
      await provisionSignatureAccount(supabaseAdmin, {
        userId: createdUser.id,
        email,
        name,
        phone,
      });
    } catch (provisionError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.id).catch(() => null);
      throw provisionError;
    }

    let emailSent = true;
    try {
      await sendSignatureConfirmationEmail({ admin: supabaseAdmin, email, name });
    } catch (emailError) {
      emailSent = false;
      console.error("[Signature signup] Falha no e-mail de confirmação:", emailError);
    }

    return json({
      success: true,
      requiresConfirmation: true,
      emailSent,
      message: emailSent
        ? "Conta criada. Confira seu e-mail para ativar o acesso."
        : "Conta criada, mas o e-mail não pôde ser enviado agora. Solicite um novo link na tela de login.",
    }, 201);
  } catch (error) {
    console.error("[Signature signup] Erro:", error);
    return json({ success: false, message: "Não foi possível criar sua conta agora." }, 500);
  }
}


import { NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { isValidSignatureEmail, normalizeSignatureEmail } from "@/lib/signatureAuth";
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

  const ip = getSignatureRequestIp(request);
  const rate = enforceSignatureAuthRateLimit({
    scope: "signature-login",
    key: ip,
    limit: 5,
    windowMs: 15 * 60 * 1000,
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
    const email = normalizeSignatureEmail(body?.email);
    const password = String(body?.password || "");

    if (!isValidSignatureEmail(email) || !password) {
      return json({ success: false, message: "Informe e-mail e senha válidos." }, 400);
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      const emailNotConfirmed = error?.code === "email_not_confirmed" || /email.*confirm/i.test(error?.message || "");
      return json({
        success: false,
        code: emailNotConfirmed ? "EMAIL_NOT_CONFIRMED" : "INVALID_CREDENTIALS",
        message: emailNotConfirmed
          ? "Seu e-mail ainda não foi confirmado."
          : "E-mail ou senha inválidos.",
      }, 401);
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return json({ success: false, code: "EMAIL_NOT_CONFIRMED", message: "Seu e-mail ainda não foi confirmado." }, 401);
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("signature_accounts")
      .select("user_id, full_name, status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (accountError) throw accountError;

    if (!account) {
      await supabase.auth.signOut();
      return json({
        success: false,
        code: "SIGNATURE_ACCOUNT_REQUIRED",
        message: "Sua conta existe, mas o módulo de assinatura ainda não foi ativado.",
      }, 403);
    }

    if (account.status !== "ACTIVE") {
      await supabase.auth.signOut();
      return json({ success: false, code: "ACCOUNT_BLOCKED", message: "Esta conta está temporariamente indisponível." }, 403);
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("signature_organization_members")
      .select("organization_id, role, status")
      .eq("user_id", data.user.id)
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      await supabase.auth.signOut();
      throw membershipError || new Error("Organização da conta não encontrada.");
    }

    await supabaseAdmin.from("signature_account_audit_logs").insert({
      organization_id: membership.organization_id,
      actor_user_id: data.user.id,
      action: "LOGIN_SUCCESS",
      metadata: { member_role: membership.role },
    });

    const response = json({
      success: true,
      redirectTo: "/assinatura/app",
      user: { id: data.user.id, email: data.user.email, name: account.full_name },
    });

    response.cookies.set(
      "sj_login_time",
      Buffer.from(JSON.stringify({ loginAt: new Date().toISOString(), userId: data.user.id })).toString("base64"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 4 * 60 * 60,
        path: "/",
      },
    );

    return response;
  } catch (error) {
    console.error("[Signature login] Erro:", error);
    return json({ success: false, message: "Não foi possível acessar sua conta agora." }, 500);
  }
}


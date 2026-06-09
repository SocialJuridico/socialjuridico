"use server";

import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.socialjuridico.com.br";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

export async function forgotPasswordAction(email) {
  const genericResponse = {
    success: true,
    message:
      "Se o e-mail estiver cadastrado, você receberá um link de recuperação em breve.",
  };

  try {
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !normalizedEmail ||
      normalizedEmail.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return {
        success: false,
        message: "Informe um endereço de e-mail válido.",
      };
    }

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
      });

    if (linkError) {
      console.warn(
        "[Recuperação de senha] Não foi possível gerar o link:",
        linkError.message,
      );
      return genericResponse;
    }

    const hashedToken = linkData?.properties?.hashed_token;

    if (!hashedToken) {
      console.warn(
        "[Recuperação de senha] Token hash não retornado pelo Supabase.",
      );
      return genericResponse;
    }

    const recoveryUrl = new URL("/api/auth/recover-password", SITE_URL);
    recoveryUrl.searchParams.set("token_hash", hashedToken);
    recoveryUrl.searchParams.set("type", "recovery");

    const { error: resendError } = await resend.emails.send({
      from: RESEND_FROM,
      to: normalizedEmail,
      subject: "Redefinição de senha — Social Jurídico",
      html: `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width" />
            <title>Redefinição de senha</title>
          </head>
          <body style="margin:0;padding:24px;background:#111;color:#fff;font-family:Arial,sans-serif;">
            <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:#0d0f12;overflow:hidden;">
              <div style="padding:34px 36px;">
                <p style="margin:0 0 10px;color:#d4af37;font-size:12px;font-weight:700;letter-spacing:.08em;text-align:center;text-transform:uppercase;">Social Jurídico</p>
                <h1 style="margin:0;color:#fff;font-size:27px;line-height:1.25;text-align:center;">Redefinição de senha</h1>
                <p style="margin:25px 0 0;color:#d7d7d7;font-size:16px;line-height:1.65;">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <div style="margin:32px 0;text-align:center;">
                  <a href="${recoveryUrl.toString()}" style="display:inline-block;padding:14px 27px;border-radius:8px;color:#111;background:#d4af37;font-size:16px;font-weight:700;text-decoration:none;">Redefinir minha senha</a>
                </div>
                <p style="margin:0;color:#a8a8a8;font-size:13px;line-height:1.6;">O link possui validade limitada. Caso você não tenha solicitado a redefinição, ignore esta mensagem.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (resendError) {
      console.error("[Recuperação de senha] Erro no Resend:", resendError);
      return {
        success: false,
        message:
          "Não foi possível enviar o e-mail agora. Aguarde alguns minutos e tente novamente.",
      };
    }

    return genericResponse;
  } catch (error) {
    console.error("[Recuperação de senha] Erro inesperado:", error);
    return {
      success: false,
      message: "Não foi possível processar sua solicitação agora.",
    };
  }
}

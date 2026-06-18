import { resend } from "@/lib/resend";
import { resolveStaticPublicAppOrigin } from "@/lib/publicAppOrigin";

const RESEND_FROM = "Social Jurídico Assinatura <contato@socialjuridico.com.br>";

export function normalizeSignatureEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

export function normalizeSignatureName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export function normalizeSignaturePhone(value) {
  return String(value || "").replace(/[^0-9+()\-\s]/g, "").trim().slice(0, 30);
}

export function isValidSignatureEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateSignaturePassword(value) {
  const password = String(value || "");

  if (password.length < 10 || password.length > 128) {
    return "A senha deve possuir entre 10 e 128 caracteres.";
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use pelo menos uma letra maiúscula, uma minúscula e um número.";
  }

  return null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function confirmationEmailHtml({ name, confirmationUrl }) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(confirmationUrl);

  return `<!doctype html>
  <html lang="pt-BR">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Confirme sua conta</title></head>
    <body style="margin:0;padding:28px;background:#0b0c0e;color:#f5f5f3;font-family:Arial,sans-serif">
      <div style="max-width:620px;margin:0 auto;border:1px solid #3d3520;background:#111317">
        <div style="border-top:6px solid #d4af37;padding:34px">
          <p style="margin:0 0 24px;color:#efd874;font-size:13px;font-weight:bold;text-transform:uppercase">Social Jurídico Assinatura</p>
          <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2">Confirme seu e-mail</h1>
          <p style="color:#c8c8c5;font-size:16px;line-height:1.65">Olá, <strong>${safeName}</strong>.</p>
          <p style="color:#c8c8c5;font-size:16px;line-height:1.65">Confirme seu endereço para ativar o plano gratuito com 3 documentos por mês.</p>
          <div style="margin:32px 0;text-align:center">
            <a href="${safeUrl}" style="display:inline-block;padding:15px 26px;border-radius:6px;color:#111;background:#d4af37;text-decoration:none;font-weight:bold">Confirmar minha conta</a>
          </div>
          <p style="margin:0;color:#888;font-size:13px;line-height:1.55">Se você não solicitou esta conta, ignore esta mensagem. O link possui validade limitada.</p>
        </div>
      </div>
    </body>
  </html>`;
}

export async function sendSignatureConfirmationEmail({ admin, email, name }) {
  const origin = resolveStaticPublicAppOrigin();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    options: { redirectTo: `${origin}/assinatura/entrar` },
  });

  if (error) throw error;

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Token de confirmação não foi gerado.");

  const confirmationUrl = new URL("/api/assinatura/auth/confirmar", origin);
  confirmationUrl.searchParams.set("token_hash", tokenHash);
  confirmationUrl.searchParams.set("type", "signup");

  const { error: emailError } = await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: "Confirme sua conta no Social Jurídico Assinatura",
    html: confirmationEmailHtml({ name, confirmationUrl: confirmationUrl.toString() }),
  });

  if (emailError) throw emailError;
}

export async function provisionSignatureAccount(admin, { userId, email, name, phone }) {
  const { data, error } = await admin.rpc("provision_signature_account", {
    p_user_id: userId,
    p_email: email,
    p_full_name: name,
    p_phone: phone || null,
  });

  if (error) throw error;
  return data;
}


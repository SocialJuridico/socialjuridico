import { resend } from "@/lib/resend";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendDeletionCompletionEmail({ email, name }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return { sent: false, skipped: true };

  const safeName = escapeHtml(String(name || "").trim().slice(0, 160));
  const greeting = safeName ? `, ${safeName}` : "";

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: normalizedEmail,
    subject: "Exclusão da conta concluída — Social Jurídico",
    html: `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width" />
          <title>Exclusão da conta concluída</title>
        </head>
        <body style="margin:0;padding:24px;background:#111;color:#fff;font-family:Arial,sans-serif;">
          <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:#0d0f12;overflow:hidden;">
            <div style="padding:34px 36px;">
              <p style="margin:0 0 10px;color:#d4af37;font-size:12px;font-weight:700;letter-spacing:.08em;text-align:center;text-transform:uppercase;">Social Jurídico</p>
              <h1 style="margin:0;color:#fff;font-size:25px;line-height:1.25;text-align:center;">Exclusão concluída</h1>
              <p style="margin:25px 0 0;color:#d7d7d7;font-size:16px;line-height:1.65;">Olá${greeting}. Sua conta foi removida da plataforma e o acesso foi encerrado.</p>
              <p style="margin:14px 0 0;color:#d7d7d7;font-size:16px;line-height:1.65;">Alguns registros podem ser mantidos de forma restrita quando houver obrigação legal, fiscal, antifraude ou necessidade de defesa de direitos.</p>
              <p style="margin:26px 0 0;color:#737373;font-size:12px;line-height:1.5;text-align:center;">Esta é uma comunicação de confirmação do atendimento ao seu pedido.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(error.message || "Falha ao enviar confirmação por e-mail.");
  }

  return { sent: true, skipped: false };
}

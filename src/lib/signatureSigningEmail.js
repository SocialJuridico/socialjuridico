import { getSignatureResend } from "@/lib/signatureResend";

const FROM = "Social Jurídico Assinatura <contato@socialjuridico.com.br>";

async function deliver(payload) {
  const result = await getSignatureResend().emails.send(payload);
  if (result?.error) throw result.error;
  return result?.data;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailFrame({ preview, title, content, actionLabel, actionUrl, footer }) {
  const action = actionUrl
    ? `<div style="margin:30px 0;text-align:center"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 24px;border-radius:6px;color:#111;background:#d4af37;text-decoration:none;font-weight:bold">${escapeHtml(actionLabel)}</a></div>`
    : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(preview)}</title></head><body style="margin:0;padding:28px;background:#0b0c0e;color:#f5f5f3;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;border:1px solid #3d3520;background:#111317"><div style="border-top:6px solid #d4af37;padding:34px"><p style="margin:0 0 24px;color:#efd874;font-size:13px;font-weight:bold;text-transform:uppercase">Social Jurídico Assinatura</p><h1 style="margin:0 0 20px;font-size:27px;line-height:1.2">${escapeHtml(title)}</h1>${content}${action}<p style="margin:24px 0 0;color:#888;font-size:12px;line-height:1.55">${escapeHtml(footer)}</p></div></div></body></html>`;
}

export async function sendSignatureInvitationEmail({ recipient, envelope, organizationName, signingUrl }) {
  const requiresAction = recipient.role !== "COPY";
  const content = `<p style="color:#c8c8c5;font-size:16px;line-height:1.65">Olá, <strong>${escapeHtml(recipient.name)}</strong>.</p><p style="color:#c8c8c5;font-size:16px;line-height:1.65"><strong>${escapeHtml(organizationName)}</strong> enviou o documento <strong>${escapeHtml(envelope.title)}</strong> para você ${requiresAction ? "revisar e concluir eletronicamente" : "consultar"}.</p>${envelope.message ? `<div style="margin:20px 0;padding:14px;border-left:3px solid #d4af37;background:#17191c;color:#aaa;font-size:14px;line-height:1.55">${escapeHtml(envelope.message)}</div>` : ""}<p style="color:#999;font-size:13px;line-height:1.55">O acesso é individual. Para assinar ou aprovar, será enviado um código de segurança para este e-mail.</p>`;

  return deliver({
    from: FROM,
    to: recipient.email,
    subject: `${requiresAction ? "Assinatura solicitada" : "Documento compartilhado"}: ${envelope.title}`,
    html: emailFrame({
      preview: envelope.title,
      title: requiresAction ? "Você recebeu um documento para assinar" : "Você recebeu um documento",
      content,
      actionLabel: requiresAction ? "Revisar e assinar" : "Visualizar documento",
      actionUrl: signingUrl,
      footer: "Se você não reconhece o remetente, não prossiga e ignore esta mensagem.",
    }),
  });
}

export async function sendSignatureOtpEmail({ recipient, envelopeTitle, otpCode }) {
  const content = `<p style="color:#c8c8c5;font-size:16px;line-height:1.65">Olá, <strong>${escapeHtml(recipient.name)}</strong>.</p><p style="color:#c8c8c5;font-size:16px;line-height:1.65">Use o código abaixo para confirmar sua identidade e concluir o documento <strong>${escapeHtml(envelopeTitle)}</strong>.</p><div style="margin:28px 0;padding:18px;text-align:center;border:1px solid #3d3520;background:#0b0c0e;color:#efd874;font-size:32px;font-weight:bold;letter-spacing:9px">${escapeHtml(otpCode)}</div><p style="color:#999;font-size:13px;line-height:1.55">O código expira em 10 minutos e possui limite de tentativas.</p>`;

  return deliver({
    from: FROM,
    to: recipient.email,
    subject: `Código de assinatura: ${otpCode}`,
    html: emailFrame({
      preview: "Código de segurança",
      title: "Confirme sua identidade",
      content,
      footer: "Nunca compartilhe este código. O Social Jurídico não solicita códigos por telefone ou mensagem.",
    }),
  });
}

export async function sendSignatureCompletionEmail({ to, name, envelopeTitle, verificationCode, accessUrl }) {
  const content = `<p style="color:#c8c8c5;font-size:16px;line-height:1.65">Olá, <strong>${escapeHtml(name)}</strong>.</p><p style="color:#c8c8c5;font-size:16px;line-height:1.65">O documento <strong>${escapeHtml(envelopeTitle)}</strong> foi concluído por todos os participantes.</p><p style="color:#999;font-size:13px;line-height:1.55">Código de verificação: <strong style="color:#efd874">${escapeHtml(verificationCode)}</strong></p>`;

  return deliver({
    from: FROM,
    to,
    subject: `Documento concluído: ${envelopeTitle}`,
    html: emailFrame({
      preview: "Documento concluído",
      title: "Assinatura concluída",
      content,
      actionLabel: accessUrl ? "Baixar documento final" : null,
      actionUrl: accessUrl,
      footer: "Guarde o documento final e o código de verificação para consultas futuras.",
    }),
  });
}

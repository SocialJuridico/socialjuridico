// Templates de e-mail do fluxo de cadastro do Oráculo Acadêmico (ver
// oraculoJuridico.md). Mesma identidade visual dos demais e-mails
// transacionais: fundo escuro, dourado (#d4af37).

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wrapEmail({ eyebrow, title, bodyHtml }) {
  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#08090b;font-family:Arial,sans-serif;color:#ffffff;">
    <div style="max-width:600px;margin:0 auto;overflow:hidden;border:1px solid rgba(212,175,55,0.3);border-radius:14px;background:linear-gradient(145deg, #0d0f14 0%, #12151c 100%);">
      <div style="background:linear-gradient(135deg,#d4af37 0%,#b8962e 50%,#a07928 100%);padding:28px 36px;text-align:center;">
        <h1 style="margin:0;color:#0d0f12;font-size:20px;font-weight:800;letter-spacing:1px;">⚖️ SOCIAL JURÍDICO</h1>
        <p style="margin:6px 0 0;color:rgba(13,15,18,0.7);font-size:12px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(eyebrow)}</p>
      </div>
      <div style="padding:32px 36px;">
        ${bodyHtml}
      </div>
    </div>
  </body>
</html>`;
}

function button(url, label) {
  return `
    <div style="margin:28px 0;text-align:center;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;border-radius:8px;color:#111111;background:#d4af37;text-decoration:none;font-size:16px;font-weight:bold;">
        ${escapeHtml(label)}
      </a>
    </div>`;
}

const STATUS_COPY = {
  CADASTRO_INCOMPLETO: {
    label: "Cadastro recebido",
    color: "#94a3b8",
    text: "Recebemos os dados do seu cadastro.",
  },
  PENDENTE_DOCUMENTOS: {
    label: "Aguardando validação de documentos",
    color: "#facc15",
    text: "Seu comprovante/diploma está em análise pela nossa equipe.",
  },
  PENDENTE_SUPERVISOR: {
    label: "Aguardando aprovação de supervisor",
    color: "#facc15",
    text: "Falta pelo menos um advogado supervisor confirmar seu convite de padrinho.",
  },
  PENDENTE_ADMIN: {
    label: "Aguardando validação do admin",
    color: "#facc15",
    text: "Seu(s) supervisor(es) já confirmaram. Falta a validação final da nossa equipe.",
  },
  ATIVO: {
    label: "Ativo",
    color: "#4ade80",
    text: "Seu acesso ao Oráculo Acadêmico está liberado.",
  },
  SUSPENSO: {
    label: "Suspenso",
    color: "#fca5a5",
    text: "Seu cadastro foi suspenso.",
  },
  REPROVADO: {
    label: "Reprovado",
    color: "#fca5a5",
    text: "Seu cadastro não foi aprovado.",
  },
};

/**
 * E-mail enviado ao final das 5 etapas do cadastro do Oráculo, com o status
 * inicial (sempre PENDENTE_DOCUMENTOS neste ponto). Com `verifyUrl`, leva o
 * botão de confirmação de conta (link do Supabase); sem `verifyUrl` (fluxo
 * de ativação — a conta do ecossistema já existe e está confirmada), leva o
 * botão de acesso ao login do produto.
 */
export function oraculoAccountConfirmationTemplate({
  name,
  verifyUrl,
  activation = false,
}) {
  const status = STATUS_COPY.PENDENTE_DOCUMENTOS;
  const safeName = escapeHtml(name || "Oráculo");
  const loginUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.socialjuridico.com.br"
  }/oraculoacademico/login`;

  const intro = activation
    ? `Recebemos todas as etapas do seu cadastro no Oráculo Acadêmico e o
        vinculamos à sua conta já existente do ecossistema Social Jurídico.
        Seu acesso usa o e-mail e a senha que você já possui.`
    : `Recebemos todas as etapas do seu cadastro no Oráculo Acadêmico.
        Confirme seu e-mail para poder acompanhar o andamento da sua
        liberação.`;

  return wrapEmail({
    eyebrow: "CADASTRO DO ORÁCULO ACADÊMICO RECEBIDO",
    title: activation ? "Cadastro recebido" : "Confirme sua conta",
    bodyHtml: `
      <p style="margin:0;color:#ffffff;font-size:17px;line-height:1.6;">
        Olá, <strong style="color:#d4af37;">${safeName}</strong>!
      </p>
      <p style="margin:12px 0 0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.7;">
        ${intro}
      </p>
      <div style="margin:20px 0;padding:16px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:800;color:${status.color};border:1px solid ${status.color}55;">
          ${status.label}
        </span>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.65);font-size:13px;line-height:1.6;">
          ${status.text} Enviamos convites para os supervisores que você
          indicou; assim que pelo menos um confirmar e nossa equipe validar
          seus documentos, você vira Oráculo ativo.
        </p>
      </div>
      <div style="margin:0 0 20px;padding:14px 16px;border-radius:10px;border:1px solid rgba(250,204,21,0.35);background:rgba(250,204,21,0.06);">
        <p style="margin:0;color:#facc15;font-size:13px;line-height:1.6;">
          <strong>Importante:</strong> seu cadastro só será aceito se a sua
          instituição de ensino estiver participando do programa Oráculo
          Acadêmico. Se você indicou uma instituição nova, registramos a
          indicação e vamos entrar em contato com ela.
        </p>
      </div>
      ${
        verifyUrl
          ? button(verifyUrl, "Confirmar minha conta")
          : button(loginUrl, "Acessar minha conta")
      }
      <p style="margin:0;color:#a8a8a8;font-size:13px;line-height:1.55;text-align:center;">
        ${
          verifyUrl
            ? "O link possui validade limitada. Caso você não tenha solicitado este cadastro, ignore esta mensagem."
            : "Caso você não tenha solicitado este cadastro, entre em contato com nossa equipe."
        }
      </p>`,
  });
}

/**
 * E-mail de convite enviado ao advogado supervisor ("padrinho"), para o
 * e-mail que o próprio Oráculo cadastrou para ele.
 */
export function oraculoSupervisorInviteTemplate({
  supervisorName,
  oraculoName,
  relacaoLabel,
  acceptUrl,
}) {
  return wrapEmail({
    eyebrow: "CONVITE PARA SER SUPERVISOR",
    title: "Convite de supervisor — Oráculo Acadêmico",
    bodyHtml: `
      <p style="margin:0;color:#ffffff;font-size:17px;line-height:1.6;">
        Olá, <strong style="color:#d4af37;">${escapeHtml(supervisorName || "Advogado(a)")}</strong>!
      </p>
      <p style="margin:12px 0 0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.7;">
        <strong style="color:#d4af37;">${escapeHtml(oraculoName || "Um estudante")}</strong>
        indicou você como supervisor (padrinho) no programa Oráculo Acadêmico
        do Social Jurídico, na relação: <strong>${escapeHtml(relacaoLabel || "Não informada")}</strong>.
      </p>
      <p style="margin:12px 0 0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.7;">
        Ao aceitar, você confirma que pode acompanhar/supervisionar esse
        candidato. A confirmação é necessária para a liberação do acesso dele
        à plataforma.
      </p>
      ${button(acceptUrl, "Ver convite e responder")}`,
  });
}

/**
 * E-mail enviado ao Oráculo após decisão do admin (aprovar/rejeitar/
 * suspender), avisando que já pode tentar acessar a conta.
 */
export function oraculoAdminDecisionTemplate({ name, status, motivo }) {
  const copy = STATUS_COPY[status] || STATUS_COPY.PENDENTE_DOCUMENTOS;
  const safeName = escapeHtml(name || "Oráculo");
  const loginUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.socialjuridico.com.br"
  }/oraculoacademico/login`;

  return wrapEmail({
    eyebrow: "ATUALIZAÇÃO DO SEU CADASTRO",
    title: `Seu cadastro está: ${copy.label}`,
    bodyHtml: `
      <p style="margin:0;color:#ffffff;font-size:17px;line-height:1.6;">
        Olá, <strong style="color:#d4af37;">${safeName}</strong>!
      </p>
      <div style="margin:16px 0;padding:16px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:800;color:${copy.color};border:1px solid ${copy.color}55;">
          ${copy.label}
        </span>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.65);font-size:13px;line-height:1.6;">
          ${copy.text}
        </p>
        ${
          motivo
            ? `<p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:13px;line-height:1.6;"><strong>Motivo:</strong> ${escapeHtml(motivo)}</p>`
            : ""
        }
      </div>
      ${button(loginUrl, "Acessar minha conta")}`,
  });
}

export function oraculoInstitutionInviteTemplate({
  invitedName,
  institutionName,
  roleLabel,
  inviteUrl,
  expiresAt,
}) {
  const expires = expiresAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
        new Date(expiresAt),
      )
    : "em breve";

  return wrapEmail({
    eyebrow: "ACESSO INSTITUCIONAL",
    title: "Convite para o Oraculo Academico",
    bodyHtml: `
      <p style="margin:0;color:#ffffff;font-size:17px;line-height:1.6;">
        Ola, <strong style="color:#d4af37;">${escapeHtml(invitedName || "convidado(a)")}</strong>!
      </p>
      <p style="margin:12px 0 0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.7;">
        Voce foi convidado para acessar o dashboard institucional do
        <strong style="color:#d4af37;">Oraculo Academico</strong>.
      </p>
      <div style="margin:20px 0;padding:16px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
        <p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.7;">
          <strong>Instituicao:</strong> ${escapeHtml(institutionName || "")}<br />
          <strong>Perfil:</strong> ${escapeHtml(roleLabel || "")}<br />
          <strong>Validade:</strong> ${escapeHtml(expires)}
        </p>
      </div>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;line-height:1.7;">
        O acesso e individual. Nao compartilhamos senha por e-mail e o Social
        Juridico nao visualiza sua senha. Use o link abaixo para aceitar o
        convite e definir suas credenciais.
      </p>
      ${button(inviteUrl, "Aceitar convite")}
      <p style="margin:0;color:#a8a8a8;font-size:13px;line-height:1.55;text-align:center;">
        Se voce nao reconhece este convite, ignore esta mensagem.
      </p>`,
  });
}

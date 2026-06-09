import { NextResponse } from "next/server";

import { resend } from "@/lib/resend";

const CONTACT_EMAIL = "socialjuridico3@gmail.com";
const EMAIL_FROM =
  "Social Jurídico <contato@socialjuridico.com.br>";

const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const requestStore = new Map();

const allowedSubjects = {
  suporte: "Suporte técnico",
  cadastro: "Cadastro ou acesso à conta",
  financeiro: "Financeiro, planos ou pagamentos",
  advogado: "Cadastro ou validação de advogado",
  privacidade: "Privacidade e proteção de dados",
  exclusao: "Exclusão de conta ou dados",
  parceria: "Parcerias e imprensa",
  seguranca: "Segurança ou denúncia",
  outro: "Outro assunto",
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRequestIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = requestStore.get(ip);

  if (
    !current ||
    now - current.windowStartedAt > RATE_LIMIT_WINDOW_MS
  ) {
    requestStore.set(ip, {
      count: 1,
      windowStartedAt: now,
    });

    return false;
  }

  current.count += 1;
  requestStore.set(ip, current);

  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function createEmailHtml({
  name,
  email,
  phone,
  subjectLabel,
  message,
  ip,
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Não informado");
  const safeSubject = escapeHtml(subjectLabel);
  const safeMessage = escapeHtml(message).replaceAll(
    "\n",
    "<br />",
  );
  const safeIp = escapeHtml(ip);

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Nova mensagem de contato</title>
      </head>

      <body style="margin:0;padding:0;background:#111111;font-family:Arial,sans-serif;color:#f5f5f5;">
        <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
          <div style="border:1px solid rgba(212,175,55,.28);border-radius:16px;overflow:hidden;background:#1a1a1a;">
            <div style="padding:24px;background:#151515;border-bottom:1px solid rgba(212,175,55,.18);">
              <p style="margin:0 0 8px;color:#d4af37;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">
                Social Jurídico
              </p>

              <h1 style="margin:0;color:#ffffff;font-size:22px;">
                Nova mensagem pelo formulário de contato
              </h1>
            </div>

            <div style="padding:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:9px 0;color:#999999;width:150px;">
                    Nome
                  </td>

                  <td style="padding:9px 0;color:#ffffff;font-weight:600;">
                    ${safeName}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 0;color:#999999;">
                    E-mail
                  </td>

                  <td style="padding:9px 0;">
                    <a
                      href="mailto:${safeEmail}"
                      style="color:#d4af37;text-decoration:none;"
                    >
                      ${safeEmail}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 0;color:#999999;">
                    Telefone
                  </td>

                  <td style="padding:9px 0;color:#ffffff;">
                    ${safePhone}
                  </td>
                </tr>

                <tr>
                  <td style="padding:9px 0;color:#999999;">
                    Assunto
                  </td>

                  <td style="padding:9px 0;color:#ffffff;">
                    ${safeSubject}
                  </td>
                </tr>
              </table>

              <div style="margin-top:22px;padding:18px;border-radius:12px;background:#111111;border:1px solid rgba(255,255,255,.07);">
                <p style="margin:0 0 10px;color:#d4af37;font-size:12px;font-weight:700;text-transform:uppercase;">
                  Mensagem
                </p>

                <p style="margin:0;color:#dddddd;font-size:15px;line-height:1.65;">
                  ${safeMessage}
                </p>
              </div>

              <p style="margin:22px 0 0;color:#777777;font-size:11px;">
                IP de origem: ${safeIp}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request) {
  try {
    const ip = getRequestIp(request);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Muitas mensagens foram enviadas em pouco tempo. Aguarde alguns minutos e tente novamente.",
        },
        {
          status: 429,
        },
      );
    }

    const body = await request.json();

    const name = normalizeText(body?.name);
    const email = normalizeText(body?.email).toLowerCase();
    const phone = normalizeText(body?.phone);
    const subject = normalizeText(body?.subject);
    const message = normalizeText(body?.message);
    const website = normalizeText(body?.website);

    // Campo invisível preenchido normalmente indica automação.
    if (website) {
      return NextResponse.json({
        success: true,
        message: "Mensagem recebida.",
      });
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Informe um nome válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidEmail(email) || email.length > 160) {
      return NextResponse.json(
        {
          success: false,
          message: "Informe um endereço de e-mail válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (phone.length > 30) {
      return NextResponse.json(
        {
          success: false,
          message: "O telefone informado é inválido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Object.hasOwn(allowedSubjects, subject)) {
      return NextResponse.json(
        {
          success: false,
          message: "Selecione um assunto válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (message.length < 10 || message.length > 4000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A mensagem deve possuir entre 10 e 4.000 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    const subjectLabel = allowedSubjects[subject];

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [CONTACT_EMAIL],
      replyTo: email,
      subject: `[CONTATO] ${subjectLabel} — ${name}`,
      html: createEmailHtml({
        name,
        email,
        phone,
        subjectLabel,
        message,
        ip,
      }),
    });

    if (error) {
      console.error("[Contato] Erro no Resend:", error);

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível enviar sua mensagem agora. Tente novamente ou utilize um dos nossos WhatsApps.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mensagem enviada com sucesso.",
      id: data?.id || null,
    });
  } catch (error) {
    console.error("[Contato] Erro inesperado:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro ao processar sua mensagem. Tente novamente.",
      },
      {
        status: 500,
      },
    );
  }
}
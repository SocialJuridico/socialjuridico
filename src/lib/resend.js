import { Resend } from "resend";

import { sanitizeEmailPayloadPublicUrls } from "./emailPublicUrlSafety";
import { supabaseAdmin } from "./supabase";

const rawResend = new Resend(process.env.RESEND_API_KEY);

async function transformAndLogPayload(inputPayload) {
  const payload = sanitizeEmailPayloadPublicUrls(inputPayload);

  if (!payload || !payload.to) {
    return payload;
  }

  try {
    const trackId = crypto.randomUUID
      ? crypto.randomUUID()
      : require("crypto").randomUUID();

    let toEmail = "";
    if (Array.isArray(payload.to)) {
      toEmail = payload.to.join(", ");
    } else if (typeof payload.to === "string") {
      toEmail = payload.to;
    }

    let singleEmail = toEmail;
    if (toEmail.includes(",")) {
      singleEmail = toEmail.split(",")[0].trim();
    }

    const existingTrackMatch = (payload.html || "").match(
      /trackId=([a-f0-9-]{36})/i,
    );

    if (existingTrackMatch) {
      return payload;
    }

    let html = payload.html || "";
    const hasHtml = typeof html === "string" && html.length > 0;

    if (hasHtml) {
      const trackingPixel = `<img src="https://www.socialjuridico.com.br/api/track/open?trackId=${trackId}" width="1" height="1" alt="" style="display:none;" />`;

      if (html.includes("</body>")) {
        html = html.replace("</body>", `${trackingPixel}</body>`);
      } else {
        html += trackingPixel;
      }

      const hrefRegex = /href="((https?):\/\/[^\"]+)"/g;

      html = html.replace(hrefRegex, (match, url) => {
        if (
          url.includes("/api/track/click") ||
          url.includes("/api/track/open")
        ) {
          return match;
        }

        let parsedUrl;

        try {
          parsedUrl = new URL(url);
        } catch {
          return match;
        }

        const isSupabaseAuthLink =
          parsedUrl.hostname.endsWith(".supabase.co") &&
          parsedUrl.pathname.includes("/auth/v1/verify");

        const isSensitiveAuthLink =
          isSupabaseAuthLink ||
          parsedUrl.pathname.includes("/api/auth/confirm-email") ||
          parsedUrl.pathname.includes("/api/auth/recover-password") ||
          parsedUrl.pathname.includes("/atualizar-senha") ||
          parsedUrl.pathname.includes("/confirmar-email");

        if (isSensitiveAuthLink) {
          return match;
        }

        const trackingUrl = new URL(
          "/api/track/click",
          "https://www.socialjuridico.com.br",
        );

        trackingUrl.searchParams.set("trackId", trackId);
        trackingUrl.searchParams.set("dest", url);

        return `href="${trackingUrl.toString()}"`;
      });
    }

    let emailType = "SISTEMA";
    const subjectUpper = (payload.subject || "").toUpperCase();

    if (subjectUpper.includes("INTERESSE")) emailType = "INTERESSE";
    else if (
      subjectUpper.includes("BEM-VINDO") ||
      subjectUpper.includes("CADASTRO") ||
      subjectUpper.includes("CONFIRME")
    ) {
      emailType = "CADASTRO";
    } else if (
      subjectUpper.includes("SENHA") ||
      subjectUpper.includes("RECUPER")
    ) {
      emailType = "SENHA";
    } else if (
      subjectUpper.includes("PAGAMENTO") ||
      subjectUpper.includes("ASSINATURA") ||
      subjectUpper.includes("FATURA") ||
      subjectUpper.includes("CUPOM") ||
      subjectUpper.includes("CREDITADO") ||
      subjectUpper.includes("VENDA")
    ) {
      emailType = "FINANCEIRO";
    } else if (
      subjectUpper.includes("MENSAGEM") ||
      subjectUpper.includes("CONVERSA") ||
      subjectUpper.includes("CHAT")
    ) {
      emailType = "CHAT";
    } else if (subjectUpper.includes("CRM")) emailType = "CRM";
    else if (
      subjectUpper.includes("JURI") ||
      subjectUpper.includes("SALDO")
    ) {
      emailType = "JURIS";
    } else if (
      subjectUpper.includes("AVISO") ||
      subjectUpper.includes("ALERTA") ||
      subjectUpper.includes("ATENÇÃO")
    ) {
      emailType = "AVISO";
    } else if (
      subjectUpper.includes("COMUNICADO") ||
      subjectUpper.includes("ADMIN")
    ) {
      emailType = "ADMIN";
    }

    let dbUserId = null;
    let dbClientId = null;

    if (supabaseAdmin && singleEmail) {
      try {
        const { data: client } = await supabaseAdmin
          .from("clientes")
          .select("id")
          .eq("email", singleEmail.toLowerCase())
          .maybeSingle();

        if (client) {
          dbUserId = client.id;
          dbClientId = client.id;
        } else {
          const { data: lawyer } = await supabaseAdmin
            .from("advogados")
            .select("id")
            .eq("email", singleEmail.toLowerCase())
            .maybeSingle();

          if (lawyer) {
            dbUserId = lawyer.id;
          }
        }
      } catch (dbErr) {
        console.error("Error looking up user by email:", dbErr);
      }
    }

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("email_tracking_logs").insert([
          {
            id: trackId,
            recipient_email: toEmail,
            email_type: emailType,
            sent_at: new Date().toISOString(),
            destination_url: null,
            user_id: dbUserId,
            client_id: dbClientId,
          },
        ]);
      } catch (logErr) {
        console.error("Error logging email tracking in DB:", logErr);
      }
    }

    return {
      ...payload,
      html: hasHtml ? html : payload.html,
    };
  } catch (err) {
    console.error("Error in transformAndLogPayload:", err);
    return payload;
  }
}

export const resend = {
  ...rawResend,
  emails: {
    ...rawResend.emails,
    send: async function (payload) {
      const safePayload = sanitizeEmailPayloadPublicUrls(payload);
      try {
        const transformed = await transformAndLogPayload(safePayload);
        return await rawResend.emails.send(transformed);
      } catch (err) {
        console.error("Error in resend.emails.send wrapper:", err);
        return await rawResend.emails.send(safePayload);
      }
    },
  },
  batch: {
    ...rawResend.batch,
    send: async function (payloads) {
      const safePayloads = Array.isArray(payloads)
        ? payloads.map((payload) => sanitizeEmailPayloadPublicUrls(payload))
        : sanitizeEmailPayloadPublicUrls(payloads);

      try {
        if (!Array.isArray(safePayloads)) {
          const transformed = await transformAndLogPayload(safePayloads);
          return await rawResend.batch.send(transformed);
        }

        const transformedPayloads = [];

        for (const payload of safePayloads) {
          const transformed = await transformAndLogPayload(payload);
          transformedPayloads.push(transformed);
        }

        return await rawResend.batch.send(transformedPayloads);
      } catch (err) {
        console.error("Error in resend.batch.send wrapper:", err);
        return await rawResend.batch.send(safePayloads);
      }
    },
  },
};

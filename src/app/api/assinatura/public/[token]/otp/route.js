import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getSignatureProductRequestEvidence,
  signatureProductJson,
} from "@/lib/signatureProductServer";
import {
  generateSignatureOtp,
  hashSignatureOtp,
  loadPublicSignatureContext,
} from "@/lib/signatureSigningServer";
import { sendSignatureOtpEmail } from "@/lib/signatureSigningEmail";
import {
  enforceSignatureAuthRateLimit,
  getSignatureRequestIp,
} from "@/lib/signatureAuthRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  try {
    if (!supabaseAdmin) return signatureProductJson({ success: false, message: "Serviço indisponível." }, 503);
    const { token } = await params;
    const context = await loadPublicSignatureContext(supabaseAdmin, token);
    if (!context) return signatureProductJson({ success: false, message: "Convite inválido ou substituído." }, 404);

    if (!context.envelope || !["SENT", "IN_PROGRESS"].includes(context.envelope.status)) {
      return signatureProductJson({ success: false, message: "Este documento não está disponível para assinatura." }, 409);
    }
    if (context.envelope.expires_at && Date.now() > Date.parse(context.envelope.expires_at)) {
      return signatureProductJson({ success: false, message: "Este convite expirou." }, 410);
    }
    if (!["SIGNER", "APPROVER"].includes(context.recipient.role)) {
      return signatureProductJson({ success: false, message: "Este convite é somente para consulta." }, 409);
    }
    if (context.recipient.status === "COMPLETED") {
      return signatureProductJson({ success: false, message: "Sua participação já foi concluída." }, 409);
    }

    const rate = enforceSignatureAuthRateLimit({
      scope: "public-signature-otp",
      key: `${getSignatureRequestIp(request)}:${context.recipient.id}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return signatureProductJson(
        { success: false, message: "Muitos códigos solicitados. Aguarde antes de tentar novamente." },
        429,
        { "Retry-After": String(rate.retryAfter) },
      );
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("signature_recipients")
      .select("otp_last_sent_at")
      .eq("id", context.recipient.id)
      .single();
    if (currentError) throw currentError;
    const lastSentAt = Date.parse(current.otp_last_sent_at || "");
    if (Number.isFinite(lastSentAt) && Date.now() - lastSentAt < 60 * 1000) {
      return signatureProductJson({ success: false, message: "Aguarde um minuto antes de solicitar outro código." }, 429);
    }

    const otpCode = generateSignatureOtp();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("signature_recipients")
      .update({
        otp_hash: hashSignatureOtp(context.recipient.id, otpCode),
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        otp_last_sent_at: now,
        viewed_at: context.recipient.viewed_at || now,
        status: context.recipient.status === "INVITED" ? "VIEWED" : context.recipient.status,
      })
      .eq("id", context.recipient.id)
      .eq("access_token_hash", context.tokenHash);
    if (updateError) throw updateError;

    const evidence = getSignatureProductRequestEvidence(request);
    try {
      await sendSignatureOtpEmail({
        recipient: context.recipient,
        envelopeTitle: context.envelope.title,
        otpCode,
      });
      await supabaseAdmin.from("signature_evidence_events").insert({
        organization_id: context.envelope.organization_id,
        envelope_id: context.envelope.id,
        recipient_id: context.recipient.id,
        event_type: "OTP_SENT",
        ip_hash: evidence.ipHash,
        user_agent: evidence.userAgent,
        payload: { expires_in_seconds: 600 },
      });
    } catch (emailError) {
      await supabaseAdmin
        .from("signature_recipients")
        .update({ otp_hash: null, otp_expires_at: null })
        .eq("id", context.recipient.id);
      await supabaseAdmin.from("signature_evidence_events").insert({
        organization_id: context.envelope.organization_id,
        envelope_id: context.envelope.id,
        recipient_id: context.recipient.id,
        event_type: "OTP_SENT",
        outcome: "FAILURE",
        ip_hash: evidence.ipHash,
        user_agent: evidence.userAgent,
        payload: { reason: "email_delivery_failed" },
      });
      console.error("[Public signature OTP email]", emailError);
      return signatureProductJson({ success: false, message: "Não foi possível enviar o código agora." }, 502);
    }

    return signatureProductJson({
      success: true,
      message: `Código enviado para ${context.recipient.email.slice(0, 2)}***@${context.recipient.email.split("@")[1]}.`,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("[Public signature OTP]", error);
    return signatureProductJson({ success: false, message: "Não foi possível enviar o código." }, 500);
  }
}

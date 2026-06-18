import { hasTrustedMutationOrigin, resolvePublicAppOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getSignatureProductRequestEvidence,
  signatureProductJson,
} from "@/lib/signatureProductServer";
import {
  ensureFinalSignatureDocument,
  loadPublicSignatureContext,
  serializePublicSignatureContext,
  verifySignatureOtpHash,
  applyRecipientSignature,
} from "@/lib/signatureSigningServer";
import { sendSignatureCompletionEmail } from "@/lib/signatureSigningEmail";
import {
  enforceSignatureAuthRateLimit,
  getSignatureRequestIp,
} from "@/lib/signatureAuthRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request, { params }) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  try {
    if (!supabaseAdmin) return signatureProductJson({ success: false, message: "Serviço indisponível." }, 503);
    const { token } = await params;
    const context = await loadPublicSignatureContext(supabaseAdmin, token);
    if (!context) return signatureProductJson({ success: false, message: "Convite inválido ou substituído." }, 404);

    const body = await request.json();
    const code = String(body?.code || "").trim();
    const documentHash = String(body?.documentHash || "").trim().toLowerCase();
    const original = context.documents.find((document) => document.document_kind === "ORIGINAL");

    if (body?.accepted !== true) {
      return signatureProductJson({ success: false, message: "Confirme o aceite eletrônico para continuar." }, 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return signatureProductJson({ success: false, message: "Informe o código de 6 dígitos." }, 400);
    }
    if (!original || documentHash !== original.sha256) {
      return signatureProductJson({ success: false, message: "A versão do documento mudou. Atualize a página." }, 409);
    }
    if (!["SENT", "IN_PROGRESS"].includes(context.envelope.status)) {
      if (context.recipient.status === "COMPLETED") {
        return signatureProductJson({ success: true, data: serializePublicSignatureContext(context) });
      }
      return signatureProductJson({ success: false, message: "Este documento não está disponível para assinatura." }, 409);
    }
    if (context.envelope.expires_at && Date.now() > Date.parse(context.envelope.expires_at)) {
      return signatureProductJson({ success: false, message: "Este convite expirou." }, 410);
    }
    if (!["SIGNER", "APPROVER"].includes(context.recipient.role)) {
      return signatureProductJson({ success: false, message: "Este convite é somente para consulta." }, 409);
    }

    const rate = enforceSignatureAuthRateLimit({
      scope: "public-signature-confirm",
      key: `${getSignatureRequestIp(request)}:${context.recipient.id}`,
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return signatureProductJson(
        { success: false, message: "Muitas tentativas. Aguarde antes de tentar novamente." },
        429,
        { "Retry-After": String(rate.retryAfter) },
      );
    }

    const { data: security, error: securityError } = await supabaseAdmin
      .from("signature_recipients")
      .select("otp_hash, otp_expires_at, otp_attempts")
      .eq("id", context.recipient.id)
      .eq("access_token_hash", context.tokenHash)
      .single();
    if (securityError) throw securityError;

    const attempts = Number(security.otp_attempts || 0);
    if (!security.otp_hash || !security.otp_expires_at) {
      return signatureProductJson({ success: false, message: "Solicite um novo código de segurança." }, 400);
    }
    if (attempts >= MAX_OTP_ATTEMPTS) {
      return signatureProductJson({ success: false, message: "Código bloqueado. Solicite um novo código." }, 423);
    }
    if (Date.now() > Date.parse(security.otp_expires_at)) {
      return signatureProductJson({ success: false, message: "O código expirou. Solicite um novo." }, 410);
    }

    const evidence = getSignatureProductRequestEvidence(request);
    if (!verifySignatureOtpHash(context.recipient.id, code, security.otp_hash)) {
      const nextAttempts = attempts + 1;
      await supabaseAdmin
        .from("signature_recipients")
        .update({ otp_attempts: nextAttempts })
        .eq("id", context.recipient.id);
      await supabaseAdmin.from("signature_evidence_events").insert({
        organization_id: context.envelope.organization_id,
        envelope_id: context.envelope.id,
        recipient_id: context.recipient.id,
        event_type: "OTP_REJECTED",
        outcome: nextAttempts >= MAX_OTP_ATTEMPTS ? "BLOCKED" : "FAILURE",
        ip_hash: evidence.ipHash,
        user_agent: evidence.userAgent,
        payload: { attempt: nextAttempts },
      });
      return signatureProductJson(
        { success: false, message: nextAttempts >= MAX_OTP_ATTEMPTS ? "Código bloqueado. Solicite um novo." : "Código inválido." },
        nextAttempts >= MAX_OTP_ATTEMPTS ? 423 : 401,
      );
    }

    const stampPage = body?.stampPage ? parseInt(body.stampPage, 10) : null;
    const stampX = body?.stampX !== undefined && body?.stampX !== null ? parseFloat(body.stampX) : null;
    const stampY = body?.stampY !== undefined && body?.stampY !== null ? parseFloat(body.stampY) : null;

    const { error: updateCoordsError } = await supabaseAdmin
      .from("signature_recipients")
      .update({
        stamp_page: stampPage,
        stamp_x: stampX,
        stamp_y: stampY,
      })
      .eq("id", context.recipient.id);
    if (updateCoordsError) throw updateCoordsError;

    const { data: completion, error: completionError } = await supabaseAdmin.rpc(
      "complete_signature_recipient",
      {
        p_recipient_id: context.recipient.id,
        p_access_token_hash: context.tokenHash,
        p_signed_name: context.recipient.name,
        p_ip_hash: evidence.ipHash,
        p_user_agent: evidence.userAgent,
        p_acceptance_version: "v1",
      },
    );
    if (completionError) throw completionError;

    // Apply the visual stamp progressively
    await applyRecipientSignature(supabaseAdmin, context.envelope.id, context.recipient.id);

    let finalAvailable = false;
    let finalizationPending = false;
    if (completion?.completed) {
      try {
        await ensureFinalSignatureDocument(supabaseAdmin, context.envelope.id);
        finalAvailable = true;

        const [{ data: recipients }, { data: owner }] = await Promise.all([
          supabaseAdmin
            .from("signature_recipients")
            .select("id, name, email")
            .eq("envelope_id", context.envelope.id),
          supabaseAdmin
            .from("signature_accounts")
            .select("full_name, email")
            .eq("user_id", context.envelope.created_by || "00000000-0000-0000-0000-000000000000")
            .maybeSingle(),
        ]);

        const origin = resolvePublicAppOrigin(request);
        const messages = (recipients || []).map((recipient) =>
          sendSignatureCompletionEmail({
            to: recipient.email,
            name: recipient.name,
            envelopeTitle: context.envelope.title,
            verificationCode: context.envelope.verification_code,
            accessUrl: recipient.id === context.recipient.id ? `${origin}/assinar/${encodeURIComponent(context.token)}` : null,
          }),
        );
        if (owner?.email && !(recipients || []).some((recipient) => recipient.email === owner.email)) {
          messages.push(
            sendSignatureCompletionEmail({
              to: owner.email,
              name: owner.full_name,
              envelopeTitle: context.envelope.title,
              verificationCode: context.envelope.verification_code,
              accessUrl: `${origin}/assinatura/app`,
            }),
          );
        }
        const emailResults = await Promise.allSettled(messages);
        await supabaseAdmin.from("signature_evidence_events").insert({
          organization_id: context.envelope.organization_id,
          envelope_id: context.envelope.id,
          recipient_id: context.recipient.id,
          event_type: "COMPLETION_EMAIL_SENT",
          outcome: emailResults.some((result) => result.status === "rejected") ? "FAILURE" : "SUCCESS",
          payload: {
            sent: emailResults.filter((result) => result.status === "fulfilled").length,
            failed: emailResults.filter((result) => result.status === "rejected").length,
          },
        });
      } catch (finalError) {
        finalizationPending = true;
        console.error("[Public signature finalization]", finalError);
      }
    }

    const refreshed = await loadPublicSignatureContext(supabaseAdmin, token);
    return signatureProductJson({
      success: true,
      data: serializePublicSignatureContext(refreshed),
      completed: Boolean(completion?.completed),
      finalAvailable: finalAvailable || Boolean(refreshed.documents.find((document) => document.document_kind === "FINAL")),
      finalizationPending,
      message: completion?.completed
        ? finalizationPending
          ? "Assinatura concluída. O documento final está sendo processado."
          : "Todas as assinaturas foram concluídas."
        : "Sua participação foi concluída com sucesso.",
    });
  } catch (error) {
    console.error("[Public signature confirmation]", error);
    const migrationMissing = ["42883", "PGRST202"].includes(error?.code);
    return signatureProductJson(
      {
        success: false,
        code: migrationMissing ? "MIGRATION_REQUIRED" : "SIGN_FAILED",
        message: migrationMissing
          ? "O fluxo de assinatura ainda precisa ser aplicado ao banco."
          : "Não foi possível concluir a assinatura agora.",
      },
      migrationMissing ? 503 : 500,
    );
  }
}

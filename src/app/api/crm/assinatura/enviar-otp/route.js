import crypto from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase";
import {
  getScopedSignature,
  hasValidSignatureMutationOrigin,
  recordPublicSignatureAudit,
  recordSignatureAudit,
  requireDigitalSignatureAccess,
  sendSignatureInvitation,
  sendSignatureOtp,
  signatureJson,
  signatureOtpHash,
  signatureServerFailure,
} from "@/lib/digitalSignatures/signatureServer";
import {
  isValidSignatureUuid,
  normalizeSignatureRole,
  parseSignatureMetadata,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    if (!hasValidSignatureMutationOrigin(request)) {
      return signatureJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const body = await request.json();
    const signatureId = String(body.signature_id || "");
    const role = normalizeSignatureRole(body.role);
    if (!isValidSignatureUuid(signatureId) || !role) {
      return signatureJson(
        { success: false, message: "Dados da assinatura inválidos." },
        400,
      );
    }

    if (body.is_otp_request !== true) {
      const access = await requireDigitalSignatureAccess(request);
      if (!access.ok) return access.response;
      const signature = await getScopedSignature(access, signatureId);
      if (!signature) {
        return signatureJson(
          { success: false, message: "Processo de assinatura não encontrado." },
          404,
        );
      }
      await sendSignatureInvitation({ signature, role });
      await recordSignatureAudit(access, request, {
        requestId: crypto.randomUUID(),
        signatureId,
        action: "RESEND_INVITATION",
        metadata: { role, source: "legacy" },
      });
      return signatureJson({
        success: true,
        message: "Convite reenviado com sucesso.",
      });
    }

    const { data: signature, error } = await supabaseAdmin
      .from("assinaturas_digitais")
      .select("id, lawyer_id, document_name, status, metadata, updated_at")
      .eq("id", signatureId)
      .maybeSingle();
    if (error) throw error;
    if (!signature) {
      return signatureJson(
        { success: false, message: "Processo de assinatura não encontrado." },
        404,
      );
    }

    const metadata = parseSignatureMetadata(signature.metadata);
    const party = metadata[role];
    if (!party?.email) {
      return signatureJson(
        { success: false, message: "Signatário não encontrado." },
        400,
      );
    }
    if (party.signed) {
      return signatureJson(
        { success: false, message: "Este documento já foi assinado por você." },
        409,
      );
    }

    const lastSentAt = Date.parse(party.otp_last_sent_at || "");
    if (Number.isFinite(lastSentAt) && Date.now() - lastSentAt < 60_000) {
      return signatureJson(
        {
          success: false,
          message: "Aguarde um minuto antes de solicitar um novo código.",
        },
        429,
      );
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const now = new Date().toISOString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    metadata[role] = {
      ...party,
      otp: null,
      otp_hash: signatureOtpHash(signatureId, role, otpCode),
      otp_expires: otpExpires,
      otp_attempts: 0,
      otp_last_sent_at: now,
    };
    metadata.history = Array.isArray(metadata.history) ? metadata.history : [];
    metadata.history.push({
      event: `otp_sent_${role}`,
      timestamp: now,
      details: "Código temporário enviado ao e-mail do signatário.",
    });

    const { error: updateError } = await supabaseAdmin
      .from("assinaturas_digitais")
      .update({ metadata, updated_at: now })
      .eq("id", signatureId)
      .eq("updated_at", signature.updated_at);
    if (updateError) throw updateError;

    await sendSignatureOtp({ signature: { ...signature, metadata }, role, otpCode });
    await recordPublicSignatureAudit(request, signature, "OTP_SENT", { role });

    return signatureJson({
      success: true,
      message: "Código enviado com segurança.",
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error("[CRM/Assinatura/EnviarOTP] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível enviar o código de verificação.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}

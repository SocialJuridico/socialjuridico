import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  requireSignatureProductAccess,
  signatureProductJson,
} from "@/lib/signatureProductServer";
import {
  generateSignatureAccessToken,
  hashSignatureAccessToken,
} from "@/lib/signatureSigningServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) {
      return signatureProductJson({ success: false, message: "Envelope inválido." }, 400);
    }

    const { data: envelope, error: envelopeError } = await access.db
      .from("signature_envelopes")
      .select("id, status, expires_at")
      .eq("id", id)
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (envelopeError) throw envelopeError;
    if (!envelope) {
      return signatureProductJson({ success: false, message: "Envelope não encontrado." }, 404);
    }

    if (!["SENT", "IN_PROGRESS"].includes(envelope.status)) {
      return signatureProductJson(
        { success: false, message: "Este documento não está disponível para assinatura no momento." },
        409
      );
    }

    if (envelope.expires_at && Date.now() > Date.parse(envelope.expires_at)) {
      return signatureProductJson({ success: false, message: "Este envelope expirou." }, 410);
    }

    const userEmail = access.account.email.trim().toLowerCase();
    const { data: recipient, error: recipientError } = await access.db
      .from("signature_recipients")
      .select("id, email, role, status")
      .eq("envelope_id", envelope.id)
      .eq("email", userEmail)
      .maybeSingle();
    if (recipientError) throw recipientError;

    if (!recipient) {
      return signatureProductJson(
        { success: false, message: "Você não está registrado como signatário neste envelope." },
        403
      );
    }

    if (!["SIGNER", "APPROVER"].includes(recipient.role)) {
      return signatureProductJson(
        { success: false, message: "Sua participação neste envelope é apenas de leitura/cópia." },
        409
      );
    }

    if (recipient.status === "COMPLETED") {
      return signatureProductJson(
        { success: false, message: "Você já concluiu sua assinatura para este documento." },
        409
      );
    }

    if (recipient.status === "DECLINED") {
      return signatureProductJson(
        { success: false, message: "Sua participação foi recusada." },
        409
      );
    }

    const token = generateSignatureAccessToken();
    const tokenHash = hashSignatureAccessToken(token);

    const { error: updateError } = await access.db
      .from("signature_recipients")
      .update({ access_token_hash: tokenHash })
      .eq("id", recipient.id);
    if (updateError) throw updateError;

    return signatureProductJson({
      success: true,
      url: `/assinar/${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error("[Signature sign redirect]", error);
    return signatureProductJson({ success: false, message: "Não foi possível iniciar a assinatura." }, 500);
  }
}

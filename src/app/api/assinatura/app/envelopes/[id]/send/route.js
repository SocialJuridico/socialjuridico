import { hasTrustedMutationOrigin, resolvePublicAppOrigin } from "@/lib/publicAppOrigin";
import {
  getSignatureProductRequestEvidence,
  loadSignatureEnvelope,
  requireSignatureProductAccess,
  signatureProductJson,
} from "@/lib/signatureProductServer";
import {
  generateSignatureAccessToken,
  hashSignatureAccessToken,
} from "@/lib/signatureSigningServer";
import { sendSignatureInvitationEmail } from "@/lib/signatureSigningEmail";
import { enforceSignatureAuthRateLimit } from "@/lib/signatureAuthRateLimit";

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

    const rate = enforceSignatureAuthRateLimit({
      scope: "signature-envelope-send",
      key: access.user.id,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return signatureProductJson(
        { success: false, message: "Muitos envios em sequência. Aguarde antes de tentar novamente." },
        429,
        { "Retry-After": String(rate.retryAfter) },
      );
    }

    const { data: envelope, error: envelopeError } = await access.db
      .from("signature_envelopes")
      .select(
        "id, organization_id, title, message, status, verification_code, expires_at, signature_recipients(id, name, email, role, status)",
      )
      .eq("id", id)
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (envelopeError) throw envelopeError;
    if (!envelope) return signatureProductJson({ success: false, message: "Envelope não encontrado." }, 404);
    if (!["DRAFT", "SENT", "IN_PROGRESS"].includes(envelope.status)) {
      return signatureProductJson({ success: false, message: "Este envelope não pode mais ser enviado." }, 409);
    }

    const pendingRecipients = (envelope.signature_recipients || []).filter(
      (recipient) => !["COMPLETED", "DECLINED"].includes(recipient.status),
    );
    if (!pendingRecipients.length) {
      return signatureProductJson({ success: false, message: "Não há destinatários pendentes." }, 409);
    }

    const invitations = pendingRecipients.map((recipient) => {
      const token = generateSignatureAccessToken();
      return {
        recipient,
        token,
        tokenHash: hashSignatureAccessToken(token),
      };
    });

    const { data: dispatch, error: dispatchError } = await access.db.rpc("dispatch_signature_envelope", {
      p_envelope_id: envelope.id,
      p_actor_user_id: access.user.id,
      p_recipient_tokens: invitations.map((item) => ({
        recipient_id: item.recipient.id,
        token_hash: item.tokenHash,
      })),
      p_expires_at: envelope.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (dispatchError) throw dispatchError;

    const { data: organization, error: organizationError } = await access.db
      .from("signature_organizations")
      .select("name")
      .eq("id", access.organizationId)
      .single();
    if (organizationError) throw organizationError;

    const origin = resolvePublicAppOrigin(request);
    const evidence = getSignatureProductRequestEvidence(request);
    const deliveries = await Promise.allSettled(
      invitations.map((item) =>
        sendSignatureInvitationEmail({
          recipient: item.recipient,
          envelope,
          organizationName: organization.name,
          signingUrl: `${origin}/assinar/${encodeURIComponent(item.token)}`,
        }),
      ),
    );

    const evidenceRows = deliveries.map((delivery, index) => ({
      organization_id: access.organizationId,
      envelope_id: envelope.id,
      actor_user_id: access.user.id,
      recipient_id: invitations[index].recipient.id,
      event_type: delivery.status === "fulfilled" ? "INVITATION_SENT" : "INVITATION_FAILED",
      outcome: delivery.status === "fulfilled" ? "SUCCESS" : "FAILURE",
      ip_hash: evidence.ipHash,
      user_agent: evidence.userAgent,
      payload: { role: invitations[index].recipient.role },
    }));
    const { error: evidenceError } = await access.db.from("signature_evidence_events").insert(evidenceRows);
    if (evidenceError) console.error("[Signature send] Falha ao registrar entrega:", evidenceError);

    const failed = deliveries.filter((delivery) => delivery.status === "rejected").length;
    const updated = await loadSignatureEnvelope(access.db, access.organizationId, envelope.id);

    return signatureProductJson({
      success: true,
      data: updated,
      firstSend: Boolean(dispatch?.first_send),
      sent: deliveries.length - failed,
      failed,
      message: failed
        ? `Envelope enviado, mas ${failed} convite${failed === 1 ? " não pôde" : "s não puderam"} ser entregue. Use reenviar para tentar novamente.`
        : "Convites enviados com sucesso.",
    });
  } catch (error) {
    console.error("[Signature envelope send]", error);
    const limitReached = /document limit reached/i.test(error?.message || "");
    const migrationMissing = ["42883", "PGRST202"].includes(error?.code);
    return signatureProductJson(
      {
        success: false,
        code: limitReached ? "DOCUMENT_LIMIT_REACHED" : migrationMissing ? "MIGRATION_REQUIRED" : "SEND_FAILED",
        message: limitReached
          ? "Seu limite mensal de documentos foi atingido. Escolha outro plano para continuar."
          : migrationMissing
            ? "A migration do fluxo de assinatura ainda precisa ser aplicada."
            : "Não foi possível enviar o envelope agora.",
      },
      limitReached ? 409 : migrationMissing ? 503 : 500,
    );
  }
}

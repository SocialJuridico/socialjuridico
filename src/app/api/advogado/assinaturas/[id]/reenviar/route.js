import {
  getScopedSignature,
  hasValidSignatureMutationOrigin,
  recordSignatureAudit,
  requireDigitalSignatureAccess,
  sendSignatureInvitation,
  signatureJson,
  signatureServerFailure,
} from "@/lib/digitalSignatures/signatureServer";
import {
  isValidSignatureUuid,
  normalizeSignatureRole,
  parseSignatureMetadata,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    if (!hasValidSignatureMutationOrigin(request)) {
      return signatureJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireDigitalSignatureAccess(request);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const role = normalizeSignatureRole(body.role || "client");
    const requestId = String(body.requestId || "");

    if (!isValidSignatureUuid(id) || !role || !isValidSignatureUuid(requestId)) {
      return signatureJson(
        { success: false, message: "Dados para reenvio inválidos." },
        400,
      );
    }

    const signature = await getScopedSignature(access, id);
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
        { success: false, message: "Este signatário já concluiu a assinatura." },
        409,
      );
    }

    const lastSent = Date.parse(party.invitation_last_sent_at || "");
    if (Number.isFinite(lastSent) && Date.now() - lastSent < 60_000) {
      return signatureJson(
        {
          success: false,
          message: "Aguarde um minuto antes de reenviar o convite.",
        },
        429,
      );
    }

    await sendSignatureInvitation({ signature, role });
    const now = new Date().toISOString();
    metadata[role] = { ...party, invitation_last_sent_at: now };
    metadata.history = Array.isArray(metadata.history) ? metadata.history : [];
    metadata.history.push({
      event: `invitation_sent_${role}`,
      timestamp: now,
      details: "Convite de assinatura reenviado pelo painel autenticado.",
    });

    const { error } = await access.db
      .from("assinaturas_digitais")
      .update({ metadata, updated_at: now })
      .eq("id", signature.id)
      .eq("lawyer_id", signature.lawyer_id);
    if (error) throw error;

    await recordSignatureAudit(access, request, {
      requestId,
      signatureId: signature.id,
      action: "RESEND_INVITATION",
      metadata: { role },
    });

    return signatureJson({
      success: true,
      message: "Convite reenviado com sucesso.",
    });
  } catch (error) {
    console.error("[Advogado/Assinaturas/Reenviar] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível reenviar o convite.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}

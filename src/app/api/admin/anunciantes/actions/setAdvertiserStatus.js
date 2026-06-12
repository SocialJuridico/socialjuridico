import {
  getAdvertiser,
  isValidUuid,
  json,
  normalizeText,
  recordAdvertiserAudit,
} from "../adminAdvertiserCore";

export async function setAdvertiserStatus(context) {
  const { db, request, adminId, body, legacyDelete } = context;
  const advertiserId = String(body?.id || "").trim();
  const active = legacyDelete ? false : Boolean(body?.active);
  const reason = normalizeText(
    body?.reason ||
      (legacyDelete
        ? "Conta suspensa pelo fluxo administrativo legado."
        : ""),
    1000,
  );

  if (!isValidUuid(advertiserId)) {
    return json({ success: false, message: "Anunciante inválido." }, 400);
  }

  if (reason.length < 10) {
    return json(
      { success: false, message: "Informe uma justificativa válida." },
      400,
    );
  }

  const existing = await getAdvertiser(db, advertiserId);
  if (!existing) {
    return json({ success: false, message: "Anunciante não encontrado." }, 404);
  }

  const { error } = await db
    .from("anunciantes")
    .update({ ativo: active })
    .eq("id", advertiserId);

  if (error) throw new Error("Falha ao alterar o acesso do anunciante.");

  const auditRecorded = await recordAdvertiserAudit(db, request, {
    adminId,
    advertiserId,
    action: active ? "ADVERTISER_REACTIVATED" : "ADVERTISER_SUSPENDED",
    purpose: "PARTNER_ACCESS_GOVERNANCE",
    justification: reason,
    metadata: { previousActive: existing.ativo !== false, active },
  });

  return json({
    success: true,
    message: active
      ? "Acesso reativado."
      : "Acesso suspenso sem excluir o histórico.",
    data: { auditRecorded },
  });
}

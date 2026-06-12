import {
  getAd,
  getAdvertiser,
  isValidUuid,
  json,
  normalizeAdStatus,
  normalizeText,
  recordAdvertiserAudit,
} from "../adminAdvertiserCore";

export async function updateAdLifecycle(context) {
  const {
    db,
    request,
    adminId,
    body,
    restoring,
    legacyDelete,
  } = context;
  const adId = String(body?.id || "").trim();
  const reason = normalizeText(
    body?.reason ||
      (legacyDelete
        ? "Anúncio arquivado pelo fluxo administrativo legado."
        : ""),
    1000,
  );

  if (!isValidUuid(adId)) {
    return json({ success: false, message: "Anúncio inválido." }, 400);
  }

  if (!restoring && reason.length < 10) {
    return json(
      { success: false, message: "Informe o motivo do arquivamento." },
      400,
    );
  }

  const ad = await getAd(db, adId);
  if (!ad) {
    return json({ success: false, message: "Anúncio não encontrado." }, 404);
  }

  if (ad.legacySchema) {
    return json(
      {
        success: false,
        code: "ADVERTISER_GOVERNANCE_MIGRATION_REQUIRED",
        message:
          "A migração de governança dos anunciantes precisa ser executada antes de arquivar ou restaurar anúncios.",
      },
      409,
    );
  }

  if (restoring) {
    const advertiser = await getAdvertiser(db, ad.anunciante_id);

    if (!advertiser || advertiser.ativo === false) {
      return json(
        {
          success: false,
          message: "Reative o anunciante antes de restaurar o anúncio.",
        },
        409,
      );
    }
  }

  const { error } = await db
    .from("anuncios")
    .update({
      status: restoring ? "ATIVO" : "ARQUIVADO",
      em_destaque: restoring ? Boolean(ad.em_destaque) : false,
    })
    .eq("id", adId);

  if (error) throw new Error("Falha ao atualizar o ciclo de vida do anúncio.");

  const auditRecorded = await recordAdvertiserAudit(db, request, {
    adminId,
    advertiserId: ad.anunciante_id,
    adId,
    action: restoring ? "AD_RESTORED" : "AD_ARCHIVED",
    purpose: "AD_LIFECYCLE_MANAGEMENT",
    justification: restoring ? null : reason,
    metadata: { previousStatus: normalizeAdStatus(ad.status) },
  });

  return json({
    success: true,
    message: restoring
      ? "Anúncio restaurado."
      : "Anúncio arquivado sem destruir o histórico.",
    data: { auditRecorded },
  });
}

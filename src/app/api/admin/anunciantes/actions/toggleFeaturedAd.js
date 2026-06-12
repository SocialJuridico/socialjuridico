import {
  getAd,
  getAdvertiser,
  isValidUuid,
  json,
  normalizeAdStatus,
  recordAdvertiserAudit,
} from "../adminAdvertiserCore";

export async function toggleFeaturedAd(context) {
  const { db, request, adminId, body } = context;
  const adId = String(body?.id || "").trim();
  const featured = Boolean(body?.em_destaque ?? body?.featured);

  if (!isValidUuid(adId)) {
    return json({ success: false, message: "Anúncio inválido." }, 400);
  }

  const ad = await getAd(db, adId);
  if (!ad) {
    return json({ success: false, message: "Anúncio não encontrado." }, 404);
  }

  const advertiser = await getAdvertiser(db, ad.anunciante_id);
  if (
    featured &&
    (normalizeAdStatus(ad.status) !== "ATIVO" || advertiser?.ativo === false)
  ) {
    return json(
      {
        success: false,
        message:
          "Somente anúncios ativos de anunciantes ativos podem receber destaque.",
      },
      409,
    );
  }

  const { error } = await db
    .from("anuncios")
    .update({ em_destaque: featured })
    .eq("id", adId);

  if (error) throw new Error("Falha ao alterar o destaque.");

  const auditRecorded = await recordAdvertiserAudit(db, request, {
    adminId,
    advertiserId: ad.anunciante_id,
    adId,
    action: featured ? "AD_FEATURED" : "AD_UNFEATURED",
    purpose: "AD_PLACEMENT_MANAGEMENT",
    metadata: { previousFeatured: Boolean(ad.em_destaque), featured },
  });

  return json({
    success: true,
    message: featured ? "Destaque ativado." : "Destaque removido.",
    data: { auditRecorded },
  });
}

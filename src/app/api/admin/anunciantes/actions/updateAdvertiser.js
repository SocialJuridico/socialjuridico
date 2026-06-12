import {
  isValidUsername,
  isValidUuid,
  json,
  normalizeText,
  normalizeUsername,
  normalizeWhatsapp,
  recordAdvertiserAudit,
} from "../adminAdvertiserCore";

export async function updateAdvertiser(context) {
  const { db, request, adminId, body } = context;
  const advertiserId = String(body?.id || "").trim();
  const username = normalizeUsername(body?.username);
  const companyName = normalizeText(
    body?.nome_empresa ?? body?.companyName,
    120,
  );
  const whatsappProvided = typeof body?.whatsapp === "string";
  const whatsapp = normalizeWhatsapp(body?.whatsapp);

  if (!isValidUuid(advertiserId)) {
    return json({ success: false, message: "Anunciante inválido." }, 400);
  }

  if (!isValidUsername(username) || companyName.length < 2) {
    return json(
      { success: false, message: "Revise usuário e nome da empresa." },
      400,
    );
  }

  const updatePayload = {
    username,
    nome_empresa: companyName,
  };

  if (whatsappProvided && whatsapp) {
    updatePayload.whatsapp = whatsapp;
  }

  const { data: advertiser, error } = await db
    .from("anunciantes")
    .update(updatePayload)
    .eq("id", advertiserId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return json(
        { success: false, message: "Este nome de usuário já está em uso." },
        409,
      );
    }
    throw new Error("Falha ao atualizar anunciante.");
  }

  if (!advertiser) {
    return json({ success: false, message: "Anunciante não encontrado." }, 404);
  }

  const auditRecorded = await recordAdvertiserAudit(db, request, {
    adminId,
    advertiserId,
    action: "ADVERTISER_UPDATED",
    purpose: "PARTNER_ACCOUNT_MANAGEMENT",
    metadata: {
      username,
      companyName,
      whatsappChanged: whatsappProvided && Boolean(whatsapp),
    },
  });

  return json({
    success: true,
    message: "Cadastro atualizado.",
    data: { auditRecorded },
  });
}

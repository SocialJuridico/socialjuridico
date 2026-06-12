import { hashAdvertiserPassword } from "@/lib/anuncianteAuth";

import {
  isValidUsername,
  json,
  normalizeText,
  normalizeUsername,
  normalizeWhatsapp,
  recordAdvertiserAudit,
} from "../adminAdvertiserCore";

export async function createAdvertiser(context) {
  const { db, request, adminId, body } = context;
  const username = normalizeUsername(body?.username);
  const password = String(body?.password || "");
  const companyName = normalizeText(body?.nome_empresa, 120);
  const whatsapp = normalizeWhatsapp(body?.whatsapp);

  if (!isValidUsername(username)) {
    return json(
      {
        success: false,
        message:
          "O usuário deve ter entre 3 e 40 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.",
      },
      400,
    );
  }

  if (password.length < 10 || password.length > 128) {
    return json(
      {
        success: false,
        message: "A senha inicial deve possuir entre 10 e 128 caracteres.",
      },
      400,
    );
  }

  if (companyName.length < 2) {
    return json(
      { success: false, message: "Informe o nome da empresa." },
      400,
    );
  }

  const { data: advertiser, error } = await db
    .from("anunciantes")
    .insert([
      {
        username,
        password: "__HASHED_PASSWORD__",
        password_hash: hashAdvertiserPassword(password),
        nome_empresa: companyName,
        whatsapp: whatsapp || null,
        ativo: true,
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return json(
        { success: false, message: "Este nome de usuário já está em uso." },
        409,
      );
    }
    throw new Error("Falha ao criar anunciante.");
  }

  const auditRecorded = await recordAdvertiserAudit(db, request, {
    adminId,
    advertiserId: advertiser.id,
    action: "ADVERTISER_CREATED",
    purpose: "PARTNER_ACCOUNT_MANAGEMENT",
    metadata: { username, companyName, hasWhatsapp: Boolean(whatsapp) },
  });

  return json({
    success: true,
    message: "Anunciante criado com segurança.",
    data: { id: advertiser.id, auditRecorded },
  });
}

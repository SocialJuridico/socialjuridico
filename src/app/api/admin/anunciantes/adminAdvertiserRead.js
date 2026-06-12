import {
  calculateAdvertiserSummary,
  json,
  maskWhatsapp,
  normalizeAdStatus,
  normalizeText,
  requireAdminAdvertiserAccess,
} from "./adminAdvertiserCore";

function isMissingStatusColumn(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("column anuncios.status does not exist") ||
    message.includes("could not find the 'status' column")
  );
}

function isMissingSupportTable(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("mensagens_suporte_anunciante")
  );
}

async function loadAds(db) {
  const currentSchemaResult = await db
    .from("anuncios")
    .select(
      "id, anunciante_id, titulo, descricao, categoria, status, em_destaque, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!currentSchemaResult.error) {
    return {
      data: currentSchemaResult.data || [],
      legacySchema: false,
    };
  }

  if (!isMissingStatusColumn(currentSchemaResult.error)) {
    console.error(
      "[Admin/Anunciantes] Erro Supabase ao consultar anúncios:",
      currentSchemaResult.error,
    );
    throw new Error("Falha ao consultar anúncios.");
  }

  const legacyResult = await db
    .from("anuncios")
    .select(
      "id, anunciante_id, titulo, descricao, categoria, em_destaque, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (legacyResult.error) {
    console.error(
      "[Admin/Anunciantes] Erro no fallback de anúncios:",
      legacyResult.error,
    );
    throw new Error("Falha ao consultar anúncios.");
  }

  return {
    data: (legacyResult.data || []).map((ad) => ({
      ...ad,
      status: "ATIVO",
    })),
    legacySchema: true,
  };
}

async function loadSupport(db) {
  const result = await db
    .from("mensagens_suporte_anunciante")
    .select("id, anunciante_id, sender_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!result.error) {
    return {
      data: result.data || [],
      available: true,
    };
  }

  if (isMissingSupportTable(result.error)) {
    return {
      data: [],
      available: false,
    };
  }

  console.error(
    "[Admin/Anunciantes] Erro Supabase ao consultar suporte:",
    result.error,
  );
  throw new Error("Falha ao consultar suporte.");
}

export async function getAdminAdvertisers() {
  try {
    const access = await requireAdminAdvertiserAccess();
    if (!access.ok) return access.response;

    const [advertisersResult, adsResult, supportResult] = await Promise.all([
      access.db
        .from("anunciantes")
        .select("id, username, nome_empresa, whatsapp, ativo, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      loadAds(access.db),
      loadSupport(access.db),
    ]);

    if (advertisersResult.error) {
      console.error(
        "[Admin/Anunciantes] Erro Supabase ao consultar anunciantes:",
        advertisersResult.error,
      );
      throw new Error("Falha ao consultar anunciantes.");
    }

    const adsByAdvertiser = new Map();
    for (const ad of adsResult.data || []) {
      const current = adsByAdvertiser.get(ad.anunciante_id) || [];
      current.push({
        id: ad.id,
        title: ad.titulo || "Anúncio sem título",
        description: normalizeText(ad.descricao, 1200),
        category: ad.categoria || "OUTROS",
        status: normalizeAdStatus(ad.status),
        featured: Boolean(ad.em_destaque),
        createdAt: ad.created_at,
      });
      adsByAdvertiser.set(ad.anunciante_id, current);
    }

    const supportByAdvertiser = new Map();
    for (const message of supportResult.data || []) {
      const current = supportByAdvertiser.get(message.anunciante_id) || {
        messageCount: 0,
        advertiserMessages: 0,
        lastMessageAt: null,
        lastSenderType: null,
      };

      current.messageCount += 1;
      if (message.sender_type === "ANUNCIANTE") {
        current.advertiserMessages += 1;
      }
      if (!current.lastMessageAt) {
        current.lastMessageAt = message.created_at;
        current.lastSenderType = message.sender_type;
      }
      supportByAdvertiser.set(message.anunciante_id, current);
    }

    const advertisers = (advertisersResult.data || []).map((advertiser) => ({
      id: advertiser.id,
      username: advertiser.username || "",
      companyName: advertiser.nome_empresa || "Empresa não informada",
      maskedWhatsapp: maskWhatsapp(advertiser.whatsapp),
      hasWhatsapp: Boolean(advertiser.whatsapp),
      active: advertiser.ativo !== false,
      createdAt: advertiser.created_at,
      ads: adsByAdvertiser.get(advertiser.id) || [],
      support: supportByAdvertiser.get(advertiser.id) || {
        messageCount: 0,
        advertiserMessages: 0,
        lastMessageAt: null,
        lastSenderType: null,
      },
    }));

    return json({
      success: true,
      data: {
        advertisers,
        summary: calculateAdvertiserSummary(advertisers),
        schema: {
          legacyAds: adsResult.legacySchema,
          archiveAvailable: !adsResult.legacySchema,
          supportAvailable: supportResult.available,
        },
        privacy: {
          whatsappMaskedByDefault: true,
          passwordsReturned: false,
          adContactReturned: false,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Anunciantes][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os anunciantes." },
      500,
    );
  }
}

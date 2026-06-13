import {
  messageJson,
  requireMessageUser,
} from "@/lib/messages/messageServer";
import {
  isValidServiceAdPhone,
  normalizeServiceAdCategory,
} from "@/lib/serviceAds/serviceAdValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireMessageUser(request, { lawyerOnly: true });
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const featuredOnly = searchParams.get("destaque") === "true";
    const rawCategory = String(searchParams.get("categoria") || "").trim();
    const category = rawCategory
      ? normalizeServiceAdCategory(rawCategory, "")
      : "";

    if (rawCategory && !category) {
      return messageJson(
        { success: false, message: "Categoria de anúncio inválida." },
        400,
      );
    }

    const { data: advertisers, error: advertisersError } = await access.db
      .from("anunciantes")
      .select("id, nome_empresa, whatsapp")
      .eq("ativo", true)
      .limit(2000);

    if (advertisersError) throw advertisersError;

    const advertiserMap = new Map(
      (advertisers || []).map((advertiser) => [advertiser.id, advertiser]),
    );
    const advertiserIds = [...advertiserMap.keys()];

    if (!advertiserIds.length) {
      return messageJson({
        success: true,
        data: [],
        deprecated: true,
        replacement: "/api/advogado/anuncios-servicos",
      });
    }

    let query = access.db
      .from("anuncios")
      .select(
        "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
      )
      .in("anunciante_id", advertiserIds)
      .or("status.eq.ATIVO,status.is.null")
      .order("em_destaque", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);

    if (featuredOnly) query = query.eq("em_destaque", true);
    if (category) query = query.eq("categoria", category);

    const { data: ads, error: adsError } = await query;
    if (adsError) throw adsError;

    return messageJson({
      success: true,
      deprecated: true,
      replacement: "/api/advogado/anuncios-servicos",
      data: (ads || []).map((ad) => {
        const advertiser = advertiserMap.get(ad.anunciante_id);
        return {
          id: ad.id,
          anunciante_id: ad.anunciante_id,
          titulo: ad.titulo,
          descricao: ad.descricao,
          categoria: normalizeServiceAdCategory(ad.categoria, "OUTROS"),
          contato: null,
          contact_available: isValidServiceAdPhone(
            ad.contato || advertiser?.whatsapp,
          ),
          status: ad.status || "ATIVO",
          em_destaque: Boolean(ad.em_destaque),
          created_at: ad.created_at,
          anunciante: advertiser
            ? {
                id: advertiser.id,
                nome_empresa: advertiser.nome_empresa,
                whatsapp: null,
              }
            : null,
        };
      }),
      privacy: {
        rawPhoneReturned: false,
      },
    });
  } catch (error) {
    console.error("[Anúncios Legados][GET] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível carregar os anúncios." },
      500,
    );
  }
}

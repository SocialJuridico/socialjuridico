import { supabaseAdmin } from "@/lib/supabase";

import {
  isReviewUuid,
  reviewJson,
  safeReviewError,
} from "./reviewServer";

export async function getPublicLawyerRating(_request, context) {
  try {
    if (!supabaseAdmin) {
      return reviewJson(
        { success: false, message: "Serviço de reputação indisponível." },
        503,
      );
    }

    const params = await context.params;
    const lawyerId = String(params?.advogadoId || "").trim();

    if (!isReviewUuid(lawyerId)) {
      return reviewJson(
        { success: false, message: "Advogado inválido." },
        400,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("advogados")
      .select("avg_rating, total_ratings")
      .eq("id", lawyerId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao consultar reputação: ${error.message}`);
    }

    if (!data) {
      return reviewJson(
        { success: false, message: "Advogado não encontrado." },
        404,
      );
    }

    const total = Number(data.total_ratings || 0);
    const average = Number(data.avg_rating || 0);

    return reviewJson(
      {
        success: true,
        data: {
          media: total > 0 ? average : null,
          total,
        },
      },
      200,
      {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    );
  } catch (error) {
    return safeReviewError(error, "Não foi possível carregar a reputação.");
  }
}

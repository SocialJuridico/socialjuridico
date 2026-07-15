import { generatePublicShareDescription } from "@/lib/clientDashboard/casePublicShareServer";
import { DEFAULT_PUBLIC_APP_ORIGIN } from "@/lib/publicAppOrigin";

import {
  opportunityJson,
  requireLawyerAccess,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request, { params }) {
  try {
    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const { id } = await params;
    if (!UUID_RE.test(String(id || ""))) {
      return opportunityJson(
        { success: false, message: "Caso inválido." },
        400,
      );
    }

    const { data: caseItem, error } = await access.db
      .from("casos")
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, public_share_description",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Falha ao consultar caso: ${error.message}`);
    if (!caseItem) {
      return opportunityJson(
        { success: false, message: "Caso não encontrado." },
        404,
      );
    }

    let description = caseItem.public_share_description;

    if (!description) {
      const generated = await generatePublicShareDescription({
        titulo: caseItem.titulo,
        descricao: caseItem.descricao,
        area: caseItem.area_atuacao,
        cidade: caseItem.cidade,
        estado: caseItem.estado,
      });
      description = generated.descricao;

      const { error: updateError } = await access.db
        .from("casos")
        .update({
          public_share_description: description,
          public_share_generated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error(
          "[Oportunidades/Compartilhar] Falha ao cachear descrição pública:",
          updateError.message,
        );
      }
    }

    // Link é feito pra circular fora da plataforma (grupos externos) — usa
    // sempre o domínio real de produção, nunca o origin da própria request
    // (que em dev aponta pra localhost).
    const shareUrl = `${DEFAULT_PUBLIC_APP_ORIGIN}/oportunidades/${id}`;

    return opportunityJson({
      success: true,
      data: { shareUrl, description },
    });
  } catch (error) {
    console.error("[Oportunidades/Compartilhar][POST] Falha:", error);
    return opportunityJson(
      { success: false, message: "Não foi possível gerar o link de compartilhamento." },
      500,
    );
  }
}

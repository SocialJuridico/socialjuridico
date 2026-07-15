import { generatePublicShareDescription } from "@/lib/clientDashboard/casePublicShareServer";
import {
  clientJson,
  isClientUuid,
  requireClientUser,
  safeClientError,
  validateClientMutationOrigin,
} from "@/lib/clientDashboard/clientServer";
import { DEFAULT_PUBLIC_APP_ORIGIN } from "@/lib/publicAppOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const { id } = await params;
    if (!isClientUuid(id)) {
      return clientJson({ success: false, message: "Caso inválido." }, 400);
    }

    // Escopo obrigatório: cliente só compartilha o PRÓPRIO caso.
    const { data: caseItem, error } = await access.db
      .from("casos")
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, public_share_description",
      )
      .eq("id", id)
      .eq("cliente_id", access.user.id)
      .maybeSingle();

    if (error) throw new Error(`Falha ao consultar caso: ${error.message}`);
    if (!caseItem) {
      return clientJson({ success: false, message: "Caso não encontrado." }, 404);
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
        .eq("id", id)
        .eq("cliente_id", access.user.id);

      if (updateError) {
        console.error(
          "[Cliente/Compartilhar] Falha ao cachear descrição pública:",
          updateError.message,
        );
      }
    }

    // Link é feito pra circular fora da plataforma (grupos externos) — usa
    // sempre o domínio real de produção, nunca o origin da própria request.
    const shareUrl = `${DEFAULT_PUBLIC_APP_ORIGIN}/oportunidades/${id}`;

    return clientJson({
      success: true,
      data: { shareUrl, description },
    });
  } catch (error) {
    return safeClientError(
      error,
      "Não foi possível gerar o link de compartilhamento.",
    );
  }
}

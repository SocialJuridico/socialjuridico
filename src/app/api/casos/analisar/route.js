import { getRoleFromDatabase } from "@/lib/securityUtils";
import { resolveCaseUploads } from "@/lib/clientDashboard/caseUploadServer";
import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { classifyCase } from "@/lib/clientDashboard/caseClassifierServer";
import {
  PRIORITY_LABELS,
  SOCIAL_TYPE_LABELS,
  isSocialCase,
} from "@/lib/clientDashboard/caseClassification";

import {
  json,
  normalizeText,
  requireCaseUser,
} from "../caseRouteUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/casos/analisar
 * Pré-análise da IA ANTES de publicar: transcreve áudio/vídeo (cacheando o
 * resultado na row do upload) e classifica o caso. NÃO cria caso. Dá
 * transparência ao cliente sobre prioridade, tipo social e próximos passos.
 */
export async function POST(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const role =
      (await getRoleFromDatabase(access.db, access.user.id)) || "CLIENT";
    if (role !== "CLIENT") {
      return json(
        { success: false, message: "Apenas clientes podem analisar casos." },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const description = normalizeText(body?.descricao, 20000);
    const area = normalizeText(body?.area_atuacao, 120);
    const uploadIds = Array.isArray(body?.upload_ids)
      ? body.upload_ids.slice(0, 7)
      : [];

    const resolvedUploads = await resolveCaseUploads(
      access.db,
      access.user.id,
      uploadIds,
    );

    const hasMedia = Boolean(
      resolvedUploads.audioUrl || resolvedUploads.videoUrl,
    );
    if (!description && !hasMedia) {
      return json(
        {
          success: false,
          message:
            "Envie um relato por texto, áudio ou vídeo para analisar o caso.",
        },
        400,
      );
    }

    const classification = await classifyCase({
      db: access.db,
      descricao: description,
      area,
      tickets: resolvedUploads.tickets,
      cacheTranscription: true,
    });

    const socialType = classification.tipoSocial;

    return json({
      success: true,
      data: {
        titulo: classification.titulo || "",
        prioridade: classification.prioridade,
        prioridadeLabel: PRIORITY_LABELS[classification.prioridade],
        riscoVida: classification.riscoVida === true,
        showPoliceButton:
          classification.prioridade === "URGENTE" &&
          classification.riscoVida === true,
        tipoSocial: socialType,
        tipoSocialLabel: SOCIAL_TYPE_LABELS[socialType] || "",
        isSocial: isSocialCase(socialType),
        proximosPassos: classification.proximosPassos,
        transcricao: classification.meta?.transcricao || "",
        resumo: classification.meta?.resumo || "",
        prioridadeJustificativa:
          classification.meta?.prioridadeJustificativa || "",
        tipoSocialJustificativa:
          classification.meta?.tipoSocialJustificativa || "",
        aiUnavailable: classification.meta?.classifierError === "AI_UNAVAILABLE",
      },
    });
  } catch (error) {
    console.error("[Casos/Analisar][POST] Erro:", {
      code: error?.code || null,
      message: error?.message || "unknown",
    });
    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível analisar o caso agora.",
      },
      status,
    );
  }
}

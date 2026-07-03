import { sendPushNotification } from "@/lib/pushNotifications";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { resolveCaseUploads } from "@/lib/clientDashboard/caseUploadServer";
import { attachCaseUploadsSafely } from "@/lib/clientDashboard/caseUploadAttachServer";
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
  upsertCaseGovernance,
} from "../caseRouteUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeGeo(body) {
  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);
  const cidade = normalizeText(body?.cidade, 120);
  const estado = normalizeText(body?.estado, 2).toUpperCase();
  return {
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    cidade,
    estado: estado.length === 2 ? estado : "",
  };
}

async function notifyEmergency(db, caseItem) {
  try {
    await sendPushNotification({
      roles: ["LAWYER"],
      title: "🚨 EMERGÊNCIA — Social Jurídico",
      message: `Caso urgente publicado: ${String(caseItem.titulo || "").slice(0, 60)}.`,
      url: "/dashboard/advogado",
    });
  } catch (error) {
    console.error("[Casos/Emergência] Falha no push:", error?.message);
  }
}

/**
 * POST /api/casos/emergencia
 * Fluxo do botão EMERGÊNCIA (mobile): recebe o vídeo já enviado (upload_id),
 * transcreve + classifica pela IA e PUBLICA o caso automaticamente. Não exige
 * título, área nem localização digitados — a IA infere e a geolocalização é
 * opcional. Retorna a classificação e se deve exibir o botão de ligar 190.
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
        { success: false, message: "Apenas clientes podem abrir emergências." },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const uploadId = normalizeText(body?.upload_id, 60);
    if (!uploadId) {
      return json(
        { success: false, message: "Vídeo da emergência não encontrado." },
        400,
      );
    }
    const geo = normalizeGeo(body);

    const resolvedUploads = await resolveCaseUploads(access.db, access.user.id, [
      uploadId,
    ]);
    if (!resolvedUploads.videoUrl && !resolvedUploads.audioUrl) {
      return json(
        {
          success: false,
          message: "Envie um vídeo ou áudio para registrar a emergência.",
        },
        400,
      );
    }

    const classification = await classifyCase({
      db: access.db,
      descricao: "",
      area: "",
      tickets: resolvedUploads.tickets,
      cacheTranscription: true,
    });

    const transcription = String(classification.meta?.transcricao || "").trim();
    const titulo =
      normalizeText(classification.titulo, 180) ||
      "🚨 Emergência — relato em vídeo";
    const descricao =
      transcription ||
      "Emergência registrada por vídeo. Abra a mídia anexada ao caso.";
    const area =
      normalizeText(classification.areaSugerida, 120) || "Direito Penal";

    const createdAt = new Date().toISOString();
    const payload = {
      titulo,
      descricao,
      area_atuacao: area,
      cidade: geo.cidade || null,
      estado: geo.estado || null,
      cliente_id: access.user.id,
      anexos: resolvedUploads.attachments,
      video_url: resolvedUploads.videoUrl,
      audio_url: resolvedUploads.audioUrl,
      prioridade: classification.prioridade,
      tipo_social: classification.tipoSocial,
      risco_vida: classification.riscoVida === true,
      is_emergencia: true,
      ai_proximos_passos: classification.proximosPassos,
      ai_meta: {
        ...classification.meta,
        emergencia: true,
        geolocation:
          geo.latitude !== null && geo.longitude !== null
            ? { latitude: geo.latitude, longitude: geo.longitude }
            : null,
      },
      ai_classified_at: createdAt,
      status: "ABERTO",
      created_at: createdAt,
      updated_at: createdAt,
    };

    const { data: caseItem, error: insertError } = await access.db
      .from("casos")
      .insert([payload])
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, status, prioridade, tipo_social, risco_vida, is_emergencia, ai_proximos_passos, created_at",
      )
      .single();

    if (insertError) {
      throw new Error(`Falha ao registrar emergência: ${insertError.message}`);
    }

    try {
      await attachCaseUploadsSafely(
        access.db,
        access.user.id,
        caseItem.id,
        resolvedUploads.tickets,
      );
    } catch (uploadError) {
      await access.db
        .from("casos")
        .delete()
        .eq("id", caseItem.id)
        .eq("cliente_id", access.user.id);
      throw uploadError;
    }

    await upsertCaseGovernance(access.db, caseItem.id, {
      operational_stage: "NEW",
      risk_level: "RESTRICTED",
    }).catch((error) => {
      console.error("[Casos/Emergência] Falha na governança:", error?.message);
    });

    await notifyEmergency(access.db, caseItem);

    const showPoliceButton =
      classification.prioridade === "URGENTE" &&
      classification.riscoVida === true;

    return json(
      {
        success: true,
        data: {
          caso: caseItem,
          classificacao: {
            titulo,
            prioridade: classification.prioridade,
            prioridadeLabel: PRIORITY_LABELS[classification.prioridade],
            tipoSocial: classification.tipoSocial,
            tipoSocialLabel: SOCIAL_TYPE_LABELS[classification.tipoSocial] || "",
            isSocial: isSocialCase(classification.tipoSocial),
            riscoVida: classification.riscoVida === true,
            resumo: classification.meta?.resumo || "",
            transcricao: transcription,
            proximosPassos: classification.proximosPassos,
          },
          showPoliceButton,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Casos/Emergência][POST] Erro:", {
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
            : "Não foi possível registrar a emergência agora.",
      },
      status,
    );
  }
}

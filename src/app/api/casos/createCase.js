import {
  novoCasoTemplate,
  oportunidadeLocalTemplate,
} from "@/lib/emailTemplates";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { resolveCaseUploads } from "@/lib/clientDashboard/caseUploadServer";
import { attachCaseUploadsSafely } from "@/lib/clientDashboard/caseUploadAttachServer";
import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { classifyCase } from "@/lib/clientDashboard/caseClassifierServer";
import {
  json,
  normalizeText,
  requireCaseUser,
  upsertCaseGovernance,
} from "./caseRouteUtils";

const EMAIL_BATCH_SIZE = 100;
const EMAIL_BATCH_DELAY_MS = 1500;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function deduplicateLawyers(lawyers) {
  const seen = new Set();

  return (lawyers || []).filter((lawyer) => {
    const email = String(lawyer.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

function normalizeVideoLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    return url.toString().slice(0, 1000);
  } catch {
    return undefined;
  }
}

async function sendEmailBatches(lawyers, buildPayload) {
  for (let index = 0; index < lawyers.length; index += EMAIL_BATCH_SIZE) {
    const batch = lawyers.slice(index, index + EMAIL_BATCH_SIZE);
    const payloads = batch.map(buildPayload);

    try {
      const { error } = await resend.batch.send(payloads);
      if (error) {
        console.error("[Casos/Criação] Falha em lote de e-mail:", error);
      }
    } catch (error) {
      console.error("[Casos/Criação] Exceção em lote de e-mail:", error);
    }

    if (index + EMAIL_BATCH_SIZE < lawyers.length) {
      await sleep(EMAIL_BATCH_DELAY_MS);
    }
  }
}

async function notifyLawyers(db, caseItem) {
  try {
    await sendPushNotification({
      roles: ["LAWYER"],
      title: "Social Jurídico 📍",
      message: `Nova oportunidade: ${caseItem.titulo.slice(0, 50)} em ${caseItem.cidade}/${caseItem.estado}.`,
      url: "/dashboard/advogado",
    });
  } catch (error) {
    console.error("[Casos/Criação] Falha no push:", error);
  }

  if (!process.env.RESEND_API_KEY) return;

  try {
    const { data: lawyers, error } = await db
      .from("advogados")
      .select("name, email, estado")
      .not("email", "is", null)
      .neq("oab_verification_status", "ERROR");

    if (error) {
      console.error("[Casos/Criação] Falha ao consultar advogados:", error);
      return;
    }

    const uniqueLawyers = deduplicateLawyers(lawyers);
    const localLawyers = uniqueLawyers.filter(
      (lawyer) => lawyer.estado === caseItem.estado,
    );
    const otherLawyers = uniqueLawyers.filter(
      (lawyer) => lawyer.estado !== caseItem.estado,
    );

    await sendEmailBatches(localLawyers, (lawyer) => ({
      from: "Social Jurídico <contato@socialjuridico.com.br>",
      to: [lawyer.email.trim()],
      subject: `📍 Oportunidade em ${caseItem.cidade}/${caseItem.estado}`,
      html: oportunidadeLocalTemplate({
        titulo: caseItem.titulo,
        area_atuacao: caseItem.area_atuacao,
        cidade: caseItem.cidade,
        estado: caseItem.estado,
        lawyerName: lawyer.name || "Advogado(a)",
      }),
    }));

    if (localLawyers.length && otherLawyers.length) {
      await sleep(EMAIL_BATCH_DELAY_MS);
    }

    await sendEmailBatches(otherLawyers, (lawyer) => ({
      from: "Social Jurídico <contato@socialjuridico.com.br>",
      to: [lawyer.email.trim()],
      subject: `📍 Nova oportunidade: ${caseItem.area_atuacao} em ${caseItem.cidade}/${caseItem.estado}`,
      html: novoCasoTemplate({
        titulo: caseItem.titulo,
        area_atuacao: caseItem.area_atuacao,
        cidade: caseItem.cidade,
        estado: caseItem.estado,
        lawyerName: lawyer.name || "Advogado(a)",
      }),
    }));
  } catch (error) {
    console.error("[Casos/Criação] Falha não fatal na distribuição:", error);
  }
}

export async function createCase(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const role =
      (await getRoleFromDatabase(access.db, access.user.id)) || "CLIENT";

    if (role !== "CLIENT") {
      return json(
        { success: false, message: "Apenas clientes podem publicar casos." },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const title = normalizeText(body?.titulo, 180);
    const description = normalizeText(body?.descricao, 20000);
    const area = normalizeText(body?.area_atuacao, 120);
    const city = normalizeText(body?.cidade, 120);
    const state = normalizeText(body?.estado, 2).toUpperCase();
    const videoLink = normalizeVideoLink(body?.video_link);
    const uploadIds = Array.isArray(body?.upload_ids)
      ? body.upload_ids.slice(0, 7)
      : [];

    // Área, cidade e estado permanecem obrigatórios (declaração do cliente).
    // O relato (descrição) e o título podem vir apenas de áudio/vídeo — a IA
    // transcreve e preenche. Assim quebramos a barreira de quem não escreve.
    if (!area || !city || state.length !== 2) {
      return json(
        {
          success: false,
          message: "Área, cidade e estado são obrigatórios.",
        },
        400,
      );
    }

    if (videoLink === undefined) {
      return json(
        {
          success: false,
          message: "O link externo do vídeo deve ser uma URL HTTPS válida.",
        },
        400,
      );
    }

    const resolvedUploads = await resolveCaseUploads(
      access.db,
      access.user.id,
      uploadIds,
    );

    const hasMedia = Boolean(
      resolvedUploads.audioUrl || resolvedUploads.videoUrl,
    );

    // Exige texto OU mídia. Sem nenhum dos dois não há relato para o caso.
    if (!description && !hasMedia) {
      return json(
        {
          success: false,
          message:
            "Descreva o caso por texto ou envie um áudio/vídeo com o relato.",
        },
        400,
      );
    }

    // Classificação social/prioridade por IA (transcreve áudio/vídeo, classifica
    // o relato). Nunca lança: em falha retorna NORMAL/NENHUM sem bloquear a publicação.
    const classification = await classifyCase({
      db: access.db,
      descricao: description,
      area,
      tickets: resolvedUploads.tickets,
    });

    // Backfill: quando o cliente não digitou, usa a transcrição como relato e
    // o resumo da IA como título, garantindo conteúdo legível ao advogado.
    const transcription = String(classification.meta?.transcricao || "").trim();
    const finalDescription =
      description ||
      transcription ||
      "Relato enviado por áudio/vídeo. Abra a mídia anexada ao caso.";
    const finalTitle =
      title ||
      normalizeText(classification.titulo, 180) ||
      normalizeText(classification.meta?.resumo, 180) ||
      (transcription ? normalizeText(transcription, 120) : "") ||
      "Relato enviado por áudio/vídeo";

    const createdAt = new Date().toISOString();
    const payload = {
      titulo: finalTitle,
      descricao: finalDescription,
      area_atuacao: area,
      cidade: city,
      estado: state,
      cliente_id: access.user.id,
      anexos: resolvedUploads.attachments,
      video_link: videoLink,
      video_url: resolvedUploads.videoUrl,
      audio_url: resolvedUploads.audioUrl,
      prioridade: classification.prioridade,
      tipo_social: classification.tipoSocial,
      ai_proximos_passos: classification.proximosPassos,
      ai_meta: classification.meta,
      ai_classified_at: createdAt,
      status: "ABERTO",
      created_at: createdAt,
      updated_at: createdAt,
    };

    const { data: caseItem, error: insertError } = await access.db
      .from("casos")
      .insert([payload])
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, status, advogado_id, anexos, video_link, video_url, audio_url, prioridade, tipo_social, ai_proximos_passos, ai_meta, ai_classified_at, created_at, updated_at",
      )
      .single();

    if (insertError) {
      throw new Error(`Falha ao criar caso: ${insertError.message}`);
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
      risk_level:
        resolvedUploads.tickets.length || videoLink ? "RESTRICTED" : "STANDARD",
    }).catch((error) => {
      console.error("[Casos/Criação] Falha ao inicializar governança:", error);
    });

    await notifyLawyers(access.db, caseItem);

    return json({ success: true, data: caseItem }, 201);
  } catch (error) {
    console.error("[Casos][POST] Erro:", {
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
            : "Não foi possível publicar o caso.",
      },
      status,
    );
  }
}

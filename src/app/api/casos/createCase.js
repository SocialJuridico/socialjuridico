import {
  novoCasoTemplate,
  oportunidadeLocalTemplate,
} from "@/lib/emailTemplates";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";
import { getRoleFromDatabase } from "@/lib/securityUtils";
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
      .not("email", "is", null);

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
    const state = normalizeText(body?.estado, 40);
    const videoLink = normalizeText(body?.video_link, 1000) || null;
    const attachments = Array.isArray(body?.anexos)
      ? body.anexos.slice(0, 50)
      : [];

    if (!title || !description || !area || !city || !state) {
      return json(
        {
          success: false,
          message:
            "Título, descrição, área, cidade e estado são obrigatórios.",
        },
        400,
      );
    }

    const createdAt = new Date().toISOString();
    const payload = {
      titulo: title,
      descricao: description,
      area_atuacao: area,
      cidade: city,
      estado: state,
      cliente_id: access.user.id,
      anexos: attachments,
      video_link: videoLink,
      video_url: body?.video_url || null,
      audio_url: body?.audio_url || null,
      status: "ABERTO",
      created_at: createdAt,
    };

    let result = await access.db
      .from("casos")
      .insert([payload])
      .select()
      .single();

    if (result.error) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.video_link;
      delete fallbackPayload.video_url;
      delete fallbackPayload.audio_url;

      result = await access.db
        .from("casos")
        .insert([fallbackPayload])
        .select()
        .single();
    }

    if (result.error) {
      throw new Error(`Falha ao criar caso: ${result.error.message}`);
    }

    await upsertCaseGovernance(access.db, result.data.id, {
      operational_stage: "NEW",
      risk_level:
        attachments.length || body?.video_url || body?.audio_url || videoLink
          ? "RESTRICTED"
          : "STANDARD",
    }).catch((error) => {
      console.error("[Casos/Criação] Falha ao inicializar governança:", error);
    });

    await notifyLawyers(access.db, result.data);

    return json({ success: true, data: result.data });
  } catch (error) {
    console.error("[Casos][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível publicar o caso." },
      500,
    );
  }
}

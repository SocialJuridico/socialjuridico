import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import OpenAI from "openai";
import { toFile } from "openai";
import ffmpegStatic from "ffmpeg-static";

import {
  SOCIAL_TYPE_GUIDE,
  normalizePriority,
  normalizeSocialType,
} from "./caseClassification";

// Caminho do binário ffmpeg embutido (ffmpeg-static). Usado apenas para EXTRAIR
// o áudio do vídeo e enviar à IA; o vídeo original no storage nunca é alterado.
const ffmpegPath = ffmpegStatic || null;

// Limite da API de transcrição da OpenAI (25 MB). Áudio (upload máx. 25 MB)
// sempre cabe. Para vídeo, extraímos a faixa de áudio comprimida (16 kHz mono),
// que fica muito abaixo do limite mesmo para vídeos longos.
const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;

// Teto de segurança para baixar o vídeo e extrair o áudio (evita estourar
// memória/tempo em vídeos muito grandes). Acima disso, tenta enviar direto se
// couber, senão ignora a mídia na transcrição.
const VIDEO_DOWNLOAD_MAX_BYTES = 200 * 1024 * 1024;

const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const CLASSIFY_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

const CLASSIFICATION_SCHEMA = {
  name: "classificacao_social_socialjuridico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "titulo",
      "areaSugerida",
      "prioridade",
      "prioridadeJustificativa",
      "riscoVida",
      "tipoSocial",
      "tipoSocialJustificativa",
      "resumo",
      "proximosPassos",
    ],
    properties: {
      titulo: { type: "string" },
      areaSugerida: { type: "string" },
      prioridade: {
        type: "string",
        enum: ["URGENTE", "PREFERENCIAL", "NORMAL"],
      },
      riscoVida: { type: "boolean" },
      prioridadeJustificativa: { type: "string" },
      tipoSocial: {
        type: "string",
        enum: [
          "DIREITO_RACIAL",
          "DIREITO_IDOSO",
          "DIREITO_INFANTIL",
          "DIREITO_MULHER",
          "DIREITO_LGBTQIA",
          "TRABALHO_ESCRAVO",
          "NENHUM",
        ],
      },
      tipoSocialJustificativa: { type: "string" },
      resumo: { type: "string" },
      proximosPassos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["titulo", "descricao"],
          properties: {
            titulo: { type: "string" },
            descricao: { type: "string" },
          },
        },
      },
    },
  },
};

const FALLBACK = Object.freeze({
  titulo: "",
  areaSugerida: "",
  prioridade: "NORMAL",
  riscoVida: false,
  tipoSocial: "NENHUM",
  proximosPassos: [],
  meta: {
    prioridadeJustificativa: "",
    tipoSocialJustificativa: "",
    resumo: "",
    transcricao: "",
    classifierError: null,
  },
});

function cloneFallback(overrides = {}) {
  return {
    titulo: "",
    areaSugerida: "",
    prioridade: FALLBACK.prioridade,
    riscoVida: false,
    tipoSocial: FALLBACK.tipoSocial,
    proximosPassos: [],
    meta: { ...FALLBACK.meta, ...(overrides.meta || {}) },
    ...(overrides.prioridade ? { prioridade: overrides.prioridade } : {}),
    ...(overrides.tipoSocial ? { tipoSocial: overrides.tipoSocial } : {}),
  };
}

function clampText(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Extrai a faixa de áudio de um vídeo em memória, gerando um MP3 mono 16 kHz
// (ideal para reconhecimento de fala e muito abaixo de 25 MB). NÃO toca no
// arquivo original — opera apenas sobre uma cópia temporária. Retorna Buffer
// ou null se o ffmpeg não estiver disponível/falhar.
async function extractAudioFromVideo(videoBuffer, sourceExtension = "mp4") {
  if (!ffmpegPath) return null;

  let workDir = null;
  try {
    workDir = await mkdtemp(path.join(tmpdir(), "caso-audio-"));
    const inputPath = path.join(workDir, `in-${randomUUID()}.${sourceExtension}`);
    const outputPath = path.join(workDir, `out-${randomUUID()}.mp3`);
    await writeFile(inputPath, videoBuffer);

    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        "-i",
        inputPath,
        "-vn", // descarta o vídeo, mantém só o áudio
        "-ac",
        "1", // mono
        "-ar",
        "16000", // 16 kHz
        "-b:a",
        "64k",
        "-f",
        "mp3",
        "-y",
        outputPath,
      ]);

      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.slice(-400)}`));
      });
    });

    return await readFile(outputPath);
  } catch (error) {
    console.warn("[CasoIA/ExtraçãoÁudio] Falha não fatal:", {
      message: error?.message,
    });
    return null;
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => null);
  }
}

async function transcribeAudioBlob(file) {
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
  });
  return (transcription.text || "").trim();
}

async function transcribeTicket(db, ticket) {
  if (!ticket) return "";
  const size = Number(ticket.size_bytes || 0);
  if (size <= 0) return "";

  try {
    // Áudio direto: já respeita o limite de upload de 25 MB.
    if (ticket.category === "AUDIO") {
      if (size > TRANSCRIBE_MAX_BYTES) return "";
      const { data: blob, error } = await db.storage
        .from(ticket.bucket)
        .download(ticket.object_path);
      if (error || !blob) return "";
      const file = await toFile(blob, ticket.original_name || "audio", {
        type: ticket.declared_mime || undefined,
      });
      return await transcribeAudioBlob(file);
    }

    // Vídeo: extrai só a faixa de áudio para caber no limite da IA.
    if (ticket.category === "VIDEO") {
      if (size > VIDEO_DOWNLOAD_MAX_BYTES) return "";
      const { data: blob, error } = await db.storage
        .from(ticket.bucket)
        .download(ticket.object_path);
      if (error || !blob) return "";

      const videoBuffer = Buffer.from(await blob.arrayBuffer());
      const extension =
        { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }[
          ticket.declared_mime
        ] || "mp4";

      const audioBuffer = await extractAudioFromVideo(videoBuffer, extension);
      if (audioBuffer && audioBuffer.length > 0) {
        if (audioBuffer.length > TRANSCRIBE_MAX_BYTES) return "";
        const file = await toFile(audioBuffer, "audio-do-video.mp3", {
          type: "audio/mpeg",
        });
        return await transcribeAudioBlob(file);
      }

      // Fallback sem ffmpeg: envia o vídeo direto apenas se couber no limite.
      if (size <= TRANSCRIBE_MAX_BYTES) {
        const file = await toFile(blob, ticket.original_name || "video", {
          type: ticket.declared_mime || undefined,
        });
        return await transcribeAudioBlob(file);
      }
      return "";
    }

    return "";
  } catch (error) {
    console.warn("[CasoIA/Transcrição] Falha não fatal:", {
      category: ticket?.category,
      message: error?.message,
    });
    return "";
  }
}

function buildPrompt({ descricao, area, transcricao }) {
  const guia = Object.entries(SOCIAL_TYPE_GUIDE)
    .map(([code, text]) => `- ${code}: ${text}`)
    .join("\n");

  const relato = [
    descricao ? `RELATO ESCRITO:\n${descricao}` : "",
    transcricao ? `TRANSCRIÇÃO DE ÁUDIO/VÍDEO:\n${transcricao}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `Você é um TRIAGISTA JURÍDICO do SocialJurídico. Classifique o caso do cliente quanto à PRIORIDADE e ao TIPO SOCIAL, sem alterar a área jurídica declarada.

PRIORIDADE (escolha uma):
- URGENTE: risco iminente à vida, integridade física/psicológica, ameaça ativa, violência, saúde grave, prazo/prescrição a vencer, verba alimentar, dano continuado.
- PREFERENCIAL: cliente ou vítima pertence a grupo com prioridade legal (idoso, criança, pessoa com deficiência, gestante) SEM risco imediato caracterizado.
- NORMAL: demanda comum, sem urgência nem prioridade legal.

TIPO SOCIAL (escolha um; use NENHUM se não houver indício claro de que o caso afeta minoria/grupo protegido — negros, idosos, crianças, mulheres em contexto de violência de gênero, LGBTQIA+, ou vítimas de trabalho escravo):
${guia}
- NENHUM: não se enquadra em nenhum dos tipos sociais acima.

REGRAS:
1. "titulo": crie um título curto e objetivo (máx. 80 caracteres) que resuma o caso, com base no relato/transcrição e na área jurídica declarada ("${area || "não informada"}"). Sem ponto final, sem aspas, linguagem clara. Ex.: "Ameaças e disputa de guarda contra a mãe".
2. "areaSugerida": a área jurídica provável do caso (ex.: "Direito de Família", "Direito Penal", "Direito do Trabalho"). Se o cliente já declarou a área, repita-a; senão infira a mais provável pelo relato.
3. "riscoVida": responda true SOMENTE quando houver risco iminente à vida ou à integridade física por agressão em curso, tentativa de homicídio, ameaça de morte, violência física atual ou situação de perigo imediato. Caso contrário, false.
4. Só atribua um TIPO SOCIAL diferente de NENHUM quando houver indício real no relato. Na dúvida, use NENHUM.
5. A área jurídica declarada pelo cliente NÃO deve ser alterada; o tipo social é uma camada adicional.
6. "proximosPassos": 3 a 5 passos concretos e ordenados para o advogado agir agora, específicos ao caso.
7. Justificativas objetivas (1 a 3 frases). Não prometa resultado. Responda somente no schema JSON.

${relato}`;
}

/**
 * Classifica um caso (prioridade + tipo social) a partir do relato escrito e,
 * quando presentes, das transcrições de áudio/vídeo. Nunca lança: em qualquer
 * falha retorna o fallback NORMAL/NENHUM para não bloquear a publicação.
 *
 * @param {object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.db
 * @param {string} params.descricao
 * @param {string} params.area
 * @param {Array<object>} [params.tickets] uploads resolvidos (inclui transcricao cacheada)
 * @param {boolean} [params.cacheTranscription] grava a transcrição na row do upload
 */
export async function classifyCase({
  db,
  descricao,
  area,
  tickets = [],
  cacheTranscription = false,
}) {
  if (!openai) return cloneFallback();

  // Transcrição em escopo externo para ser preservada mesmo se a classificação
  // (chamada de chat) falhar depois.
  let transcricao = "";
  try {
    const mediaTickets = (tickets || []).filter(
      (ticket) => ticket?.category === "AUDIO" || ticket?.category === "VIDEO",
    );

    const transcripts = [];
    for (const ticket of mediaTickets) {
      // Reusa cache quando disponível (evita transcrever o mesmo arquivo 2x).
      const cached = clampText(ticket?.transcricao, 12000);
      if (cached) {
        transcripts.push(cached);
        continue;
      }

      const text = await transcribeTicket(db, ticket);
      if (!text) continue;
      transcripts.push(text);

      if (cacheTranscription && ticket?.id) {
        await db
          .from("client_case_uploads")
          .update({ transcricao: text, transcribed_at: new Date().toISOString() })
          .eq("id", ticket.id)
          .then(
            () => null,
            (error) =>
              console.warn("[CasoIA/CacheTranscrição] Falha ao gravar:", {
                id: ticket.id,
                message: error?.message,
              }),
          );
      }
    }
    transcricao = clampText(transcripts.join("\n\n"), 12000);
  } catch (error) {
    console.warn("[CasoIA/Transcrição] Falha ao transcrever mídias:", {
      message: error?.message,
    });
  }

  try {
    const relatoEscrito = clampText(descricao, 12000);
    if (!relatoEscrito && !transcricao) {
      return cloneFallback({ meta: { transcricao } });
    }

    const completion = await openai.chat.completions.create({
      model: CLASSIFY_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você responde somente JSON válido para classificação social/prioridade de casos jurídicos brasileiros. Seja prudente e objetivo.",
        },
        {
          role: "user",
          content: buildPrompt({ descricao: relatoEscrito, area, transcricao }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: CLASSIFICATION_SCHEMA,
      },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    const proximosPassos = Array.isArray(parsed.proximosPassos)
      ? parsed.proximosPassos
          .map((step) => ({
            titulo: clampText(step?.titulo, 120),
            descricao: clampText(step?.descricao, 800),
          }))
          .filter((step) => step.titulo || step.descricao)
          .slice(0, 6)
      : [];

    return {
      titulo: clampText(parsed.titulo, 180),
      areaSugerida: clampText(parsed.areaSugerida, 120),
      prioridade: normalizePriority(parsed.prioridade),
      riscoVida: parsed.riscoVida === true,
      tipoSocial: normalizeSocialType(parsed.tipoSocial),
      proximosPassos,
      meta: {
        prioridadeJustificativa: clampText(parsed.prioridadeJustificativa, 900),
        tipoSocialJustificativa: clampText(parsed.tipoSocialJustificativa, 900),
        resumo: clampText(parsed.resumo, 900),
        transcricao,
        classifierError: null,
      },
    };
  } catch (error) {
    console.error("[CasoIA/Classificação] Falha não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return cloneFallback({
      meta: { transcricao, classifierError: "AI_UNAVAILABLE" },
    });
  }
}

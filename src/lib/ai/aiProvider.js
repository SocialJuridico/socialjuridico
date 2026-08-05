import { getGroqClient, isGroqAvailable } from "./groqClient";

// ---------------------------------------------------------------------------
// Abstração de provedor de IA (migração temporária OpenAI -> Groq).
//
// Toda a IA do projeto passa por aqui. Hoje o provedor ativo é a Groq, mas a
// escolha é controlada por AI_PROVIDER, de modo que a OpenAI pode ser
// reativada no futuro sem refatorar as rotas.
//
// Como a Groq é compatível com o formato da OpenAI, o restante do código
// continua usando `client.chat.completions.create(...)` e
// `client.audio.transcriptions.create(...)` exatamente como antes.
// ---------------------------------------------------------------------------

export const AI_PROVIDER = process.env.AI_PROVIDER || "groq";

// Modelos (configuráveis por ambiente, com defaults seguros).
export const AI_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const AI_FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile";
export const AI_FAST_MODEL =
  process.env.GROQ_FAST_MODEL || "llama-3.1-8b-instant";
export const AI_TRANSCRIBE_MODEL =
  process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

// Modelo com suporte a visão (imagens). Os modelos de texto acima NÃO
// processam `image_url`; a Groq oferece um modelo multimodal específico.
export const AI_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

// Ordem de tentativa de modelos de texto (principal -> fallback -> rápido).
export const DEFAULT_MODELS = [AI_MODEL, AI_FALLBACK_MODEL, AI_FAST_MODEL];

/**
 * Retorna o cliente compatível (formato OpenAI) do provedor ativo.
 * Lança um erro claro caso a chave não esteja configurada.
 */
export function getAIClient() {
  if (AI_PROVIDER === "groq") {
    return getGroqClient();
  }
  throw new Error(`Provedor de IA não suportado: ${AI_PROVIDER}`);
}

/**
 * Versão que NÃO lança: retorna o cliente ou `null` se a IA não estiver
 * configurada. Preserva o padrão usado nas rotas atuais
 * (`const openai = OPENAI_API_KEY ? new OpenAI(...) : null`).
 */
export function getAIClientOrNull() {
  try {
    if (AI_PROVIDER === "groq") {
      return isGroqAvailable() ? getGroqClient() : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Indica se o provedor de IA ativo está configurado. Não lança.
 */
export function isAIAvailable() {
  if (AI_PROVIDER === "groq") return isGroqAvailable();
  return false;
}

/**
 * Higieniza uma resposta que pode vir dentro de um bloco Markdown ```json.
 * Nunca lança; retorna o valor original se não for string.
 */
export function cleanJsonResponse(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Faz `JSON.parse` de forma tolerante: higieniza blocos Markdown e nunca
 * derruba a aplicação. Retorna `fallback` (default `null`) em caso de erro.
 */
export function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(cleanJsonResponse(value));
  } catch {
    return fallback;
  }
}

// Modelos da Groq que suportam `response_format: { type: "json_schema" }`
// (structured outputs estritos). Para os demais, faz-se o downgrade seguro
// para `json_object`, mantendo a instrução de schema no prompt do chamador.
const JSON_SCHEMA_CAPABLE = [
  /gpt-oss/i,
  /kimi-k2/i,
  /moonshotai/i,
];

/**
 * Normaliza o `response_format` para o provedor/modelo ativo.
 *
 * A Groq só aceita `json_schema` estrito em alguns modelos. Quando o modelo
 * atual não suporta, faz-se o downgrade para `{ type: "json_object" }`, que é
 * amplamente suportado. As rotas já validam/parseiam o JSON manualmente, então
 * o downgrade é seguro (o schema continua descrito no prompt).
 */
export function normalizeResponseFormat(responseFormat, model = AI_MODEL) {
  if (!responseFormat || responseFormat.type !== "json_schema") {
    return responseFormat;
  }

  if (AI_PROVIDER !== "groq") {
    return responseFormat;
  }

  const supportsJsonSchema = JSON_SCHEMA_CAPABLE.some((rx) => rx.test(model));
  if (supportsJsonSchema) {
    return responseFormat;
  }

  return { type: "json_object" };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new TypeError("messages deve ser um array.");
  }

  return messages
    .filter(
      (message) =>
        message &&
        typeof message.content === "string" &&
        ["system", "user", "assistant"].includes(message.role)
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

/**
 * Decide se vale a pena tentar o próximo modelo. Só faz fallback em
 * condições transitórias do provedor (timeout, rate limit, indisponibilidade,
 * erro interno). NUNCA faz fallback em erros de autenticação (401/403) ou de
 * requisição inválida (400/422), para não mascarar problemas de configuração.
 */
export function shouldTryFallback(error) {
  const status = error?.status || error?.response?.status;

  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}


/**
 * Geração central de resposta de texto com fallback automático entre modelos.
 *
 * Mantém a mesma assinatura de alto nível usada no projeto (messages,
 * temperature, maxTokens, responseFormat, signal) e devolve o texto pronto
 * junto de metadados internos (provider, model, usage) — nunca expõe segredos.
 */
export async function generateAIResponse({
  messages,
  temperature = 0.2,
  maxTokens = 1200,
  responseFormat,
  signal,
  models,
}) {
  const client = getAIClient();
  const normalizedMessages = normalizeMessages(messages);

  if (normalizedMessages.length === 0) {
    throw new Error("Nenhuma mensagem válida foi fornecida para a IA.");
  }

  const modelChain =
    Array.isArray(models) && models.length ? models : DEFAULT_MODELS;

  let lastError;

  for (const model of modelChain) {
    try {
      const request = {
        model,
        messages: normalizedMessages,
        temperature,
        max_tokens: maxTokens,
      };

      if (responseFormat) {
        request.response_format = responseFormat;
      }

      const options = signal ? { signal } : undefined;
      const response = await client.chat.completions.create(request, options);

      const content = response?.choices?.[0]?.message?.content?.trim();

      if (!content) {
        // Resposta vazia é tratada como falha transitória -> aciona fallback.
        const emptyError = new Error(
          `O modelo ${model} retornou uma resposta vazia.`
        );
        emptyError.status = 502;
        throw emptyError;
      }

      return {
        content,
        provider: AI_PROVIDER,
        model,
        usage: response.usage || null,
      };
    } catch (error) {
      lastError = error;

      // Log interno mínimo: sem prompts, sem dados sensíveis, sem chave.
      console.error("[AI] Falha na geração", {
        provider: AI_PROVIDER,
        model,
        status: error?.status,
        errorCode: error?.code,
        message: error?.message,
      });

      if (!shouldTryFallback(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `Todos os modelos de IA falharam: ${
      lastError?.message || "erro desconhecido"
    }`
  );
}

/**
 * Transcrição de áudio (fala -> texto) usando o modelo Whisper da Groq.
 *
 * O parâmetro `file` deve estar no formato aceito pelo SDK (File/Blob/stream
 * ou objeto criado com `toFile`), exatamente como o fluxo de upload atual já
 * fornece. Não altera validações de tamanho/formato/duração das rotas.
 */
export async function transcribeAudio(file, options = {}) {
  const client = getAIClient();

  if (!file) {
    throw new Error("Arquivo de áudio não fornecido.");
  }

  const transcription = await client.audio.transcriptions.create({
    file,
    model: AI_TRANSCRIBE_MODEL,
    language: options.language || "pt",
    response_format: options.responseFormat || "json",
  });

  const text = transcription?.text?.trim();

  if (!text) {
    throw new Error("A transcrição retornou conteúdo vazio.");
  }

  return {
    text,
    provider: AI_PROVIDER,
    model: AI_TRANSCRIBE_MODEL,
  };
}

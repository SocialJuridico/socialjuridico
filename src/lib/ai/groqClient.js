import OpenAI from "openai";

// Cliente centralizado da Groq.
//
// A Groq expõe uma API 100% compatível com o formato da OpenAI, então
// reutilizamos o mesmo SDK "openai" já presente no projeto — apenas trocando a
// baseURL e a chave. Isso mantém toda a superfície de chamada existente
// (`chat.completions.create`, `audio.transcriptions.create`, etc.) inalterada.
//
// A chave NUNCA é logada nem exposta. Este módulo só deve rodar no servidor.

let groqClient = null;

/**
 * Retorna (e memoriza) a instância do cliente Groq.
 * Lança um erro claro caso a chave não esteja configurada no ambiente.
 */
export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada no ambiente.");
  }

  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  return groqClient;
}

/**
 * Indica se a Groq está configurada (chave presente). Não lança.
 * Útil para preservar o comportamento das rotas que verificam
 * a disponibilidade da IA antes de chamá-la (ex.: `if (!openai) ...`).
 */
export function isGroqAvailable() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
}

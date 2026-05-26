import { createClient } from "./supabaseServer";
import { supabaseAdmin } from "./supabase";

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const base64 = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Recupera e valida o usuário autenticado por cabeçalho Bearer (para mobile)
 * ou cookies de sessão (para web).
 * ⚠️ NÃO realiza fallback para cookies se houver qualquer tentativa de autenticar por token.
 * 
 * @param {Request} request 
 * @returns {Promise<Object|null>} Usuário autenticado ou null se falhar
 */
export async function getAuthenticatedUser(request) {
  const authHeader = request?.headers?.get("Authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const fallbackToken =
    request?.headers?.get("x-access-token") ||
    (request?.url ? new URL(request.url).searchParams.get("token") : null);
  const token = headerToken || fallbackToken;

  if (token && token !== "null" && token !== "undefined") {
    if (!supabaseAdmin) {
      console.error("[authServerUtils] supabaseAdmin não inicializado");
      return null;
    }
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (user && !error) return user;

    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      const {
        data: { user: adminUser },
        error: adminError,
      } = await supabaseAdmin.auth.admin.getUserById(payload.sub);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (
        adminUser &&
        !adminError &&
        (!payload.exp || payload.exp > nowInSeconds)
      ) {
        return adminUser;
      }
    }
    console.error("[authServerUtils] Falha na validação do token, barrando requisição");
    return null; // Força falha, não cai nos cookies
  }

  // Se nenhum token de Authorization foi enviado, usa cookies do navegador (sessão web)
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!authError && user) return user;

  return null;
}

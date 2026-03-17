/**
 * Rate Limiting Middleware
 * ⚠️ NOTA: Esta é uma implementação em memória para desenvolvimento
 * Para produção, use Redis ou serviço de rate limiting dedicado
 */

const requestCounts = new Map();
const CLEANUP_INTERVAL = 60 * 1000; // 1 minuto

// Limpar registros antigos periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    // Se nenhuma requisição nos últimos 15 minutos, remover
    if (now - data.lastReset > 15 * 60 * 1000) {
      requestCounts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Middleware de rate limiting por IP/usuário
 * @param {number} maxRequests - Número máximo de requisições
 * @param {number} windowMs - Janela de tempo em ms
 * @returns {Function} Middleware function
 */
export function rateLimit(maxRequests = 100, windowMs = 60 * 1000) {
  return (request) => {
    // Extrair identificador (IP ou User ID)
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      request.ip ||
      "unknown";

    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, {
        count: 0,
        lastReset: now,
      });
    }

    const data = requestCounts.get(key);

    // Se passou da janela, resetar contador
    if (now - data.lastReset > windowMs) {
      data.count = 0;
      data.lastReset = now;
    }

    data.count++;

    // Retornar informações para header de resposta
    return {
      count: data.count,
      maxRequests,
      remaining: Math.max(0, maxRequests - data.count),
      resetTime: new Date(data.lastReset + windowMs),
      isLimited: data.count > maxRequests,
    };
  };
}

/**
 * Throttle por endpoint
 * Configuração recomendada de rate limits por tipo de API
 */
export const RATE_LIMIT_CONFIG = {
  // APIs públicas (login, cadastro)
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests / 15 min

  // APIs de leitura
  read: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests / min

  // APIs de escrita
  write: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests / min

  // APIs de IA (uso intensivo de recursos)
  ai: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests / min

  // APIs críticas (exclusão, admin)
  critical: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests / min
};

/**
 * Determina qual config usar baseado na rota
 */
export function getRateLimitConfig(pathname) {
  if (
    pathname.includes("/auth/") ||
    pathname.includes("/login") ||
    pathname.includes("/cadastro")
  ) {
    return RATE_LIMIT_CONFIG.auth;
  }
  if (pathname.includes("/redator") || pathname.includes("/chat-ai")) {
    return RATE_LIMIT_CONFIG.ai;
  }
  if (
    pathname.includes("/admin") &&
    (pathname.includes("/DELETE") || pathname.includes("/delete"))
  ) {
    return RATE_LIMIT_CONFIG.critical;
  }
  if (pathname.match(/\/(POST|PUT|PATCH|DELETE)$/)) {
    return RATE_LIMIT_CONFIG.write;
  }
  return RATE_LIMIT_CONFIG.read;
}

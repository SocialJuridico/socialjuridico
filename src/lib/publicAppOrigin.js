export const DEFAULT_PUBLIC_APP_ORIGIN = "https://socialjuridico.com.br";

const TRUSTED_PRODUCTION_HOSTS = new Set([
  "socialjuridico.com.br",
  "www.socialjuridico.com.br",
]);

function firstHeaderValue(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  );
}

function normalizeOrigin(
  value,
  { rejectLoopback = false, requireHttps = false } = {},
) {
  if (!value) return null;

  try {
    const url = new URL(String(value).trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (requireHttps && url.protocol !== "https:") return null;
    if (rejectLoopback && isLoopbackHostname(url.hostname)) return null;
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function originHost(value) {
  const origin = normalizeOrigin(value);
  if (!origin) return null;

  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function originUrl(value) {
  const origin = normalizeOrigin(value);
  if (!origin) return null;

  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function requestHostCandidates(request) {
  if (!request) return [];

  const candidates = [
    request.headers?.get?.("x-forwarded-host"),
    request.headers?.get?.("host"),
  ];

  try {
    candidates.push(new URL(request.url).host);
  } catch {
    // request.url can be unavailable in unit-level mocks.
  }

  return [
    ...new Set(
      candidates
        .flatMap((value) => String(value || "").split(","))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function requestOrigin(request, { production }) {
  if (!request) return null;

  const forwardedHost = firstHeaderValue(
    request.headers?.get?.("x-forwarded-host") || request.headers?.get?.("host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers?.get?.("x-forwarded-proto"),
  );

  const candidates = [];
  if (forwardedHost) {
    let protocol = "http";
    if (production) {
      protocol = "https";
    } else if (["http", "https"].includes(forwardedProto)) {
      protocol = forwardedProto;
    } else {
      try {
        protocol = new URL(request.url).protocol.replace(":", "") || "http";
      } catch {
        protocol = "http";
      }
    }
    candidates.push(`${protocol}://${forwardedHost}`);
  }
  candidates.push(request.url);

  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate, {
      rejectLoopback: production,
      requireHttps: production,
    });
    if (!origin) continue;
    if (!production) return origin;

    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      if (TRUSTED_PRODUCTION_HOSTS.has(hostname)) return origin;
    } catch {
      // Ignora cabeçalhos de host inválidos ou não confiáveis.
    }
  }

  return null;
}

function configuredOrigin(env, { production }) {
  for (const candidate of [env.NEXT_PUBLIC_SITE_URL, env.NEXT_PUBLIC_APP_URL]) {
    const origin = normalizeOrigin(candidate, {
      rejectLoopback: production,
      requireHttps: production,
    });
    if (origin) return origin;
  }
  return null;
}

export function resolvePublicAppOrigin(request, env = process.env) {
  const production = String(env.NODE_ENV || "").toLowerCase() === "production";

  if (production) {
    return (
      requestOrigin(request, { production: true }) ||
      configuredOrigin(env, { production: true }) ||
      DEFAULT_PUBLIC_APP_ORIGIN
    );
  }

  return (
    configuredOrigin(env, { production: false }) ||
    requestOrigin(request, { production: false }) ||
    "http://localhost:3000"
  );
}

export function resolveStaticPublicAppOrigin(env = process.env) {
  const production = String(env.NODE_ENV || "").toLowerCase() === "production";
  return (
    configuredOrigin(env, { production }) ||
    (production ? DEFAULT_PUBLIC_APP_ORIGIN : "http://localhost:3000")
  );
}

export function isTrustedPublicMutationOrigin(request, candidate) {
  const candidateUrl = originUrl(candidate);
  if (!candidateUrl) return false;

  const candidateHost = candidateUrl.host.toLowerCase();
  const withoutWww = candidateHost.replace(/^www\./, "");

  if (
    TRUSTED_PRODUCTION_HOSTS.has(withoutWww) &&
    candidateUrl.protocol !== "https:"
  ) {
    return false;
  }

  const trustedHosts = new Set(requestHostCandidates(request));

  for (const value of [
    resolvePublicAppOrigin(request),
    resolveStaticPublicAppOrigin(),
    DEFAULT_PUBLIC_APP_ORIGIN,
    "https://www.socialjuridico.com.br",
  ]) {
    const host = originHost(value);
    if (host) trustedHosts.add(host);
  }

  const withWww = candidateHost.startsWith("www.")
    ? candidateHost
    : `www.${candidateHost}`;

  return (
    trustedHosts.has(candidateHost) ||
    trustedHosts.has(withoutWww) ||
    trustedHosts.has(withWww) ||
    TRUSTED_PRODUCTION_HOSTS.has(withoutWww)
  );
}

export function hasTrustedMutationOrigin(request, { allowMissingOrigin = true } = {}) {
  const authorization = request?.headers?.get?.("authorization");
  if (authorization?.startsWith("Bearer ")) return true;

  const origin = request?.headers?.get?.("origin");
  if (origin) return isTrustedPublicMutationOrigin(request, origin);

  const referer = request?.headers?.get?.("referer");
  if (referer) return isTrustedPublicMutationOrigin(request, referer);

  if (!allowMissingOrigin) {
    return request?.headers?.get?.("sec-fetch-site") === "same-origin";
  }

  return true;
}

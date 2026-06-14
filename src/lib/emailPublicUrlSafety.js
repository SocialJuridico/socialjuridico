import { resolveStaticPublicAppOrigin } from "./publicAppOrigin";

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

const REDIRECT_QUERY_KEYS = [
  "redirect_to",
  "redirectTo",
  "redirect_url",
  "redirectUrl",
  "return_to",
  "returnTo",
  "next",
];

function isLoopbackHost(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return LOOPBACK_HOSTS.has(normalized) || normalized.endsWith(".localhost");
}

function replaceLoopbackOrigin(url, publicOrigin) {
  if (!isLoopbackHost(url.hostname)) return url;

  const canonical = new URL(publicOrigin);
  url.protocol = canonical.protocol;
  url.hostname = canonical.hostname;
  url.port = canonical.port;
  url.username = "";
  url.password = "";
  return url;
}

export function normalizeEmailPublicUrl(
  rawUrl,
  publicOrigin = resolveStaticPublicAppOrigin(),
) {
  try {
    const decodedUrl = String(rawUrl || "").replaceAll("&amp;", "&");
    const url = replaceLoopbackOrigin(new URL(decodedUrl), publicOrigin);

    for (const key of REDIRECT_QUERY_KEYS) {
      const nestedValue = url.searchParams.get(key);
      if (!nestedValue) continue;

      try {
        const nestedUrl = replaceLoopbackOrigin(
          new URL(nestedValue),
          publicOrigin,
        );
        url.searchParams.set(key, nestedUrl.toString());
      } catch {
        // Mantém valores relativos ou que não sejam URLs absolutas.
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function normalizeEmailHtmlPublicUrls(
  html,
  publicOrigin = resolveStaticPublicAppOrigin(),
) {
  if (typeof html !== "string" || !html) return html;

  return html.replace(
    /(\b(?:href|src)\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi,
    (match, prefix, quote, url) =>
      `${prefix}${quote}${normalizeEmailPublicUrl(url, publicOrigin)}${quote}`,
  );
}

export function normalizeEmailTextPublicUrls(
  text,
  publicOrigin = resolveStaticPublicAppOrigin(),
) {
  if (typeof text !== "string" || !text) return text;

  return text.replace(/https?:\/\/[^\s<>"']+/gi, (url) =>
    normalizeEmailPublicUrl(url, publicOrigin),
  );
}

export function sanitizeEmailPayloadPublicUrls(
  payload,
  publicOrigin = resolveStaticPublicAppOrigin(),
) {
  if (!payload || typeof payload !== "object") return payload;

  return {
    ...payload,
    html: normalizeEmailHtmlPublicUrls(payload.html, publicOrigin),
    text: normalizeEmailTextPublicUrls(payload.text, publicOrigin),
  };
}

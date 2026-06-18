const stores = new Map();

function getStore(scope) {
  if (!stores.has(scope)) stores.set(scope, new Map());
  return stores.get(scope);
}

export function getSignatureRequestIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

export function enforceSignatureAuthRateLimit({ scope, key, limit, windowMs }) {
  const store = getStore(scope);
  const now = Date.now();

  for (const [storedKey, entry] of store) {
    if (now - entry.startedAt > windowMs) store.delete(storedKey);
  }

  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, startedAt: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - entry.startedAt)) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}


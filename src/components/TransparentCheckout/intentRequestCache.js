export function getOrCreateIntentRequest(cache, key, createRequest) {
  if (!cache || typeof createRequest !== "function") {
    throw new Error("Cache ou fábrica de intent inválidos.");
  }

  if (cache.key === key && cache.promise) {
    return cache.promise;
  }

  const promise = Promise.resolve().then(createRequest);
  cache.key = key;
  cache.promise = promise;

  promise.catch(() => {
    if (cache.promise === promise) {
      cache.key = "";
      cache.promise = null;
    }
  });

  return promise;
}

export function resetIntentRequestCache(cache) {
  if (!cache) return;
  cache.key = "";
  cache.promise = null;
}

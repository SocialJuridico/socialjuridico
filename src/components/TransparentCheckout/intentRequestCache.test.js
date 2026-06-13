import {
  getOrCreateIntentRequest,
  resetIntentRequestCache,
} from "./intentRequestCache";

describe("intentRequestCache", () => {
  test("reutiliza a mesma promessa para a mesma chave", async () => {
    const cache = { key: "", promise: null };
    const factory = jest.fn().mockResolvedValue({ clientSecret: "pi_secret" });

    const first = getOrCreateIntentRequest(cache, "juris-20", factory);
    const second = getOrCreateIntentRequest(cache, "juris-20", factory);

    await expect(first).resolves.toEqual({ clientSecret: "pi_secret" });
    await expect(second).resolves.toEqual({ clientSecret: "pi_secret" });
    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("libera o cache quando a requisição falha", async () => {
    const cache = { key: "", promise: null };
    const factory = jest.fn().mockRejectedValue(new Error("falhou"));

    await expect(
      getOrCreateIntentRequest(cache, "juris-10", factory),
    ).rejects.toThrow("falhou");

    await Promise.resolve();
    expect(cache).toEqual({ key: "", promise: null });
  });

  test("permite reset explícito para nova tentativa", () => {
    const cache = { key: "juris-50", promise: Promise.resolve({}) };
    resetIntentRequestCache(cache);
    expect(cache).toEqual({ key: "", promise: null });
  });
});

import {
  TRIAGE_QUESTIONS,
  computeFallbackIntentScore,
  getIntentTier,
} from "../caseIntentQuestions";

describe("caseIntentQuestions", () => {
  test("exposes exactly 4 questions with 4 options each", () => {
    expect(TRIAGE_QUESTIONS).toHaveLength(4);
    TRIAGE_QUESTIONS.forEach((question) => {
      expect(question.options).toHaveLength(4);
    });
  });

  test("best-case answers score 100", () => {
    const score = computeFallbackIntentScore({
      objetivo: "CONDUZIR",
      prazo: "AGORA",
      advogadoAtual: "NAO",
      disponibilidade: "HOJE",
    });
    expect(score).toBe(100);
  });

  test("worst-case answers score 0", () => {
    const score = computeFallbackIntentScore({
      objetivo: "INFORMACAO",
      prazo: "NAO_PRETENDE",
      advogadoAtual: "JA_CONTRATADO",
      disponibilidade: "NAO_PRONTO",
    });
    expect(score).toBe(0);
  });

  test("clamps and defaults missing/unknown answers to 0 points", () => {
    const score = computeFallbackIntentScore({ objetivo: "CONDUZIR" });
    expect(score).toBe(30);
    expect(computeFallbackIntentScore(null)).toBe(0);
  });

  test("getIntentTier matches the RPC's tier boundaries", () => {
    expect(getIntentTier(null)).toBe("LEGADO");
    expect(getIntentTier(undefined)).toBe("LEGADO");
    expect(getIntentTier(100)).toBe("ALTA");
    expect(getIntentTier(80)).toBe("ALTA");
    expect(getIntentTier(79)).toBe("MEDIA");
    expect(getIntentTier(60)).toBe("MEDIA");
    expect(getIntentTier(59)).toBe("ORACULO");
    expect(getIntentTier(0)).toBe("ORACULO");
  });
});

// O módulo decide, na importação, se a IA está disponível a partir de
// process.env.OPENAI_API_KEY. Este projeto carrega .env.local via next/jest,
// então o teste precisa isolar o módulo (resetModules + require dinâmico)
// para exercitar o caminho "sem IA" de forma determinística, sem depender do
// ambiente local nem fazer chamadas reais à OpenAI.
describe("classifyClosingIntent", () => {
  const baseParams = {
    respostas: {
      objetivo: "INFORMACAO",
      prazo: "NAO_PRETENDE",
      advogadoAtual: "JA_CONTRATADO",
      disponibilidade: "NAO_PRONTO",
    },
    area: "Trabalhista",
    descricao: "Relato de teste.",
  };

  test("falls back to the deterministic score when OPENAI_API_KEY is absent", async () => {
    jest.resetModules();
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { classifyClosingIntent } = require("../caseIntentClassifierServer");
      const result = await classifyClosingIntent(baseParams);

      expect(result).toEqual({
        intencaoFechamento: 0,
        meta: { justificativa: "", classifierError: "AI_UNAVAILABLE" },
      });
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      jest.resetModules();
    }
  });

  test("never throws even with empty answers", async () => {
    jest.resetModules();
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { classifyClosingIntent } = require("../caseIntentClassifierServer");
      await expect(
        classifyClosingIntent({ respostas: {}, area: "", descricao: "" }),
      ).resolves.toEqual(
        expect.objectContaining({ intencaoFechamento: 0 }),
      );
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      jest.resetModules();
    }
  });
});

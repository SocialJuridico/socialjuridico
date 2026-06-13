import {
  buildServiceAdSummary,
  buildServiceAdWhatsAppUrl,
  isValidServiceAdPhone,
  matchesServiceAdSearch,
  normalizeServiceAdCategory,
  normalizeServiceAdFeatured,
  normalizeServiceAdPhone,
  normalizeServiceAdSort,
  normalizeServiceAdWhatsAppPhone,
  serializeServiceAdSummary,
} from "./serviceAdValidation";

describe("serviceAdValidation", () => {
  it("normaliza categoria, destaque e ordenacao", () => {
    expect(normalizeServiceAdCategory("prepostos")).toBe("PREPOSTOS");
    expect(normalizeServiceAdCategory("invalida")).toBe("ALL");
    expect(normalizeServiceAdCategory("invalida", "OUTROS")).toBe("OUTROS");
    expect(normalizeServiceAdFeatured("featured")).toBe("FEATURED");
    expect(normalizeServiceAdFeatured("qualquer")).toBe("ALL");
    expect(normalizeServiceAdSort("recent")).toBe("RECENT");
    expect(normalizeServiceAdSort("qualquer")).toBe("RELEVANCE");
  });

  it("normaliza e valida telefones sem expor formatacao", () => {
    expect(normalizeServiceAdPhone("+55 (51) 99999-0000")).toBe(
      "5551999990000",
    );
    expect(normalizeServiceAdWhatsAppPhone("(51) 99999-0000")).toBe(
      "5551999990000",
    );
    expect(normalizeServiceAdWhatsAppPhone("+55 (51) 99999-0000")).toBe(
      "5551999990000",
    );
    expect(isValidServiceAdPhone("(51) 99999-0000")).toBe(true);
    expect(isValidServiceAdPhone("1234")).toBe(false);
  });

  it("gera url segura do whatsapp com mensagem contextual", () => {
    const url = buildServiceAdWhatsAppUrl(
      "(51) 99999-0000",
      "Preposto para audiência",
    );

    expect(url).toContain("https://wa.me/5551999990000");
    expect(decodeURIComponent(url)).toContain(
      "Preposto para audiência",
    );
    expect(buildServiceAdWhatsAppUrl("123", "Serviço")).toBeNull();
  });

  it("busca sem diferenciar acentos ou caixa", () => {
    const ad = {
      title: "Diligência em cartório",
      description: "Retirada de cópias processuais",
      category: "DILIGENCIAS",
      categoryLabel: "Diligências",
      advertiser: { name: "Apoio Jurídico Sul" },
    };

    expect(matchesServiceAdSearch(ad, "diligencia")).toBe(true);
    expect(matchesServiceAdSearch(ad, "APOIO JURIDICO")).toBe(true);
    expect(matchesServiceAdSearch(ad, "audiência trabalhista")).toBe(false);
  });

  it("resume anuncios, categorias, destaques e parceiros unicos", () => {
    const summary = serializeServiceAdSummary(
      buildServiceAdSummary([
        {
          category: "PREPOSTOS",
          featured: true,
          advertiser: { id: "a" },
        },
        {
          category: "DILIGENCIAS",
          featured: false,
          advertiser: { id: "a" },
        },
        {
          category: "OUTROS",
          featured: true,
          advertiser: { id: "b" },
        },
      ]),
    );

    expect(summary).toEqual({
      total: 3,
      featured: 2,
      prepostos: 1,
      diligencias: 1,
      outros: 1,
      advertisers: 2,
    });
  });
});

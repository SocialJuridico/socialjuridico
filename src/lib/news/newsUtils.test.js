import {
  ARTICLE_STATUS,
  buildExcerpt,
  canTransition,
  checkComplianceRisks,
  ensureUniqueSlug,
  estimateReadingTime,
  generateShareCode,
  sanitizeEditorialHtml,
  slugify,
  validateArticlePayload,
} from "./newsUtils";

describe("slugify", () => {
  it("remove acentos e normaliza espaços", () => {
    expect(slugify("Direitos Trabalhistas e Férias")).toBe(
      "direitos-trabalhistas-e-ferias",
    );
  });

  it("remove caracteres especiais", () => {
    expect(slugify("Golpe do PIX: cuidado!!!")).toBe("golpe-do-pix-cuidado");
  });

  it("lida com entrada inválida", () => {
    expect(slugify(null)).toBe("");
    expect(slugify(123)).toBe("");
  });
});

describe("ensureUniqueSlug", () => {
  it("retorna base quando livre", () => {
    expect(ensureUniqueSlug("meu-titulo", [])).toBe("meu-titulo");
  });

  it("anexa sufixo incremental quando ocupado", () => {
    const taken = new Set(["meu-titulo", "meu-titulo-2"]);
    expect(ensureUniqueSlug("meu-titulo", taken)).toBe("meu-titulo-3");
  });

  it("usa fallback quando slug vazio", () => {
    expect(ensureUniqueSlug("", [])).toBe("materia");
  });
});

describe("estimateReadingTime", () => {
  it("retorna ao menos 1 minuto", () => {
    expect(estimateReadingTime("palavra")).toBe(1);
  });

  it("calcula com base em 225 palavras/min", () => {
    const words = new Array(450).fill("palavra").join(" ");
    expect(estimateReadingTime(words)).toBe(2);
  });

  it("ignora tags HTML", () => {
    expect(estimateReadingTime("<p>texto</p>")).toBe(1);
  });
});

describe("buildExcerpt", () => {
  it("trunca respeitando limite e adiciona reticências", () => {
    const long = new Array(50).fill("palavra").join(" ");
    const excerpt = buildExcerpt(long, 30);
    expect(excerpt.length).toBeLessThanOrEqual(31);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("retorna texto completo quando curto", () => {
    expect(buildExcerpt("curto", 100)).toBe("curto");
  });
});

describe("sanitizeEditorialHtml", () => {
  it("remove scripts", () => {
    expect(sanitizeEditorialHtml("<p>ok</p><script>alert(1)</script>")).toBe(
      "<p>ok</p>",
    );
  });

  it("remove handlers inline", () => {
    const result = sanitizeEditorialHtml('<p onclick="x()">ok</p>');
    expect(result).not.toContain("onclick");
  });

  it("remove tags não permitidas mantendo conteúdo", () => {
    const result = sanitizeEditorialHtml("<div><p>ok</p></div>");
    expect(result).toContain("<p>ok</p>");
    expect(result).not.toContain("<div>");
  });

  it("remove protocolo javascript", () => {
    const result = sanitizeEditorialHtml('<a href="javascript:alert(1)">x</a>');
    expect(result).not.toContain("javascript:");
  });
});

describe("canTransition", () => {
  it("permite transições válidas", () => {
    expect(canTransition("RASCUNHO_IA", "AGUARDANDO_REVISAO")).toBe(true);
    expect(canTransition("APROVADO", "PUBLICADO")).toBe(true);
  });

  it("bloqueia transições inválidas", () => {
    expect(canTransition("PUBLICADO", "RASCUNHO_IA")).toBe(false);
    expect(canTransition("ARQUIVADO", "PUBLICADO")).toBe(false);
  });

  it("permite manter o mesmo status", () => {
    expect(canTransition("PUBLICADO", "PUBLICADO")).toBe(true);
  });
});

describe("validateArticlePayload", () => {
  it("aprova payload válido", () => {
    const result = validateArticlePayload({
      title: "Título com mais de oito caracteres",
      editorial_type: "NOTICIA_JURIDICA",
      status: ARTICLE_STATUS.RASCUNHO_IA,
    });
    expect(result.valid).toBe(true);
  });

  it("rejeita título curto", () => {
    const result = validateArticlePayload({ title: "curto" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejeita tipo editorial inválido", () => {
    const result = validateArticlePayload({
      title: "Título suficientemente longo",
      editorial_type: "INVALIDO",
    });
    expect(result.valid).toBe(false);
  });
});

describe("checkComplianceRisks", () => {
  it("detecta promessa de resultado", () => {
    const result = checkComplianceRisks(
      "Garanto o ganho da sua causa em todos os casos",
    );
    expect(result.ok).toBe(false);
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it("aprova texto informativo neutro", () => {
    const result = checkComplianceRisks(
      "A legislação prevê prazos para o ajuizamento da ação.",
    );
    expect(result.ok).toBe(true);
  });
});

describe("generateShareCode", () => {
  it("gera código do tamanho solicitado", () => {
    expect(generateShareCode(8)).toHaveLength(8);
    expect(generateShareCode(12)).toHaveLength(12);
  });

  it("gera apenas caracteres alfanuméricos", () => {
    expect(generateShareCode(20)).toMatch(/^[a-zA-Z0-9]+$/);
  });
});
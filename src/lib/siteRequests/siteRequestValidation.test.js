import {
  buildSiteSalesWhatsAppUrl,
  isValidSiteRequestEmail,
  isValidSiteRequestPhone,
  normalizeSalesWhatsAppPhone,
  normalizeSiteFeatureList,
  normalizeSiteRequestPayload,
  serializeSiteProject,
  validateSiteRequestPayload,
} from "./siteRequestValidation";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

function validPayload(overrides = {}) {
  return normalizeSiteRequestPayload({
    requestId: UUID,
    projectType: "SITE_INSTITUCIONAL",
    officeName: "Pavanello Advocacia",
    objective:
      "Quero apresentar minhas áreas de atuação e captar contatos qualificados.",
    desiredFeatures: ["WHATSAPP", "SEO"],
    domainStatus: "NEEDS_DOMAIN",
    currentDomain: "",
    deadline: "UP_TO_30_DAYS",
    budgetRange: "FROM_500_TO_1500",
    preferredContact: "WHATSAPP",
    contactPhone: "(51) 99999-0000",
    contactEmail: "advogado@example.com",
    notes: "",
    consent: true,
    ...overrides,
  });
}

describe("siteRequestValidation", () => {
  it("normaliza campos e remove recursos duplicados ou desconhecidos", () => {
    const payload = validPayload({
      desiredFeatures: ["seo", "SEO", "WHATSAPP", "INVALID"],
    });

    expect(payload.desiredFeatures).toEqual(["SEO", "WHATSAPP"]);
    expect(normalizeSiteFeatureList("SEO")).toEqual([]);
  });

  it("valida os dados obrigatorios da solicitacao", () => {
    expect(validateSiteRequestPayload(validPayload())).toEqual({
      valid: true,
      errors: {},
    });

    const invalid = validPayload({
      officeName: "",
      objective: "curto",
      consent: false,
    });
    const result = validateSiteRequestPayload(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      officeName: expect.any(String),
      objective: expect.any(String),
      consent: expect.any(String),
    });
  });

  it("exige contato valido conforme o canal selecionado", () => {
    const invalidPhone = validateSiteRequestPayload(
      validPayload({ preferredContact: "WHATSAPP", contactPhone: "123" }),
    );
    expect(invalidPhone.errors.contactPhone).toBeDefined();

    const invalidEmail = validateSiteRequestPayload(
      validPayload({ preferredContact: "EMAIL", contactEmail: "invalido" }),
    );
    expect(invalidEmail.errors.contactEmail).toBeDefined();

    expect(isValidSiteRequestPhone("(51) 99999-0000")).toBe(true);
    expect(isValidSiteRequestEmail("advogado@example.com")).toBe(true);
  });

  it("exige dominio quando o advogado informa que ja possui um", () => {
    const result = validateSiteRequestPayload(
      validPayload({ domainStatus: "HAS_DOMAIN", currentDomain: "" }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.currentDomain).toBeDefined();
  });

  it("serializa projeto conhecido e aplica fallback seguro", () => {
    expect(serializeSiteProject("LANDING_PAGE")).toMatchObject({
      projectType: "LANDING_PAGE",
      title: "Página Express de Captação",
    });
    expect(serializeSiteProject("INVALID")).toMatchObject({
      projectType: "OUTRO",
      title: "Projeto Personalizado",
    });
  });

  it("gera whatsapp com ddi brasileiro e aceita campo do banco", () => {
    expect(normalizeSalesWhatsAppPhone("(51) 99999-0000")).toBe(
      "5551999990000",
    );

    const url = buildSiteSalesWhatsAppUrl("(51) 99999-0000", {
      id: UUID,
      project_type: "SITE_INSTITUCIONAL",
    });

    expect(url).toContain("https://wa.me/5551999990000");
    expect(decodeURIComponent(url)).toContain("Site Institucional Premium");
    expect(decodeURIComponent(url)).toContain("123E4567");
  });
});

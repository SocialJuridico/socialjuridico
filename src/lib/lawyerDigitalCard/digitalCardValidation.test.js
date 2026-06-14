import {
  buildDigitalCardPublicUrl,
  normalizeCustomLinks,
  normalizePublicUrl,
  slugifyDigitalCard,
  validateDigitalCardMutation,
} from "./digitalCardValidation";

describe("digital card validation", () => {
  test("normalizes a public slug and URL", () => {
    expect(slugifyDigitalCard("  João da Silva OAB/RS  ")).toBe("joao-da-silva-oab-rs");
    expect(normalizePublicUrl("saulopavanello.com.br")).toBe("https://saulopavanello.com.br/");
    expect(normalizePublicUrl("javascript:alert(1)")).toBe("");
    expect(buildDigitalCardPublicUrl("https://socialjuridico.com.br/", "joao-silva")).toBe(
      "https://socialjuridico.com.br/cartao/joao-silva",
    );
  });

  test("limits and sanitizes custom links", () => {
    const links = normalizeCustomLinks([
      { title: "Consulta", url: "agenda.example.com", icon: "calendar" },
      { title: "Consulta", url: "https://example.com/segunda", icon: "unknown" },
      { title: "Inválido", url: "javascript:alert(1)" },
    ]);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ key: "consulta", icon: "calendar", enabled: true });
    expect(links[1]).toMatchObject({ key: "consulta-2", icon: "link" });
  });

  test("validates privacy, appearance and public data", () => {
    const result = validateDigitalCardMutation({
      slug: "joao-silva",
      displayName: "João Silva",
      headline: "Advocacia Empresarial",
      bio: "Atendimento estratégico.",
      avatarUrl: "https://example.com/avatar.jpg",
      publicEmail: "joao@example.com",
      phone: "+55 (11) 99999-9999",
      whatsapp: "+55 (11) 99999-9999",
      website: "joaosilva.adv.br",
      instagram: "@joaoadv",
      linkedin: "joao-advogado",
      youtube: "@joaoadv",
      location: "São Paulo - SP",
      theme: "wine",
      backgroundStyle: "mesh",
      accentColor: "#AABBCC",
      customLinks: [],
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showRating: true,
      showBrand: true,
      isPublished: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      slug: "joao-silva",
      phone: "5511999999999",
      whatsapp: "5511999999999",
      website: "https://joaosilva.adv.br/",
      show_email: true,
      show_phone: false,
      is_published: true,
      accent_color: "#AABBCC",
    });
  });

  test("rejects unsafe public fields", () => {
    const result = validateDigitalCardMutation(
      { slug: "x", publicEmail: "invalid", website: "javascript:alert(1)", accentColor: "gold" },
      { partial: true },
    );
    expect(result.success).toBe(false);
    expect(result.errors).toMatchObject({ slug: expect.any(String), publicEmail: expect.any(String), website: expect.any(String), accentColor: expect.any(String) });
  });
});

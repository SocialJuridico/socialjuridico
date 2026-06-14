import { buildDigitalCardVcard, safeVcardFilename } from "./digitalCardVcard";

describe("digital card vCard", () => {
  test("generates a compatible contact with privacy rules", () => {
    const vcard = buildDigitalCardVcard({
      displayName: "João da Silva",
      headline: "Advocacia Empresarial",
      phone: "5511999999999",
      whatsapp: "5511988888888",
      publicEmail: "joao@example.com",
      website: "https://example.com/",
      location: "São Paulo - SP",
      bio: "Atendimento estratégico.",
      publicUrl: "https://socialjuridico.com.br/cartao/joao-silva",
      showPhone: true,
      showEmail: false,
      showLocation: true,
      profile: { officeName: "Silva Advocacia" },
    });
    expect(vcard).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(vcard).toContain("FN:João da Silva");
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE:+5511999999999");
    expect(vcard).toContain("item1.X-ABLabel:WhatsApp");
    expect(vcard).not.toContain("EMAIL;TYPE=INTERNET");
    expect(vcard).toContain("X-SOCIALPROFILE;TYPE=SOCIALJURIDICO:");
    expect(vcard).toContain("END:VCARD\r\n");
  });

  test("escapes values and builds a safe filename", () => {
    const vcard = buildDigitalCardVcard({
      displayName: "Ana; Souza",
      headline: "Advogada, Sócia",
      publicUrl: "https://socialjuridico.com.br/cartao/ana",
      profile: {},
    });
    expect(vcard).toContain("FN:Ana\\; Souza");
    expect(vcard).toContain("TITLE:Advogada\\, Sócia");
    expect(safeVcardFilename("Ana Júlia / Advocacia")).toBe("Ana-Julia-Advocacia.vcf");
  });
});

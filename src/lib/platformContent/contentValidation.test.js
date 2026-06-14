import {
  normalizeDocumentationSchema,
  validateDocumentationUpdate,
  validateTutorialInput,
  validateTutorialVideo,
} from "./contentValidation";
import { validateDocumentationPdf } from "./documentationAi";

describe("platform content validation", () => {
  test("mantém apenas blocos conhecidos e limita conteúdo", () => {
    const schema = normalizeDocumentationSchema({
      blocks: [
        { type: "paragraph", text: "Conteúdo válido" },
        { type: "script", text: "alert(1)" },
        { type: "slide", title: "Apresentação", bullets: ["Um", "Dois"] },
      ],
    });
    expect(schema.blocks).toHaveLength(2);
    expect(schema.blocks.map((item) => item.type)).toEqual(["paragraph", "slide"]);
  });

  test("valida edição da documentação", () => {
    expect(validateDocumentationUpdate({ title: "A" }).success).toBe(false);
    expect(
      validateDocumentationUpdate({
        title: "Guia oficial",
        contentType: "GUIDE",
        targetAudience: "LAWYER",
      }).success,
    ).toBe(true);
  });

  test("impede vínculo de tutorial com público incorreto", () => {
    const result = validateTutorialInput({
      title: "Publicar caso",
      audience: "LAWYER",
      routeKey: "CLIENT_PUBLISH_CASE",
    });
    expect(result.success).toBe(false);
    expect(result.errors.routeKey).toBeTruthy();
  });

  test("confere assinatura real de PDF", () => {
    const file = { type: "application/pdf", arrayBuffer() {} };
    expect(validateDocumentationPdf(file, Buffer.from("%PDF-1.7\n")).success).toBe(true);
    expect(validateDocumentationPdf(file, Buffer.from("not-pdf")).success).toBe(false);
  });

  test("confere assinatura real de vídeo", () => {
    const mp4 = Buffer.alloc(16);
    mp4.write("ftyp", 4, "ascii");
    const file = { type: "video/mp4", arrayBuffer() {} };
    expect(validateTutorialVideo(file, mp4).success).toBe(true);
    expect(validateTutorialVideo(file, Buffer.from("invalid")).success).toBe(false);
  });
});

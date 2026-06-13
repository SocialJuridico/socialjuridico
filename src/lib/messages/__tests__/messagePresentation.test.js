import {
  conversationKey,
  conversationStatusPresentation,
  mediaKind,
  messageBelongsToConversation,
  messagePreview,
  normalizeMessageText,
  parseMediaMessage,
  serializeMediaMessage,
  summarizeConversations,
} from "../messagePresentation";

describe("messagePresentation", () => {
  test("normaliza texto e respeita o limite informado", () => {
    expect(normalizeMessageText("  Olá\r\ncliente  ")).toBe("Olá\ncliente");
    expect(normalizeMessageText("abcdef", 4)).toBe("abcd");
  });

  test("serializa e interpreta anexos HTTPS", () => {
    const serialized = serializeMediaMessage({
      fileUrl: "https://example.com/documento.pdf",
      fileName: "Contrato.pdf",
      fileType: "application/pdf",
    });
    const parsed = parseMediaMessage(serialized);

    expect(parsed).toEqual({
      isMedia: true,
      fileUrl: "https://example.com/documento.pdf",
      fileName: "Contrato.pdf",
      fileType: "application/pdf",
    });
    expect(mediaKind(parsed.fileType)).toBe("PDF");
  });

  test("rejeita mídia sem HTTPS e mantém texto comum", () => {
    const insecure = JSON.stringify({
      isMedia: true,
      fileUrl: "http://example.com/arquivo.pdf",
      fileName: "Arquivo.pdf",
      fileType: "application/pdf",
    });

    expect(parseMediaMessage(insecure)).toBeNull();
    expect(messagePreview("Uma mensagem normal")).toBe("Uma mensagem normal");
  });

  test("gera prévias sem expor o JSON do anexo", () => {
    expect(
      messagePreview(
        serializeMediaMessage({
          fileUrl: "https://example.com/audio.webm",
          fileName: "voz.webm",
          fileType: "audio/webm",
        }),
      ),
    ).toBe("Mensagem de voz");

    expect(messagePreview("x".repeat(120), 20)).toBe(`${"x".repeat(20)}…`);
  });

  test("separa conversas por caso e negociação", () => {
    expect(conversationKey("case-1", null)).toBe("case-1:case");
    expect(conversationKey("case-1", "interest-1")).toBe(
      "case-1:interest-1",
    );

    expect(
      messageBelongsToConversation(
        { caso_id: "case-1", interest_id: "interest-1" },
        "case-1",
        "interest-1",
      ),
    ).toBe(true);
    expect(
      messageBelongsToConversation(
        { caso_id: "case-1", interest_id: "interest-2" },
        "case-1",
        "interest-1",
      ),
    ).toBe(false);
  });

  test("apresenta corretamente negociação, contratação e caso encerrado", () => {
    expect(
      conversationStatusPresentation({
        mode: "NEGOTIATION",
        interestStatus: "NEGOTIATING",
      }).code,
    ).toBe("NEGOTIATING");

    expect(
      conversationStatusPresentation({
        mode: "NEGOTIATION",
        interestStatus: "HIRED",
      }).code,
    ).toBe("HIRED_NEGOTIATION");

    expect(
      conversationStatusPresentation({
        mode: "CASE",
        caseStatus: "ENCERRADO",
      }).code,
    ).toBe("CLOSED");
  });

  test("resume conversas e mensagens não lidas", () => {
    expect(
      summarizeConversations([
        {
          mode: "NEGOTIATION",
          interestStatus: "NEGOTIATING",
          unreadCount: 2,
        },
        { mode: "CASE", unreadCount: 1 },
        { mode: "NEGOTIATION", interestStatus: "HIRED", unreadCount: 0 },
      ]),
    ).toEqual({
      total: 3,
      unread: 3,
      negotiating: 1,
      activeCases: 1,
    });
  });
});

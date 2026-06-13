import {
  buildChatConversationKey,
  canWriteChatConversation,
  chatAttachmentKind,
  getChatFileExtension,
  isChatUuid,
  normalizeAiScope,
  normalizeChatCursor,
  normalizeChatFileName,
  normalizeChatInterestId,
  normalizeChatText,
  parseLegacyMediaContent,
} from "./chatValidation";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("chatValidation", () => {
  it("valida identificadores e diferencia ausencia de valor invalido", () => {
    expect(isChatUuid(UUID)).toBe(true);
    expect(isChatUuid("invalido")).toBe(false);
    expect(normalizeChatInterestId("")).toBeNull();
    expect(normalizeChatInterestId(UUID)).toBe(UUID);
    expect(normalizeChatInterestId("invalido")).toBeUndefined();
  });

  it("higieniza texto, nome e cursor", () => {
    expect(normalizeChatText("  oi\u0000\r\n tudo bem  ")).toBe(
      "oi\n tudo bem",
    );
    expect(normalizeChatFileName('../contrato:"final".pdf')).toBe(
      "..-contrato-final-.pdf",
    );
    expect(normalizeChatCursor("2026-06-13T12:00:00-03:00")).toBe(
      "2026-06-13T15:00:00.000Z",
    );
    expect(normalizeChatCursor("data-invalida")).toBeUndefined();
  });

  it("aplica leitura e escrita conforme o estado da conversa", () => {
    expect(
      canWriteChatConversation({
        mode: "NEGOTIATION",
        caseStatus: "NEGOCIANDO",
        interestStatus: "NEGOTIATING",
      }),
    ).toBe(true);
    expect(
      canWriteChatConversation({
        mode: "NEGOTIATION",
        caseStatus: "CONTRATADO",
        interestStatus: "HIRED",
      }),
    ).toBe(false);
    expect(
      canWriteChatConversation({
        mode: "CASE",
        caseStatus: "CONTRATADO",
      }),
    ).toBe(true);
    expect(
      canWriteChatConversation({
        mode: "CASE",
        caseStatus: "CANCELADO",
      }),
    ).toBe(false);
  });

  it("classifica anexos permitidos", () => {
    expect(getChatFileExtension("application/pdf")).toBe("pdf");
    expect(
      getChatFileExtension(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
    expect(getChatFileExtension("application/x-executable")).toBeNull();
    expect(chatAttachmentKind("image/png")).toBe("IMAGE");
    expect(chatAttachmentKind("audio/webm")).toBe("AUDIO");
    expect(chatAttachmentKind("application/pdf")).toBe("PDF");
    expect(chatAttachmentKind("application/msword")).toBe("DOCUMENT");
  });

  it("preserva compatibilidade apenas com midia legada https", () => {
    const legacy = parseLegacyMediaContent(
      JSON.stringify({
        isMedia: true,
        fileUrl: "https://storage.example.com/arquivo.pdf",
        fileName: "arquivo.pdf",
        fileType: "application/pdf",
      }),
    );
    expect(legacy).toMatchObject({
      legacy: true,
      kind: "PDF",
      name: "arquivo.pdf",
    });
    expect(
      parseLegacyMediaContent(
        JSON.stringify({
          isMedia: true,
          fileUrl: "javascript:alert(1)",
        }),
      ),
    ).toBeNull();
  });

  it("normaliza escopo da ia e chave da conversa", () => {
    expect(normalizeAiScope("message")).toBe("MESSAGE");
    expect(normalizeAiScope("outro")).toBeNull();
    expect(buildChatConversationKey(UUID)).toBe(`${UUID}:case`);
    expect(buildChatConversationKey(UUID, UUID)).toBe(`${UUID}:${UUID}`);
  });
});

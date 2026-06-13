import {
  MAX_CLIENT_DOCUMENT_BYTES,
  maskClientDocument,
  maskClientPhone,
  normalizeClientPayload,
  normalizeClientQuery,
  validateClientDocument,
  validateClientPayload,
  validateFinancePayload,
  validateInteractionPayload,
} from "./clientValidation";

describe("CRM de clientes - validação compartilhada", () => {
  test("normaliza dados pessoais sem aceitar campos arbitrários", () => {
    expect(
      normalizeClientPayload({
        requestId: "a844d7e5-a620-4fc5-b341-11557f751653",
        name: "  Maria   da Silva ",
        type: "Pessoa Física",
        cpfCnpj: "123.456.789-01",
        phone: "(51) 99999-8888",
        email: " MARIA@EXEMPLO.COM ",
        status: "Ativo",
        lawyerId: "adulterado",
      }),
    ).toEqual({
      requestId: "a844d7e5-a620-4fc5-b341-11557f751653",
      name: "Maria da Silva",
      type: "Pessoa Física",
      cpfCnpj: "12345678901",
      rg: "",
      civilStatus: "",
      profession: "",
      phone: "51999998888",
      address: "",
      email: "maria@exemplo.com",
      notes: "",
      status: "Ativo",
    });
  });

  test("exige UUID idempotente na criação do cliente", () => {
    const invalid = validateClientPayload({
      requestId: "invalido",
      name: "Maria da Silva",
    });
    const valid = validateClientPayload({
      requestId: "a844d7e5-a620-4fc5-b341-11557f751653",
      name: "Maria da Silva",
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors.requestId).toEqual(expect.any(String));
    expect(valid.valid).toBe(true);
  });

  test("rejeita e-mail, telefone e documento com formato inválido", () => {
    const result = validateClientPayload({
      name: "M",
      email: "invalido",
      phone: "123",
      cpfCnpj: "12345",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        cpfCnpj: expect.any(String),
      }),
    );
  });

  test("limita paginação e remove caracteres perigosos da busca", () => {
    const query = normalizeClientQuery(
      new URLSearchParams({
        page: "-10",
        pageSize: "999",
        status: "Ativo",
        scope: "mine",
        search: "Maria%,(teste)@mail.com",
      }),
    );

    expect(query).toEqual({
      page: 1,
      pageSize: 30,
      status: "Ativo",
      scope: "mine",
      search: "Mariateste@mail.com",
    });
  });

  test("mascara documento e telefone na carteira", () => {
    expect(maskClientDocument("12345678901")).toBe("***.456.789-**");
    expect(maskClientDocument("12345678000199")).toBe("**.345.678/****-**");
    expect(maskClientPhone("51999998888")).toBe("(51) *****-8888");
  });

  test("valida interação e lançamento financeiro", () => {
    expect(
      validateInteractionPayload({ type: "reunião", content: "Reunião concluída." })
        .valid,
    ).toBe(true);
    expect(
      validateFinancePayload({
        description: "Honorários iniciais",
        amount: "1500.50",
        dueDate: "2026-06-30",
        status: "PENDENTE",
      }).valid,
    ).toBe(true);
    expect(validateFinancePayload({ description: "", amount: "-1" }).valid).toBe(
      false,
    );
  });

  test("aceita apenas documentos permitidos e respeita 25 MB", () => {
    expect(
      validateClientDocument({
        name: "contrato.pdf",
        type: "application/pdf",
        size: MAX_CLIENT_DOCUMENT_BYTES,
      }).valid,
    ).toBe(true);

    expect(
      validateClientDocument({
        name: "script.exe",
        type: "application/octet-stream",
        size: MAX_CLIENT_DOCUMENT_BYTES + 1,
      }).valid,
    ).toBe(false);
  });
});

import {
  buildGenerationPayload,
  composeGeneratedDocument,
  createEmptyContract,
  createEmptyPowerOfAttorney,
  validateDocumentForm,
} from "./documentGeneratorUtils";

describe("documentGeneratorUtils", () => {
  test("gera payload sem qualificacao das partes", () => {
    const contract = createEmptyContract();
    contract.partyOne.name = "Parte Um";
    contract.partyTwo.name = "Parte Dois";
    contract.purpose = "Prestacao de servicos juridicos por prazo determinado.";
    const payload = buildGenerationPayload("contract", contract, createEmptyPowerOfAttorney());
    expect(payload.type).toBe("Contrato de Honorários");
    expect(payload.facts).toContain(contract.type);
    expect(payload.facts).not.toContain("Parte Um");
    expect(payload.facts).not.toContain("Parte Dois");
  });

  test("monta qualificacoes no documento final", () => {
    const contract = createEmptyContract();
    contract.partyOne = { name: "Parte Um", document: "DOC1", civilStatus: "casada", profession: "empresaria", address: "Endereco A" };
    contract.partyTwo = { name: "Parte Dois", document: "DOC2", civilStatus: "solteiro", profession: "advogado", address: "Endereco B" };
    const result = composeGeneratedDocument("contract", "CLAUSULA DO OBJETO", contract, createEmptyPowerOfAttorney());
    expect(result).toContain("Parte Um");
    expect(result).toContain("Parte Dois");
    expect(result).toContain("CLAUSULA DO OBJETO");
  });

  test("valida campos obrigatorios", () => {
    expect(validateDocumentForm("contract", createEmptyContract(), createEmptyPowerOfAttorney())).toBe("Informe o nome do contratante.");
    expect(validateDocumentForm("power-of-attorney", createEmptyContract(), createEmptyPowerOfAttorney())).toBe("Informe o nome do outorgante.");
  });
});

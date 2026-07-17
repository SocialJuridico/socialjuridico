import { parseArticleIntent } from "./legalLibrarySearch";

const aliasMap = new Map([
  ["codigo civil", "codigo-civil"],
  ["cc", "codigo-civil"],
  ["cdc", "codigo-defesa-consumidor"],
  ["constituicao federal", "constituicao-federal"],
  ["cf", "constituicao-federal"],
]);

describe("parseArticleIntent", () => {
  test("artigo com separador de milhar resolve o número completo", () => {
    // Antes do fix, a normalização quebrava "1.583" em "1 583" e o parse
    // retornava o artigo "1" (incidente: Interpretar IA devolvia sempre Art. 1).
    expect(parseArticleIntent("art. 1.583 do Código Civil", aliasMap)).toEqual({
      collectionSlug: "codigo-civil",
      number: "1583",
    });
    expect(parseArticleIntent("art. 1.634 do Código Civil", aliasMap)).toEqual({
      collectionSlug: "codigo-civil",
      number: "1634",
    });
  });

  test("artigo de até 3 dígitos continua funcionando", () => {
    expect(parseArticleIntent("art 14 cdc", aliasMap)).toEqual({
      collectionSlug: "codigo-defesa-consumidor",
      number: "14",
    });
    expect(parseArticleIntent("art. 227 da CF", aliasMap)).toEqual({
      collectionSlug: "constituicao-federal",
      number: "227",
    });
  });

  test("formato compacto sem 'art' com número de milhar", () => {
    expect(parseArticleIntent("cc 1583", aliasMap)).toEqual({
      collectionSlug: "codigo-civil",
      number: "1583",
    });
  });

  test("sem apelido de coleção -> null", () => {
    expect(parseArticleIntent("responsabilidade civil por danos", aliasMap)).toBeNull();
  });
});

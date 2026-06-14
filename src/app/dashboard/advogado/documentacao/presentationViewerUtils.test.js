import {
  PRESENTATION_MAX_ZOOM,
  PRESENTATION_MIN_ZOOM,
  clampPresentationPage,
  clampPresentationZoom,
  createPresentationFileName,
} from "./presentationViewerUtils";

describe("presentation viewer utils", () => {
  test("limita páginas ao intervalo disponível", () => {
    expect(clampPresentationPage(0, 12)).toBe(1);
    expect(clampPresentationPage(7, 12)).toBe(7);
    expect(clampPresentationPage(99, 12)).toBe(12);
  });

  test("limita o zoom aos valores suportados", () => {
    expect(clampPresentationZoom(0.2)).toBe(PRESENTATION_MIN_ZOOM);
    expect(clampPresentationZoom(1.25)).toBe(1.25);
    expect(clampPresentationZoom(5)).toBe(PRESENTATION_MAX_ZOOM);
  });

  test("gera nome seguro para download", () => {
    expect(createPresentationFileName("Jornada da Assinatura Digital"))
      .toBe("jornada-da-assinatura-digital.pdf");
  });
});

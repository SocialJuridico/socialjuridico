export const PRESENTATION_MIN_ZOOM = 0.75;
export const PRESENTATION_MAX_ZOOM = 2;
export const PRESENTATION_ZOOM_STEP = 0.25;

export function clampPresentationPage(value, pageCount) {
  const total = Math.max(1, Number(pageCount) || 1);
  const page = Math.round(Number(value) || 1);
  return Math.min(total, Math.max(1, page));
}

export function clampPresentationZoom(value) {
  const zoom = Number(value) || 1;
  return Math.min(
    PRESENTATION_MAX_ZOOM,
    Math.max(PRESENTATION_MIN_ZOOM, zoom),
  );
}

export function createPresentationFileName(documentSlug) {
  const safeSlug = String(documentSlug || "apresentacao")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${safeSlug || "apresentacao"}.pdf`;
}

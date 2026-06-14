import { getTutorialRoute, isTutorialRouteAllowed } from "@/lib/platformTutorials/tutorialRoutes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLIDE_STORAGE_PATTERN = /^documentation\/[0-9a-f-]{36}\/v\d+\/slide-\d{3}\.png$/i;
const ALLOWED_DOCUMENT_TYPES = new Set(["ARTICLE", "GUIDE", "PRESENTATION", "MANUAL", "REFERENCE"]);
const ALLOWED_AUDIENCES = new Set(["LAWYER", "CLIENT", "BOTH"]);
const ALLOWED_BLOCK_TYPES = new Set(["heading", "paragraph", "list", "callout", "steps", "table", "quote", "slide", "slide_image"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export function isPlatformUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

export function normalizePlatformText(value, maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function slugifyPlatformContent(value) {
  const slug = normalizePlatformText(value, 180)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || `documento-${Date.now()}`;
}

function normalizeStringArray(value, maxItems = 20, maxLength = 500) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => normalizePlatformText(item, maxLength))
    .filter(Boolean);
}

function normalizeRows(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((row) => normalizeStringArray(row, 10, 240));
}

function normalizePositiveInteger(value, fallback = 0, max = 20000) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return fallback;
  return number;
}

function normalizeSlideStoragePath(value) {
  const path = String(value || "").trim().replace(/\\/g, "/");
  return SLIDE_STORAGE_PATTERN.test(path) ? path : "";
}

export function normalizeDocumentationSchema(value) {
  const input = value && typeof value === "object" ? value : {};
  const rawBlocks = Array.isArray(input.blocks) ? input.blocks : [];
  const blocks = rawBlocks.slice(0, 160).flatMap((rawBlock, index) => {
    if (!rawBlock || typeof rawBlock !== "object") return [];
    const type = normalizePlatformText(rawBlock.type, 30).toLowerCase();
    if (!ALLOWED_BLOCK_TYPES.has(type)) return [];

    const base = {
      id: normalizePlatformText(rawBlock.id, 80) || `block-${index + 1}`,
      type,
      title: normalizePlatformText(rawBlock.title, 180),
    };

    if (["heading", "paragraph", "quote", "callout"].includes(type)) {
      return [{ ...base, text: normalizePlatformText(rawBlock.text, 6000) }];
    }
    if (type === "list") {
      return [{ ...base, items: normalizeStringArray(rawBlock.items, 40, 700) }];
    }
    if (type === "steps") {
      const steps = Array.isArray(rawBlock.steps)
        ? rawBlock.steps.slice(0, 30).map((step, stepIndex) => ({
            title: normalizePlatformText(step?.title, 180) || `Etapa ${stepIndex + 1}`,
            text: normalizePlatformText(step?.text, 1200),
          }))
        : [];
      return [{ ...base, steps }];
    }
    if (type === "table") {
      return [{ ...base, headers: normalizeStringArray(rawBlock.headers, 10, 180), rows: normalizeRows(rawBlock.rows) }];
    }
    if (type === "slide") {
      return [{
        ...base,
        eyebrow: normalizePlatformText(rawBlock.eyebrow, 120),
        text: normalizePlatformText(rawBlock.text, 2200),
        bullets: normalizeStringArray(rawBlock.bullets, 12, 500),
      }];
    }
    if (type === "slide_image") {
      const storagePath = normalizeSlideStoragePath(
        rawBlock.storagePath || rawBlock.storage_path,
      );
      if (!storagePath) return [];
      return [{
        ...base,
        page: normalizePositiveInteger(rawBlock.page, index + 1, 1000),
        storagePath,
        width: normalizePositiveInteger(rawBlock.width, 0),
        height: normalizePositiveInteger(rawBlock.height, 0),
        alt: normalizePlatformText(rawBlock.alt, 240) || `Slide ${index + 1}`,
      }];
    }
    return [];
  });

  return {
    version: 1,
    blocks,
  };
}

export function validateDocumentationUpdate(body, { partial = false } = {}) {
  const errors = {};
  const title = normalizePlatformText(body?.title, 180);
  const subtitle = normalizePlatformText(body?.subtitle, 260);
  const summary = normalizePlatformText(body?.summary, 1200);
  const contentType = normalizePlatformText(body?.contentType || body?.content_type, 30).toUpperCase();
  const audience = normalizePlatformText(body?.targetAudience || body?.target_audience, 20).toUpperCase();

  if (!partial && title.length < 3) errors.title = "Informe um título com pelo menos 3 caracteres.";
  if (title && title.length < 3) errors.title = "Informe um título com pelo menos 3 caracteres.";
  if (contentType && !ALLOWED_DOCUMENT_TYPES.has(contentType)) errors.contentType = "Tipo de documentação inválido.";
  if (audience && !ALLOWED_AUDIENCES.has(audience)) errors.targetAudience = "Público inválido.";

  const sortOrderValue = body?.sortOrder ?? body?.sort_order;
  const sortOrder = sortOrderValue === undefined ? undefined : Number(sortOrderValue);
  if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000)) {
    errors.sortOrder = "Ordem inválida.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    data: {
      ...(title || !partial ? { title } : {}),
      ...(body?.subtitle !== undefined ? { subtitle } : {}),
      ...(body?.summary !== undefined ? { summary } : {}),
      ...(contentType ? { content_type: contentType } : {}),
      ...(audience ? { target_audience: audience } : {}),
      ...(body?.contentSchema !== undefined || body?.content_schema !== undefined
        ? { content_schema: normalizeDocumentationSchema(body?.contentSchema ?? body?.content_schema) }
        : {}),
      ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
    },
  };
}

export function validateTutorialInput(body, { partial = false } = {}) {
  const errors = {};
  const title = normalizePlatformText(body?.title, 180);
  const description = normalizePlatformText(body?.description, 1200);
  const audience = normalizePlatformText(body?.audience, 20).toUpperCase();
  const routeKey = normalizePlatformText(body?.routeKey || body?.route_key, 100).toUpperCase();
  const route = getTutorialRoute(routeKey);

  if (!partial && title.length < 3) errors.title = "Informe um título com pelo menos 3 caracteres.";
  if (title && title.length < 3) errors.title = "Informe um título com pelo menos 3 caracteres.";
  if (!partial && !ALLOWED_AUDIENCES.has(audience)) errors.audience = "Público inválido.";
  if (audience && !ALLOWED_AUDIENCES.has(audience)) errors.audience = "Público inválido.";
  if (!partial && !route) errors.routeKey = "Selecione uma rota válida.";
  if (routeKey && !route) errors.routeKey = "Selecione uma rota válida.";
  if (routeKey && audience && !isTutorialRouteAllowed(routeKey, audience)) {
    errors.routeKey = "A rota não pertence ao público selecionado.";
  }

  const versionValue = body?.version;
  const version = versionValue === undefined ? undefined : Number(versionValue);
  if (version !== undefined && (!Number.isInteger(version) || version < 1 || version > 10000)) {
    errors.version = "Versão inválida.";
  }
  const sortOrderValue = body?.sortOrder ?? body?.sort_order;
  const sortOrder = sortOrderValue === undefined ? undefined : Number(sortOrderValue);
  if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000)) {
    errors.sortOrder = "Ordem inválida.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    data: {
      ...(title || !partial ? { title } : {}),
      ...(body?.description !== undefined ? { description } : {}),
      ...(audience ? { audience } : {}),
      ...(routeKey ? { route_key: routeKey } : {}),
      ...(version !== undefined ? { version } : {}),
      ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
      ...(body?.autoOpen !== undefined || body?.auto_open !== undefined
        ? { auto_open: (body?.autoOpen ?? body?.auto_open) !== false }
        : {}),
    },
  };
}

export function validateTutorialVideo(file, buffer, maxBytes = 250 * 1024 * 1024) {
  if (!file || typeof file.arrayBuffer !== "function" || !buffer?.length) {
    return { success: false, status: 400, message: "Nenhum vídeo válido foi enviado." };
  }
  if (buffer.length > maxBytes) {
    return { success: false, status: 413, message: "O vídeo deve possuir no máximo 250 MB." };
  }
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return { success: false, status: 415, message: "Formato não permitido. Envie MP4 ou WebM." };
  }

  const isMp4 = file.type === "video/mp4" && buffer.subarray(4, 12).toString("ascii").includes("ftyp");
  const isWebm = file.type === "video/webm" && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!isMp4 && !isWebm) {
    return { success: false, status: 415, message: "O conteúdo do arquivo não corresponde ao formato informado." };
  }

  return { success: true, extension: file.type === "video/mp4" ? "mp4" : "webm" };
}
const MAX_SMARTDOC_BYTES = 25 * 1024 * 1024;

const FILE_RULES = Object.freeze({
  pdf: Object.freeze({
    mimeTypes: Object.freeze(["application/pdf"]),
    signature: Object.freeze([0x25, 0x50, 0x44, 0x46, 0x2d]),
  }),
  doc: Object.freeze({
    mimeTypes: Object.freeze(["application/msword"]),
    signature: Object.freeze([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  }),
  docx: Object.freeze({
    mimeTypes: Object.freeze([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    zip: true,
  }),
  jpg: Object.freeze({
    mimeTypes: Object.freeze(["image/jpeg"]),
    signature: Object.freeze([0xff, 0xd8, 0xff]),
  }),
  jpeg: Object.freeze({
    mimeTypes: Object.freeze(["image/jpeg"]),
    signature: Object.freeze([0xff, 0xd8, 0xff]),
  }),
  png: Object.freeze({
    mimeTypes: Object.freeze(["image/png"]),
    signature: Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  }),
});

const ALLOWED_STORAGE_BUCKETS = new Set(["smart-docs", "crm_documents"]);

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array();
}

function startsWithSignature(bytes, signature) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function hasZipSignature(bytes) {
  return (
    startsWithSignature(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWithSignature(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWithSignature(bytes, [0x50, 0x4b, 0x07, 0x08])
  );
}

function containsAscii(bytes, value) {
  if (!value || bytes.length < value.length) return false;
  const expected = new TextEncoder().encode(value);
  outer: for (let index = 0; index <= bytes.length - expected.length; index += 1) {
    for (let offset = 0; offset < expected.length; offset += 1) {
      if (bytes[index + offset] !== expected[offset]) continue outer;
    }
    return true;
  }
  return false;
}

export function normalizeSmartDocFileName(value) {
  const normalized = String(value || "")
    .replace(/[\\/]+/g, "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return normalized || "";
}

export function getSmartDocExtension(fileName) {
  const normalized = normalizeSmartDocFileName(fileName);
  const separator = normalized.lastIndexOf(".");
  return separator > 0 ? normalized.slice(separator + 1).toLowerCase() : "";
}

export function getSmartDocMimeForExtension(extension) {
  return FILE_RULES[String(extension || "").toLowerCase()]?.mimeTypes?.[0] || "";
}

export function validateSmartDocFileMetadata(file) {
  const originalName = String(file?.name || "");
  const fileName = normalizeSmartDocFileName(originalName);
  const extension = getSmartDocExtension(fileName);
  const mimeType = String(file?.type || "").trim().toLowerCase();
  const size = Number(file?.size || 0);
  const rule = FILE_RULES[extension];
  const errors = {};

  if (!fileName || !rule) {
    errors.file = "Envie PDF, DOC, DOCX, JPG ou PNG.";
  } else if (originalName.includes("/") || originalName.includes("\\")) {
    errors.file = "O nome do arquivo contém um caminho inválido.";
  }

  if (!mimeType || !rule?.mimeTypes.includes(mimeType)) {
    errors.file = "A extensão e o tipo MIME do arquivo não correspondem.";
  }

  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_SMARTDOC_BYTES) {
    errors.file = "O arquivo deve possuir no máximo 25 MB.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    fileName,
    extension,
    mimeType,
    size,
  };
}

export function validateSmartDocFileBytes(bytesValue, extension) {
  const bytes = asBytes(bytesValue);
  const rule = FILE_RULES[String(extension || "").toLowerCase()];
  if (!rule || bytes.length === 0) {
    return { valid: false, message: "O conteúdo do arquivo está vazio ou inválido." };
  }

  if (rule.signature && !startsWithSignature(bytes, rule.signature)) {
    return {
      valid: false,
      message: "O conteúdo do arquivo não corresponde à extensão informada.",
    };
  }

  if (rule.zip) {
    const isWordPackage =
      hasZipSignature(bytes) &&
      containsAscii(bytes, "[Content_Types].xml") &&
      containsAscii(bytes, "word/");
    if (!isWordPackage) {
      return {
        valid: false,
        message: "O arquivo DOCX não possui uma estrutura válida do Microsoft Word.",
      };
    }
  }

  return { valid: true, message: "" };
}

export function validateSmartDocUpload(file, bytesValue) {
  const metadata = validateSmartDocFileMetadata(file);
  if (!metadata.valid) return metadata;
  const content = validateSmartDocFileBytes(bytesValue, metadata.extension);
  return {
    ...metadata,
    valid: content.valid,
    errors: content.valid ? {} : { file: content.message },
  };
}

function decodeStorageSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function isSafeSmartDocStoragePath(value) {
  const path = String(value || "");
  if (
    !path ||
    path.length > 1024 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\u0000") ||
    /^[a-z][a-z\d+.-]*:/i.test(path)
  ) {
    return false;
  }

  const segments = path.split("/");
  if (segments.some((segment) => !segment)) return false;

  return segments.every((segment) => {
    const decoded = decodeStorageSegment(segment);
    if (decoded === null || decoded !== decoded.trim()) return false;
    return decoded !== "." && decoded !== ".." && !decoded.includes("/") && !decoded.includes("\\");
  });
}

export function parseSmartDocLegacyStoragePath(fileUrl, bucket = "crm_documents") {
  try {
    const url = new URL(String(fileUrl || ""));
    const encodedBucket = encodeURIComponent(bucket);
    const markers = [
      `/storage/v1/object/public/${encodedBucket}/`,
      `/storage/v1/object/sign/${encodedBucket}/`,
      `/storage/v1/object/authenticated/${encodedBucket}/`,
    ];
    const marker = markers.find((candidate) => url.pathname.includes(candidate));
    if (!marker) return "";
    const path = decodeURIComponent(url.pathname.slice(url.pathname.indexOf(marker) + marker.length));
    return isSafeSmartDocStoragePath(path) ? path : "";
  } catch {
    return "";
  }
}

export function resolveSmartDocStorageTarget(document) {
  const bucket = String(document?.storage_bucket || "crm_documents");
  if (!ALLOWED_STORAGE_BUCKETS.has(bucket)) return null;

  const path =
    String(document?.storage_path || "") ||
    parseSmartDocLegacyStoragePath(document?.file_url, bucket);
  if (!isSafeSmartDocStoragePath(path)) return null;

  if (bucket === "smart-docs") {
    const ownerId = String(document?.lawyer_id || "");
    if (!ownerId || path.split("/")[0] !== ownerId) return null;
  }

  return { bucket, path };
}

export { MAX_SMARTDOC_BYTES };

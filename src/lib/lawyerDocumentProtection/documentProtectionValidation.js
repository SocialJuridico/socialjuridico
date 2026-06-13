import {
  MAX_SMARTDOC_BYTES,
  getSmartDocExtension,
  getSmartDocMimeForExtension,
  isSafeSmartDocStoragePath,
  normalizeSmartDocFileName,
  resolveSmartDocStorageTarget,
  validateSmartDocFileBytes,
  validateSmartDocFileMetadata,
  validateSmartDocUpload,
} from "@/lib/lawyerSmartDocs/smartDocValidation";

const PROTECTION_TYPES = Object.freeze({
  contrato: "Contrato",
  procuracao: "Procuração",
  prova: "Prova Digital",
  provadigital: "Prova Digital",
  notificacao: "Notificação",
  outros: "Outros",
});

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function normalizeDocumentProtectionType(value) {
  return PROTECTION_TYPES[normalizeKey(value)] || "Outros";
}

export function isSameProtectedHash(document, hashSha512) {
  const hash = String(hashSha512 || "").trim().toLowerCase();
  return Boolean(
    document?.is_blindado === true &&
      /^[0-9a-f]{128}$/.test(hash) &&
      String(document?.hash_sha512 || "").trim().toLowerCase() === hash,
  );
}

export const validateDocumentProtectionUpload = validateSmartDocUpload;
export const validateDocumentProtectionFileMetadata = validateSmartDocFileMetadata;
export const validateDocumentProtectionFileBytes = validateSmartDocFileBytes;
export const normalizeDocumentProtectionFileName = normalizeSmartDocFileName;
export const getDocumentProtectionExtension = getSmartDocExtension;
export const getDocumentProtectionMimeForExtension = getSmartDocMimeForExtension;
export const isSafeDocumentProtectionStoragePath = isSafeSmartDocStoragePath;
export const resolveDocumentProtectionStorageTarget = resolveSmartDocStorageTarget;
export { MAX_SMARTDOC_BYTES };

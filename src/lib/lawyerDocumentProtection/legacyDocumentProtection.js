const LEGACY_SOURCE_DEFINITIONS = Object.freeze({
  contratos: Object.freeze({ table: "blindagem_contratos", type: "Contrato" }),
  procuracoes: Object.freeze({ table: "blindagem_procuracoes", type: "Procuração" }),
  provas: Object.freeze({ table: "blindagem_provas", type: "Prova Digital" }),
  notificacoes: Object.freeze({ table: "blindagem_notificacoes", type: "Notificação" }),
});

export const LEGACY_PROTECTION_SOURCES = Object.freeze(
  Object.entries(LEGACY_SOURCE_DEFINITIONS).map(([key, definition]) => ({
    key,
    ...definition,
  })),
);

function cleanText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

export function resolveLegacyProtectionSource(source) {
  return LEGACY_SOURCE_DEFINITIONS[cleanText(source, 30)] || null;
}

export function normalizeLegacyProtectionQuery(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    30,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") || "18", 10) || 18),
  );
  const search = cleanText(searchParams.get("search"), 80).toLocaleLowerCase("pt-BR");
  const type = cleanText(searchParams.get("type"), 60);
  return { page, pageSize, search, type };
}

export function buildProtectionProtocol(id, protocol = "", legacy = false) {
  const registeredProtocol = cleanText(protocol, 80);
  if (registeredProtocol) return registeredProtocol;
  const compactId = cleanText(id, 80).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${legacy ? "SJ-BLD-LEG" : "SJ-BLD"}-${compactId.slice(0, 20) || "REGISTRO"}`;
}

export function serializeLegacyProtectedDocument(
  row,
  { source, memberMap = new Map(), clientMap = new Map() } = {},
) {
  const definition = resolveLegacyProtectionSource(source);
  if (!definition) throw new Error("Origem legada inválida.");

  return {
    id: row.id,
    source,
    legacy: true,
    protocol: buildProtectionProtocol(row.id, row.protocol, true),
    fileName: row.file_name || "Documento legado",
    fileUrl: `/api/advogado/blindagemdedocumentos/${row.id}/arquivo?legacySource=${source}`,
    documentType: definition.type,
    protected: true,
    hash: row.hash_sha512 || null,
    hashAlgorithm: row.hash_sha512 ? "SHA-512" : null,
    fileSizeBytes: 0,
    clientId: row.client_id || null,
    clientName: clientMap.get(row.client_id)?.name || null,
    lawyerId: row.lawyer_id,
    lawyerName: memberMap.get(row.lawyer_id)?.name || "Advogado",
    uploadIp: row.upload_ip || null,
    userAgent: row.user_agent || null,
    canDelete: false,
    createdAt: row.created_at,
    protectedAt: row.created_at,
  };
}

export function matchesLegacyProtectionFilters(document, { search = "", type = "" } = {}) {
  if (type && type !== "all" && document.documentType !== type) return false;
  if (!search) return true;

  const haystack = [
    document.fileName,
    document.documentType,
    document.protocol,
    document.hash,
    document.clientName,
    document.lawyerName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");

  return haystack.includes(search.toLocaleLowerCase("pt-BR"));
}

export function extractLegacyStoragePath(fileUrl, bucket = "crm_documents") {
  try {
    const url = new URL(String(fileUrl || ""));
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/${bucket}/`,
    ];
    const marker = markers.find((candidate) => url.pathname.includes(candidate));
    if (!marker) return null;
    const encodedPath = url.pathname.split(marker)[1];
    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch {
    return null;
  }
}

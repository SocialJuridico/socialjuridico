function cleanText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

export function normalizeNotificationQuery(searchParams) {
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const pageSize = Math.min(
    30,
    Math.max(
      1,
      Number.parseInt(searchParams.get("pageSize") || "12", 10) || 12,
    ),
  );
  const search = cleanText(searchParams.get("search"), 100).toLocaleLowerCase(
    "pt-BR",
  );
  const status = cleanText(searchParams.get("status"), 30).toLowerCase();
  return { page, pageSize, search, status };
}

export function normalizeNotificationStatus(value) {
  const status = String(value || "enviado").toLowerCase();
  if (["lido", "visualizado"].includes(status)) return "lido";
  if (["erro_envio", "erro", "falhou"].includes(status)) {
    return "erro_envio";
  }
  return "enviado";
}

export function serializeExtrajudicialNotification(
  row,
  { memberMap = new Map(), clientMap = new Map() } = {},
) {
  const status = normalizeNotificationStatus(row.status);
  return {
    id: row.id,
    protocol: row.protocol || "Sem protocolo",
    status,
    recipientEmail: row.destinatario_email || "Não informado",
    fileName: row.file_name || "Notificação extrajudicial",
    tone: row.tone || null,
    hash: row.hash_sha512 || null,
    createdAt: row.created_at || null,
    readAt: row.read_at || null,
    readIp: row.read_ip || null,
    readGeo: row.read_geo || null,
    readUserAgent: row.read_user_agent || null,
    uploadIp: row.upload_ip || null,
    userAgent: row.user_agent || null,
    clientId: row.client_id || null,
    clientName: clientMap.get(row.client_id)?.name || null,
    caseId: row.case_id || null,
    lawyerId: row.lawyer_id || null,
    lawyerName: memberMap.get(row.lawyer_id)?.name || "Advogado responsável",
    trackingUrl: row.access_token
      ? `/notificacao/${encodeURIComponent(row.access_token)}`
      : null,
    documentUrl: `/api/advogado/notificacaoextrajudicial/${row.id}/arquivo`,
    hasLocation: Boolean(row.read_geo),
    hasReadEvidence: Boolean(row.read_at || row.read_ip || row.read_user_agent),
  };
}

export function matchesExtrajudicialNotificationFilters(
  item,
  { search = "", status = "" } = {},
) {
  if (status && status !== "all" && item.status !== status) return false;
  if (!search) return true;

  const haystack = [
    item.protocol,
    item.recipientEmail,
    item.fileName,
    item.clientName,
    item.lawyerName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");

  return haystack.includes(search.toLocaleLowerCase("pt-BR"));
}

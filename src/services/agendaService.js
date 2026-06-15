function readJson(response) {
  return response.json().catch(() => null);
}

async function agendaRequest(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await readJson(response);
  if (!response.ok || !data?.success) {
    const error = new Error(data?.message || "Não foi possível concluir a operação.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export function listAgendaItems(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return agendaRequest(`/api/advogado/agenda${query ? `?${query}` : ""}`);
}

export function createAgendaItem(payload) {
  const requestId = payload.requestId || crypto.randomUUID();
  return agendaRequest("/api/advogado/agenda", {
    method: "POST",
    headers: { "X-Idempotency-Key": requestId },
    body: JSON.stringify({ ...payload, requestId }),
  });
}

export function updateAgendaItem(itemId, payload) {
  const requestId = payload.requestId || crypto.randomUUID();
  return agendaRequest(`/api/advogado/agenda/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: { "X-Idempotency-Key": requestId },
    body: JSON.stringify({ ...payload, requestId }),
  });
}

export function deleteAgendaItem(itemId) {
  return agendaRequest(`/api/advogado/agenda/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
  });
}

export function generateAgendaAiSupport(payload) {
  return agendaRequest("/api/advogado/agenda/assistente", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function readJson(response) {
  return response.json().catch(() => null);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
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

export function listLawyerDocumentation(query = "") {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const search = params.toString();
  return request(`/api/advogado/documentacao${search ? `?${search}` : ""}`);
}

export function getLawyerDocumentation(slug) {
  return request(`/api/advogado/documentacao/${encodeURIComponent(slug)}`);
}

export function listAdminDocumentation() {
  return request("/api/admin/documentacao");
}

export function uploadAdminDocumentation(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/admin/documentacao/upload", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: formData,
  });
}

export function processAdminDocumentation(document) {
  return request(`/api/admin/documentacao/${encodeURIComponent(document.id)}/processar`, {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ updatedAt: document.updated_at }),
  });
}

export function updateAdminDocumentation(documentId, payload) {
  return request(`/api/admin/documentacao/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(payload),
  });
}

export function publishAdminDocumentation(document, publish = true) {
  return request(`/api/admin/documentacao/${encodeURIComponent(document.id)}/publicar`, {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ publish, updatedAt: document.updated_at }),
  });
}

export function deleteAdminDocumentation(documentId, reason) {
  return request(`/api/admin/documentacao/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ reason }),
  });
}

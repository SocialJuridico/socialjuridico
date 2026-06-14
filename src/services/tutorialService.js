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

export function listTutorials(routeKey = "") {
  const params = new URLSearchParams();
  if (routeKey) params.set("routeKey", routeKey);
  const query = params.toString();
  return request(`/api/tutorials${query ? `?${query}` : ""}`);
}

export function recordTutorialProgress(tutorial, action, positionSeconds = 0) {
  return request("/api/tutorials/progress", {
    method: "POST",
    body: JSON.stringify({
      tutorialId: tutorial.id,
      version: tutorial.version,
      action,
      positionSeconds,
    }),
  });
}

export function listAdminTutorials() {
  return request("/api/admin/tutoriais");
}

export function uploadAdminTutorial({ file, title, description, audience, routeKey, version, sortOrder, autoOpen }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("description", description || "");
  formData.append("audience", audience);
  formData.append("routeKey", routeKey);
  formData.append("version", String(version || 1));
  formData.append("sortOrder", String(sortOrder || 0));
  formData.append("autoOpen", autoOpen === false ? "false" : "true");
  return request("/api/admin/tutoriais/upload", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: formData,
  });
}

export function updateAdminTutorial(tutorialId, payload) {
  return request(`/api/admin/tutoriais/${encodeURIComponent(tutorialId)}`, {
    method: "PATCH",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminTutorial(tutorialId, reason) {
  return request(`/api/admin/tutoriais/${encodeURIComponent(tutorialId)}`, {
    method: "DELETE",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ reason }),
  });
}

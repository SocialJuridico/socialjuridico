export async function trackEvent(event, properties = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/track-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        event,
        path: window.location.pathname,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // O rastreamento nunca deve bloquear a navegação.
  }
}
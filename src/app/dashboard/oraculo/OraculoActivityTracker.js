"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Rastreia TUDO que o aluno faz no dashboard: sessão, tempo ativo (aba visível),
// telas visitadas e ações. Envia em lote ao /api/oraculo/telemetry. IDs do aluno
// são resolvidos no servidor pela sessão autenticada (nunca daqui).

const ENDPOINT = "/api/oraculo/telemetry";
const HEARTBEAT_MS = 30000; // envia a cada 30s
const TICK_MS = 5000; // mede tempo ativo a cada 5s

function newSessionKey() {
  try {
    const existing = sessionStorage.getItem("oraculo_session_key");
    if (existing) return existing;
    const key =
      (crypto.randomUUID && crypto.randomUUID()) ||
      `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("oraculo_session_key", key);
    return key;
  } catch {
    return `s_${Date.now()}`;
  }
}

export default function OraculoActivityTracker() {
  const pathname = usePathname();
  const state = useRef({
    sessionKey: null,
    queue: [],
    activeMs: 0,
    lastTick: 0,
    surface: pathname,
    started: false,
  });

  // Mantém a tela atual acessível ao loop.
  useEffect(() => {
    state.current.surface = pathname;
    if (state.current.started) {
      state.current.queue.push({
        type: "PAGE_VIEW",
        surface: pathname,
        clientTs: new Date().toISOString(),
      });
    }
  }, [pathname]);

  useEffect(() => {
    const s = state.current;
    s.sessionKey = newSessionKey();

    function isActive() {
      return document.visibilityState === "visible";
    }

    function send(ended, useBeacon) {
      const now = Date.now();
      // Fecha o tempo ativo pendente.
      if (isActive()) s.activeMs += now - s.lastTick;
      s.lastTick = now;

      const events = s.queue.slice();
      const payload = {
        sessionKey: s.sessionKey,
        userAgent: navigator.userAgent,
        activeMsDelta: Math.round(s.activeMs),
        ended: Boolean(ended),
        events,
      };
      s.queue = [];
      s.activeMs = 0;

      // Só envia se houver algo relevante.
      if (!ended && !events.length && payload.activeMsDelta < 1000) return;

      const body = JSON.stringify(payload);
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }));
      } else {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    }

    // Evento inicial de login/entrada.
    s.queue.push({
      type: "LOGIN",
      surface: s.surface,
      clientTs: new Date().toISOString(),
    });
    s.started = true;
    s.lastTick = Date.now();

    const tick = setInterval(() => {
      const now = Date.now();
      if (isActive()) s.activeMs += now - s.lastTick;
      s.lastTick = now;
    }, TICK_MS);

    const heartbeat = setInterval(() => {
      s.queue.push({
        type: "HEARTBEAT",
        surface: s.surface,
        activeMs: Math.round(s.activeMs),
        clientTs: new Date().toISOString(),
      });
      send(false, false);
    }, HEARTBEAT_MS);

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        send(false, true);
      } else {
        s.lastTick = Date.now();
      }
    }
    function onPageHide() {
      send(true, true);
    }

    // Ação avulsa disparável de qualquer componente do dashboard do aluno.
    function trackEvent(type, meta = {}) {
      s.queue.push({
        type: String(type || "ACTION"),
        surface: s.surface,
        refType: meta.refType || null,
        refId: meta.refId || null,
        metadata: meta.metadata || {},
        clientTs: new Date().toISOString(),
      });
    }
    window.__oraculoTrack = trackEvent;

    // Captura genérica de cliques: todo botão/link do dashboard vira evento.
    function onClick(e) {
      const el = e.target?.closest?.("button, a, [data-track], [role='button']");
      if (!el) return;
      const explicit = el.getAttribute("data-track");
      const label = (el.getAttribute("aria-label") || el.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);
      const href = el.tagName === "A" ? el.getAttribute("href") : null;
      s.queue.push({
        type: explicit || "CLICK",
        surface: s.surface,
        refType: el.tagName,
        refId: href,
        metadata: { label },
        clientTs: new Date().toISOString(),
      });
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("click", onClick, true);

    return () => {
      clearInterval(tick);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onClick, true);
      send(true, true);
      if (window.__oraculoTrack === trackEvent) delete window.__oraculoTrack;
    };
  }, []);

  return null;
}

"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabase";

async function readJson(response) {
  return response.json().catch(() => null);
}

// Geolocalização best-effort: não bloqueia a emergência se o usuário negar ou
// demorar. Resolve em no máximo ~6s.
function getGeolocation() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({});
      return;
    }
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => done({}), 6000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        done({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        clearTimeout(timer);
        done({});
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  });
}

/**
 * Fluxo do botão EMERGÊNCIA (mobile): sobe o vídeo gravado e chama o endpoint
 * de emergência, que transcreve, classifica e publica o caso automaticamente.
 */
export function useEmergency({ onPosted } = {}) {
  const [open, setOpen] = useState(false);
  // idle | uploading | analyzing | done | error
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setOpen(false);
    setStatus("idle");
    setResult(null);
    setError("");
  }, []);

  const start = useCallback(
    async (file) => {
      if (!file) return;

      setOpen(true);
      setResult(null);
      setError("");
      setStatus("uploading");

      try {
        const geoPromise = getGeolocation();

        // 1. Autoriza o upload do vídeo.
        const ticketResponse = await fetch("/api/client/case-uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "VIDEO",
            original_name: file.name || `emergencia-${Date.now()}.mp4`,
            mime_type: file.type || "video/mp4",
            size_bytes: file.size,
          }),
        });
        const ticketData = await readJson(ticketResponse);
        if (!ticketResponse.ok || !ticketData?.success) {
          throw new Error(
            ticketData?.message || "Não foi possível preparar o vídeo.",
          );
        }
        const ticket = ticketData.data;

        // 2. Envia o arquivo para o storage.
        const { error: uploadError } = await supabase.storage
          .from(ticket.bucket)
          .uploadToSignedUrl(ticket.path, ticket.token, file, {
            contentType: file.type || "video/mp4",
            upsert: false,
          });
        if (uploadError) {
          await fetch(`/api/client/case-uploads?id=${ticket.id}`, {
            method: "DELETE",
          }).catch(() => null);
          throw new Error(uploadError.message || "Falha ao enviar o vídeo.");
        }

        // 3. Classifica e publica automaticamente.
        setStatus("analyzing");
        const geo = await geoPromise;
        const response = await fetch("/api/casos/emergencia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_id: ticket.id, ...geo }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível registrar a emergência.",
          );
        }

        setResult(data.data);
        setStatus("done");
        toast.success("Emergência registrada e enviada aos advogados.");
        await onPosted?.(data.data);
      } catch (err) {
        setStatus("error");
        setError(err.message || "Não foi possível registrar a emergência.");
        toast.error(err.message || "Não foi possível registrar a emergência.");
      }
    },
    [onPosted],
  );

  return { open, status, result, error, start, reset, setOpen };
}

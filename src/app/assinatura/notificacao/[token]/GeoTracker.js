"use client";

import { useEffect } from "react";

export default function GeoTracker({ token }) {
  useEffect(() => {
    if (!token) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const geoStr = `${latitude},${longitude}`;

          try {
            await fetch(`/api/assinatura/notificacao/${encodeURIComponent(token)}/geo`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ geo: geoStr }),
            });
          } catch (error) {
            console.error("Erro ao salvar geolocalização:", error);
          }
        },
        (error) => {
          console.log("Geolocalização negada ou indisponível:", error.message);
        }
      );
    }
  }, [token]);

  return null; // Invisible component
}

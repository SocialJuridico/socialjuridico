'use client';
import { useEffect } from 'react';

export default function GeoTracker({ tokenId }) {
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const geoStr = `${latitude},${longitude}`;
          
          // Enviar para a API
          try {
            await fetch('/api/crm/notificacoes/geo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tokenId, geo: geoStr })
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
  }, [tokenId]);

  return null; // Componente invisível
}

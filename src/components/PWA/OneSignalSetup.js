"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const SAFARI_ID = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID;

export default function OneSignalSetup() {
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    // Iniciar OneSignal
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        // Só tenta inicializar se estiver no domínio certo ou se for localhost permitido
        await OneSignal.init({
          appId: APP_ID,
          safari_web_id: SAFARI_ID,
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecureOrigin: true,
        });
      } catch (e) {
        console.warn("OneSignal init skipped or failed:", e.message);
      }

      // Vincular o ID do usuário do Supabase se ele estiver logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await OneSignal.login(user.id);
        console.log("OneSignal: Usuário vinculado", user.id);
        
        // Pedir permissão explicitamente se ainda não tiver
        if (OneSignal.Notifications.permission !== true) {
          await OneSignal.Notifications.requestPermission();
        }
      }

      // Escutar mudanças de autenticação para vincular/desvincular
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await OneSignal.login(session.user.id);
          // Pedir permissão ao logar
          if (OneSignal.Notifications.permission !== true) {
            await OneSignal.Notifications.requestPermission();
          }
        } else if (event === 'SIGNED_OUT') {
          await OneSignal.logout();
        }
      });
    });

    // Inserir o script do OneSignal no head se não existir
    if (!document.querySelector('script[src*="OneSignalSDK.page.js"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}

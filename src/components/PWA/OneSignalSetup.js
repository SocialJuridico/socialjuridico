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
        console.log("OneSignal: Vinculando usuário", user.id);
        await OneSignal.login(user.id);
      }

      // Escutar mudanças de autenticação para vincular/desvincular
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await OneSignal.login(session.user.id);
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

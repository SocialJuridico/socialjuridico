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
      console.log("OneSignal: Iniciando com AppID:", APP_ID);
      
      if (!APP_ID) {
        console.error("OneSignal: APP_ID não encontrado! Verifique o .env");
        return;
      }

      try {
        await OneSignal.init({
          appId: APP_ID,
          safari_web_id: SAFARI_ID,
          allowLocalhostAsSecureOrigin: true,
          persistNotification: false,
          promptOptions: {
            slidedown: {
              enabled: true,
              autoPrompt: true,
              timeDelay: 3,
              pageViews: 1,
            }
          }
        });
        console.log("OneSignal: Inicializado com sucesso");

        // Vincular o ID do usuário do Supabase se ele estiver logado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await OneSignal.login(user.id);
          console.log("OneSignal: Usuário vinculado", user.id);
          
          // Adicionar TAG de ROLE para segmentação de notificações
          const role = user.user_metadata?.role || "LAWYER";
          await OneSignal.User.addTag("role", role);
          console.log("OneSignal: Tag de role adicionada:", role);

          // Pedir permissão explicitamente se ainda não tiver usando o Slidedown (Evita bloqueio do Safari/Chrome por falta de interação)
          const permission = OneSignal.Notifications.permission;
          if (permission !== true) {
            console.log("OneSignal: Solicitando permissão via Slidedown...");
            await OneSignal.Slidedown.promptPush();
          }
        }

        // Escutar mudanças de autenticação para vincular/desvincular
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await OneSignal.login(session.user.id);
            if (OneSignal.Notifications.permission !== true) {
               await OneSignal.Slidedown.promptPush();
            }
          } else if (event === 'SIGNED_OUT') {
            await OneSignal.logout();
          }
        });
      } catch (e) {
        console.error("OneSignal Error:", e);
      }
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

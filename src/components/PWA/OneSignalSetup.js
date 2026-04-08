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

        // Função auxiliar para vincular o usuário e pedir permissão
        const bindUserAndPrompt = async (user) => {
          if (!user) return;
          try {
            await OneSignal.login(user.id);
            console.log("OneSignal: Usuário vinculado!", user.id);
            
            const role = user.user_metadata?.role || "LAWYER";
            await OneSignal.User.addTag("role", role);
            console.log("OneSignal: Tag de role adicionada:", role);

            if (OneSignal.Notifications.permission !== true) {
              console.log("OneSignal: Solicitando permissão via Slidedown...");
              await OneSignal.Slidedown.promptPush();
            }
          } catch(e) {
            console.log("Erro ao vincular OneSignal", e);
          }
        };

        // 1. Tentar pegar o usuário logo no carregamento
        console.log("OneSignal: Verificando supabase.auth.getSession()...");
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("OneSignal: Resultado do getSession:", { sessionExists: !!session, userExists: !!session?.user, error });
        
        if (session?.user) {
          await bindUserAndPrompt(session.user);
        }

        // 2. Escutar mudanças (inclusive a restauração inicial da sessão)
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("OneSignal AuthStateChange Disparado:", event, "User:", session?.user?.id);
          
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
            await bindUserAndPrompt(session.user);
          } else if (event === 'SIGNED_OUT') {
            await OneSignal.logout();
            console.log("OneSignal: Usuário deslogado");
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

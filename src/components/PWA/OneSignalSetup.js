"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const SAFARI_ID = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID;

export default function OneSignalSetup() {
  const pathname = usePathname();

  useEffect(() => {
    // Para evitar rodar os scripts várias vezes
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(async function(OneSignal) {
      console.log("OneSignal: Iniciando com AppID:", APP_ID);
      
      if (!APP_ID) return;

      try {
        // Init só precisa ser chamado uma vez
        if (!OneSignal.initialized) {
          await OneSignal.init({
            appId: APP_ID,
            safari_web_id: SAFARI_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "OneSignalSDKWorker.js",
            promptOptions: {
              slidedown: {
                enabled: true,
                autoPrompt: true,
                timeDelay: 3,
                pageViews: 1,
              }
            }
          });
          OneSignal.initialized = true;
          console.log("OneSignal: Inicializado com sucesso");
        }

        const bindUserAndPrompt = async (user) => {
          if (!user) return;
          try {
            await OneSignal.login(user.id);
            console.log("OneSignal: Usuário vinculado!", user.id);
            
            const role = user.role || user.user_metadata?.role || "LAWYER";
            await OneSignal.User.addTags({ role: role });
            console.log("OneSignal: Tag role adicionada:", role);

            console.log("OneSignal Permission:", OneSignal.Notifications.permission);
            if (OneSignal.Notifications.permission !== true) {
              await OneSignal.Slidedown.promptPush({ force: true });
            }
          } catch(e) {
            console.error("OneSignal erro em bindUserAndPrompt:", e);
          }
        };

        // Verifica a sessão todas as vezes que mudar de tela (lendo a fonte verdadeira de cookies via API)
        try {
          const res = await fetch("/api/perfil");
          if (res.ok) {
            const result = await res.json();
            if (result.success && result.data?.id) {
              await bindUserAndPrompt(result.data);
            } else {
              await OneSignal.logout();
            }
          } else {
            await OneSignal.logout();
          }
        } catch (error) {
          console.error("Erro ao puxar perfil no OneSignal", error);
        }

      } catch (e) {
        console.error("OneSignal Error:", e);
      }
    });

  }, [pathname]);

  // Script global inserido fora do lifecycle do Next
  useEffect(() => {
    if (!document.querySelector('script[src*="OneSignalSDK.page.js"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}

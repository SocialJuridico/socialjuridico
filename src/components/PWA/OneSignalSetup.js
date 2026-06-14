"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { supabase } from "@/lib/supabase";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const SAFARI_ID = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID;

function loadOneSignalScript() {
  if (document.querySelector('script[src*="OneSignalSDK.page.js"]')) return;

  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  document.head.appendChild(script);
}

function getOneSignalClient() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];

  return new Promise((resolve) => {
    window.OneSignalDeferred.push((OneSignal) => resolve(OneSignal));
  });
}

async function initOneSignalOnce() {
  if (!APP_ID || typeof window === "undefined") return null;

  if (window.__sjOneSignalInitPromise) {
    return window.__sjOneSignalInitPromise;
  }

  window.__sjOneSignalInitPromise = getOneSignalClient().then(async (OneSignal) => {
    if (window.__sjOneSignalInitialized) return OneSignal;

    try {
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
          },
        },
        notifyButton: {
          enable: true,
          size: "medium",
          theme: "default",
          position: "bottom-right",
          displayPredicate: () => true,
          text: {
            "tip.state.unsubscribed": "Inscreva-se para notificacoes",
            "tip.state.subscribed": "Voce esta inscrito",
            "tip.state.blocked": "As notificacoes estao bloqueadas",
            "message.action.subscribed": "Obrigado por se inscrever!",
            "dialog.main.title": "Gerenciar Notificacoes",
            "dialog.main.button.subscribe": "INSCREVER-SE",
            "dialog.main.button.unsubscribe": "CANCELAR INSCRICAO",
          },
        },
      });
      window.__sjOneSignalInitialized = true;
    } catch (error) {
      if (!String(error?.message || "").includes("already initialized")) {
        window.__sjOneSignalInitPromise = null;
        throw error;
      }
      window.__sjOneSignalInitialized = true;
    }

    return OneSignal;
  });

  return window.__sjOneSignalInitPromise;
}

async function bindUserAndPrompt(OneSignal, user) {
  if (!OneSignal || !user?.id) return;

  await OneSignal.login(user.id);

  const role = user.role || user.user_metadata?.role || "LAWYER";
  await OneSignal.User.addTags({ role });

  if (
    OneSignal.Notifications?.permission !== true &&
    !window.__sjOneSignalPromptShown
  ) {
    window.__sjOneSignalPromptShown = true;
    await OneSignal.Slidedown.promptPush({ force: true });
  }
}

export default function OneSignalSetup() {
  const pathname = usePathname();

  useEffect(() => {
    loadOneSignalScript();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!APP_ID) return;

      try {
        const OneSignal = await initOneSignalOnce();
        if (!OneSignal || cancelled) return;

        const sessionResponse = await supabase.auth.getSession();
        const session = sessionResponse?.data?.session;

        if (!session) {
          await OneSignal.logout();
          return;
        }

        const response = await fetch("/api/perfil", { cache: "no-store" });
        const result = await response.json().catch(() => null);

        if (response.ok && result?.success && result.data?.id) {
          await bindUserAndPrompt(OneSignal, result.data);
        } else {
          await OneSignal.logout();
        }
      } catch (error) {
        console.error("OneSignal Error:", error);
      }
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}

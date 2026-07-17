"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import styles from "./Conectar.module.css";

// Aceita múltiplos IDs separados por vírgula (ex.: ID da Web Store + ID da
// cópia unpacked de desenvolvimento). A página tenta cada um em ordem.
const EXTENSION_IDS = (process.env.NEXT_PUBLIC_SJ_EXTENSION_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

function sendTokenToExtension(extensionId, payload) {
  return new Promise((resolve) => {
    try {
      window.chrome.runtime.sendMessage(extensionId, payload, (response) => {
        if (window.chrome.runtime.lastError || !response?.ok) resolve(false);
        else resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

// STATUS possíveis: "loading" | "no-session" | "no-extension" | "success" | "error"
export default function ConectarExtensaoPage() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) {
        if (!cancelled) setStatus("no-session");
        return;
      }

      if (!EXTENSION_IDS.length || typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
        if (!cancelled) setStatus("no-extension");
        return;
      }

      const payload = {
        type: "SJ_AUTH_TOKEN",
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      };

      let delivered = false;
      for (const extensionId of EXTENSION_IDS) {
        // eslint-disable-next-line no-await-in-loop
        if (await sendTokenToExtension(extensionId, payload)) {
          delivered = true;
          break;
        }
      }

      if (!cancelled) setStatus(delivered ? "success" : "no-extension");
    }

    connect().catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {status === "loading" && <p>Conectando com a extensão…</p>}

        {status === "no-session" && (
          <>
            <h1>Faça login primeiro</h1>
            <p>Você precisa estar logado no Social Jurídico para conectar a extensão.</p>
            <Link className={styles.button} href="/login?redirect=/extensao/conectar">
              Fazer login
            </Link>
          </>
        )}

        {status === "no-extension" && (
          <>
            <h1>Extensão não encontrada</h1>
            <p>
              Não conseguimos falar com a extensão Social Jurídico neste navegador. Confirme que ela
              está instalada e tente novamente.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1>Extensão conectada</h1>
            <p>Pode fechar esta aba e voltar para o painel da extensão.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1>Algo deu errado</h1>
            <p>Não foi possível conectar a extensão agora. Tente novamente em instantes.</p>
          </>
        )}
      </div>
    </main>
  );
}

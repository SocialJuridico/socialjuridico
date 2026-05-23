import { supabaseAdmin } from "./supabase";

export async function sendPushNotification({ 
  userIds = [], 
  roles = [], 
  title, 
  message, 
  url = "https://socialjuridico.com.br/dashboard" 
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  // Array de tokens do Expo para notificar
  let expoTokens = [];

  try {
    const db = supabaseAdmin;

    // Resolver IDs de usuários alvo
    let targetUserIds = [...userIds];

    if (roles.length > 0) {
      const resolvedRoles = roles.map(r => String(r).toUpperCase());
      
      if (resolvedRoles.includes("LAWYER")) {
        const { data: advs } = await db.from("advogados").select("id");
        if (advs) {
          targetUserIds = [...targetUserIds, ...advs.map(a => a.id)];
        }
      }
      if (resolvedRoles.includes("CLIENT")) {
        const { data: clis } = await db.from("clientes").select("id");
        if (clis) {
          targetUserIds = [...targetUserIds, ...clis.map(c => c.id)];
        }
      }
    }

    // Remover duplicados
    targetUserIds = [...new Set(targetUserIds)];

    // Buscar tokens do Expo registrados
    if (targetUserIds.length > 0) {
      const { data: tokensData } = await db
        .from("user_push_tokens")
        .select("token")
        .in("user_id", targetUserIds);
      
      if (tokensData) {
        expoTokens = tokensData.map(t => t.token);
      }
    }
  } catch (dbErr) {
    console.error("[pushNotifications] Erro ao buscar tokens do Expo no banco:", dbErr);
  }

  // Disparar via Expo Push API se houver tokens
  if (expoTokens.length > 0) {
    const messages = expoTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: message,
      data: { url },
    }));

    try {
      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      const expoData = await expoRes.json();
      console.log("[pushNotifications] Expo Push Sent:", JSON.stringify(expoData));
    } catch (expoErr) {
      console.error("[pushNotifications] Erro ao enviar Expo push notification:", expoErr);
    }
  }

  // Disparar via OneSignal (legacy / fallback)
  if (!appId || !apiKey) {
    console.warn("Push: OneSignal keys not found in .env");
    return;
  }

  const body = {
    app_id: appId,
    headings: { pt: title, en: title },
    contents: { pt: message, en: message },
    url: url.startsWith("http") ? url : `https://socialjuridico.com.br${url}`,
  };

  // Se tiver IDs específicos (destinado a um usuário só, ex: chat)
  if (userIds.length > 0) {
    body.include_aliases = { external_id: userIds };
    body.target_channel = "push";
  } 
  
  // Se for destinado a um grupo (ex: todos os advogados)
  if (roles.length > 0) {
    body.filters = roles.map(role => ({
      field: "tag", 
      key: "role", 
      relation: "=", 
      value: String(role).toUpperCase()
    }));
    body.target_channel = "push";
  }

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log("OneSignal Push Notification Sent:", data);
    return data;
  } catch (err) {
    console.error("Error sending OneSignal push notification:", err);
  }
}

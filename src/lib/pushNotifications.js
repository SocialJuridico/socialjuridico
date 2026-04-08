export async function sendPushNotification({ 
  userIds = [], 
  roles = [], 
  title, 
  message, 
  url = "https://socialjuridico.com.br/dashboard" 
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.warn("Push: OneSignal keys not found in .env");
    return;
  }

  const body = {
    app_id: appId,
    headings: { pt: title },
    contents: { pt: message },
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
    console.log("Push Notification Sent:", data);
    return data;
  } catch (err) {
    console.error("Error sending push notification:", err);
  }
}

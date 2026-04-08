const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function sendPushNotification(userIds, title, message, url = "/") {
  if (!ONESIGNAL_API_KEY) {
    console.warn("OneSignal API Key não configurada. Notificação push não enviada.");
    return;
  }

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: Array.isArray(userIds) ? userIds : [userIds],
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
      url: url,
    }),
  });

  const data = await response.json();
  return data;
}

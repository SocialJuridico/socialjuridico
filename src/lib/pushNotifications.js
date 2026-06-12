import { supabaseAdmin } from "./supabase";

const DEFAULT_URL = "https://socialjuridico.com.br/dashboard";

function normalizeOptions(options, args) {
  if (
    options &&
    typeof options === "object" &&
    !Array.isArray(options) &&
    (options.userIds || options.roles || options.title || options.message)
  ) {
    return {
      userIds: Array.isArray(options.userIds) ? options.userIds : [],
      roles: Array.isArray(options.roles) ? options.roles : [],
      title: String(options.title || "").trim(),
      message: String(options.message || "").trim(),
      url: options.url || DEFAULT_URL,
    };
  }

  return {
    userIds: Array.isArray(options)
      ? options
      : typeof options === "string" && options
        ? [options]
        : [],
    roles: [],
    title: String(args[0] || "").trim(),
    message: String(args[1] || "").trim(),
    url: args[2] || DEFAULT_URL,
  };
}

async function resolveTargetUserIds(userIds, roles) {
  const targetIds = new Set(userIds.filter(Boolean));
  const normalizedRoles = [...new Set(roles.map((role) => String(role).toUpperCase()))];

  if (!supabaseAdmin || !normalizedRoles.length) {
    return [...targetIds];
  }

  const queries = [];

  if (normalizedRoles.includes("LAWYER")) {
    queries.push(supabaseAdmin.from("advogados").select("id"));
  }

  if (normalizedRoles.includes("CLIENT")) {
    queries.push(supabaseAdmin.from("clientes").select("id"));
  }

  if (normalizedRoles.includes("ADMIN")) {
    queries.push(
      supabaseAdmin
        .from("admins")
        .select("id")
        .eq("role", "ADMIN"),
    );
  }

  const results = await Promise.all(queries);

  for (const result of results) {
    if (result.error) {
      console.warn(
        "[pushNotifications] Não foi possível resolver parte do público:",
        result.error.message,
      );
      continue;
    }

    for (const item of result.data || []) {
      if (item.id) targetIds.add(item.id);
    }
  }

  return [...targetIds];
}

async function getExpoTokens(targetUserIds) {
  if (!supabaseAdmin || !targetUserIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from("user_push_tokens")
    .select("token")
    .in("user_id", targetUserIds);

  if (error) {
    console.warn(
      "[pushNotifications] Não foi possível consultar tokens Expo:",
      error.message,
    );
    return [];
  }

  return [...new Set((data || []).map((item) => item.token).filter(Boolean))];
}

async function sendExpoPush(tokens, title, message, url) {
  if (!tokens.length) return { attempted: 0, response: null };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      tokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body: message,
        data: { url },
      })),
    ),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Expo Push respondeu com status ${response.status}.`);
  }

  return { attempted: tokens.length, response: payload };
}

function buildOneSignalFilters(roles) {
  return roles.flatMap((role, index) => {
    const filter = {
      field: "tag",
      key: "role",
      relation: "=",
      value: String(role).toUpperCase(),
    };

    return index === 0 ? [filter] : [{ operator: "OR" }, filter];
  });
}

async function sendOneSignalPush({ userIds, roles, title, message, url }) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return { configured: false, response: null };
  }

  const body = {
    app_id: appId,
    headings: { pt: title, en: title },
    contents: { pt: message, en: message },
    url: url.startsWith("http")
      ? url
      : `https://socialjuridico.com.br${url}`,
    target_channel: "push",
  };

  if (userIds.length) {
    body.include_aliases = { external_id: userIds };
  } else if (roles.length) {
    body.filters = buildOneSignalFilters(roles);
  }

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`OneSignal respondeu com status ${response.status}.`);
  }

  return { configured: true, response: payload };
}

export async function sendPushNotification(options, ...args) {
  const normalized = normalizeOptions(options, args);

  if (!normalized.title || !normalized.message) {
    throw new Error("Título e mensagem do push são obrigatórios.");
  }

  const targetUserIds = await resolveTargetUserIds(
    normalized.userIds,
    normalized.roles,
  );
  const expoTokens = await getExpoTokens(targetUserIds);

  let expoResult = { attempted: 0, response: null };
  let oneSignalResult = { configured: false, response: null };

  try {
    expoResult = await sendExpoPush(
      expoTokens,
      normalized.title,
      normalized.message,
      normalized.url,
    );
  } catch (error) {
    console.error("[pushNotifications] Falha no Expo Push:", error);
  }

  try {
    oneSignalResult = await sendOneSignalPush(normalized);
  } catch (error) {
    console.error("[pushNotifications] Falha no OneSignal:", error);
  }

  return {
    targetUsers: targetUserIds.length,
    expo: expoResult,
    oneSignal: oneSignalResult,
  };
}

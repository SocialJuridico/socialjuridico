import { NextResponse } from "next/server";

import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function parseMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function serializeMeta(value) {
  return JSON.stringify(value || {});
}

async function requireNotificationUser(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      ok: false,
      response: json({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const supabase = createClient();
  const db = supabaseAdmin || supabase;
  return { ok: true, user, db };
}

async function isAdminUser(db, userId) {
  const [profileResult, adminResult] = await Promise.all([
    db.from("perfil").select("role").eq("id", userId).maybeSingle(),
    db.from("admins").select("id").eq("id", userId).maybeSingle(),
  ]);

  return profileResult.data?.role === "ADMIN" || Boolean(adminResult.data);
}

async function hideNotificationForUser(db, notification) {
  const meta = parseMeta(notification.meta);
  meta.deleted_by_user = true;

  const shared = ["ADMIN_CHAT", "ADMIN_BROADCAST"].includes(notification.tipo);
  if (!shared || meta.deleted_by_admin) {
    const { error } = await db
      .from("notificacoes")
      .delete()
      .eq("id", notification.id)
      .eq("user_id", notification.user_id);
    if (error) throw error;
    return;
  }

  const { error } = await db
    .from("notificacoes")
    .update({ meta: serializeMeta(meta) })
    .eq("id", notification.id)
    .eq("user_id", notification.user_id);
  if (error) throw error;
}

async function hideNotificationForAdmin(db, notification) {
  const meta = parseMeta(notification.meta);
  meta.deleted_by_admin = true;

  if (meta.deleted_by_user) {
    const { error } = await db
      .from("notificacoes")
      .delete()
      .eq("id", notification.id);
    if (error) throw error;
    return;
  }

  const { error } = await db
    .from("notificacoes")
    .update({ meta: serializeMeta(meta) })
    .eq("id", notification.id);
  if (error) throw error;
}

export async function GET(request) {
  try {
    const access = await requireNotificationUser(request);
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, link, lida, meta, created_at")
      .eq("user_id", access.user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const notifications = (data || [])
      .map((item) => ({ ...item, meta: parseMeta(item.meta) }))
      .filter((item) => !item.meta.deleted_by_user);

    return json({ success: true, data: notifications });
  } catch (error) {
    console.error("[Notificações][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar as notificações." },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireNotificationUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const notificationId = String(searchParams.get("id") || "all").trim();

    if (notificationId === "all") {
      const { data, error } = await access.db
        .from("notificacoes")
        .select("id, user_id, tipo, meta")
        .eq("user_id", access.user.id)
        .limit(500);

      if (error) throw error;

      for (const notification of data || []) {
        await hideNotificationForUser(access.db, notification);
      }

      return json({
        success: true,
        message: "Todas as notificações visíveis foram removidas.",
      });
    }

    const { data: notification, error } = await access.db
      .from("notificacoes")
      .select("id, user_id, tipo, meta")
      .eq("id", notificationId)
      .maybeSingle();

    if (error) throw error;
    if (!notification) {
      return json({ success: true, message: "A notificação já foi removida." });
    }

    const admin = await isAdminUser(access.db, access.user.id);
    const owner = notification.user_id === access.user.id;

    if (!owner && !admin) {
      return json({ success: false, message: "Não autorizado." }, 403);
    }

    if (owner) {
      await hideNotificationForUser(access.db, notification);
    } else {
      await hideNotificationForAdmin(access.db, notification);
    }

    return json({ success: true, message: "Notificação removida." });
  } catch (error) {
    console.error("[Notificações][DELETE] Erro:", error);
    return json(
      { success: false, message: "Não foi possível remover a notificação." },
      500,
    );
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireNotificationUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const notificationId = String(body?.id || "").trim() || null;

    let query = access.db
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", access.user.id);

    query = notificationId
      ? query.eq("id", notificationId)
      : query.eq("lida", false);

    const { error } = await query;
    if (error) throw error;

    return json({
      success: true,
      message: notificationId
        ? "Notificação marcada como lida."
        : "Notificações marcadas como lidas.",
    });
  } catch (error) {
    console.error("[Notificações][PATCH] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar as notificações." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireNotificationUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "").trim().slice(0, 500);

    if (token.length < 20) {
      return json(
        { success: false, message: "Token de notificação inválido." },
        400,
      );
    }

    const { error } = await access.db.from("user_push_tokens").upsert(
      { user_id: access.user.id, token },
      { onConflict: "token" },
    );

    if (error) throw error;

    return json({ success: true, message: "Token registrado com sucesso." });
  } catch (error) {
    console.error("[Notificações][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível registrar o dispositivo." },
      500,
    );
  }
}

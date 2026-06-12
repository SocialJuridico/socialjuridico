import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED_TYPES = new Set(["ADMIN_CHAT", "ADMIN_BROADCAST"]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function parseMeta(meta) {
  if (!meta) return {};
  if (typeof meta === "object") return meta;

  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

async function removeNotification(db, notification) {
  const meta = parseMeta(notification.meta);
  const shared = SHARED_TYPES.has(notification.tipo);

  if (!shared || meta.deleted_by_user) {
    const { error } = await db
      .from("notificacoes")
      .delete()
      .eq("id", notification.id)
      .eq("user_id", notification.user_id);

    if (error) {
      throw new Error(`Falha ao excluir notificação: ${error.message}`);
    }

    return;
  }

  const { error } = await db
    .from("notificacoes")
    .update({
      meta: JSON.stringify({
        ...meta,
        deleted_by_admin: true,
      }),
    })
    .eq("id", notification.id)
    .eq("user_id", notification.user_id);

  if (error) {
    throw new Error(`Falha ao ocultar notificação: ${error.message}`);
  }
}

export async function GET() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("notificacoes")
      .select("id, user_id, titulo, mensagem, lida, created_at, tipo, meta")
      .eq("user_id", access.auth.user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(`Falha ao consultar notificações: ${error.message}`);
    }

    const notifications = (data || [])
      .map((notification) => ({
        ...notification,
        meta: parseMeta(notification.meta),
      }))
      .filter((notification) => !notification.meta.deleted_by_admin);

    return json({ success: true, data: notifications });
  } catch (error) {
    console.error("[Admin/Notificações][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar as notificações.",
      },
      500,
    );
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const notificationId = String(body?.id || "").trim();

    if (notificationId && !isValidUuid(notificationId)) {
      return json({ success: false, message: "ID da notificação inválido." }, 400);
    }

    let query = access.db
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", access.auth.user.id)
      .eq("lida", false);

    if (notificationId) {
      query = query.eq("id", notificationId);
    }

    const { data, error } = await query.select("id");

    if (error) {
      throw new Error(`Falha ao atualizar notificações: ${error.message}`);
    }

    return json({
      success: true,
      message: notificationId
        ? "Notificação marcada como lida."
        : "Notificações marcadas como lidas.",
      data: { updated: data?.length || 0 },
    });
  } catch (error) {
    console.error("[Admin/Notificações][PATCH] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível atualizar as notificações.",
      },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const notificationId = String(searchParams.get("id") || "").trim();

    if (notificationId !== "all" && !isValidUuid(notificationId)) {
      return json({ success: false, message: "ID da notificação inválido." }, 400);
    }

    let query = access.db
      .from("notificacoes")
      .select("id, user_id, tipo, meta")
      .eq("user_id", access.auth.user.id);

    if (notificationId !== "all") {
      query = query.eq("id", notificationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Falha ao localizar notificações: ${error.message}`);
    }

    const notifications = (data || []).filter((notification) => {
      const meta = parseMeta(notification.meta);
      return !meta.deleted_by_admin;
    });

    if (!notifications.length) {
      return json(
        { success: false, message: "Notificação não encontrada." },
        404,
      );
    }

    await Promise.all(
      notifications.map((notification) =>
        removeNotification(access.db, notification),
      ),
    );

    return json({
      success: true,
      message:
        notificationId === "all"
          ? "Caixa de notificações limpa com sucesso."
          : "Notificação removida com sucesso.",
      data: { removed: notifications.length },
    });
  } catch (error) {
    console.error("[Admin/Notificações][DELETE] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível remover as notificações.",
      },
      500,
    );
  }
}

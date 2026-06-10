import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_PATH_LENGTH = 2048;
const MAX_USER_AGENT_LENGTH = 512;

function normalizePath(value) {
  if (typeof value !== "string") return "";

  const path = value.trim();

  if (
    !path.startsWith("/") ||
    path.length > MAX_PATH_LENGTH ||
    path.startsWith("/api") ||
    path.startsWith("/_next")
  ) {
    return "";
  }

  return path;
}

function getRequestIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const path = normalizePath(body?.path);

    if (!path) {
      return NextResponse.json(
        { success: false, message: "Caminho inválido." },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const db = supabaseAdmin || supabase;
    const cookieStore = await cookies();
    const userAgent = (request.headers.get("user-agent") || "").slice(
      0,
      MAX_USER_AGENT_LENGTH,
    );
    const ip = getRequestIp(request);

    const userId = user && !authError ? user.id : null;
    const userRole =
      user && !authError
        ? String(user.user_metadata?.role || "CLIENT").slice(0, 40)
        : "GUEST";

    const events = [];
    const isProtectedArea =
      path.startsWith("/dashboard") || path.startsWith("/chat");
    const lastLoggedUserId = cookieStore.get("sj_last_login_logged")?.value;
    const shouldRegisterLogin =
      Boolean(userId) && isProtectedArea && lastLoggedUserId !== userId;

    if (shouldRegisterLogin) {
      events.push({
        user_id: userId,
        user_role: userRole,
        action: "login",
        path,
        ip,
        user_agent: userAgent,
      });
    }

    events.push({
      user_id: userId,
      user_role: userRole,
      action: "page_view",
      path,
      ip,
      user_agent: userAgent,
    });

    const { error: insertError } = await db.from("access_logs").insert(events);

    if (insertError) {
      console.error("[Track] Erro ao registrar acesso:", insertError);

      return NextResponse.json(
        { success: false, message: "Não foi possível registrar o acesso." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ success: true });

    if (shouldRegisterLogin) {
      response.cookies.set("sj_last_login_logged", userId, {
        maxAge: 12 * 60 * 60,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("[Track] Erro inesperado:", error);

    return NextResponse.json(
      { success: false, message: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

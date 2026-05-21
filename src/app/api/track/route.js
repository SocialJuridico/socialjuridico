import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ success: false, message: "Path is required" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const db = supabaseAdmin || supabase;
    const cookieStore = await cookies();

    // Obter IP do cabeçalho
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";

    let userId = null;
    let userRole = "GUEST";

    if (user && !authError) {
      userId = user.id;
      userRole = user.user_metadata?.role || "CLIENT";

      // Se acessou uma rota protegida (dashboard ou chat) e não possui o cookie de login recente,
      // registramos também um log de ação 'login' para controle de usuários ativos diários.
      const isDashboardOrChat = path.startsWith("/dashboard") || path.startsWith("/chat");
      const hasLoginCookie = cookieStore.get("sj_last_login_logged")?.value;

      if (isDashboardOrChat && !hasLoginCookie) {
        // Salva evento de login
        await db.from("access_logs").insert({
          user_id: userId,
          user_role: userRole,
          action: "login",
          path,
          ip,
          user_agent: userAgent,
        });

        // Configura cookie para durar 12 horas para evitar múltiplos logs na mesma sessão
        cookieStore.set("sj_last_login_logged", "true", {
          maxAge: 12 * 60 * 60, // 12 horas
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
    }

    // Registrar o evento de 'page_view' padrão
    const { error: insertError } = await db.from("access_logs").insert({
      user_id: userId,
      user_role: userRole,
      action: "page_view",
      path,
      ip,
      user_agent: userAgent,
    });

    if (insertError) {
      console.error("Erro ao inserir log de acesso:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no tracking endpoint:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

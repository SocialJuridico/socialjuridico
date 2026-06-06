import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Rotas que exigem autenticação
const PROTECTED_ROUTES = ["/dashboard", "/chat", "/admin"];

// Rotas de autenticação (redirecionar para dashboard se já logado)
const AUTH_ROUTES = ["/login", "/cadastro"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Rota neutra: deixar passar
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  // ── VERIFICAÇÃO DE SESSÃO DO ESCRITÓRIO (COOKIE CUSTOMIZADO) ──
  const escritorioSession = request.cookies.get("sj_escritorio_session");
  if (pathname.startsWith("/dashboard/escritorio")) {
    if (escritorioSession) {
      return NextResponse.next();
    }
    // Deixa passar para ser validado pela sessão do Supabase abaixo
  }

  // ── VERIFICAÇÃO DE SESSÃO DO ANUNCIANTE (COOKIE CUSTOMIZADO) ──
  const anuncianteSession = request.cookies.get("sj_anunciante_session");
  if (pathname.startsWith("/dashboard/anunciante")) {
    if (!anuncianteSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login-anunciante";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isAuthRoute) {
    if (escritorioSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/escritorio";
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Criar cliente Supabase para middleware (sem access a next/headers)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verificar sessão do Supabase
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user && !error;

  // ── ROTA PROTEGIDA SEM SESSÃO → REDIRECIONAR PARA LOGIN ──
  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── VERIFICAÇÃO DE EXPIRAÇÃO DA SESSÃO DE 4 HORAS E STATUS OAB ──
  // Apenas para rotas protegidas com usuário autenticado
  if (isProtected && isAuthenticated) {
    // 1. Validar Status da OAB se for advogado
    const role = user.user_metadata?.role || "CLIENT";
    if (role === "LAWYER") {
      const db = supabaseAdmin || supabase;
      const { data: profile } = await db
        .from("advogados")
        .select("oab_verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.oab_verification_status === "ERROR") {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("oab_error", "true");
        const errorResponse = NextResponse.redirect(url);
        errorResponse.cookies.delete("sj_login_time");
        return errorResponse;
      }
    }

    // 2. Verificar expiração da sessão de 4 horas
    const loginTimeCookie = request.cookies.get("sj_login_time");

    if (loginTimeCookie?.value) {
      try {
        const decoded = JSON.parse(
          Buffer.from(loginTimeCookie.value, "base64").toString("utf8"),
        );
        const loginDate = new Date(decoded.loginAt);
        const hoursElapsed =
          (Date.now() - loginDate.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed >= 4) {
          // Sessão expirou → forçar logout
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("expired", "true");
          const expiredResponse = NextResponse.redirect(url);
          expiredResponse.cookies.delete("sj_login_time");
          return expiredResponse;
        }
      } catch {
        // Cookie corrompido → ignorar (não derrubar a sessão por isso)
        response.cookies.delete("sj_login_time");
      }
    }
    // Se não tiver o cookie sj_login_time, pode ser que o usuário logou
    // antes desse sistema ser implementado. Deixamos passar normalmente.
  }

  if (isAuthRoute && isAuthenticated) {
    const role = user.user_metadata?.role || "CLIENT";
    const url = request.nextUrl.clone();
    if (role === "ADMIN") url.pathname = "/dashboard/admin";
    else if (role === "LAWYER") url.pathname = "/dashboard/advogado";
    else url.pathname = "/dashboard/cliente";
    return NextResponse.redirect(url);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔒 HEADERS DE SEGURANÇA (GERENCIADOS GLOBALMENTE NO NEXT.CONFIG.MJS)
  // ═══════════════════════════════════════════════════════════════════

  // Cabeçalho de diagnóstico para saber se o middleware está rodando
  response.headers.set("X-Middleware-Debug", "SocialJuridico-Active");

  // Remove X-Powered-By (não expor tecnologia usada)
  response.headers.delete("X-Powered-By");

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/admin/:path*",
    "/login",
    "/cadastro",
  ],
};

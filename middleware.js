import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

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

  // ── VERIFICAÇÃO DE EXPIRAÇÃO DA SESSÃO DE 4 HORAS ──
  // Apenas para rotas protegidas com usuário autenticado
  if (isProtected && isAuthenticated) {
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
  // 🔒 HEADERS DE SEGURANÇA
  // ═══════════════════════════════════════════════════════════════════

  // Previne clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Previne MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Habilita proteção XSS no navegador
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Política de segurança de conteúdo (CSP) básica
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' *.openai.com *.cloudflareinsights.com www.googletagmanager.com js.stripe.com cdn.onesignal.com onesignal.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' *.supabase.co wss://*.supabase.co *.openai.com *.cloudflareinsights.com *.google-analytics.com api.stripe.com onesignal.com; frame-src js.stripe.com; frame-ancestors 'none';",
  );

  // HSTS (HTTP Strict Transport Security) - força HTTPS
  // Nota: Usar com cuidado, ativar apenas quando tiver certificado SSL válido
  // response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Referrer Policy - não enviar referrer para externos
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable de característica de rastreamento
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

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

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/chat",
  "/admin",
  "/assinatura/app",
  "/oraculoacademico/painel",
];
const AUTH_ROUTES = [
  "/login",
  "/cadastro",
  "/assinatura/entrar",
  "/oraculoacademico/login",
];
const LAWYER_ROOT = "/dashboard/advogado";
const LAWYER_HOME = "/dashboard/advogado/oportunidade";
const SIGNATURE_AUTH_COOKIE_NAME = "sj-signature-auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isSignatureRoute = pathname.startsWith("/assinatura/");

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const escritorioSession = request.cookies.get("sj_escritorio_session");
  if (pathname.startsWith("/dashboard/escritorio")) {
    if (escritorioSession) return NextResponse.next();
  }

  const anuncianteSession = request.cookies.get("sj_anunciante_session");
  if (pathname.startsWith("/dashboard/anunciante")) {
    if (!anuncianteSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login-anunciante";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isAuthRoute && !isSignatureRoute && escritorioSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/escritorio";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      ...(isSignatureRoute
        ? {
            cookieOptions: {
              name: SIGNATURE_AUTH_COOKIE_NAME,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            },
          }
        : {}),
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user && !error);

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    const redirectTarget = `${pathname}${request.nextUrl.search}`;
    url.pathname = pathname.startsWith("/assinatura/app")
      ? "/assinatura/entrar"
      : "/login";
    url.search = "";
    url.searchParams.set("redirectTo", redirectTarget);
    return NextResponse.redirect(url);
  }

  if (isProtected && isAuthenticated) {
    const role = user.user_metadata?.role || "CLIENT";

    if (role === "LAWYER" && !pathname.startsWith("/assinatura/app")) {
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
        url.search = "";
        url.searchParams.set("oab_error", "true");
        const errorResponse = NextResponse.redirect(url);
        errorResponse.cookies.delete("sj_login_time");
        return errorResponse;
      }
    }

    const loginTimeCookie = request.cookies.get(
      isSignatureRoute ? "sj_signature_login_time" : "sj_login_time",
    );
    if (loginTimeCookie?.value) {
      try {
        const decoded = JSON.parse(
          Buffer.from(loginTimeCookie.value, "base64").toString("utf8"),
        );
        const loginDate = new Date(decoded.loginAt);
        const hoursElapsed =
          (Date.now() - loginDate.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed >= 4) {
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = isSignatureRoute ? "/assinatura/entrar" : "/login";
          url.search = "";
          url.searchParams.set("expired", "true");
          const expiredResponse = NextResponse.redirect(url);
          expiredResponse.cookies.delete(
            isSignatureRoute ? "sj_signature_login_time" : "sj_login_time",
          );
          return expiredResponse;
        }
      } catch {
        response.cookies.delete("sj_login_time");
      }
    }

    if (
      role === "LAWYER" &&
      pathname === LAWYER_ROOT &&
      request.nextUrl.searchParams.get("legacy") !== "1"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = LAWYER_HOME;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (isAuthRoute && !isSignatureRoute && isAuthenticated) {
    const role = user.user_metadata?.role || "CLIENT";
    const url = request.nextUrl.clone();
    url.search = "";

    if (role === "SIGNATURE_CUSTOMER") {
      url.pathname = "/assinatura/app";
    } else if (role === "ADMIN") url.pathname = "/dashboard/admin";
    else if (role === "LAWYER") url.pathname = LAWYER_HOME;
    else if (role === "ORACULO") url.pathname = "/oraculoacademico/painel";
    else url.pathname = "/dashboard/cliente";

    return NextResponse.redirect(url);
  }

  response.headers.set("X-Middleware-Debug", "SocialJuridico-Active");
  response.headers.delete("X-Powered-By");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/admin/:path*",
    "/assinatura/app/:path*",
    "/assinatura/entrar",
    "/login",
    "/cadastro",
    "/oraculoacademico/painel/:path*",
    "/oraculoacademico/login",
  ],
};

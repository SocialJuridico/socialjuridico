import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

const SITE_URL = "https://www.socialjuridico.com.br";
const DASHBOARD_URL = `${SITE_URL}/dashboard/cliente`;
const LOGIN_URL = `${SITE_URL}/login`;

export function isPublicDestination(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    const isSocialJuridicoHost =
      url.hostname === "socialjuridico.com.br" ||
      url.hostname === "www.socialjuridico.com.br";

    const isSocialJuridicoPublicRoute =
      isSocialJuridicoHost &&
      (
        url.pathname.startsWith("/confirmar-email") ||
        url.pathname.startsWith("/atualizar-senha") ||
        url.pathname.startsWith("/notificacao/") ||
        url.pathname.startsWith("/assinatura/") ||
        url.pathname.startsWith("/api/auth/confirm-email") ||
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/cadastro")
      );

    const isSupabaseVerification =
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.includes("/auth/v1/verify") &&
      (
        url.searchParams.get("type") === "recovery" ||
        url.searchParams.get("type") === "signup"
      );

    return isSocialJuridicoPublicRoute || isSupabaseVerification;
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const dest = searchParams.get("dest");
  const redirectTarget = dest || DASHBOARD_URL;

  if (!trackId) {
    return NextResponse.redirect(redirectTarget);
  }

  try {
    const db = supabaseAdmin;

    const { data: track } = await db
      .from("email_tracking_logs")
      .select("clicked_at, logged_in_at")
      .eq("id", trackId)
      .single();

    if (track) {
      const updates = {};

      if (!track.clicked_at) {
        updates.clicked_at = new Date().toISOString();
      }

      const supabase = createClient();
      const { data: { user } = {} } = await supabase.auth.getUser();

      if (user) {
        if (!track.logged_in_at) {
          updates.logged_in_at = new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
          await db
            .from("email_tracking_logs")
            .update(updates)
            .eq("id", trackId);
        }

        return NextResponse.redirect(redirectTarget);
      }

      if (Object.keys(updates).length > 0) {
        await db
          .from("email_tracking_logs")
          .update(updates)
          .eq("id", trackId);
      }

      // Confirmation and recovery links must remain usable without an existing session.
      if (isPublicDestination(dest)) {
        return NextResponse.redirect(redirectTarget);
      }

      const loginRedirect = new URL("/login", SITE_URL);
      loginRedirect.searchParams.set("trackId", trackId);

      if (dest) {
        loginRedirect.searchParams.set("redirectTo", dest);
      }

      return NextResponse.redirect(loginRedirect);
    }
  } catch (error) {
    console.error("Error tracking click:", error);
  }

  return NextResponse.redirect(redirectTarget);
}

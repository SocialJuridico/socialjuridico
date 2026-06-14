import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import {
  GOOGLE_CALENDAR_NONCE_COOKIE,
  verifyGoogleCalendarState,
} from "@/lib/lawyerAgenda/googleCalendarState";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithStatus(request, redirectTo, status) {
  const target = new URL(redirectTo || "/dashboard/advogado/agenda", request.url);
  target.searchParams.set("google_sync", status);
  const response = NextResponse.redirect(target);
  response.cookies.set(GOOGLE_CALENDAR_NONCE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/auth/google",
  });
  return response;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const nonce = request.cookies.get(GOOGLE_CALENDAR_NONCE_COOKIE)?.value;
  const verifiedState = verifyGoogleCalendarState(state, nonce);
  const redirectTo = verifiedState?.redirectTo || "/dashboard/advogado/agenda";

  try {
    if (providerError || !code || !verifiedState || !supabaseAdmin) {
      return redirectWithStatus(request, redirectTo, "error");
    }

    const user = await getAuthenticatedUser(request);
    if (!user || user.id !== verifiedState.userId) {
      return redirectWithStatus(request, redirectTo, "error");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${appUrl}/api/auth/google/callback`,
    );
    const { tokens } = await oauth2Client.getToken(code);

    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from("advogados")
      .select("id, google_refresh_token")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!currentProfile) return redirectWithStatus(request, redirectTo, "error");

    const refreshToken = tokens.refresh_token || currentProfile.google_refresh_token;
    if (!refreshToken) return redirectWithStatus(request, redirectTo, "error");

    const { error: updateError } = await supabaseAdmin
      .from("advogados")
      .update({
        google_refresh_token: refreshToken,
        google_sync_enabled: true,
      })
      .eq("id", user.id);
    if (updateError) throw updateError;

    return redirectWithStatus(request, redirectTo, "success");
  } catch (error) {
    console.error("[Google Calendar OAuth][Callback] Erro:", error);
    return redirectWithStatus(request, redirectTo, "error");
  }
}

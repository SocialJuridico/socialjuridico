import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import {
  createGoogleCalendarState,
  GOOGLE_CALENDAR_NONCE_COOKIE,
  normalizeGoogleRedirect,
} from "@/lib/lawyerAgenda/googleCalendarState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }

    const redirectTo = normalizeGoogleRedirect(
      new URL(request.url).searchParams.get("redirectTo"),
    );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${appUrl}/api/auth/google/callback`,
    );
    const { state, nonce } = createGoogleCalendarState(user.id, redirectTo);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state,
    });

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_CALENDAR_NONCE_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/auth/google",
    });
    return response;
  } catch (error) {
    console.error("[Google Calendar OAuth][Start] Erro:", error);
    return NextResponse.redirect(
      new URL("/dashboard/advogado/agenda?google_sync=error", request.url),
    );
  }
}

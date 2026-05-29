import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const dest = searchParams.get("dest");
  const dashboardUrl = "https://socialjuridico.com.br/dashboard/cliente";
  const loginUrl = "https://socialjuridico.com.br/login";

  // Determine actual target destination redirect
  const redirectTarget = dest ? dest : dashboardUrl;

  if (!trackId) {
    return NextResponse.redirect(redirectTarget);
  }

  try {
    const db = supabaseAdmin;
    // Fetch current track
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

      // Check if user is already logged in
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
      } else {
        if (Object.keys(updates).length > 0) {
          await db
            .from("email_tracking_logs")
            .update(updates)
            .eq("id", trackId);
        }
        // Redirect to login page and pass the trackId and destination url
        const loginRedirect = `${loginUrl}?trackId=${trackId}${dest ? `&redirectTo=${encodeURIComponent(dest)}` : ""}`;
        return NextResponse.redirect(loginRedirect);
      }
    }
  } catch (err) {
    console.error("Error tracking click:", err);
  }

  return NextResponse.redirect(redirectTarget);
}

import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");

  if (trackId) {
    try {
      const db = supabaseAdmin;
      // Fetch current track
      const { data: track } = await db
        .from("case_email_funnel")
        .select("opened_at")
        .eq("id", trackId)
        .single();

      // Only update if not already opened to preserve the first open timestamp
      if (track && !track.opened_at) {
        await db
          .from("case_email_funnel")
          .update({ opened_at: new Date().toISOString() })
          .eq("id", trackId);
      }
    } catch (err) {
      console.error("Error tracking open:", err);
    }
  }

  // Return a 1x1 pixel transparent GIF
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return new NextResponse(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

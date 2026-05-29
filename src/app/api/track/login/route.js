import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { success: false, message: "trackId é obrigatório" },
        { status: 400 }
      );
    }

    const db = supabaseAdmin;
    const { data: track } = await db
      .from("email_tracking_logs")
      .select("logged_in_at")
      .eq("id", trackId)
      .single();

    if (track && !track.logged_in_at) {
      await db
        .from("email_tracking_logs")
        .update({ logged_in_at: new Date().toISOString() })
        .eq("id", trackId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na API POST /api/track/login:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

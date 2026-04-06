import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    // Apenas avisos ativos que ainda não expiraram
    const agora = new Date().toISOString();

    const { data, error } = await db
      .from("avisos")
      .select("texto")
      .eq("ativo", true)
      .gt("expira_em", agora)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro API Avisos:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

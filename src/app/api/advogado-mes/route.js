import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseAdmin;
    const { data: banner, error } = await db
      .from("admin_banners")
      .select("id, name, image_url, link_url")
      .eq("name", "ADVOGADO_MES")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = zero rows returned
      throw error;
    }

    return NextResponse.json({ success: true, banner: banner || null });
  } catch (error) {
    console.error("Erro ao buscar advogado do mês:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Banco de dados não configurado" },
        { status: 500 }
      );
    }

    const { data: banners, error } = await supabaseAdmin
      .from("admin_banners")
      .select("id, name, image_url, link_url, position, slot_index")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter out "ADVOGADO_MES" if it's a special popup banner,
    // or keep it if they want. Usually popup banners aren't shown in the sidebar.
    // Let's filter out ADVOGADO_MES from sidebar banners just in case.
    const sidebarBanners = (banners || []).filter(b => b.name !== "ADVOGADO_MES");

    return NextResponse.json({ success: true, banners: sidebarBanners });
  } catch (error) {
    console.error("Erro ao buscar banners:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

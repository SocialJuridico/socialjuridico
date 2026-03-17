import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/admin/me -> valida se usuario atual esta em admins com role ADMIN
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const { data: admin, error } = await db
      .from("admins")
      .select("id, name, email, role, created_at")
      .eq("id", user.id)
      .eq("role", "ADMIN")
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    console.error("Erro na API GET /api/admin/me:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

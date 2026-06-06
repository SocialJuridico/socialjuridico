import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/admin/stats -> estatisticas basicas para dashboard admin
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

    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("id, role")
      .eq("id", user.id)
      .eq("role", "ADMIN")
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const [clientesRes, advRes, casosRes, notifRes, radarPendenteRes] = await Promise.all([
      db.from("clientes").select("id", { count: "exact", head: true }),
      db.from("advogados").select("id", { count: "exact", head: true }),
      db.from("casos").select("id", { count: "exact", head: true }),
      db.from("notificacoes").select("id", { count: "exact", head: true }),
      db.from("radar_oportunidades").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalClientes: clientesRes.count || 0,
        totalAdvogados: advRes.count || 0,
        totalCasos: casosRes.count || 0,
        totalNotificacoes: notifRes.count || 0,
        totalRadarPendente: radarPendenteRes.count || 0,
      },
    });
  } catch (error) {
    console.error("Erro na API GET /api/admin/stats:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

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
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { data: funnelData, error: funnelError } = await db
      .from("case_email_funnel")
      .select(`
        id,
        interested_count,
        sent_at,
        opened_at,
        clicked_at,
        logged_in_at,
        viewed_interests_at,
        responded_at,
        casos (
          titulo
        ),
        clientes (
          name,
          email
        )
      `)
      .order("sent_at", { ascending: false });

    if (funnelError) throw funnelError;

    // Normalizar a estrutura de retorno para facilitar a renderização no front
    const normalizedData = (funnelData || []).map((item) => ({
      id: item.id,
      interested_count: item.interested_count,
      sent_at: item.sent_at,
      opened_at: item.opened_at,
      clicked_at: item.clicked_at,
      logged_in_at: item.logged_in_at,
      viewed_interests_at: item.viewed_interests_at,
      responded_at: item.responded_at,
      caso_titulo: item.casos?.titulo || "Caso desconhecido",
      cliente_name: item.clientes?.name || "Cliente desconhecido",
      cliente_email: item.clientes?.email || "",
    }));

    return NextResponse.json({ success: true, data: normalizedData });
  } catch (error) {
    console.error("Erro na API GET /api/admin/funnel:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

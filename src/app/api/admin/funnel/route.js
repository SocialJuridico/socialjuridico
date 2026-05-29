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
      .from("email_tracking_logs")
      .select(`
        id,
        recipient_email,
        email_type,
        user_id,
        client_id,
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
        clientes:client_id (
          name,
          email
        )
      `)
      .order("sent_at", { ascending: false })
      .limit(500);

    if (funnelError) throw funnelError;

    // Buscar nomes dos advogados de forma otimizada/batched em lote
    const userIds = Array.from(
      new Set((funnelData || []).map((item) => item.user_id).filter(Boolean))
    );
    
    const lawyerMap = new Map();
    if (userIds.length > 0) {
      const { data: lawyers } = await db
        .from("advogados")
        .select("id, name, email")
        .in("id", userIds);
      
      (lawyers || []).forEach((l) => {
        lawyerMap.set(l.id, l);
      });
    }

    // Normalizar a estrutura de retorno para facilitar a renderização no front
    const normalizedData = (funnelData || []).map((item) => {
      const isInterest = item.email_type === "INTERESSE";
      const lawyer = lawyerMap.get(item.user_id);
      const resolvedName = item.clientes?.name || lawyer?.name || "Geral / Desconhecido";
      const resolvedEmail = item.clientes?.email || lawyer?.email || item.recipient_email || "";

      return {
        id: item.id,
        email_type: item.email_type || "SISTEMA",
        recipient_email: item.recipient_email || "",
        interested_count: item.interested_count,
        sent_at: item.sent_at,
        opened_at: item.opened_at,
        clicked_at: item.clicked_at,
        logged_in_at: item.logged_in_at,
        viewed_interests_at: item.viewed_interests_at,
        responded_at: item.responded_at,
        caso_titulo: item.casos?.titulo || (isInterest ? "Caso desconhecido" : "—"),
        cliente_name: resolvedName,
        cliente_email: resolvedEmail,
      };
    });

    return NextResponse.json({ success: true, data: normalizedData });
  } catch (error) {
    console.error("Erro na API GET /api/admin/funnel:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

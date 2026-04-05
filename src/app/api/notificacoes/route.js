import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/notificacoes -> lista notificacoes do usuario autenticado
export async function GET() {
  try {
    const supabase = createClient();
    
    // 1. Tentar pegar o usuário diretamente (mais seguro)
    const { data: { user } } = await supabase.auth.getUser();
    
    let finalUser = user;

    // 2. Fallback: Se getUser() falhar, tenta getSession() 
    if (!finalUser) {
       const { data: { session } } = await supabase.auth.getSession();
       finalUser = session?.user;
    }

    if (!finalUser) {
      console.error("[notificacoes] Auth error: No user or session found");
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }
    
    const db = supabaseAdmin || supabase;

    const { data, error } = await db
      .from("notificacoes")
      .select("*")
      .eq("user_id", finalUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/notificacoes?id=...
export async function DELETE(req) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "ID da notificação é obrigatório" },
        { status: 400 },
      );
    }

    // 1. Pega usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[DELETE Notif] No user session");
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;

    // 2. Verifica se o usuário é ADMIN (Checa perfil e tb tabela admins)
    const [profileRes, adminRes] = await Promise.all([
      db.from("perfil").select("role").eq("id", user.id).maybeSingle(),
      db.from("admins").select("id").eq("id", user.id).maybeSingle()
    ]);

    const isAdmin = profileRes.data?.role === "ADMIN" || !!adminRes.data;
    
    console.log(`[DELETE Notif] User: ${user.email}, isAdmin: ${isAdmin}, ID: ${notificationId}`);

    // 3. Executa a exclusão
    let query = db.from("notificacoes").delete().eq("id", notificationId);

    // Se não for admin, só pode excluir se for dono da notificação
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { error, count, status } = await query.select(); // Adicionando .select() para confirmar o que foi deletado

    if (error) {
      console.error("[DELETE Notif] DB Error:", error);
      throw error;
    }

    console.log(`[DELETE Notif] Success. Deleted: ${Array.isArray(status) ? status.length : 'ok'}`);

    return NextResponse.json({ 
      success: true, 
      message: "Mensagem excluída com sucesso",
      deletedCount: Array.isArray(status) ? status.length : undefined
    });

  } catch (error) {
    console.error("Erro na API DELETE /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao excluir mensagem" },
      { status: 500 },
    );
  }
}


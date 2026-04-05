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
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    // 2. Verifica se o usuário é ADMIN
    const { data: profile } = await supabaseAdmin
      .from("perfil")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "ADMIN";

    // 3. Executa a exclusão
    const db = supabaseAdmin || supabase;
    
    let query = db.from("notificacoes").delete().eq("id", notificationId);

    // Se não for admin, só pode excluir se for dono da notificação
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { error, count, status } = await query;

    if (error) throw error;

    // Se no status do delete não veio erro, mas nada foi deletado (count pode não vir sempre dependendo do supabase config, mas status sim)
    // No entanto, se o user_id não coincidir e não for admin, o result será 0 rows deleted.

    return NextResponse.json({ 
      success: true, 
      message: "Mensagem excluída com sucesso" 
    });

  } catch (error) {
    console.error("Erro na API DELETE /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao excluir mensagem" },
      { status: 500 },
    );
  }
}


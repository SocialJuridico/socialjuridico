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

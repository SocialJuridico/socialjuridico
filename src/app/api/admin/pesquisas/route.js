import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    // Verify Admin
    const { data: admin } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    // Fetch pesquisas_satisfacao_advogados
    const { data: advData, error: advErr } = await supabaseAdmin
      .from("pesquisas_satisfacao_advogados")
      .select(`
        *,
        advogados:user_id (name, email)
      `)
      .order("created_at", { ascending: false });

    // Fetch pesquisas_satisfacao_clientes
    const { data: cliData, error: cliErr } = await supabaseAdmin
      .from("pesquisas_satisfacao_clientes")
      .select(`
        *,
        clientes:user_id (name, email)
      `)
      .order("created_at", { ascending: false });

    if (advErr || cliErr) {
      console.error("Erro nas pesquisas:", advErr, cliErr);
      return NextResponse.json({ success: false, message: "Erro ao buscar dados." }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        advogados: advData,
        clientes: cliData
      }
    });
  } catch (error) {
    console.error("Erro GET admin/pesquisas:", error);
    return NextResponse.json({ success: false, message: "Erro interno." }, { status: 500 });
  }
}

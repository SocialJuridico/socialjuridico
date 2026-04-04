import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  
  // Verificação de Admin (Padrão do projeto)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
  }

  // Pegamos o perfil para garantir que é Admin
  const { data: profile } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ success: false, message: "Acesso administrativo necessário" }, { status: 403 });
  }

  // Buscamos todas as indicações
  const { data: indicacoes, error } = await supabaseAdmin
    .from("indicacoes")
    .select(`
      *,
      indicador:advogados!indicador_id (name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar indicadores admin:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  // Para cada indicado, vamos verificar o status de Premium dele
  const fullData = await Promise.all(
    indicacoes.map(async (ind) => {
      // Verificamos se ele já existe na tabela de advogados e se é premium
      const { data: adv } = await supabaseAdmin
        .from("advogados")
        .select("is_premium")
        .eq("email", ind.email_indicado)
        .single();
      
      return {
        ...ind,
        is_pro: adv?.is_premium || false
      };
    })
  );

  return NextResponse.json({ success: true, data: fullData });
}

// Rota para creditar o advogado (Mudança de Status)
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  
  const { indicacao_id, valor, indicador_id } = await req.json();

  // 1. Atualizar status da indicação
  const { error: updateError } = await supabaseAdmin
    .from("indicacoes")
    .update({ 
       status: 'COMISSIONADO', 
       valor_comissao: valor 
    })
    .eq("id", indicacao_id);

  if (updateError) return NextResponse.json({ success: false, message: updateError.message });

  // 2. Creditar o saldo de Juri do Advogado Indicador
  const { data: adv } = await supabaseAdmin.from("advogados").select("balance").eq("id", indicador_id).single();
  
  if (adv) {
    const newBalance = Number(adv.balance || 0) + Number(valor);
    await supabaseAdmin.from("advogados").update({ balance: newBalance }).eq("id", indicador_id);
  }

  return NextResponse.json({ success: true, message: "Crédito realizado com sucesso!" });
}

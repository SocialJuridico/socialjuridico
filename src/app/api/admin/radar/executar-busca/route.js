/**
 * O Radar Jurídico coleta apenas referências a conteúdos públicos e links originais,
 * sem coleta de dados pessoais privados. As oportunidades são salvas como pendentes
 * para curadoria administrativa antes da exibição aos advogados.
 */

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { runRadarFetch } from "@/lib/radar/runRadarFetch";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/admin/radar/executar-busca
// Dispara manualmente a busca e classificação de oportunidades externas a partir do painel administrativo
export async function POST(request) {
  try {
    const supabase = createClient();

    // 1. Verificar autenticação e sessão do usuário
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    // 2. Verificar se o usuário possui a role de ADMIN na tabela de administradores
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id, role")
      .eq("id", user.id)
      .eq("role", "ADMIN")
      .maybeSingle();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    // 3. Executar o robô de busca
    console.log(`[Radar Admin API] Execução manual iniciada por admin: ${user.email}`);
    const result = await runRadarFetch();
    
    return NextResponse.json(result);

  } catch (error) {
    console.error("[Radar Admin API] Erro na execução manual:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Erro interno no servidor ao rodar busca",
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Retorna erro para qualquer outro método HTTP
export async function GET() {
  return NextResponse.json(
    { success: false, message: "Método não permitido. Utilize o método POST." },
    { status: 405 }
  );
}

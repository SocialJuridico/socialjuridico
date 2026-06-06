import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Auxiliar para verificar se o usuário atual é admin
async function checkAdmin(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { errorStatus: 401, message: "Não autorizado" };
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("id, role")
    .eq("id", user.id)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (adminError || !admin) {
    return { errorStatus: 403, message: "Acesso restrito a administradores" };
  }

  return { user, admin };
}

// POST /api/admin/radar/:id/aprovar
// Aprova a oportunidade pública, mudando status para 'aprovado' e definindo publicado_em = now()
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "ID é obrigatório" }, { status: 400 });
    }

    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: adminCheck.errorStatus }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .update({
        status: "aprovado",
        publicado_em: new Date().toISOString(),
        aprovado_por: adminCheck.user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao aprovar oportunidade ${id}:`, error.message);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    console.log(`[Radar Admin] Oportunidade APROVADA: ${id} por ${adminCheck.user.id}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro geral na API POST /api/admin/radar/:id/aprovar:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}


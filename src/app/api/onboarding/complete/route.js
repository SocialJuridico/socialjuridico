import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin não configurado no servidor" },
        { status: 500 },
      );
    }

    // Buscar user atual via admin para preservar user_metadata já existente
    const { data: authUser, error: getErr } =
      await supabaseAdmin.auth.admin.getUserById(user.id);
    if (getErr) {
      console.error("Erro ao buscar usuário no Auth (admin):", getErr);
      return NextResponse.json(
        { success: false, message: "Erro interno" },
        { status: 500 },
      );
    }

    const currentMeta = authUser?.user?.user_metadata || {};
    const newMeta = { ...currentMeta, onboarding_complete: true };

    const { error: updError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { user_metadata: newMeta },
    );
    if (updError) {
      console.error("Erro ao atualizar metadata do usuário:", updError);
      return NextResponse.json(
        { success: false, message: "Erro ao atualizar usuário" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding marcado como concluído",
    });
  } catch (error) {
    console.error("Erro em /api/onboarding/complete:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

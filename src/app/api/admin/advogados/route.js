import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
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

// GET /api/admin/advogados -> lista advogados cadastrados
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

    const { data, error } = await db
      .from("advogados")
      .select("id, name, email, phone, oab, is_premium, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/advogados?id=... -> exclui advogado
export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const advogadoId = searchParams.get("id");

    if (!advogadoId) {
      return NextResponse.json(
        { success: false, message: "ID do advogado é obrigatório" },
        { status: 400 },
      );
    }

    await db.from("mensagens").delete().eq("sender_id", advogadoId);
    await db.from("case_interests").delete().eq("lawyer_id", advogadoId);
    await db.from("notificacoes").delete().eq("user_id", advogadoId);

    await db
      .from("casos")
      .update({
        advogado_id: null,
        status: "ABERTO",
        updated_at: new Date().toISOString(),
      })
      .eq("advogado_id", advogadoId);

    const { error: deleteError } = await db
      .from("advogados")
      .delete()
      .eq("id", advogadoId);

    if (deleteError) throw deleteError;

    if (supabaseAdmin) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(advogadoId);
      if (authDeleteError) {
        console.error("Falha ao remover advogado do Auth:", authDeleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Advogado excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/advogados?id=... -> resetar senha do advogado
export async function PATCH(request) {
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

    const { searchParams } = new URL(request.url);
    const advogadoId = searchParams.get("id");

    if (!advogadoId) {
      return NextResponse.json(
        { success: false, message: "ID do advogado é obrigatório" },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Service Role não configurada no servidor" },
        { status: 500 },
      );
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(advogadoId, {
        password: "socialjuridico1!",
        user_metadata: {
          needs_password_update: true,
        },
      });

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Senha resetada para o padrão com sucesso",
    });
  } catch (error) {
    console.error("Erro na API PATCH /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

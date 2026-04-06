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
      .select("id, name, email, phone, oab, is_premium, premium_expires_at, balance, created_at")
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
// PUT /api/admin/advogados -> Gerenciar PRO e Balance
export async function PUT(request) {
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

    const { lawyerId, action, value } = await request.json();

    if (!lawyerId || !action) {
      return NextResponse.json(
        { success: false, message: "Parâmetros inválidos" },
        { status: 400 },
      );
    }

    // 1. Buscar o advogado
    const { data: lawyer, error: lError } = await db
      .from("advogados")
      .select("id, is_premium, balance")
      .eq("id", lawyerId)
      .single();

    if (lError || !lawyer) {
      return NextResponse.json(
        { success: false, message: "Advogado não encontrado" },
        { status: 404 },
      );
    }

    const updates = {};

    if (action === "GIVE_PRO") {
      // PRO por 30 dias
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      updates.is_premium = true;
      updates.premium_expires_at = expiresAt.toISOString();
    } else if (action === "ADD_JURIS") {
      const amountToAdd = Number(value);
      if (isNaN(amountToAdd)) {
        return NextResponse.json(
          { success: false, message: "Valor de Juris inválido" },
          { status: 400 },
        );
      }
      updates.balance = (lawyer.balance || 0) + amountToAdd;
    } else if (action === "REMOVE_JURIS") {
      const amountToRemove = Number(value);
      if (isNaN(amountToRemove)) {
        return NextResponse.json(
          { success: false, message: "Valor de Juris inválido" },
          { status: 400 },
        );
      }
      // Garante que o saldo não fique negativo (opcional, dependendo da regra de negócio)
      updates.balance = Math.max(0, (lawyer.balance || 0) - amountToRemove);
    } else if (action === "REMOVE_PRO") {
      updates.is_premium = false;
      updates.premium_expires_at = null;
    }

    const { error: updateError } = await db
      .from("advogados")
      .update(updates)
      .eq("id", lawyerId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Advogado atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro na API PUT /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

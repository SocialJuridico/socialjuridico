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

// GET /api/admin/clientes -> lista clientes cadastrados
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
      .from("clientes")
      .select("id, name, email, phone, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/admin/clientes:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/clientes?id=... -> exclui cliente
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
    const clienteId = searchParams.get("id");

    if (!clienteId) {
      return NextResponse.json(
        { success: false, message: "ID do cliente é obrigatório" },
        { status: 400 },
      );
    }

    // Remoção de dados relacionados básicos para evitar bloqueio por FK
    const { data: casos } = await db
      .from("casos")
      .select("id")
      .eq("cliente_id", clienteId);

    const casoIds = (casos || []).map((c) => c.id);

    if (casoIds.length > 0) {
      await db.from("mensagens").delete().in("caso_id", casoIds);
      await db.from("case_interests").delete().in("case_id", casoIds);
      await db.from("casos").delete().in("id", casoIds);
    }

    await db.from("notificacoes").delete().eq("user_id", clienteId);

    const { error: deleteClientError } = await db
      .from("clientes")
      .delete()
      .eq("id", clienteId);

    if (deleteClientError) throw deleteClientError;

    if (supabaseAdmin) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(clienteId);
      if (authDeleteError) {
        console.error("Falha ao remover usuário do Auth:", authDeleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cliente excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/clientes:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/clientes?id=... -> resetar senha do cliente
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
    const clienteId = searchParams.get("id");

    if (!clienteId) {
      return NextResponse.json(
        { success: false, message: "ID do cliente é obrigatório" },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Service Role não configurada no servidor" },
        { status: 500 },
      );
    }

    const { error: authErrorUpdate } =
      await supabaseAdmin.auth.admin.updateUserById(clienteId, {
        password: "socialjuridico1!",
        user_metadata: {
          needs_password_update: true,
        },
      });

    if (authErrorUpdate) throw authErrorUpdate;

    return NextResponse.json({
      success: true,
      message: "Senha resetada para o padrão com sucesso",
    });
  } catch (error) {
    console.error("Erro na API PATCH /api/admin/clientes:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

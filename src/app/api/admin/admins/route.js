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
      .from("admins")
      .select("id, name, email, role, phone, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/admin/admins:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Service Role não configurada no servidor" },
        { status: 500 },
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

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const password = String(body.password || "socialjuridico1!").trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Nome, email e senha são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "ADMIN",
          needs_password_update: true,
        },
      });

    if (createAuthError || !authData?.user) {
      throw createAuthError || new Error("Falha ao criar usuário no Auth");
    }

    const payload = {
      id: authData.user.id,
      name,
      email,
      role: "ADMIN",
      phone,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("admins")
      .insert([payload])
      .select("id, name, email, role, phone, created_at")
      .single();

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API POST /api/admin/admins:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Service Role não configurada no servidor" },
        { status: 500 },
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID é obrigatório" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updateData = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.phone !== undefined)
      updateData.phone = body.phone ? String(body.phone).trim() : null;
    if (body.email !== undefined)
      updateData.email = String(body.email).trim().toLowerCase();

    if (Object.keys(updateData).length > 0) {
      const { error } = await db.from("admins").update(updateData).eq("id", id);
      if (error) throw error;
    }

    const authUpdate = {};
    if (body.email !== undefined)
      authUpdate.email = String(body.email).trim().toLowerCase();
    if (body.password !== undefined && String(body.password).trim()) {
      authUpdate.password = String(body.password).trim();
    }
    if (body.name !== undefined) {
      authUpdate.user_metadata = {
        full_name: String(body.name).trim(),
        role: "ADMIN",
      };
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        authUpdate,
      );
      if (authErr) throw authErr;
    }

    const { data, error: selectError } = await db
      .from("admins")
      .select("id, name, email, role, phone, created_at")
      .eq("id", id)
      .single();

    if (selectError) throw selectError;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API PUT /api/admin/admins:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Service Role não configurada no servidor" },
        { status: 500 },
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID é obrigatório" },
        { status: 400 },
      );
    }

    if (id === user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Você não pode excluir seu próprio usuário admin",
        },
        { status: 400 },
      );
    }

    const { error } = await db.from("admins").delete().eq("id", id);
    if (error) throw error;

    const { error: authErrorDelete } =
      await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErrorDelete) {
      console.error("Falha ao excluir admin do Auth:", authErrorDelete);
    }

    return NextResponse.json({
      success: true,
      message: "Admin removido com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/admins:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

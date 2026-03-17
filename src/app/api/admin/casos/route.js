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

// GET /api/admin/casos -> lista casos cadastrados
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

    let data = [];
    const { data: dataWithArea, error } = await db
      .from("casos")
      .select("id, titulo, area, status, cliente_id, advogado_id, created_at")
      .order("created_at", { ascending: false });

    if (
      error?.code === "PGRST204" ||
      error?.code === "42703" ||
      error?.message?.includes("casos.area")
    ) {
      // Fallback para bancos sem coluna 'area'
      const { data: fallbackData, error: fallbackError } = await db
        .from("casos")
        .select("id, titulo, status, cliente_id, advogado_id, created_at")
        .order("created_at", { ascending: false });
      if (fallbackError) throw fallbackError;
      data = (fallbackData || []).map((c) => ({ ...c, area: null }));
    } else {
      if (error) throw error;
      data = dataWithArea || [];
    }

    const clienteIds = Array.from(
      new Set((data || []).map((c) => c.cliente_id).filter(Boolean)),
    );

    let clientesMap = {};
    if (clienteIds.length > 0) {
      const { data: clientes } = await db
        .from("clientes")
        .select("id, name, email")
        .in("id", clienteIds);
      clientesMap = Object.fromEntries((clientes || []).map((c) => [c.id, c]));
    }

    const enriched = (data || []).map((caso) => ({
      ...caso,
      cliente_name: clientesMap[caso.cliente_id]?.name || null,
      cliente_email: clientesMap[caso.cliente_id]?.email || null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Erro na API GET /api/admin/casos:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/casos?id=... -> exclui caso
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
    const casoId = searchParams.get("id");

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    await db.from("mensagens").delete().eq("caso_id", casoId);
    await db.from("case_interests").delete().eq("case_id", casoId);

    const { error: deleteError } = await db
      .from("casos")
      .delete()
      .eq("id", casoId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Caso excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

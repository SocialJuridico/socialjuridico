import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

const BANNER_TABLES = ["admin_banners", "amin_banners"];

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

async function runOnBannerTable(executor) {
  let lastError = null;
  for (const table of BANNER_TABLES) {
    const result = await executor(table);
    if (!result.error) return result;
    if (result.error?.code !== "42P01" && result.error?.code !== "PGRST106") {
      return result;
    }
    lastError = result.error;
  }
  return {
    data: null,
    error: lastError || new Error("Tabela de banners não encontrada"),
  };
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

    const { data, error } = await runOnBannerTable((table) =>
      db
        .from(table)
        .select("id, name, image_url, link_url, created_at, updated_at, position, slot_index")
        .order("created_at", { ascending: false }),
    );

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/admin/banners:", error);
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

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, image_url, link_url, position, slot_index } = body;

    if (!name || !image_url) {
      return NextResponse.json(
        { success: false, message: "Nome e URL da imagem são obrigatórios" },
        { status: 400 },
      );
    }

    const payload = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      image_url: String(image_url).trim(),
      link_url: link_url ? String(link_url).trim() : null,
      position: position ? String(position).trim() : "left",
      slot_index: slot_index !== undefined ? Number(slot_index) : 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await runOnBannerTable((table) =>
      db
        .from(table)
        .insert([payload])
        .select("id, name, image_url, link_url, created_at, updated_at, position, slot_index")
        .single(),
    );

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API POST /api/admin/banners:", error);
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
    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.image_url !== undefined)
      updates.image_url = String(body.image_url).trim();
    if (body.link_url !== undefined)
      updates.link_url = body.link_url ? String(body.link_url).trim() : null;
    if (body.position !== undefined)
      updates.position = String(body.position).trim();
    if (body.slot_index !== undefined)
      updates.slot_index = Number(body.slot_index);

    const { data, error } = await runOnBannerTable((table) =>
      db
        .from(table)
        .update(updates)
        .eq("id", id)
        .select("id, name, image_url, link_url, created_at, updated_at, position, slot_index")
        .single(),
    );

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API PUT /api/admin/banners:", error);
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

    const { error } = await runOnBannerTable((table) =>
      db.from(table).delete().eq("id", id),
    );
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Banner removido com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/banners:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

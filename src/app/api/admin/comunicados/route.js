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

async function insertNotifications(db, notifications) {
  const { error } = await db.from("notificacoes").insert(notifications);

  if (error?.code === "PGRST204") {
    const fallback = notifications.map(
      ({ id, user_id, titulo, mensagem, lida, created_at }) => ({
        id,
        user_id,
        titulo,
        mensagem,
        lida,
        created_at,
      }),
    );
    const { error: fallbackError } = await db
      .from("notificacoes")
      .insert(fallback);
    if (fallbackError) throw fallbackError;
    return;
  }

  if (error) throw error;
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

    const [clientesRes, advogadosRes] = await Promise.all([
      db
        .from("clientes")
        .select("id, name, email")
        .order("name", { ascending: true }),
      db
        .from("advogados")
        .select("id, name, email, oab")
        .order("name", { ascending: true }),
    ]);

    if (clientesRes.error) throw clientesRes.error;
    if (advogadosRes.error) throw advogadosRes.error;

    return NextResponse.json({
      success: true,
      data: {
        clientes: clientesRes.data || [],
        advogados: advogadosRes.data || [],
      },
    });
  } catch (error) {
    console.error("Erro na API GET /api/admin/comunicados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
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
    const audience = String(body.audience || "").trim();
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const recipientId = body.recipientId ? String(body.recipientId).trim() : "";

    if (!audience || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Público, título e mensagem são obrigatórios",
        },
        { status: 400 },
      );
    }

    let recipients = [];

    if (audience === "single-lawyer") {
      if (!recipientId) {
        return NextResponse.json(
          { success: false, message: "Selecione um advogado" },
          { status: 400 },
        );
      }
      recipients = [recipientId];
    } else if (audience === "single-client") {
      if (!recipientId) {
        return NextResponse.json(
          { success: false, message: "Selecione um cliente" },
          { status: 400 },
        );
      }
      recipients = [recipientId];
    } else if (audience === "all-lawyers") {
      const { data, error } = await db.from("advogados").select("id");
      if (error) throw error;
      recipients = (data || []).map((item) => item.id);
    } else if (audience === "all-clients") {
      const { data, error } = await db.from("clientes").select("id");
      if (error) throw error;
      recipients = (data || []).map((item) => item.id);
    } else if (audience === "all-users") {
      const [clientesRes, advogadosRes, adminsRes] = await Promise.all([
        db.from("clientes").select("id"),
        db.from("advogados").select("id"),
        db.from("admins").select("id"),
      ]);
      if (clientesRes.error) throw clientesRes.error;
      if (advogadosRes.error) throw advogadosRes.error;
      if (adminsRes.error) throw adminsRes.error;

      recipients = [
        ...(clientesRes.data || []).map((item) => item.id),
        ...(advogadosRes.data || []).map((item) => item.id),
        ...(adminsRes.data || []).map((item) => item.id),
      ];
    } else {
      return NextResponse.json(
        { success: false, message: "Público inválido" },
        { status: 400 },
      );
    }

    recipients = Array.from(new Set(recipients.filter(Boolean)));
    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhum destinatário encontrado" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const notifications = recipients.map((userId) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      titulo: title,
      mensagem: message,
      lida: false,
      created_at: now,
      tipo: "ADMIN_BROADCAST",
      meta: JSON.stringify({
        audience,
        sent_by: user.id,
      }),
    }));

    await insertNotifications(db, notifications);

    return NextResponse.json({
      success: true,
      message: `Comunicado enviado para ${recipients.length} usuário(s).`,
    });
  } catch (error) {
    console.error("Erro na API POST /api/admin/comunicados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

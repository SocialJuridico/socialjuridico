import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

function parseMeta(meta) {
  if (!meta) return {};
  if (typeof meta === "object") return meta;
  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
}

async function resolveRole(db, userId) {
  const { data: admin } = await db
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (admin) return "ADMIN";

  const { data: lawyer } = await db
    .from("advogados")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (lawyer) return "LAWYER";

  return null;
}

async function resolvePartner(db, currentRole, partnerId) {
  if (currentRole === "LAWYER") {
    const { data } = await db
      .from("admins")
      .select("id, name, email")
      .eq("id", partnerId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name || data.email || "Administrador",
      role: "ADMIN",
    };
  }

  if (currentRole === "ADMIN") {
    const { data } = await db
      .from("advogados")
      .select("id, name, email")
      .eq("id", partnerId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name || data.email || "Advogado",
      role: "LAWYER",
    };
  }

  return null;
}

function mapChatMessage(row, currentUserId) {
  const meta = parseMeta(row.meta);
  const senderId = meta.sender_id || null;
  return {
    id: row.id,
    content: row.mensagem || "",
    created_at: row.created_at,
    sender_id: senderId,
    sender_role: meta.sender_role || null,
    isOwn: senderId === currentUserId,
    tipo: row.tipo || null,
  };
}

export async function GET(request) {
  try {
    const supabase = createClient();
    const db = supabaseAdmin || supabase;

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

    const role = await resolveRole(db, user.id);
    if (!role || (role !== "ADMIN" && role !== "LAWYER")) {
      return NextResponse.json(
        {
          success: false,
          message: "Acesso permitido apenas para admin e advogado",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const partnerId = String(searchParams.get("partnerId") || "").trim();

    if (!partnerId) {
      return NextResponse.json(
        { success: false, message: "partnerId é obrigatório" },
        { status: 400 },
      );
    }

    const partner = await resolvePartner(db, role, partnerId);
    if (!partner) {
      return NextResponse.json(
        { success: false, message: "Participante não encontrado" },
        { status: 404 },
      );
    }

    const { data, error } = await db
      .from("notificacoes")
      .select("id, user_id, titulo, mensagem, created_at, tipo, meta")
      .order("created_at", { ascending: true })
      .limit(1200);

    if (error) throw error;

    const filtered = (data || []).filter((row) => {
      const meta = parseMeta(row.meta);

      if (role === "LAWYER") {
        if (row.user_id !== user.id) return false;

        if (row.tipo === "ADMIN_BROADCAST") {
          return String(meta.sent_by || "") === partnerId;
        }

        if (row.tipo === "ADMIN_CHAT") {
          return (
            String(meta.sender_id || "") === partnerId ||
            String(meta.chat_with || "") === partnerId
          );
        }

        return false;
      }

      if (role === "ADMIN") {
        if (row.tipo === "ADMIN_BROADCAST") {
          return (
            row.user_id === partnerId && String(meta.sent_by || "") === user.id
          );
        }

        if (row.tipo === "ADMIN_CHAT") {
          const isAdminSentToPartner =
            row.user_id === partnerId &&
            String(meta.sender_id || "") === user.id;
          const isPartnerSentToAdmin =
            row.user_id === user.id &&
            String(meta.sender_id || "") === partnerId;
          const isAdminMirror =
            row.user_id === user.id &&
            String(meta.sender_id || "") === user.id &&
            String(meta.chat_with || "") === partnerId;

          return isAdminSentToPartner || isPartnerSentToAdmin || isAdminMirror;
        }

        return false;
      }

      return false;
    });

    return NextResponse.json({
      success: true,
      data: {
        partner,
        messages: filtered.map((row) => mapChatMessage(row, user.id)),
      },
    });
  } catch (error) {
    console.error("Erro na API GET /api/admin-chat:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const db = supabaseAdmin || supabase;

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

    const role = await resolveRole(db, user.id);
    if (!role || (role !== "ADMIN" && role !== "LAWYER")) {
      return NextResponse.json(
        {
          success: false,
          message: "Acesso permitido apenas para admin e advogado",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const partnerId = String(body.partnerId || "").trim();
    const content = String(body.content || "").trim();

    if (!partnerId || !content) {
      return NextResponse.json(
        { success: false, message: "partnerId e conteúdo são obrigatórios" },
        { status: 400 },
      );
    }

    const partner = await resolvePartner(db, role, partnerId);
    if (!partner) {
      return NextResponse.json(
        { success: false, message: "Participante não encontrado" },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const senderLabel = role === "ADMIN" ? "administrador" : "advogado";

    const recipientRow = {
      id: crypto.randomUUID(),
      user_id: partnerId,
      titulo: `Nova mensagem do ${senderLabel}`,
      mensagem: content,
      lida: false,
      created_at: now,
      tipo: "ADMIN_CHAT",
      meta: JSON.stringify({
        sender_id: user.id,
        sender_role: role,
        chat_with: user.id,
      }),
    };

    const senderMirrorRow = {
      id: crypto.randomUUID(),
      user_id: user.id,
      titulo: "Mensagem enviada",
      mensagem: content,
      lida: true,
      created_at: now,
      tipo: "ADMIN_CHAT",
      meta: JSON.stringify({
        sender_id: user.id,
        sender_role: role,
        chat_with: partnerId,
      }),
    };

    const { error } = await db
      .from("notificacoes")
      .insert([recipientRow, senderMirrorRow]);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        id: senderMirrorRow.id,
        content,
        created_at: now,
        sender_id: user.id,
        sender_role: role,
        isOwn: true,
        tipo: "ADMIN_CHAT",
      },
    });
  } catch (error) {
    console.error("Erro na API POST /api/admin-chat:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

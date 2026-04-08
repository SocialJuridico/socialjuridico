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
  const senderId = meta.sender_id || meta.sent_by || null;
  return {
    id: row.id,
    content: row.mensagem || "",
    created_at: row.created_at,
    sender_id: senderId,
    sender_role: meta.sender_role || (row.tipo === 'ADMIN_BROADCAST' ? 'ADMIN' : null),
    isOwn: String(senderId) === String(currentUserId),
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
      .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
      .in("tipo", ["ADMIN_CHAT", "ADMIN_BROADCAST"])
      .order("created_at", { ascending: true });

    if (error) throw error;

    const filtered = (data || []).filter((row) => {
      const meta = parseMeta(row.meta);

      // SOFT DELETE: Se a mensagem estiver marcada como apagada por quem está vendo, pula
      if (role === "LAWYER" && meta.deleted_by_user) return false;
      if (role === "ADMIN" && meta.deleted_by_admin) return false;

      if (role === "LAWYER") {
        if (row.user_id !== user.id) return false;

        if (row.tipo === "ADMIN_BROADCAST") {
          return String(meta.sent_by || "") === partnerId;
        }

        if (row.tipo === "ADMIN_CHAT") {
          // Recebida do admin ou Mirror de enviada para admin
          return (
            String(meta.sender_id || "") === partnerId || 
            String(meta.chat_with || "") === partnerId
          );
        }

        return false;
      }

      if (role === "ADMIN") {
        // Para ADMIN, permitimos ver:
        // 1. O que foi enviado PARA ele (user_id === adminId)
        // 2. O que ele enviou PARA o parceiro (user_id === partnerId AND sent_by === adminId)

        if (row.tipo === "ADMIN_BROADCAST") {
          const sentByMe = String(meta.sent_by || "") === user.id && row.user_id === partnerId;
          const sentByPartner = String(meta.sent_by || "") === partnerId && row.user_id === user.id;
          return sentByMe || sentByPartner;
        }

        if (row.tipo === "ADMIN_CHAT") {
          if (row.user_id === user.id) {
            // Mirror ou recebida
            return (
              String(meta.sender_id || "") === partnerId || 
              String(meta.chat_with || "") === partnerId
            );
          }
          if (row.user_id === partnerId) {
             // O que o parceiro recebeu DE mim
             return String(meta.sender_id || "") === user.id;
          }
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

export async function DELETE(request) {
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
        { success: false, message: "Acesso restrito" },
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

    console.log(`[DELETE AdminChat] Admin ${user.email} deleting conversation with partner ${partnerId}`);

    // 1. Busca todas as possíveis notificações que ligam esse Admin ao Parceiro
    // Pegamos um range amplo para processar no JS (mais confiável que filtros JSON complexos em algumas versões)
    const { data: allNotifs, error: fetchError } = await db
      .from("notificacoes")
      .select("id, user_id, tipo, meta")
      .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
      .in("tipo", ["ADMIN_CHAT", "ADMIN_BROADCAST"]);

    if (fetchError) throw fetchError;

    // 2. Filtra no JS as mensagens que pertencem a esta conversa específica
    const notifsToUpdate = (allNotifs || []).filter(row => {
      const meta = parseMeta(row.meta);

      // Verificações para ADMIN_CHAT
      if (row.tipo === "ADMIN_CHAT") {
        const isAdminMirror = row.user_id === user.id && String(meta.chat_with || "") === partnerId;
        const isPartnerReceived = row.user_id === partnerId && String(meta.sender_id || "") === user.id;
        const isReceivedFromPartner = row.user_id === user.id && String(meta.sender_id || "") === partnerId;
        
        // Se for Lawyer apagando, ele apaga apenas o que está no user_id dele
        if (role === "LAWYER") {
          return row.user_id === user.id && (isReceivedFromPartner || isAdminMirror);
        }

        // Se for Admin apagando, ele quer esconder da visão dele (mirrors + recebidas)
        // E TAMBÉM marcar o que ele enviou para o parceiro como "apagado pelo admin"
        return isAdminMirror || isPartnerReceived || isReceivedFromPartner;
      }

      // Verificações para ADMIN_BROADCAST
      if (row.tipo === "ADMIN_BROADCAST") {
        // Se for admin, marca os comunicados que ELE enviou para esse parceiro como apagados por ele
        if (role === "ADMIN") {
           return row.user_id === partnerId && String(meta.sent_by || "") === user.id;
        }
        // Se for lawyer, marca o que ele recebeu
        if (role === "LAWYER") {
           return row.user_id === user.id && String(meta.sent_by || "") === partnerId;
        }
      }

      return false;
    });

    console.log(`[DELETE AdminChat] Found ${notifsToUpdate.length} messages to soft-delete.`);

    if (notifsToUpdate.length > 0) {
      // Como o meta pode variar, precisamos atualizar um a um ou em blocos se idênticos
      // Para garantir a preservação de outros dados no meta, faremos em paralelo
      const updates = notifsToUpdate.map(async (row) => {
        const currentMeta = parseMeta(row.meta);
        const newMeta = { ...currentMeta };
        
        if (role === "ADMIN") {
          newMeta.deleted_by_admin = true;
        } else {
          newMeta.deleted_by_user = true;
        }

        // Se ambos apagaram, ou se é o dono apagando algo privado, podemos apagar físico
        // Mas por segurança e para atender o requisito "não apaga para o outro", 
        // o soft-delete resolve perfeitamente.
        // Se a msg já estava apagada pelo outro, agora ela some definitivamente.
        if (newMeta.deleted_by_admin && newMeta.deleted_by_user) {
          return db.from("notificacoes").delete().eq("id", row.id);
        }

        return db.from("notificacoes").update({ meta: JSON.stringify(newMeta) }).eq("id", row.id);
      });

      await Promise.all(updates);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${notifsToUpdate.length} mensagens atualizadas/removidas com sucesso.`,
      count: notifsToUpdate.length
    });

  } catch (error) {
    console.error("Erro na API DELETE /api/admin-chat:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

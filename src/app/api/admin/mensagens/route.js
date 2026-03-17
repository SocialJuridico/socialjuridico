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

async function ensureAdmin(db, userId) {
  const { data, error } = await db
    .from("admins")
    .select("id")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function GET() {
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

    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { data, error } = await db
      .from("notificacoes")
      .select("id, user_id, titulo, mensagem, created_at, tipo, meta")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const sentRows = (data || []).filter((row) => {
      const meta = parseMeta(row.meta);
      return (
        (row.tipo === "ADMIN_BROADCAST" &&
          String(meta.sent_by || "") === user.id) ||
        (row.tipo === "ADMIN_CHAT" && String(meta.sender_id || "") === user.id)
      );
    });

    const targetIds = Array.from(
      new Set(sentRows.map((row) => row.user_id).filter(Boolean)),
    );

    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: lawyers, error: lawyersError } = await db
      .from("advogados")
      .select("id, name, email, oab")
      .in("id", targetIds);

    if (lawyersError) throw lawyersError;

    const lawyerMap = new Map((lawyers || []).map((l) => [l.id, l]));

    const conversationsMap = new Map();

    sentRows.forEach((row) => {
      if (!lawyerMap.has(row.user_id)) return;

      const prev = conversationsMap.get(row.user_id);
      if (!prev) {
        conversationsMap.set(row.user_id, {
          userId: row.user_id,
          lastMessage: row.mensagem || "",
          lastTitle: row.titulo || "Mensagem",
          lastDate: row.created_at,
          totalMessages: 1,
        });
        return;
      }

      prev.totalMessages += 1;
      if (new Date(row.created_at) > new Date(prev.lastDate || 0)) {
        prev.lastDate = row.created_at;
        prev.lastMessage = row.mensagem || prev.lastMessage;
        prev.lastTitle = row.titulo || prev.lastTitle;
      }
    });

    const conversations = Array.from(conversationsMap.values())
      .map((conv) => {
        const lawyer = lawyerMap.get(conv.userId);
        return {
          ...conv,
          lawyer: {
            id: lawyer.id,
            name: lawyer.name || "Advogado",
            email: lawyer.email || "",
            oab: lawyer.oab || "",
          },
        };
      })
      .sort((a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0));

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error("Erro na API GET /api/admin/mensagens:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/mensagens?caso_id=xxx  -> busca mensagens de um caso
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const caso_id = searchParams.get("caso_id");

    if (!caso_id) {
      return NextResponse.json(
        { success: false, message: "caso_id é obrigatório" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("mensagens")
      .select("*")
      .eq("caso_id", caso_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/mensagens:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// POST /api/mensagens -> envia uma nova mensagem
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

    const body = await request.json();
    const { caso_id, content } = body;

    if (!caso_id || !content?.trim()) {
      return NextResponse.json(
        { success: false, message: "caso_id e conteúdo são obrigatórios" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("mensagens")
      .insert([
        {
          caso_id,
          sender_id: user.id,
          content: content.trim(),
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    // Buscar o caso para saber quem notificar
    const { data: caso } = await supabaseAdmin
      .from("casos")
      .select("id, titulo, cliente_id, advogado_id")
      .eq("id", caso_id)
      .single();

    if (caso) {
      const recipientId =
        user.id === caso.cliente_id ? caso.advogado_id : caso.cliente_id;

      if (recipientId && recipientId !== user.id) {
        const now = new Date().toISOString();
        const notifId = crypto.randomUUID();
        const notifBase = {
          id: notifId,
          user_id: recipientId,
          titulo: "Nova mensagem no chat",
          mensagem: `Você recebeu uma nova mensagem no caso "${caso.titulo}".`,
          lida: false,
          created_at: now,
        };

        const { error: notifError } = await supabaseAdmin
          .from("notificacoes")
          .insert([
            {
              ...notifBase,
              tipo: "MENSAGEM",
              meta: JSON.stringify({ case_id: caso_id }),
            },
          ]);

        if (notifError?.code === "PGRST204") {
          const { error: fallbackError } = await supabaseAdmin
            .from("notificacoes")
            .insert([notifBase]);
          if (fallbackError) {
            console.error(
              "Falha ao inserir notificação de mensagem (fallback):",
              fallbackError,
            );
          }
        } else if (notifError) {
          console.error(
            "Falha ao inserir notificação de mensagem:",
            notifError,
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Erro na API POST /api/mensagens:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

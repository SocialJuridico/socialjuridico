import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { parseAdvertiserSessionToken } from "@/lib/anuncianteAuth";

async function getAnuncianteSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sj_anunciante_session");

  if (!session?.value) return null;

  return parseAdvertiserSessionToken(session.value);
}

export async function GET() {
  const session = await getAnuncianteSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Não autorizado" },
      { status: 401 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("mensagens_suporte_anunciante")
    .select("*")
    .eq("anunciante_id", session.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request) {
  const session = await getAnuncianteSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Não autorizado" },
      { status: 401 },
    );
  }

  try {
    const { content } = await request.json();
    const normalizedContent =
      typeof content === "string" ? content.trim() : "";

    if (!normalizedContent) {
      return NextResponse.json(
        { success: false, message: "Conteúdo é obrigatório" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("mensagens_suporte_anunciante")
      .insert([
        {
          anunciante_id: session.id,
          sender_type: "ANUNCIANTE",
          content: normalizedContent,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Erro ao processar requisição" },
      { status: 500 },
    );
  }
}

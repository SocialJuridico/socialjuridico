import { supabase, supabaseAdmin } from "@/lib/supabase";
import { parseAdvertiserSessionToken } from "@/lib/anuncianteAuth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getAnuncianteSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sj_anunciante_session");

  if (!session?.value) {
    return null;
  }

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

  const db = supabaseAdmin || supabase;
  const { data, error } = await db
    .from("anuncios")
    .select("*")
    .eq("anunciante_id", session.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Anunciante/Anúncios] Erro ao buscar anúncios:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: data || [],
  });
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
    const body = await request.json();
    const { titulo, descricao, categoria } = body;

    if (!titulo || !descricao || !categoria) {
      return NextResponse.json(
        {
          success: false,
          message: "Título, descrição e categoria são obrigatórios",
        },
        { status: 400 },
      );
    }

    const db = supabaseAdmin || supabase;
    const { data, error } = await db
      .from("anuncios")
      .insert([
        {
          anunciante_id: session.id,
          titulo,
          descricao,
          categoria,
          em_destaque: false,
        },
      ])
      .select();

    if (error) {
      console.error("ERRO CRÍTICO SUPABASE:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Erro ao salvar no banco de dados",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data?.[0],
    });
  } catch (error) {
    console.error("ERRO NO CATCH:", error);

    return NextResponse.json(
      {
        success: false,
        message: `Erro interno: ${error.message}`,
      },
      { status: 500 },
    );
  }
}

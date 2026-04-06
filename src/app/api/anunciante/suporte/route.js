import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAnuncianteSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sj_anunciante_session");
  if (!session) return null;
  try {
    return JSON.parse(Buffer.from(session.value, "base64").toString("utf8"));
  } catch (e) {
    return null;
  }
}

export async function GET() {
  const session = await getAnuncianteSession();
  if (!session) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("mensagens_suporte_anunciante")
    .select("*")
    .eq("anunciante_id", session.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request) {
  const session = await getAnuncianteSession();
  if (!session) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ success: false, message: "Conteúdo é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("mensagens_suporte_anunciante")
      .insert([{
        anunciante_id: session.id,
        sender_type: "ANUNCIANTE",
        content: content
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Erro ao processar requisição" }, { status: 500 });
  }
}

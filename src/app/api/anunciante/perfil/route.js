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

export async function PATCH(request) {
  const session = await getAnuncianteSession();
  if (!session) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

  try {
    const { senha } = await request.json();

    if (!senha) {
      return NextResponse.json({ success: false, message: "Senha é obrigatória" }, { status: 400 });
    }

    const { error } = await supabase
      .from("anunciantes")
      .update({ password: senha })
      .eq("id", session.id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Senha atualizada!" });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Erro ao processar requisição" }, { status: 500 });
  }
}

export async function POST(request) {
  // Use POST to logout
  const { logout } = await request.json();
  if (logout) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("sj_anunciante_session");
    return response;
  }
  return NextResponse.json({ success: false });
}

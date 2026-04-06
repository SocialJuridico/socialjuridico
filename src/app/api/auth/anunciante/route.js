import { supabaseAdmin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// We use the admin client to bypass RLS for this internal auth check
const db = supabaseAdmin || supabase;

export async function POST(request) {
  try {
    const { usuario, senha } = await request.json();

    if (!usuario || !senha) {
      return NextResponse.json({ success: false, message: "Usuário e senha são obrigatórios" }, { status: 400 });
    }

    const { data, error } = await db
      .from("anunciantes")
      .select("*")
      .eq("username", usuario)
      .eq("password", senha)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, message: "Usuário ou senha incorretos" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: { id: data.id, nome: data.nome_empresa, usuario: data.username } });
    
    // Create base64 encoded session cookie (simple as requested for this feature)
    const sessionData = {
      id: data.id,
      username: data.username,
      nome_empresa: data.nome_empresa,
      role: "ANUNCIANTE",
      loginAt: new Date().toISOString(),
    };
    
    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    
    response.cookies.set("sj_anunciante_session", encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login Anunciante Error:", err);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

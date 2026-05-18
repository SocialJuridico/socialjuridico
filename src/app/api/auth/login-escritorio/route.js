import { supabaseAdmin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const db = supabaseAdmin || supabase;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const { data, error } = await db
      .from("escritorios")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, message: "Escritório não cadastrado ou credenciais incorretas" }, { status: 401 });
    }

    // Direct password match (as fallback/simple auth for the MVP/Enterprise rollout)
    if (data.senha !== password) {
      return NextResponse.json({ success: false, message: "Senha incorreta para este escritório" }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.id,
        nome: data.nome,
        cnpj: data.cnpj,
        email: data.email,
        plano: data.plano
      }
    });
    
    // Create base64 encoded session cookie for offices
    const sessionData = {
      id: data.id,
      email: data.email,
      nome: data.nome,
      cnpj: data.cnpj,
      plano: data.plano,
      role: "ESCRITORIO",
      loginAt: new Date().toISOString(),
    };
    
    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    
    response.cookies.set("sj_escritorio_session", encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login Escritorio Error:", err);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();
    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    // 1. Verificar se é um membro da equipe de um escritório (Advogado, Estagiário ou Secretária)
    const { data: staffMember, error: staffError } = await db
      .from("advogados")
      .select("id, name, email, role, phone, cargo, escritorio_id, oab, estado, oab_verification_status, oab_warning_started_at")
      .eq("email", emailClean)
      .not("escritorio_id", "is", null) // Precisa pertencer a um escritório
      .maybeSingle();

    if (staffMember) {
      // Autenticar com o Supabase Auth usando o login normal
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password,
      });

      if (authError) {
        return NextResponse.json({ success: false, message: "Senha incorreta ou credenciais inválidas." }, { status: 401 });
      }

      // Verificar confirmação de e-mail
      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return NextResponse.json({ success: false, message: "Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada e clique no link de confirmação." }, { status: 401 });
      }

      // Verificação do bloqueio da OAB para advogados da equipe
      if (staffMember.cargo === "advogado") {
        let isError = staffMember.oab_verification_status === "ERROR";
        if (!isError && staffMember.oab_verification_status === "PENDING" && staffMember.oab_warning_started_at) {
          const startedDate = new Date(staffMember.oab_warning_started_at);
          const daysPassed = (new Date().getTime() - startedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysPassed >= 7) {
            isError = true;
            await db.from("advogados").update({ oab_verification_status: "ERROR" }).eq("id", staffMember.id);
          }
        }
        if (isError) {
          await supabase.auth.signOut();
          return NextResponse.json({ success: false, type: "OAB_ERROR", message: "Acesso suspenso por pendência de verificação da OAB." }, { status: 403 });
        }
      }

      // Sucesso! Retorna a resposta e define o cookie de controle de sessão do usuário normal
      const response = NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: staffMember.name,
          role: staffMember.role || "LAWYER",
          cargo: staffMember.cargo,
          needsPasswordUpdate: authData.user.user_metadata?.needs_password_update === true
        }
      });

      const loginData = Buffer.from(
        JSON.stringify({ loginAt: new Date().toISOString(), userId: authData.user.id })
      ).toString("base64");

      response.cookies.set("sj_login_time", loginData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 4 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // 2. Caso contrário, verifica se é o administrador/dono do escritório
    const { data: office, error: officeError } = await db
      .from("escritorios")
      .select("*")
      .eq("email", emailClean)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ success: false, message: "Escritório não cadastrado ou credenciais incorretas" }, { status: 401 });
    }

    // Match direto de senha para o dono do escritório
    if (office.senha !== password) {
      return NextResponse.json({ success: false, message: "Senha incorreta para este escritório" }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: office.id,
        nome: office.nome,
        cnpj: office.cnpj,
        email: office.email,
        plano: office.plano
      }
    });
    
    // Create base64 encoded session cookie for offices
    const sessionData = {
      id: office.id,
      email: office.email,
      nome: office.nome,
      cnpj: office.cnpj,
      plano: office.plano,
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

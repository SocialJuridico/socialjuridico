import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { hashAdvertiserPassword } from "@/lib/anuncianteAuth";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito" },
        { status: 403 },
      );
    }

    // Nunca retornar password ou password_hash para o front-end.
    const { data: anunciantes, error } = await db
      .from("anunciantes")
      .select(
        `
          id,
          username,
          nome_empresa,
          whatsapp,
          ativo,
          created_at,
          anuncios:anuncios(*)
        `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: anunciantes || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;

    if (!(await ensureAdmin(db, user.id))) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "CREATE_ANUNCIANTE") {
      const username =
        typeof data.username === "string"
          ? data.username.trim().toLowerCase()
          : "";

      const password =
        typeof data.password === "string"
          ? data.password
          : "";

      if (!username || password.length < 8) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Informe um usuário e uma senha com pelo menos oito caracteres.",
          },
          { status: 400 },
        );
      }

      const passwordHash = hashAdvertiserPassword(password);

      const { error } = await db.from("anunciantes").insert([
        {
          username,
          password: "__HASHED_PASSWORD__",
          password_hash: passwordHash,
          nome_empresa: data.nome_empresa,
          whatsapp: data.whatsapp,
          ativo: true,
        },
      ]);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Anunciante criado com segurança.",
      });
    }

    if (action === "UPDATE_ANUNCIANTE") {
      const username =
        typeof data.username === "string"
          ? data.username.trim().toLowerCase()
          : "";

      if (!username) {
        return NextResponse.json(
          {
            success: false,
            message: "Informe um nome de usuário válido.",
          },
          { status: 400 },
        );
      }

      const { error } = await db
        .from("anunciantes")
        .update({
          nome_empresa: data.nome_empresa,
          whatsapp: data.whatsapp,
          username,
          ativo:
            typeof data.ativo === "boolean"
              ? data.ativo
              : undefined,
        })
        .eq("id", data.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Cadastro atualizado",
      });
    }

    if (action === "DELETE_ANUNCIANTE") {
      const { error } = await db
        .from("anunciantes")
        .delete()
        .eq("id", data.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Anunciante removido",
      });
    }

    if (action === "TOGGLE_DESTAQUE") {
      const { error } = await db
        .from("anuncios")
        .update({
          em_destaque: data.em_destaque,
        })
        .eq("id", data.id);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    if (action === "DELETE_ANUNCIO") {
      const { error } = await db
        .from("anuncios")
        .delete()
        .eq("id", data.id);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({
      success: false,
      message: "Ação inválida",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

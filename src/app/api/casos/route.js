import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

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

    const role = user.user_metadata?.role || "CLIENT";
    if (role !== "CLIENT") {
      return NextResponse.json(
        { success: false, message: "Apenas clientes podem publicar casos" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { titulo, descricao, area_atuacao, anexos } = body || {};

    if (!titulo?.trim() || !descricao?.trim() || !area_atuacao?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Título, descrição e área de atuação são obrigatórios",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("casos")
      .insert([
        {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          area_atuacao: area_atuacao.trim(),
          cliente_id: user.id,
          anexos: Array.isArray(anexos) ? anexos : [],
          status: "ABERTO",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro Supabase ao criar caso:", error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API POST /api/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Casos API: Usuário não autenticado", authError);
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const role = user.user_metadata?.role || "CLIENT";
    console.log(
      `Buscando casos para o usuário ID: ${user.id} (${user.email}), Role: ${role}`,
    );

    let query = supabaseAdmin.from("casos").select("*");

    if (role === "LAWYER") {
      // Advogado vê casos vinculados a ele OU casos abertos sem advogado
      const { data, error } = await supabaseAdmin
        .from("casos")
        .select("*")
        .or(
          `advogado_id.eq.${user.id},and(status.eq.ABERTO,advogado_id.is.null)`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    } else {
      // Cliente vê apenas os próprios casos
      const { data, error } = await supabaseAdmin
        .from("casos")
        .select("*")
        .eq("cliente_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Se não achou nada, verificamos por email (debug)
      if (data.length === 0) {
        const { data: profile } = await supabaseAdmin
          .from("clientes")
          .select("id")
          .eq("email", user.email)
          .single();
        if (profile && profile.id !== user.id) {
          const { data: emailData } = await supabaseAdmin
            .from("casos")
            .select("*")
            .eq("cliente_id", profile.id);
          if (emailData && emailData.length > 0)
            return NextResponse.json({ success: true, data: emailData });
        }
      }
      return NextResponse.json({ success: true, data: data || [] });
    }
  } catch (error) {
    console.error("Erro na API de Casos:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
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
    const { id, titulo, descricao, area_atuacao } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    console.log(`Atualizando caso ${id} para o usuário ${user.id}`);

    const { data, error } = await supabaseAdmin
      .from("casos")
      .update({
        titulo,
        descricao,
        area_atuacao,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("cliente_id", user.id) // Garante que o cliente só edite os próprios casos
      .select();

    if (error) {
      console.error("Erro Supabase ao atualizar caso:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado ou sem permissão" },
        { status: 404 },
      );
    }

    console.log("Caso atualizado:", data[0]);
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Erro na API PUT /api/casos:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

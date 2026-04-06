import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { getRoleFromDatabase } from "@/lib/securityUtils";
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

    const db = supabaseAdmin || supabase;
    const role = (await getRoleFromDatabase(db, user.id)) || "CLIENT";
    if (role !== "CLIENT") {
      return NextResponse.json(
        { success: false, message: "Apenas clientes podem publicar casos" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { titulo, descricao, area_atuacao, anexos, cidade, estado } = body || {};

    if (!titulo?.trim() || !descricao?.trim() || !area_atuacao?.trim() || !cidade?.trim() || !estado?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Título, descrição, área de atuação, cidade e estado em que se encontra o caso são obrigatórios",
        },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("casos")
      .insert([
        {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          area_atuacao: area_atuacao.trim(),
          cidade: cidade.trim(),
          estado: estado.trim(),
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
      // ⚠️ SEGURANÇA: Não logar detalhes de autenticação
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const role = (await getRoleFromDatabase(db, user.id)) || "CLIENT";
    // ⚠️ SEGURANÇA: Não logar user.id ou user.email

    let query = db.from("casos").select("*");

    if (role === "LAWYER") {
      // Advogado vê:
      // - Casos vinculados a ele (contratados)
      // - Casos ABERTOS sem advogado (oportunidades)
      // - Casos NEGOCIANDO sem advogado definido (em negociação)
      const { data, error } = await db
        .from("casos")
        .select("*")
        .or(
          `advogado_id.eq.${user.id},and(status.eq.ABERTO,advogado_id.is.null),and(status.eq.NEGOCIANDO,advogado_id.is.null)`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    } else {
      // Cliente vê apenas os próprios casos
      const { data, error } = await db
        .from("casos")
        .select("*")
        .eq("cliente_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Se não achou nada, verificamos por email (debug)
      if (data.length === 0) {
        const { data: profile } = await db
          .from("clientes")
          .select("id")
          .eq("email", user.email)
          .single();
        if (profile && profile.id !== user.id) {
          const { data: emailData } = await db
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
    const { id, titulo, descricao, area_atuacao, cidade, estado } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    // ⚠️ SEGURANÇA: Não logar user.id

    const { data, error } = await supabaseAdmin
      .from("casos")
      .update({
        titulo,
        descricao,
        area_atuacao,
        cidade,
        estado,
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

    // ⚠️ SEGURANÇA: Não logar dados sensíveis do caso
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Erro na API PUT /api/casos:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
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
    const { id, status } = body || {};

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "ID e status são obrigatórios" },
        { status: 400 },
      );
    }

    const normalizedStatus = String(status).trim().toUpperCase();
    if (!["ABERTO", "FECHADO", "CANCELADO"].includes(normalizedStatus)) {
      return NextResponse.json(
        { success: false, message: "Status inválido" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("casos")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("cliente_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro na API PATCH /api/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
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
    const casoId = searchParams.get("id");

    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso é obrigatório" },
        { status: 400 },
      );
    }

    // 1. Verificar se o caso tem advogado vinculado antes de apagar
    const { data: caso, error: casoError } = await supabaseAdmin
      .from("casos")
      .select("id, cliente_id, advogado_id")
      .eq("id", casoId)
      .eq("cliente_id", user.id)
      .single();

    if (casoError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado ou sem permissão" },
        { status: 404 },
      );
    }

    // 2. Se houver advogado, apenas CANCELA para que ele tenha feedback
    if (caso.advogado_id) {
      const { error: cancelError } = await supabaseAdmin
        .from("casos")
        .update({
          status: "CANCELADO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", casoId);

      if (cancelError) throw cancelError;

      // Opcional: Notificar o advogado explicitamente
      await supabaseAdmin.from("notificacoes").insert([
        {
          user_id: caso.advogado_id,
          titulo: "Um caso foi cancelado",
          mensagem:
            "O cliente decidiu encerrar um dos casos que você estava atendendo.",
          tipo: "CASO_CANCELADO",
          meta: JSON.stringify({ case_id: casoId }),
        },
      ]);

      return NextResponse.json({
        success: true,
        message: "Caso cancelado e arquivado para o advogado.",
      });
    }

    // 3. Se não houver advogado, apaga definitivamente (limpeza)
    await supabaseAdmin.from("mensagens").delete().eq("caso_id", casoId);
    await supabaseAdmin.from("case_interests").delete().eq("case_id", casoId);

    const { error: deleteError } = await supabaseAdmin
      .from("casos")
      .delete()
      .eq("id", casoId)
      .eq("cliente_id", user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Caso removido com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/casos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

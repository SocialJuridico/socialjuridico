import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/securityUtils";
import { NextResponse } from "next/server";

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

    const body = await request.json();
    const { nome, motivo } = body;

    if (!nome || !motivo) {
      return NextResponse.json(
        { success: false, message: "Campos obrigatórios faltando" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("solicitacoes_exclusao").insert([
      {
        user_id: user.id,
        nome,
        motivo,
        status: "PENDENTE",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Erro ao inserir solicitação de exclusão:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Solicitação enviada com sucesso",
    });
  } catch (error) {
    console.error("Erro na API POST /api/solicitacoes-exclusao:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const db = supabaseAdmin || supabase;

    // Verificação de Admin
    if (!user || !(await isAdmin(db, user.id))) {
      return NextResponse.json(
        { success: false, message: "Acesso negado" },
        { status: 403 },
      );
    }

    // 1. Buscar as solicitações
    const { data: requests, error: reqError } = await db
      .from("solicitacoes_exclusao")
      .select("*")
      .order("created_at", { ascending: false });

    if (reqError) throw reqError;

    if (!requests || requests.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Buscar informações dos advogados separadamente para evitar erros de relacionamento/join no Supabase
    const userIds = requests.map((r) => r.user_id);
    const { data: lawyers, error: lawError } = await db
      .from("advogados")
      .select("id, email")
      .in("id", userIds);

    if (lawError) {
      console.warn(
        "Aviso: Não foi possível buscar emails dos advogados:",
        lawError,
      );
      // Retorna as solicitações mesmo sem os emails para não quebrar o dashboard
      return NextResponse.json({ success: true, data: requests || [] });
    }

    // 3. Mesclar os dados
    const mergedData = requests.map((req) => ({
      ...req,
      advogados: lawyers.find((l) => l.id === req.user_id) || {
        email: "Não encontrado",
      },
    }));

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error) {
    console.error("Erro na API GET /api/solicitacoes-exclusao:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

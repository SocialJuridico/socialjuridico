import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

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

const DEFAULT_LIMITS = {
  start: {
    storage_mb: 256000, // 250 GB
    creditos_ia: 1500,
    notificacoes: 50,
    osint: 15,
    oab_sinc: 0
  },
  pro: {
    storage_mb: 512000, // 500 GB
    creditos_ia: 3000,
    notificacoes: 120,
    osint: 40,
    oab_sinc: 150
  },
  pro_plus: {
    storage_mb: 1024000, // 1 TB
    creditos_ia: 999999, // Ilimitado
    notificacoes: 999999, // Ilimitado
    osint: 999999, // Ilimitado
    oab_sinc: 700
  }
};

// GET /api/admin/escritorios -> lista todos os escritórios
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { data, error } = await db
      .from("escritorios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Erro na API GET /api/admin/escritorios:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

// POST /api/admin/escritorios -> cria um escritório
export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    const body = await request.json();
    const {
      nome,
      cnpj,
      max_advogados,
      max_estagiarios,
      endereco,
      cidade_estado,
      cep,
      areas_atuacao,
      estados_atendidos,
      nome_responsavel,
      logo_url,
      email,
      senha,
      plano
    } = body;

    if (!nome || !cnpj || !email || !senha || !nome_responsavel) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    // Inicializar limites padrão com base no plano
    const planKey = plano || "start";
    const limites = DEFAULT_LIMITS[planKey] || DEFAULT_LIMITS.start;

    const newOffice = {
      nome,
      cnpj,
      max_advogados: Math.min(20, Number(max_advogados || 20)),
      max_estagiarios: Math.min(10, Number(max_estagiarios || 10)),
      endereco,
      cidade_estado,
      cep,
      areas_atuacao: Array.isArray(areas_atuacao) ? areas_atuacao : [],
      estados_atendidos: Array.isArray(estados_atendidos) ? estados_atendidos : [estados_atendidos || ""],
      nome_responsavel,
      logo_url: logo_url || "",
      email: email.trim().toLowerCase(),
      senha,
      plano: planKey,
      limites,
      created_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from("escritorios")
      .insert([newOffice])
      .select("*")
      .single();

    if (error) {
      if (error.message?.includes("unique_cnpj") || error.message?.includes("cnpj")) {
        return NextResponse.json({ success: false, message: "Este CNPJ já está cadastrado." }, { status: 400 });
      }
      if (error.message?.includes("unique_email") || error.message?.includes("email")) {
        return NextResponse.json({ success: false, message: "Este Email de contato/login já está cadastrado." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data, message: "Escritório criado com sucesso!" });
  } catch (error) {
    console.error("Erro na API POST /api/admin/escritorios:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

// PUT /api/admin/escritorios -> atualiza dados ou limites do escritório
export async function PUT(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id, action, value } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "ID do escritório é obrigatório" }, { status: 400 });
    }

    const updates = {};

    if (action === "UPDATE_LIMITS") {
      updates.limites = value;
    } else if (action === "UPDATE_PLAN") {
      updates.plano = value;
      // Opcional: redefinir limites do plano se o ADM desejar
      updates.limites = DEFAULT_LIMITS[value] || DEFAULT_LIMITS.start;
    } else if (action === "UPDATE_GENERAL") {
      Object.assign(updates, value);
    }

    const { data, error } = await db
      .from("escritorios")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data, message: "Escritório atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro na API PUT /api/admin/escritorios:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

// DELETE /api/admin/escritorios -> exclui escritório
export async function DELETE(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID é obrigatório" }, { status: 400 });
    }

    // Desassociar funcionários (advogados) do escritório
    await db
      .from("advogados")
      .update({ escritorio_id: null })
      .eq("escritorio_id", id);

    const { error } = await db
      .from("escritorios")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Escritório excluído com sucesso!" });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/escritorios:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

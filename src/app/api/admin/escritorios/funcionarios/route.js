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

// GET /api/admin/escritorios/funcionarios -> Listar advogados e estagiários do escritório
export async function GET(request) {
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
    const escritorioId = searchParams.get("escritorioId");

    if (!escritorioId) {
      return NextResponse.json({ success: false, message: "ID do escritório é obrigatório" }, { status: 400 });
    }

    const { data: funcionarios, error: queryError } = await db
      .from("advogados")
      .select("id, name, email, phone, oab, estado, cargo, created_at, balance")
      .eq("escritorio_id", escritorioId)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;

    return NextResponse.json({ success: true, data: funcionarios || [] });
  } catch (error) {
    console.error("Erro na API GET funcionarios:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

// POST /api/admin/escritorios/funcionarios -> Criar e associar funcionário (Advogado ou Estagiário)
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
      escritorioId,
      name,
      email,
      phone,
      oab,
      estado,
      cargo, // 'advogado' ou 'estagiario'
      senha
    } = body;

    if (!escritorioId || !name || !email || !cargo || !senha) {
      return NextResponse.json({ success: false, message: "Parâmetros obrigatórios ausentes" }, { status: 400 });
    }

    // 1. Verificar limites do escritório
    const { data: office, error: officeError } = await db
      .from("escritorios")
      .select("*")
      .eq("id", escritorioId)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ success: false, message: "Escritório não encontrado" }, { status: 404 });
    }

    // Contar total de funcionários já cadastrados por cargo
    const { data: existingStaff } = await db
      .from("advogados")
      .select("id, cargo")
      .eq("escritorio_id", escritorioId);

    const advogadosCount = (existingStaff || []).filter(e => e.cargo === "advogado").length;
    const estagiariosCount = (existingStaff || []).filter(e => e.cargo === "estagiario").length;

    if (cargo === "advogado" && advogadosCount >= office.max_advogados) {
      return NextResponse.json({
        success: false,
        message: `Limite atingido! O escritório suporta no máximo ${office.max_advogados} advogados.`
      }, { status: 400 });
    }

    if (cargo === "estagiario" && estagiariosCount >= office.max_estagiarios) {
      return NextResponse.json({
        success: false,
        message: `Limite atingido! O escritório suporta no máximo ${office.max_estagiarios} estagiários.`
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: "Service Role do Supabase não configurada no servidor." }, { status: 500 });
    }

    // 2. Criar no Supabase Auth
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: "LAWYER" // Internamente ele loga como advogado na plataforma comum
      }
    });

    if (authCreateError) {
      return NextResponse.json({ success: false, message: `Erro ao criar no Auth: ${authCreateError.message}` }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 3. Criar na tabela 'advogados'
    const newStaff = {
      id: newUserId,
      email: email.trim().toLowerCase(),
      name,
      phone: phone || "",
      oab: oab || "",
      estado: estado || "",
      cargo: cargo, // 'advogado' ou 'estagiario'
      escritorio_id: escritorioId,
      role: "LAWYER",
      balance: 10, // Saldo inicial de Juris
      is_premium: true, // Todos no enterprise são premium!
      plan_type: office.plano === "pro_plus" ? "ENTERPRISE_PRO_PLUS" : office.plano === "pro" ? "ENTERPRISE_PRO" : "ENTERPRISE_START",
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await db
      .from("advogados")
      .insert([newStaff]);

    if (insertError) {
      // Rollback auth
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw insertError;
    }

    return NextResponse.json({ success: true, message: `${cargo === "estagiario" ? "Estagiário" : "Advogado"} cadastrado e associado com sucesso!` });
  } catch (error) {
    console.error("Erro na API POST funcionarios:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

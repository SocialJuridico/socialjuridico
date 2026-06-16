import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { recordSecurityAuditEvent } from "@/lib/audit/securityAuditLog";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const db = supabaseAdmin;

// Helper to authenticate office session
async function getOfficeId() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return decoded.id;
    } catch {
      // ignore
    }
  }

  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: adv } = await (supabaseAdmin || supabase)
        .from("advogados")
        .select("escritorio_id")
        .eq("id", user.id)
        .single();
      if (adv) return adv.escritorio_id;
    }
  } catch (e) {
    console.error("Erro ao obter officeId do usuario auth:", e);
  }

  return null;
}

// POST /api/escritorio/staff -> Cadastrar funcionário (Advogado ou Estagiário) pelo Painel do Escritório
export async function POST(request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, oab, estado, cargo, senha } = body;

    if (!name || !email || !cargo || !senha) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    // 1. Fetch office data and check capacities
    const { data: office, error: officeError } = await db
      .from("escritorios")
      .select("*")
      .eq("id", officeId)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ success: false, message: "Escritório não encontrado" }, { status: 404 });
    }

    const { data: existingStaff } = await db
      .from("advogados")
      .select("id, cargo")
      .eq("escritorio_id", officeId);

    const advogadosCount = (existingStaff || []).filter(e => e.cargo === "advogado").length;
    const estagiariosCount = (existingStaff || []).filter(e => e.cargo === "estagiario").length;

    if (cargo === "advogado" && advogadosCount >= office.max_advogados) {
      return NextResponse.json({
        success: false,
        message: `Limite de advogados atingido! Seu plano suporta no máximo ${office.max_advogados} advogados.`
      }, { status: 400 });
    }

    if (cargo === "estagiario" && estagiariosCount >= office.max_estagiarios) {
      return NextResponse.json({
        success: false,
        message: `Limite de estagiários atingido! Seu plano suporta no máximo ${office.max_estagiarios} estagiários.`
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: "Service Role do Supabase não configurada no servidor" }, { status: 500 });
    }

    // 2. Create user inside Supabase Auth
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: "LAWYER"
      }
    });

    if (authCreateError) {
      return NextResponse.json({ success: false, message: `Erro ao criar credenciais de login: ${authCreateError.message}` }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 3. Create profile in 'advogados' table
    const newStaff = {
      id: newUserId,
      email: email.trim().toLowerCase(),
      name,
      phone: phone || "",
      oab: oab || "",
      estado: estado || "SP",
      cargo: cargo,
      escritorio_id: officeId,
      role: "LAWYER",
      balance: 10, // Saldo inicial de Juris
      is_premium: true, // Todos no enterprise são premium!
      origem_descoberta: "Escritório Enterprise",
      plan_type: office.plano?.startsWith("pro_plus") ? "ENTERPRISE_PRO_PLUS" : office.plano?.startsWith("pro") ? "ENTERPRISE_PRO" : "ENTERPRISE_START",
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

    await recordSecurityAuditEvent({
      db,
      eventType: "OFFICE_STAFF_CREATED",
      actorId: officeId,
      actorType: "OFFICE",
      targetUserId: newUserId,
      targetType: cargo,
      targetEmail: email,
      request,
      outcome: "SUCCESS",
      statusCode: 201,
      metadata: {
        escritorio_id: officeId,
        plan_type: newStaff.plan_type,
      },
    });

    return NextResponse.json({ success: true, message: `${cargo === "estagiario" ? "Estagiário" : "Advogado"} cadastrado e associado com sucesso!` });
  } catch (error) {
    console.error("Erro na API POST /api/escritorio/staff:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

// PUT /api/escritorio/staff -> Atualizar distribuição de OAB sinc ou IA lock de um funcionário
export async function PUT(request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { lawyerId, action, value } = body;

    if (!lawyerId || !action) {
      return NextResponse.json({ success: false, message: "Parâmetros obrigatórios ausentes" }, { status: 400 });
    }

    // Certificar de que o funcionário pertence a este escritório
    const { data: lawyer, error: lawyerCheckError } = await db
      .from("advogados")
      .select("id, escritorio_id, cargo")
      .eq("id", lawyerId)
      .eq("escritorio_id", officeId)
      .single();

    if (lawyerCheckError || !lawyer) {
      return NextResponse.json({ success: false, message: "Funcionário não encontrado ou não pertence ao seu escritório" }, { status: 404 });
    }

    const updates = {};
    if (action === "UPDATE_OAB_SINC") {
      // Verificar se a soma total de OAB sinc alocada não ultrapassa o limite do escritório
      const { data: office } = await db
        .from("escritorios")
        .select("limites")
        .eq("id", officeId)
        .single();
      
      const totalOfficeLimit = office?.limites?.oab_sinc || 0;

      // Buscar cotas já distribuídas para outros advogados do escritório
      const { data: currentStaff } = await db
        .from("advogados")
        .select("id, cota_oab_sinc")
        .eq("escritorio_id", officeId);

      const otherAllocationsSum = (currentStaff || [])
        .filter(s => s.id !== lawyerId)
        .reduce((sum, curr) => sum + (Number(curr.cota_oab_sinc) || 0), 0);

      const newRequestedAllocation = Number(value || 0);

      if (otherAllocationsSum + newRequestedAllocation > totalOfficeLimit) {
        return NextResponse.json({
          success: false,
          message: `Alocação excede o limite mensal de processos OAB Sinc do escritório. Disponível: ${totalOfficeLimit - otherAllocationsSum} processos.`
        }, { status: 400 });
      }

      updates.cota_oab_sinc = newRequestedAllocation;
    } else if (action === "TOGGLE_IA_LOCK") {
      updates.bloqueado_ia = !!value;
    } else if (action === "UPDATE_PERMISSIONS") {
      updates.permissoes = typeof value === "object" ? value : {};
    } else if (action === "TOGGLE_OAB_VERIFICATION") {
      updates.oab_verification_status = value ? "VERIFIED" : "UNVERIFIED";
    } else if (action === "DISTRIBUTE_JURIS") {
      const transferAmount = Number(value || 0);
      if (transferAmount <= 0) {
        return NextResponse.json({ success: false, message: "Valor de transferência inválido." }, { status: 400 });
      }

      // Buscar saldo do escritório
      const { data: office, error: officeError } = await db
        .from("escritorios")
        .select("balance")
        .eq("id", officeId)
        .single();

      if (officeError || !office) {
        return NextResponse.json({ success: false, message: "Erro ao consultar saldo do escritório." }, { status: 400 });
      }

      if ((office.balance || 0) < transferAmount) {
        return NextResponse.json({
          success: false,
          message: `Saldo do escritório insuficiente. Saldo atual: ${office.balance || 0} Juris.`
        }, { status: 400 });
      }

      // Deduzir saldo do escritório
      const { error: officeUpdateError } = await db
        .from("escritorios")
        .update({ balance: (office.balance || 0) - transferAmount })
        .eq("id", officeId);

      if (officeUpdateError) throw officeUpdateError;

      // Adicionar ao saldo do advogado
      const { data: staffMember } = await db
        .from("advogados")
        .select("balance")
        .eq("id", lawyerId)
        .single();

      updates.balance = (staffMember?.balance || 0) + transferAmount;
    }

    const { data: updatedLawyer, error: updateError } = await db
      .from("advogados")
      .update(updates)
      .eq("id", lawyerId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await recordSecurityAuditEvent({
      db,
      eventType: "OFFICE_STAFF_UPDATED",
      actorId: officeId,
      actorType: "OFFICE",
      targetUserId: lawyerId,
      targetType: lawyer?.cargo || "office_staff",
      request,
      outcome: "SUCCESS",
      statusCode: 200,
      metadata: {
        escritorio_id: officeId,
        action,
        changed_fields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedLawyer,
      message: action === "TOGGLE_IA_LOCK" 
        ? (value ? "Funcionário travado para uso de IA." : "Acesso de IA restabelecido para o funcionário.")
        : "Distribuição de processos salva com sucesso!"
    });
  } catch (error) {
    console.error("Erro na API PUT /api/escritorio/staff:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

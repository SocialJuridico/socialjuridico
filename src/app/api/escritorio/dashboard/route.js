import { supabaseAdmin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const db = supabaseAdmin || supabase;

// Helper to authenticate the requester and return officeId + user profile (Admin or Secretary)
async function getSessionInfo() {
  const cookieStore = await cookies();
  
  // 1. Check if logged in as the Office Administrator
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return {
        officeId: decoded.id,
        user: {
          id: decoded.id,
          name: `${decoded.nome} (Gestor)`,
          cargo: "admin",
          permissoes: {
            ver_gestao: true,
            ver_comunicacao: true,
            ver_metricas: true,
            ver_notificacoes: true,
            ver_financeiro: true
          }
        }
      };
    } catch (e) {
      console.error("Erro ao decodificar cookie de escritorio:", e);
    }
  }

  // 2. Check if logged in as a normal lawyer/staff member (like a Secretary) under an office
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: adv, error: advError } = await db
        .from("advogados")
        .select("id, name, cargo, escritorio_id, permissoes")
        .eq("id", user.id)
        .single();
      
      if (adv && adv.escritorio_id && !advError) {
        return {
          officeId: adv.escritorio_id,
          user: {
            id: adv.id,
            name: adv.name,
            cargo: adv.cargo || "advogado",
            permissoes: adv.permissoes || {}
          }
        };
      }
    }
  } catch (e) {
    console.error("Erro ao obter usuario autenticado:", e);
  }

  return { officeId: null, user: null };
}

export async function GET() {
  try {
    const { officeId, user } = await getSessionInfo();

    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    // 1. Fetch office data from database
    const { data: office, error: officeError } = await db
      .from("escritorios")
      .select("*")
      .eq("id", officeId)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ success: false, message: "Escritório não encontrado" }, { status: 404 });
    }

    // 2. Fetch associated staff/lawyers list
    const { data: staff, error: staffError } = await db
      .from("advogados")
      .select("id, name, email, phone, oab, estado, cargo, cota_oab_sinc, bloqueado_ia, uso_redator_ia, uso_triagem, uso_storage_mb, permissoes, created_at")
      .eq("escritorio_id", officeId)
      .order("name", { ascending: true });

    if (staffError) throw staffError;

    // 3. Calculate dynamic usage aggregates
    const lawyersCount = (staff || []).filter(s => s.cargo === "advogado").length;
    const estagiariosCount = (staff || []).filter(s => s.cargo === "estagiario").length;

    // Aggregate storage consumption
    const totalStorageMBUsed = (staff || []).reduce((acc, curr) => acc + (Number(curr.uso_storage_mb) || 0), 0);
    // Aggregate IA usage
    const totalIAUsed = (staff || []).reduce((acc, curr) => acc + (Number(curr.uso_redator_ia) || 0) + (Number(curr.uso_triagem) || 0), 0);

    return NextResponse.json({
      success: true,
      user,
      office: {
        id: office.id,
        nome: office.nome,
        cnpj: office.cnpj,
        plano: office.plano,
        logo_url: office.logo_url,
        nome_responsavel: office.nome_responsavel,
        email: office.email,
        max_advogados: office.max_advogados,
        max_estagiarios: office.max_estagiarios,
        areas_atuacao: office.areas_atuacao,
        estados_atendidos: office.estados_atendidos,
        limites: office.limites || {
          storage_mb: 256000,
          creditos_ia: 1500,
          notificacoes: 50,
          osint: 15,
          oab_sinc: 0
        }
      },
      staff: staff || [],
      usage: {
        lawyers_count: lawyersCount,
        estagiarios_count: estagiariosCount,
        storage_mb_used: Math.round(totalStorageMBUsed * 10) / 10,
        ia_requests_used: totalIAUsed
      }
    });
  } catch (error) {
    console.error("Erro na API GET /api/escritorio/dashboard:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Erro interno no servidor", 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

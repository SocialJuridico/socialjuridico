import { supabaseAdmin } from "@/lib/supabase";
import { formatStoredOAB } from "@/lib/oab";
import { isPremiumPlanCurrentlyActive } from "@/lib/planUtils";
import { NextResponse } from "next/server";

function toPublicLawyer(lawyer, officeMap) {
  const isPremium = isPremiumPlanCurrentlyActive(lawyer);

  return {
    id: lawyer.id,
    name: lawyer.name,
    avatar: lawyer.avatar || null,
    oab: formatStoredOAB(lawyer.oab, lawyer.estado),
    estado: lawyer.estado || null,
    avg_rating: lawyer.avg_rating ?? null,
    total_ratings: lawyer.total_ratings ?? 0,
    verified: Boolean(lawyer.verified),
    specialties: Array.isArray(lawyer.specialties) ? lawyer.specialties : [],
    consulta: lawyer.consulta || null,
    tempo: lawyer.tempo || null,
    valor: lawyer.valor || null,
    is_premium: isPremium,
    nome_escritorio: officeMap[lawyer.escritorio_id]?.nome || null,
    logo_escritorio: officeMap[lawyer.escritorio_id]?.logo_url || null,
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, avatar, oab, estado, avg_rating, total_ratings, verified, specialties, is_premium, premium_expires_at, plan_type, consulta, tempo, valor, oab_verification_status, escritorio_id, cargo",
      )
      .order("name", { ascending: true });

    if (error) throw error;

    // Buscar nomes e logos dos escritórios vinculados
    const officeIds = [...new Set((data || []).map(lawyer => lawyer.escritorio_id).filter(Boolean))];
    const officeMap = {};
    if (officeIds.length > 0) {
      const { data: offices, error: officeError } = await supabaseAdmin
        .from("escritorios")
        .select("id, nome, logo_url")
        .in("id", officeIds);
      if (!officeError && offices) {
        offices.forEach(o => {
          officeMap[o.id] = { nome: o.nome, logo_url: o.logo_url };
        });
      }
    }

    const lawyers = (data || []).sort((a, b) => {
      const premiumA = isPremiumPlanCurrentlyActive(a) ? 1 : 0;
      const premiumB = isPremiumPlanCurrentlyActive(b) ? 1 : 0;
      if (premiumA !== premiumB) return premiumB - premiumA;
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });

    return NextResponse.json({
      success: true,
      data: lawyers.map((lawyer) => toPublicLawyer(lawyer, officeMap)),
    });
  } catch (error) {
    console.error("Erro na API de Advogados:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao buscar advogados" },
      { status: 500 },
    );
  }
}

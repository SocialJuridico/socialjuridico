import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/radar/reportar
// Permite que um advogado elegível sinalize uma oportunidade como inadequada/quebrada
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
        { status: 401 }
      );
    }

    // Validação de elegibilidade (START, PRO ou is_premium = true, ativo)
    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, plan_type, is_premium, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (lawyerError || !lawyer) {
      return NextResponse.json(
        { success: false, message: "Apenas advogados têm acesso ao Radar Jurídico" },
        { status: 403 }
      );
    }

    const isStartOrPro = lawyer.plan_type === "START" || lawyer.plan_type === "PRO" || lawyer.is_premium === true;
    const isBlocked = ["canceled", "cancelled", "unpaid", "blocked"].includes(
      (lawyer.subscription_status || "").toLowerCase()
    );

    if (!isStartOrPro || isBlocked) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a advogados START e PRO ativos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { radar_oportunidade_id, motivo } = body || {};

    if (!radar_oportunidade_id || !motivo?.trim()) {
      return NextResponse.json(
        { success: false, message: "radar_oportunidade_id e motivo são obrigatórios" },
        { status: 400 }
      );
    }

    // 1. Obter os motivos de reportes atuais
    const { data: op, error: fetchError } = await supabaseAdmin
      .from("radar_oportunidades")
      .select("id, reportado_motivos")
      .eq("id", radar_oportunidade_id)
      .maybeSingle();

    if (fetchError || !op) {
      return NextResponse.json(
        { success: false, message: "Oportunidade pública não encontrada" },
        { status: 404 }
      );
    }

    const motivosAtuais = Array.isArray(op.reportado_motivos) ? op.reportado_motivos : [];
    const novosMotivos = [...motivosAtuais, motivo.trim()];

    // 2. Atualizar sinalização de reporte
    const { error: updateError } = await supabaseAdmin
      .from("radar_oportunidades")
      .update({
        reportado: true,
        reportado_motivos: novosMotivos,
      })
      .eq("id", radar_oportunidade_id);

    if (updateError) {
      console.error("Erro ao atualizar reporte no banco:", updateError.message);
      return NextResponse.json(
        { success: false, message: "Erro ao registrar reporte" },
        { status: 500 }
      );
    }

    console.log(`[Radar] Oportunidade ${radar_oportunidade_id} reportada pelo advogado ${user.id}. Motivo: ${motivo.trim()}`);

    return NextResponse.json({ success: true, message: "Oportunidade reportada com sucesso!" });
  } catch (error) {
    console.error("Erro geral na API POST /api/radar/reportar:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

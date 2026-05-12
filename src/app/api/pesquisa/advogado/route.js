import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log("[PESQUISA API] Checking user:", user?.id);

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Check if the user is a verified lawyer
    const { data: advogado, error: advErr } = await supabaseAdmin
      .from("advogados")
      .select("id, verified, oab_verification_status")
      .eq("id", user.id)
      .single();

    console.log("[PESQUISA API] Advogado data:", advogado, "Error:", advErr);

    const isVerified = advogado && (advogado.verified === true || advogado.oab_verification_status === "VERIFIED");

    if (!isVerified) {
      return NextResponse.json({ 
        canEvaluate: false, 
        reason: "Somente advogados verificados podem avaliar." 
      });
    }

    // Check if already evaluated
    const { data: evaluation, error: evalErr } = await supabaseAdmin
      .from("pesquisas_satisfacao_advogados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("[PESQUISA API] Evaluation data:", evaluation, "Error:", evalErr);

    if (evaluation) {
      return NextResponse.json({ 
        canEvaluate: false, 
        reason: "Você já respondeu a pesquisa." 
      });
    }

    return NextResponse.json({ canEvaluate: true });
  } catch (error) {
    console.log("[PESQUISA API] Try/Catch Error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const payload = await request.json();

    // Verify again to prevent double rewards
    const { data: evaluation } = await supabaseAdmin
      .from("pesquisas_satisfacao_advogados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (evaluation) {
      return NextResponse.json({ error: "Pesquisa já respondida." }, { status: 400 });
    }

    // Insert evaluation
    const { error: insertError } = await supabaseAdmin
      .from("pesquisas_satisfacao_advogados")
      .insert([{
        user_id: user.id,
        q1_velocidade: payload.q1,
        q2_marketplace: payload.q2,
        q3_ia_redator: payload.q3,
        q4_ia_personalidade: payload.q4,
        q5_seguranca: payload.q5,
        q6_prazos: payload.q6,
        q7_crm: payload.q7,
        q8_smartdocs: payload.q8,
        q9_suporte: payload.q9,
        q10_roi: payload.q10,
        feedback: payload.feedback || null
      }]);

    if (insertError) {
      console.error("Erro ao salvar avaliação:", insertError);
      return NextResponse.json({ error: "Erro ao salvar os dados." }, { status: 500 });
    }

    // Reward the lawyer with 4 Juris
    const { data: advogado } = await supabaseAdmin
      .from("advogados")
      .select("balance")
      .eq("id", user.id)
      .single();

    const newBalance = (advogado?.balance || 0) + 4;

    const { error: updateError } = await supabaseAdmin
      .from("advogados")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (updateError) {
      console.error("Erro ao dar a recompensa de Juris:", updateError);
    }

    // Register Juris transaction
    await supabaseAdmin.from("juris_transactions").insert([{
      advogado_id: user.id,
      amount: 4,
      tipo: 'BONUS',
      description: 'Recompensa por Avaliação da Plataforma v3.0'
    }]);

    return NextResponse.json({ success: true, message: "Avaliação enviada com sucesso! 4 Juris creditados." });
  } catch (error) {
    console.error("Erro POST pesquisa:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

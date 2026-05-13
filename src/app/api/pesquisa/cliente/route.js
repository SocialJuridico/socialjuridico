import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Check if user is a client
    const { data: cliente, error: cliErr } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json({ 
        canEvaluate: false, 
        reason: "Apenas clientes podem acessar esta pesquisa." 
      });
    }

    // Check if already evaluated
    const { data: evaluation } = await supabaseAdmin
      .from("pesquisas_satisfacao_clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (evaluation) {
      return NextResponse.json({ 
        canEvaluate: false, 
        reason: "Você já respondeu a pesquisa." 
      });
    }

    return NextResponse.json({ canEvaluate: true });
  } catch (error) {
    console.error("Erro GET pesquisa cliente:", error);
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

    // Verify again
    const { data: evaluation } = await supabaseAdmin
      .from("pesquisas_satisfacao_clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (evaluation) {
      return NextResponse.json({ error: "Pesquisa já respondida." }, { status: 400 });
    }

    // Insert evaluation
    const { error: insertError } = await supabaseAdmin
      .from("pesquisas_satisfacao_clientes")
      .insert([{
        user_id: user.id,
        q1_cadastro: payload.q1,
        q2_clareza: payload.q2,
        q3_velocidade: payload.q3,
        q4_confianca: payload.q4,
        q5_qualidade: payload.q5,
        q6_chat: payload.q6,
        q7_transparencia: payload.q7,
        q8_seguranca: payload.q8,
        q9_pwa: payload.q9,
        q10_recomendacao: payload.q10,
        feedback: payload.feedback || null
      }]);

    if (insertError) {
      console.error("Erro ao salvar avaliação de cliente:", insertError);
      return NextResponse.json({ error: "Erro ao salvar os dados." }, { status: 500 });
    }

    // Clients don't receive Juris. Just return success.
    return NextResponse.json({ success: true, message: "Avaliação enviada com sucesso! Obrigado pelo feedback." });
  } catch (error) {
    console.error("Erro POST pesquisa cliente:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTION_FIELDS = {
  q1: "q1_design",
  q2: "q2_facilidade_uso",
  q3: "q3_velocidade",
  q4: "q4_estabilidade",
  q5: "q5_seguranca",
  q6: "q6_qualidade_geral",
  q7: "q7_qualidade_ia",
  q8: "q8_cartao_digital",
  q9: "q9_organizacao_rotas",
  q10: "q10_confianca_recomendar",
};
const REWARD_JURIS = 4;

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function hashIp(request) {
  const rawIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  if (!rawIp) return null;
  return crypto.createHash("sha256").update(rawIp).digest("hex");
}

function sanitizeFeedback(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 2500);
}

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

function buildSurveyPayload(body) {
  const payload = {};

  for (const [questionKey, column] of Object.entries(QUESTION_FIELDS)) {
    const rating = normalizeRating(body?.[questionKey]);
    if (!rating) {
      return {
        ok: false,
        message: "Responda todas as perguntas com notas de 1 a 5.",
      };
    }
    payload[column] = rating;
  }

  payload.feedback = sanitizeFeedback(body?.feedback) || null;
  return { ok: true, payload };
}

async function getCurrentLawyer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, lawyer: null };

  const { data: lawyer, error } = await supabaseAdmin
    .from("advogados")
    .select("id, balance")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !lawyer) return { user, lawyer: null };
  return { user, lawyer };
}

async function incrementBalance(userId, amount) {
  const rpcResult = await supabaseAdmin.rpc("increment_lawyer_balance", {
    p_lawyer_id: userId,
    p_amount: amount,
  });

  if (!rpcResult.error) return Number(rpcResult.data || 0);

  const missingFunction =
    rpcResult.error.code === "PGRST202" ||
    String(rpcResult.error.message || "")
      .toLowerCase()
      .includes("increment_lawyer_balance");

  if (!missingFunction) {
    throw new Error("Falha ao atualizar o saldo de Juris.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado nao localizado.");
  }

  const newBalance = Number(profile.balance || 0) + amount;
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (error) throw new Error("Falha ao atualizar o saldo de Juris.");
  return newBalance;
}

async function recordRewardTransaction(userId, amount) {
  const reference = `survey_update_${userId}`;
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .insert([
      {
        advogado_id: userId,
        tipo: "JURIS_PURCHASE",
        valor: 0,
        moeda: "BRL",
        status: "succeeded",
        juris_amount: amount,
        stripe_session_id: reference,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "[Pesquisa Atualizacao Advogado] Falha nao fatal ao registrar transacao:",
      error,
    );
    return null;
  }

  return data?.id || null;
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return json({ error: "Servico indisponivel." }, 503);
    }

    const { user, lawyer } = await getCurrentLawyer();
    if (!user) return json({ error: "Nao autorizado" }, 401);

    if (!lawyer) {
      return json({
        canEvaluate: false,
        reason: "Somente advogados podem responder esta pesquisa.",
      });
    }

    const { data: survey, error } = await supabaseAdmin
      .from("pesquisas_atualizacao_plataforma_advogados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (survey) {
      return json({
        canEvaluate: false,
        reason: "Voce ja respondeu esta pesquisa de atualizacao.",
      });
    }

    return json({ canEvaluate: true, rewardJuris: REWARD_JURIS });
  } catch (error) {
    console.error("[Pesquisa Atualizacao Advogado][GET] Erro:", error);
    return json({ error: "Erro interno." }, 500);
  }
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return json({ error: "Servico indisponivel." }, 503);
    }

    const { user, lawyer } = await getCurrentLawyer();
    if (!user) return json({ error: "Nao autorizado" }, 401);

    if (!lawyer) {
      return json({ error: "Somente advogados podem responder." }, 403);
    }

    const body = await request.json().catch(() => null);
    const surveyData = buildSurveyPayload(body);
    if (!surveyData.ok) return json({ error: surveyData.message }, 400);

    const existing = await supabaseAdmin
      .from("pesquisas_atualizacao_plataforma_advogados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data) {
      return json({ error: "Pesquisa ja respondida." }, 400);
    }

    const insertResult = await supabaseAdmin
      .from("pesquisas_atualizacao_plataforma_advogados")
      .insert([
        {
          user_id: user.id,
          ...surveyData.payload,
          ip_hash: hashIp(request),
          user_agent: String(request.headers.get("user-agent") || "").slice(0, 500),
          reward_juris: REWARD_JURIS,
        },
      ])
      .select("id")
      .maybeSingle();

    if (insertResult.error) {
      console.error(
        "[Pesquisa Atualizacao Advogado] Falha ao salvar pesquisa:",
        insertResult.error,
      );
      return json(
        { error: "Nao foi possivel salvar sua pesquisa. Tente novamente." },
        500,
      );
    }

    const newBalance = await incrementBalance(user.id, REWARD_JURIS);
    const transactionId = await recordRewardTransaction(user.id, REWARD_JURIS);

    if (transactionId && insertResult.data?.id) {
      await supabaseAdmin
      .from("pesquisas_atualizacao_plataforma_advogados")
        .update({ reward_transaction_id: transactionId })
        .eq("id", insertResult.data.id);
    }

    return json({
      success: true,
      message: `Pesquisa enviada com sucesso! ${REWARD_JURIS} Juris creditados.`,
      rewardJuris: REWARD_JURIS,
      balance: newBalance,
    });
  } catch (error) {
    console.error("[Pesquisa Atualizacao Advogado][POST] Erro:", error);
    return json({ error: "Erro interno." }, 500);
  }
}

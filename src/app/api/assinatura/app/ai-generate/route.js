import OpenAI from "openai";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  requireSignatureProductAccess,
  signatureProductJson,
} from "@/lib/signatureProductServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_AI_LIMITS = {
  FREE: 0,
  ESSENTIAL: 2,
  PROFESSIONAL: 5,
  BUSINESS: 10,
  UNLIMITED: null, // Unlimited
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    if (!openai) {
      return signatureProductJson({ success: false, message: "Serviço de IA temporariamente indisponível." }, 503);
    }

    const body = await request.json().catch(() => null);
    const prompt = String(body?.prompt || "").trim();
    const title = String(body?.title || "").trim();

    if (!prompt) {
      return signatureProductJson({ success: false, message: "O prompt de geração é obrigatório." }, 400);
    }

    // Load subscription to check plan limits
    const { data: subscription, error: subError } = await access.db
      .from("signature_subscriptions")
      .select("plan_code")
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (subError) throw subError;

    const planCode = subscription?.plan_code || "FREE";
    const limit = PLAN_AI_LIMITS[planCode] ?? 0;

    // Load active usage period to count used generations
    const { data: usage, error: usageError } = await access.db
      .from("signature_usage_periods")
      .select("ai_generations_used, period_start")
      .eq("organization_id", access.organizationId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (usageError) throw usageError;

    const used = usage ? (usage.ai_generations_used ?? 0) : 0;

    if (limit !== null && used >= limit) {
      return signatureProductJson(
        {
          success: false,
          code: "AI_LIMIT_REACHED",
          message: `Você atingiu o limite de ${limit} gerações por IA do seu plano ${planCode}. Faça upgrade para continuar.`,
        },
        403
      );
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente jurídico sênior especializado em Direito Brasileiro. Escreva minutas jurídicas completas, contratos ou declarações sob medida baseados nas necessidades do usuário. Retorne apenas o documento em formato Markdown bem estruturado, limpo, técnico e sem conversas ou introduções.",
        },
        {
          role: "user",
          content: `Título desejado: ${title || "Documento"}\n\nRequisitos e Contexto:\n${prompt}`,
        },
      ],
      temperature: 0.55,
    });

    const text = completion.choices[0]?.message?.content || "";
    if (!text.trim()) {
      return signatureProductJson({ success: false, message: "Não foi possível obter uma resposta da IA." }, 502);
    }

    // Increment AI usage in DB
    if (usage) {
      const { error: incrementError } = await access.db
        .from("signature_usage_periods")
        .update({ ai_generations_used: used + 1 })
        .eq("organization_id", access.organizationId)
        .eq("period_start", usage.period_start);
      if (incrementError) throw incrementError;
    }

    return signatureProductJson({
      success: true,
      text,
    });
  } catch (error) {
    console.error("[Signature AI generate]", error);
    return signatureProductJson({ success: false, message: "Falha ao gerar documento com IA." }, 500);
  }
}

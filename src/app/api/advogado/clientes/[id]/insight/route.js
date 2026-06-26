import OpenAI from "openai";

import {
  clientFailure,
  clientJson,
  getScopedClient,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import { incrementUsage } from "@/lib/planUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

export async function POST(request, context) {
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;
    if (!openai) {
      return clientJson(
        { success: false, message: "Serviço de IA temporariamente indisponível." },
        503,
      );
    }
    if (!access.planLimits?.canUseTriagem()) {
      return clientJson(
        {
          success: false,
          limitReached: true,
          message: "O limite mensal de insights do seu plano foi atingido.",
        },
        403,
      );
    }

    const { id } = await context.params;
    const client = await getScopedClient(access, id);
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const [interactions, finance] = await Promise.all([
      access.db
        .from("crm_interactions")
        .select("type, content, created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(10),
      access.db
        .from("crm_finance")
        .select("amount, status, due_date")
        .eq("client_id", client.id)
        .limit(100),
    ]);
    if (interactions.error) throw interactions.error;
    if (finance.error) throw finance.error;

    const financeItems = finance.data || [];
    const contextData = {
      client: {
        name: client.name,
        type: client.type,
        profession: client.profession,
        notes: client.notes,
        risk_score: client.risk_score,
        status: client.status,
      },
      recent_interactions: (interactions.data || []).map((item) => ({
        type: item.type,
        content: item.content,
        date: item.created_at,
      })),
      financial_summary: {
        paid: financeItems.filter((item) => item.status === "PAGO").length,
        pending: financeItems.filter((item) => item.status === "PENDENTE").length,
        total: financeItems.reduce(
          (sum, item) => sum + (Number(item.amount) || 0),
          0,
        ),
      },
    };

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Você produz insights KYC objetivos para advogados brasileiros. Não dê aconselhamento ao cliente final e não invente fatos.",
        },
        {
          role: "user",
          content: `Analise os dados abaixo e forneça um insight estratégico em no máximo 3 frases. Foque em risco, comportamento, prontidão documental e saúde financeira.\n\n${JSON.stringify(contextData)}`,
        },
      ],
      temperature: 0.35,
    });
    const insight = String(completion.choices[0]?.message?.content || "").trim();
    if (!insight) throw new Error("A IA não retornou um insight válido.");

    await incrementUsage(access.db, access.user.id, "uso_triagem", 1);
    const body = await request.json().catch(() => ({}));
    await recordClientAudit(access, request, {
      requestId: body.requestId,
      clientId: client.id,
      action: "GENERATE_INSIGHT",
      metadata: { model: process.env.OPENAI_MODEL || "gpt-4.1-mini" },
    });

    return clientJson({ success: true, insight });
  } catch (error) {
    console.error("[Advogado/Clientes/Insight] Erro:", error);
    const failure = clientFailure(error, "Não foi possível gerar o insight.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

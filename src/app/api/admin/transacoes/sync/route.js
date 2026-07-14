import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

// Com a InfinitePay a confirmação de pagamento é feita pelo webhook
// (/api/webhook/infinitepay), que atualiza a transação pendente para paga e
// credita plano/Juris automaticamente. Não há mais conciliação ativa contra a
// API de um provedor (o Stripe foi removido). Este endpoint apenas relata o
// estado atual das transações pendentes para acompanhamento no painel.
export async function POST(request) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço financeiro indisponível." },
        503,
      );
    }

    const { count: pendingCount, error } = await supabaseAdmin
      .from("transacoes")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "pending_manual_review"]);

    if (error) {
      throw new Error("Falha ao consultar transações pendentes.");
    }

    return json({
      success: true,
      message:
        "A confirmação de pagamentos é automática via webhook da InfinitePay. Não há conciliação manual a executar.",
      data: {
        provider: "INFINITEPAY",
        reconciliation: "WEBHOOK",
        pending: Number(pendingCount || 0),
      },
    });
  } catch (error) {
    console.error("[Admin/Transações/Sync][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível consultar o estado das transações.",
      },
      500,
    );
  }
}

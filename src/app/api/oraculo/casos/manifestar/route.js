import { NextResponse } from "next/server";

import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { getOraculoAcademicContext } from "@/lib/oraculo/oraculoAcademicContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Mapeia mensagens de negócio da RPC para respostas amigáveis.
const BUSINESS_MESSAGES = {
  ORACULO_NOT_ACTIVE:
    "Seu vínculo acadêmico precisa estar ativo para manifestar interesse.",
  CLAIM_COOLDOWN_ACTIVE:
    "Você já manifestou interesse recentemente. Aguarde o fim do intervalo.",
  CASE_NOT_ORACULO_TIER: "Este caso não está disponível para o Oráculo.",
  CASE_NOT_AVAILABLE: "Este caso não está mais disponível.",
  CASE_ALREADY_CLAIMED: "Este caso já foi reservado por outro Oráculo.",
  CASE_PREVIOUSLY_REJECTED:
    "Este caso não está mais disponível para você.",
};

function mapRpcError(error) {
  const raw = String(error?.message || "");
  const code = error?.code;

  // Migração não aplicada.
  if (["PGRST202", "42883", "42P01"].includes(code)) {
    return {
      status: 503,
      message:
        "Aplique a migração da Central de Casos do Oráculo antes de continuar.",
    };
  }

  const key = Object.keys(BUSINESS_MESSAGES).find((token) =>
    raw.includes(token),
  );
  if (key) {
    const status = key.endsWith("NOT_FOUND") ? 404 : 409;
    return { status, message: BUSINESS_MESSAGES[key] };
  }

  if (raw.includes("ORACULO_NOT_FOUND") || raw.includes("CASE_NOT_FOUND")) {
    return { status: 404, message: "Registro não encontrado." };
  }

  return { status: 500, message: "Não foi possível manifestar interesse." };
}

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  if (!supabaseAdmin) {
    return json({ success: false, message: "Serviço indisponível." }, 503);
  }

  try {
    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();
    if (!caseId) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ success: false, message: "Não autenticado." }, 401);
    }

    const context = await getOraculoAcademicContext({ authUserId: user.id });
    if (!context?.oraculoId) {
      return json(
        { success: false, message: "Perfil de Oráculo não encontrado." },
        403,
      );
    }
    if (context.studentStatus !== "ATIVO") {
      return json(
        {
          success: false,
          message:
            "Seu vínculo acadêmico precisa estar ativo para manifestar interesse.",
        },
        403,
      );
    }

    const { data, error } = await supabaseAdmin.rpc("claim_oraculo_case", {
      p_case_id: caseId,
      p_oraculo_id: context.oraculoId,
    });

    if (error) {
      const mapped = mapRpcError(error);
      return json({ success: false, message: mapped.message }, mapped.status);
    }

    return json({
      success: true,
      message:
        "Interesse manifestado. O caso ficou reservado por 24h aguardando o cliente.",
      data,
    });
  } catch (error) {
    console.error("[Oraculo/Casos/Manifestar] Erro:", error);
    return json(
      { success: false, message: "Não foi possível manifestar interesse." },
      500,
    );
  }
}

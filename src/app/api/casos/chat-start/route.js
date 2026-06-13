import crypto from "node:crypto";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isLawyer } from "@/lib/securityUtils";
import {
  isUuid,
  normalizeRequestId,
} from "@/lib/lawyerOpportunities/opportunityValidation";
import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";
import { NextResponse } from "next/server";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function rpcStatus(error) {
  if (["PGRST202", "42883"].includes(error?.code)) return 503;
  if (error?.code === "P0003") return 403;
  return 409;
}

export async function POST(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return json(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const db = supabaseAdmin || supabase;
    if (!(await isLawyer(db, user.id))) {
      return json(
        { success: false, message: "Apenas advogados utilizam esta rota." },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const caseId = String(body?.casoId || body?.caseId || "").trim();
    const interestId = String(body?.interestId || "").trim() || null;

    if (!isUuid(caseId) || (interestId && !isUuid(interestId))) {
      return json(
        { success: false, message: "Caso ou negociação inválida." },
        400,
      );
    }

    if (interestId) {
      const { data: interest, error: interestError } = await db
        .from("case_interests")
        .select("id, case_id, lawyer_id, status")
        .eq("id", interestId)
        .maybeSingle();

      if (interestError) throw interestError;
      if (
        !interest ||
        String(interest.case_id) !== caseId ||
        String(interest.lawyer_id) !== String(user.id)
      ) {
        return json(
          {
            success: false,
            message: "Negociação não encontrada ou sem permissão.",
          },
          403,
        );
      }

      if (!["NEGOTIATING", "HIRED"].includes(interest.status)) {
        return json(
          {
            success: false,
            message: "Esta negociação não está disponível para conversa.",
          },
          409,
        );
      }

      return json({
        success: true,
        alreadyStarted: true,
        chargedJuris: 0,
        message: "Acesso autorizado ao chat de negociação, sem nova cobrança.",
      });
    }

    const requestId =
      normalizeRequestId(body?.requestId) || crypto.randomUUID();
    const { data, error } = await db.rpc("open_lawyer_case_chat", {
      p_case_id: caseId,
      p_lawyer_id: user.id,
      p_request_id: requestId,
      p_ip_hash: getRequestIpHash(request),
      p_user_agent: getRequestUserAgent(request),
    });

    if (error) {
      const missingMigration = ["PGRST202", "42883"].includes(error.code);
      return json(
        {
          success: false,
          message: missingMigration
            ? "Execute a migração de governança de Meus Casos antes de continuar."
            : error.message || "Não foi possível abrir o atendimento.",
        },
        rpcStatus(error),
      );
    }

    return json({
      success: true,
      alreadyStarted: Boolean(data?.already_started),
      alreadyProcessed: Boolean(data?.already_processed),
      chargedJuris: 0,
      newBalance: data?.new_balance,
      message: data?.already_started
        ? "Atendimento já estava disponível."
        : "Atendimento aberto sem cobrança adicional.",
    });
  } catch (error) {
    console.error("[Casos/ChatStart] Erro:", error);
    return json(
      { success: false, message: "Erro interno ao abrir o atendimento." },
      500,
    );
  }
}

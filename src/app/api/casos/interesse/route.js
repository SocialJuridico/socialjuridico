import {
  clientJson,
  isClientUuid,
  requireClientUser,
  safeClientError,
  validateClientMutationOrigin,
} from "@/lib/clientDashboard/clientServer";
import { formatStoredOAB } from "@/lib/oab";

import { runInterestSideEffects } from "./interestSideEffects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rpcError(error) {
  const message = String(error?.message || "Não foi possível processar o interesse.");
  const wrapped = new Error(message);

  if (["P0001", "P0002"].includes(error?.code)) {
    wrapped.status = 409;
  } else if (["PGRST202", "42883"].includes(error?.code)) {
    wrapped.message =
      "Execute a migração transacional dos interesses antes de continuar.";
    wrapped.status = 503;
  }

  return wrapped;
}

function actionMessage(result) {
  if (result.action === "ACCEPT") {
    return "Negociação iniciada. Você já pode conversar com o advogado.";
  }
  if (result.action === "DECLINE") {
    return "Interesse recusado e profissional notificado.";
  }
  if (result.already_hired) {
    return "Este advogado já estava contratado para o caso.";
  }
  return "Advogado contratado com sucesso. O chat está disponível.";
}

export async function POST(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const interestId = String(body?.interestId || "").trim();
    const action = String(body?.action || "").trim().toUpperCase();

    if (!isClientUuid(interestId) || !["ACCEPT", "DECLINE", "HIRE"].includes(action)) {
      return clientJson(
        { success: false, message: "Interesse ou ação inválida." },
        400,
      );
    }

    const { data, error } = await access.db.rpc(
      "process_client_case_interest",
      {
        p_interest_id: interestId,
        p_client_id: access.user.id,
        p_action: action,
      },
    );

    if (error) throw rpcError(error);
    if (!data?.case_id || !data?.lawyer_id) {
      throw new Error("A operação não retornou os dados esperados.");
    }

    await runInterestSideEffects(access.db, data).catch((sideEffectError) => {
      console.error(
        "[Interesses] Operação concluída com efeito posterior pendente:",
        sideEffectError.message,
      );
    });

    return clientJson({
      success: true,
      data,
      message: actionMessage(data),
    });
  } catch (error) {
    return safeClientError(error, "Não foi possível processar o interesse.");
  }
}

export async function GET(request) {
  try {
    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const { data: cases, error: caseError } = await access.db
      .from("casos")
      .select("id, titulo, area_atuacao, status")
      .eq("cliente_id", access.user.id)
      .in("status", ["ABERTO", "NEGOCIANDO"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (caseError) {
      throw new Error(`Falha ao carregar casos: ${caseError.message}`);
    }

    if (!cases?.length) {
      return clientJson({ success: true, data: [] });
    }

    const caseIds = cases.map((item) => item.id);

    await access.db
      .from("email_tracking_logs")
      .update({ viewed_interests_at: new Date().toISOString() })
      .in("case_id", caseIds)
      .is("viewed_interests_at", null)
      .then(({ error }) => {
        if (error && !["42P01", "PGRST205"].includes(error.code)) {
          console.error("[Interesses] Falha no funil:", error.message);
        }
      });

    const { data: interests, error: interestError } = await access.db
      .from("case_interests")
      .select("id, case_id, lawyer_id, status, created_at")
      .in("case_id", caseIds)
      .in("status", ["PENDING", "NEGOTIATING"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (interestError) {
      throw new Error(`Falha ao carregar interesses: ${interestError.message}`);
    }

    const lawyerIds = [
      ...new Set((interests || []).map((item) => item.lawyer_id).filter(Boolean)),
    ];
    let lawyersById = {};

    if (lawyerIds.length) {
      const { data: lawyers, error: lawyerError } = await access.db
        .from("advogados")
        .select("id, name, avatar, oab, estado, is_premium")
        .in("id", lawyerIds);

      if (lawyerError) {
        throw new Error(`Falha ao carregar advogados: ${lawyerError.message}`);
      }

      lawyersById = Object.fromEntries(
        (lawyers || []).map((lawyer) => [lawyer.id, lawyer]),
      );
    }

    const casesById = Object.fromEntries(cases.map((item) => [item.id, item]));
    const enriched = (interests || []).map((item) => {
      const lawyer = lawyersById[item.lawyer_id] || {};
      const caseItem = casesById[item.case_id] || {};

      return {
        ...item,
        lawyer_name: lawyer.name || "Advogado",
        lawyer_avatar: lawyer.avatar || null,
        lawyer_oab: formatStoredOAB(lawyer.oab, lawyer.estado),
        lawyer_is_premium: lawyer.is_premium === true,
        caso_titulo: caseItem.titulo || "Caso",
        caso_area: caseItem.area_atuacao || "",
        caso_status: caseItem.status || "ABERTO",
      };
    });

    return clientJson({ success: true, data: enriched });
  } catch (error) {
    return safeClientError(error, "Não foi possível carregar os interesses.");
  }
}

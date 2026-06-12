import {
  getCaseGovernance,
  isValidUuid,
  json,
  requireCaseUser,
  upsertCaseGovernance,
} from "./caseRouteUtils";

async function notifyInterestedLawyers(db, caseItem, lawyerIds) {
  if (!lawyerIds.length) return;

  const notifications = lawyerIds.map((lawyerId) => ({
    id: crypto.randomUUID(),
    user_id: lawyerId,
    titulo: "Caso cancelado pelo cliente",
    mensagem: `O cliente cancelou o caso "${caseItem.titulo || "Caso"}".`,
    link: `/dashboard/advogado/casos/${caseItem.id}`,
    lida: false,
    created_at: new Date().toISOString(),
    tipo: "CASE_CANCELLED",
    meta: JSON.stringify({
      case_id: caseItem.id,
      cancellation_source: "CLIENT",
    }),
  }));

  const { error } = await db.from("notificacoes").insert(notifications);

  if (error) {
    const fallback = notifications.map(
      ({ id, user_id, titulo, mensagem, link, lida, created_at }) => ({
        id,
        user_id,
        titulo,
        mensagem,
        link,
        lida,
        created_at,
      }),
    );

    const { error: fallbackError } = await db
      .from("notificacoes")
      .insert(fallback);

    if (fallbackError) {
      console.error(
        "[Casos/Cancelamento] Falha ao notificar advogados:",
        fallbackError,
      );
    }
  }
}

export async function cancelCase(request) {
  try {
    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const caseId = String(searchParams.get("id") || "").trim();

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    const { data: caseItem, error: caseError } = await access.db
      .from("casos")
      .select(
        "id, cliente_id, advogado_id, titulo, status, negotiating_lawyers",
      )
      .eq("id", caseId)
      .eq("cliente_id", access.user.id)
      .maybeSingle();

    if (caseError) {
      throw new Error(`Falha ao consultar caso: ${caseError.message}`);
    }

    if (!caseItem) {
      return json(
        { success: false, message: "Caso não encontrado ou sem permissão." },
        404,
      );
    }

    if (caseItem.status === "CANCELADO") {
      return json({
        success: true,
        message: "O caso já estava cancelado.",
        data: { id: caseItem.id, status: caseItem.status, dataPreserved: true },
      });
    }

    const [governance, interestsResult] = await Promise.all([
      getCaseGovernance(access.db, caseId),
      access.db
        .from("case_interests")
        .select("lawyer_id")
        .eq("case_id", caseId),
    ]);

    if (interestsResult.error) {
      throw new Error(
        `Falha ao consultar interessados: ${interestsResult.error.message}`,
      );
    }

    const lawyerIds = [
      ...new Set([
        caseItem.advogado_id,
        ...(caseItem.negotiating_lawyers || []),
        ...(interestsResult.data || []).map((item) => item.lawyer_id),
      ].filter(Boolean)),
    ];

    const cancelledAt = new Date().toISOString();
    const { data: updatedCase, error: updateError } = await access.db
      .from("casos")
      .update({
        status: "CANCELADO",
        updated_at: cancelledAt,
      })
      .eq("id", caseId)
      .eq("cliente_id", access.user.id)
      .select("id, status, updated_at")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Falha ao cancelar caso: ${updateError.message}`);
    }

    if (!updatedCase) {
      throw new Error("O cancelamento não foi persistido.");
    }

    await upsertCaseGovernance(access.db, caseId, {
      operational_stage: "ARCHIVED",
      archived_at: governance?.legal_hold ? null : cancelledAt,
      archive_reason: "Caso cancelado pelo titular por meio da área do cliente.",
    });

    await notifyInterestedLawyers(access.db, caseItem, lawyerIds);

    return json({
      success: true,
      message:
        "Caso cancelado e removido das oportunidades. O histórico foi preservado.",
      data: {
        ...updatedCase,
        dataPreserved: true,
        legalHold: Boolean(governance?.legal_hold),
      },
    });
  } catch (error) {
    console.error("[Casos][DELETE] Erro:", error);
    return json(
      { success: false, message: "Não foi possível cancelar o caso." },
      500,
    );
  }
}

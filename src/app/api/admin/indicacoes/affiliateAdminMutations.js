import {
  CONFIRMED_TRANSACTION_STATUSES,
  isGovernanceMigrationMissing,
  isValidUuid,
  json,
  normalizeEmail,
  normalizeText,
  recordAffiliateAudit,
  requireAffiliateAdmin,
  validateMutationOrigin,
} from "./affiliateAdminCore";

const VALID_ACTIONS = new Set(["CREDIT_COMMISSION", "UPDATE_GOVERNANCE"]);
const VALID_REVIEW_STATUSES = new Set([
  "PENDING",
  "REVIEW",
  "CLEARED",
  "INVALID",
]);
const VALID_RISK_LEVELS = new Set(["STANDARD", "ELEVATED", "RESTRICTED"]);

async function getReferral(db, referralId) {
  const { data, error } = await db
    .from("indicacoes")
    .select(
      "id, indicador_id, email_indicado, status, valor_comissao, created_at, indicado_advogado_id, commissioned_at, review_status, risk_level",
    )
    .eq("id", referralId)
    .maybeSingle();

  if (error) {
    if (isGovernanceMigrationMissing(error)) {
      const migrationError = new Error(
        "Execute a migração de governança de afiliados antes desta operação.",
      );
      migrationError.code = "AFFILIATE_MIGRATION_REQUIRED";
      throw migrationError;
    }
    throw new Error("Falha ao consultar a indicação.");
  }

  return data || null;
}

async function resolveReferredLawyer(db, referral) {
  let query = db
    .from("advogados")
    .select("id, name, email, is_premium, plan_type");

  if (referral.indicado_advogado_id) {
    query = query.eq("id", referral.indicado_advogado_id);
  } else {
    query = query.eq("email", normalizeEmail(referral.email_indicado));
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error("Falha ao validar o advogado indicado.");
  return data || null;
}

async function findQualifyingTransaction(db, lawyerId, referralCreatedAt) {
  let query = db
    .from("transacoes")
    .select("id, valor, moeda, status, created_at")
    .eq("advogado_id", lawyerId)
    .eq("tipo", "PRO_SUBSCRIPTION")
    .in("status", CONFIRMED_TRANSACTION_STATUSES)
    .gt("valor", 0)
    .order("created_at", { ascending: false })
    .limit(1);

  if (referralCreatedAt) {
    query = query.gte("created_at", referralCreatedAt);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error("Falha ao validar a assinatura qualificadora.");
  return data || null;
}

async function countDuplicateReferrals(db, email) {
  const { count, error } = await db
    .from("indicacoes")
    .select("id", { count: "exact", head: true })
    .ilike("email_indicado", email);

  if (error) throw new Error("Falha ao verificar duplicidade da indicação.");
  return Number(count || 0);
}

async function creditCommission({ db, adminId, body }) {
  const referralId = String(body?.referralId || body?.indicacao_id || "").trim();
  const amount = Number(body?.amount ?? body?.valor);
  const justification = normalizeText(body?.justification, 1000);
  const manualOverride = body?.manualOverride === true;

  if (!isValidUuid(referralId)) {
    return json({ success: false, message: "Indicação inválida." }, 400);
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
    return json(
      { success: false, message: "A comissão deve ter entre 1 e 1000 Juris." },
      400,
    );
  }

  if (justification.length < (manualOverride ? 20 : 10)) {
    return json(
      {
        success: false,
        message: manualOverride
          ? "A aprovação excepcional exige justificativa com pelo menos 20 caracteres."
          : "Informe uma justificativa administrativa.",
      },
      400,
    );
  }

  const referral = await getReferral(db, referralId);

  if (!referral) {
    return json({ success: false, message: "Indicação não encontrada." }, 404);
  }

  if (
    String(referral.status || "").toUpperCase() === "COMISSIONADO" ||
    referral.commissioned_at
  ) {
    return json(
      { success: false, message: "Esta indicação já foi comissionada." },
      409,
    );
  }

  if (
    referral.review_status === "INVALID" ||
    referral.risk_level === "RESTRICTED"
  ) {
    return json(
      {
        success: false,
        message:
          "Esta indicação está inválida ou restrita. Revise a governança antes de qualquer comissão.",
      },
      409,
    );
  }

  const referredLawyer = await resolveReferredLawyer(db, referral);

  if (!referredLawyer) {
    return json(
      { success: false, message: "O advogado indicado não foi localizado." },
      409,
    );
  }

  if (referredLawyer.id === referral.indicador_id) {
    return json(
      { success: false, message: "Autoindicação não pode gerar comissão." },
      409,
    );
  }

  const [qualifyingTransaction, duplicateCount] = await Promise.all([
    findQualifyingTransaction(db, referredLawyer.id, referral.created_at),
    countDuplicateReferrals(db, normalizeEmail(referral.email_indicado)),
  ]);

  const requiresOverride = !qualifyingTransaction || duplicateCount > 1;

  if (requiresOverride && !manualOverride) {
    return json(
      {
        success: false,
        code: "MANUAL_OVERRIDE_REQUIRED",
        message:
          duplicateCount > 1
            ? "Há possíveis indicações duplicadas para este e-mail. Revise antes de aprovar excepcionalmente."
            : "Não há assinatura paga posterior à indicação. A comissão automática foi bloqueada.",
      },
      409,
    );
  }

  const { data, error } = await db.rpc("credit_affiliate_commission", {
    p_referral_id: referralId,
    p_admin_id: adminId,
    p_amount: amount,
    p_justification: justification,
    p_qualifying_transaction_id: qualifyingTransaction?.id || null,
    p_manual_override: manualOverride,
  });

  if (error) {
    if (isGovernanceMigrationMissing(error)) {
      return json(
        {
          success: false,
          code: "AFFILIATE_MIGRATION_REQUIRED",
          message:
            "A migração de governança de afiliados precisa ser executada antes de liberar comissões.",
        },
        503,
      );
    }

    const message = String(error.message || "");

    if (message.includes("already commissioned")) {
      return json(
        { success: false, message: "Esta indicação já foi comissionada." },
        409,
      );
    }

    if (message.includes("qualifying transaction required")) {
      return json(
        { success: false, message: "A assinatura qualificadora não foi comprovada." },
        409,
      );
    }

    console.error("[Admin/Afiliados] Falha no crédito atômico:", error);
    throw new Error("Falha ao concluir o crédito da comissão.");
  }

  return json({
    success: true,
    message: `${amount} Juris creditados ao afiliado.`,
    data: {
      referralId,
      amount,
      manualOverride,
      qualifyingTransactionId: qualifyingTransaction?.id || null,
      result: data,
    },
  });
}

async function updateGovernance({ db, request, adminId, body }) {
  const referralId = String(body?.referralId || "").trim();
  const reviewStatus = String(body?.reviewStatus || "").trim().toUpperCase();
  const riskLevel = String(body?.riskLevel || "").trim().toUpperCase();
  const notes = normalizeText(body?.notes, 1000);

  if (!isValidUuid(referralId)) {
    return json({ success: false, message: "Indicação inválida." }, 400);
  }

  if (!VALID_REVIEW_STATUSES.has(reviewStatus)) {
    return json({ success: false, message: "Status de revisão inválido." }, 400);
  }

  if (!VALID_RISK_LEVELS.has(riskLevel)) {
    return json({ success: false, message: "Nível de risco inválido." }, 400);
  }

  if (["REVIEW", "INVALID"].includes(reviewStatus) && notes.length < 10) {
    return json(
      { success: false, message: "Informe uma justificativa para a classificação." },
      400,
    );
  }

  const referral = await getReferral(db, referralId);
  if (!referral) {
    return json({ success: false, message: "Indicação não encontrada." }, 404);
  }

  if (
    String(referral.status || "").toUpperCase() === "COMISSIONADO" &&
    reviewStatus === "INVALID"
  ) {
    return json(
      {
        success: false,
        message:
          "Uma comissão já creditada exige processo de estorno antes de ser invalidada.",
      },
      409,
    );
  }

  const { error } = await db
    .from("indicacoes")
    .update({
      review_status: reviewStatus,
      risk_level: riskLevel,
      review_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referralId);

  if (error) {
    if (isGovernanceMigrationMissing(error)) {
      return json(
        {
          success: false,
          code: "AFFILIATE_MIGRATION_REQUIRED",
          message:
            "Execute a migração de governança de afiliados antes de classificar indicações.",
        },
        503,
      );
    }
    throw new Error("Falha ao atualizar a governança da indicação.");
  }

  const auditRecorded = await recordAffiliateAudit(db, request, {
    adminId,
    referralId,
    action: "AFFILIATE_REFERRAL_REVIEW_UPDATED",
    purpose: "AFFILIATE_RISK_GOVERNANCE",
    justification: notes || null,
    metadata: {
      previousReviewStatus: referral.review_status,
      previousRiskLevel: referral.risk_level,
      reviewStatus,
      riskLevel,
    },
  });

  return json({
    success: true,
    message: "Classificação da indicação atualizada.",
    data: { auditRecorded },
  });
}

export async function mutateAdminAffiliate(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireAffiliateAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const action = String(body?.action || "CREDIT_COMMISSION")
      .trim()
      .toUpperCase();

    if (!VALID_ACTIONS.has(action)) {
      return json({ success: false, message: "Ação inválida." }, 400);
    }

    const context = {
      db: access.db,
      request,
      adminId: access.auth.user.id,
      body,
    };

    return action === "CREDIT_COMMISSION"
      ? creditCommission(context)
      : updateGovernance(context);
  } catch (error) {
    console.error("[Admin/Afiliados][POST] Erro:", error);

    if (error?.code === "AFFILIATE_MIGRATION_REQUIRED") {
      return json(
        { success: false, code: error.code, message: error.message },
        503,
      );
    }

    return json(
      { success: false, message: "Não foi possível concluir a operação." },
      500,
    );
  }
}

import {
  CONFIRMED_TRANSACTION_STATUSES,
  inferPaymentProvider,
  isGovernanceMigrationMissing,
  json,
  maskEmail,
  normalizeEmail,
  requireAffiliateAdmin,
} from "./affiliateAdminCore";

const DEFAULT_COMMISSION_JURIS = Math.max(
  1,
  Math.min(1000, Number(process.env.AFFILIATE_COMMISSION_JURIS || 35)),
);

async function loadReferrals(db) {
  const currentResult = await db
    .from("indicacoes")
    .select(
      "id, indicador_id, nome_indicado, email_indicado, status, valor_comissao, created_at, indicado_advogado_id, qualifying_transaction_id, commissioned_at, commissioned_by, commission_reason, review_status, risk_level, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!currentResult.error) {
    return {
      data: currentResult.data || [],
      governanceAvailable: true,
    };
  }

  if (!isGovernanceMigrationMissing(currentResult.error)) {
    console.error(
      "[Admin/Afiliados] Falha ao consultar indicações:",
      currentResult.error,
    );
    throw new Error("Falha ao consultar indicações.");
  }

  const legacyResult = await db
    .from("indicacoes")
    .select(
      "id, indicador_id, nome_indicado, email_indicado, status, valor_comissao, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (legacyResult.error) {
    console.error(
      "[Admin/Afiliados] Falha no fallback de indicações:",
      legacyResult.error,
    );
    throw new Error("Falha ao consultar indicações.");
  }

  return {
    data: (legacyResult.data || []).map((referral) => ({
      ...referral,
      indicado_advogado_id: null,
      qualifying_transaction_id: null,
      commissioned_at: null,
      commissioned_by: null,
      commission_reason: null,
      review_status: null,
      risk_level: "STANDARD",
      updated_at: referral.created_at,
    })),
    governanceAvailable: false,
  };
}

async function loadProfiles(db, referrals) {
  const referrerIds = [
    ...new Set(referrals.map((item) => item.indicador_id).filter(Boolean)),
  ];
  const referredLawyerIds = [
    ...new Set(
      referrals.map((item) => item.indicado_advogado_id).filter(Boolean),
    ),
  ];
  const referredEmails = [
    ...new Set(
      referrals.map((item) => normalizeEmail(item.email_indicado)).filter(Boolean),
    ),
  ];

  const [referrersResult, lawyersByIdResult, lawyersByEmailResult, clientsResult] =
    await Promise.all([
      referrerIds.length
        ? db
            .from("advogados")
            .select("id, name, email, balance, plan_type, is_premium")
            .in("id", referrerIds)
        : Promise.resolve({ data: [], error: null }),
      referredLawyerIds.length
        ? db
            .from("advogados")
            .select(
              "id, name, email, plan_type, is_premium, premium_expires_at, created_at",
            )
            .in("id", referredLawyerIds)
        : Promise.resolve({ data: [], error: null }),
      referredEmails.length
        ? db
            .from("advogados")
            .select(
              "id, name, email, plan_type, is_premium, premium_expires_at, created_at",
            )
            .in("email", referredEmails)
        : Promise.resolve({ data: [], error: null }),
      referredEmails.length
        ? db
            .from("clientes")
            .select("id, name, email, created_at")
            .in("email", referredEmails)
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const result of [
    referrersResult,
    lawyersByIdResult,
    lawyersByEmailResult,
    clientsResult,
  ]) {
    if (result.error) {
      console.error("[Admin/Afiliados] Falha ao consultar perfis:", result.error);
      throw new Error("Falha ao consultar os perfis relacionados.");
    }
  }

  const referrers = new Map(
    (referrersResult.data || []).map((profile) => [profile.id, profile]),
  );
  const lawyersById = new Map(
    (lawyersByIdResult.data || []).map((profile) => [profile.id, profile]),
  );
  const lawyersByEmail = new Map(
    (lawyersByEmailResult.data || []).map((profile) => [
      normalizeEmail(profile.email),
      profile,
    ]),
  );
  const clientsByEmail = new Map(
    (clientsResult.data || []).map((profile) => [
      normalizeEmail(profile.email),
      profile,
    ]),
  );

  return { referrers, lawyersById, lawyersByEmail, clientsByEmail };
}

async function loadQualifyingTransactions(db, lawyerIds) {
  if (!lawyerIds.length) return new Map();

  const { data, error } = await db
    .from("transacoes")
    .select(
      "id, advogado_id, tipo, valor, moeda, status, stripe_session_id, created_at",
    )
    .in("advogado_id", lawyerIds)
    .eq("tipo", "PRO_SUBSCRIPTION")
    .in("status", CONFIRMED_TRANSACTION_STATUSES)
    .gt("valor", 0)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    console.error(
      "[Admin/Afiliados] Falha ao consultar transações qualificadoras:",
      error,
    );
    throw new Error("Falha ao validar as assinaturas indicadas.");
  }

  const map = new Map();

  for (const transaction of data || []) {
    if (!map.has(transaction.advogado_id)) {
      map.set(transaction.advogado_id, transaction);
    }
  }

  return map;
}

function classifyReferral({
  referral,
  referrer,
  referredLawyer,
  referredClient,
  qualifyingTransaction,
  duplicateCount,
}) {
  const commissioned =
    String(referral.status || "").toUpperCase() === "COMISSIONADO" ||
    Boolean(referral.commissioned_at);

  if (commissioned) {
    return {
      code: "COMMISSIONED",
      label: "Comissionada",
      canCredit: false,
      manualOverrideAllowed: false,
      alert: null,
    };
  }

  if (!referrer) {
    return {
      code: "INVALID",
      label: "Indicador não localizado",
      canCredit: false,
      manualOverrideAllowed: false,
      alert: "O beneficiário da comissão não existe mais na base.",
    };
  }

  if (duplicateCount > 1) {
    return {
      code: "REVIEW",
      label: "Possível duplicidade",
      canCredit: false,
      manualOverrideAllowed: true,
      alert: `${duplicateCount} indicações usam o mesmo e-mail.`,
    };
  }

  if (qualifyingTransaction && referredLawyer) {
    return {
      code: "ELIGIBLE",
      label: "Elegível",
      canCredit: true,
      manualOverrideAllowed: false,
      alert: null,
    };
  }

  if (referredLawyer?.is_premium) {
    return {
      code: "REVIEW",
      label: "Plano ativo sem venda conciliada",
      canCredit: false,
      manualOverrideAllowed: true,
      alert:
        "O indicado possui plano ativo, mas não há uma assinatura paga confirmada no razão financeiro.",
    };
  }

  if (referredLawyer) {
    return {
      code: "WAITING_PAYMENT",
      label: "Aguardando assinatura",
      canCredit: false,
      manualOverrideAllowed: false,
      alert: null,
    };
  }

  if (referredClient) {
    return {
      code: "CLIENT_LEAD",
      label: "Indicação de cliente",
      canCredit: false,
      manualOverrideAllowed: false,
      alert: "Clientes não possuem assinatura profissional qualificadora.",
    };
  }

  return {
    code: "WAITING_REGISTRATION",
    label: "Cadastro não localizado",
    canCredit: false,
    manualOverrideAllowed: false,
    alert: "O e-mail indicado ainda não foi localizado nos perfis ativos.",
  };
}

function summarize(items) {
  const summary = items.reduce(
    (current, item) => {
      current.totalReferrals += 1;
      current.uniqueAffiliates.add(item.referrer.id || item.referrer.name);
      current.byEligibility[item.eligibility.code] =
        (current.byEligibility[item.eligibility.code] || 0) + 1;

      if (item.eligibility.code === "COMMISSIONED") {
        current.commissionedCount += 1;
        current.creditedJuris += Number(item.commission.amount || 0);
      }
      if (item.eligibility.code === "ELIGIBLE") current.eligibleCount += 1;
      if (item.eligibility.code === "REVIEW") current.reviewCount += 1;
      if (item.eligibility.alert) current.alertCount += 1;
      if (item.referred.profileType === "LAWYER") current.lawyerLeads += 1;

      return current;
    },
    {
      totalReferrals: 0,
      commissionedCount: 0,
      eligibleCount: 0,
      reviewCount: 0,
      alertCount: 0,
      creditedJuris: 0,
      lawyerLeads: 0,
      uniqueAffiliates: new Set(),
      byEligibility: {},
    },
  );

  const qualifyingJourney = summary.commissionedCount + summary.eligibleCount;

  return {
    totalReferrals: summary.totalReferrals,
    uniqueAffiliates: summary.uniqueAffiliates.size,
    commissionedCount: summary.commissionedCount,
    eligibleCount: summary.eligibleCount,
    reviewCount: summary.reviewCount,
    alertCount: summary.alertCount,
    creditedJuris: summary.creditedJuris,
    lawyerLeads: summary.lawyerLeads,
    conversionRate: summary.lawyerLeads
      ? Number(((qualifyingJourney / summary.lawyerLeads) * 100).toFixed(1))
      : 0,
    byEligibility: summary.byEligibility,
  };
}

export async function getAdminAffiliates() {
  try {
    const access = await requireAffiliateAdmin();
    if (!access.ok) return access.response;

    const referralResult = await loadReferrals(access.db);
    const referrals = referralResult.data;
    const profiles = await loadProfiles(access.db, referrals);

    const referredLawyerMap = new Map();
    const duplicateCounts = new Map();

    for (const referral of referrals) {
      const email = normalizeEmail(referral.email_indicado);
      duplicateCounts.set(email, (duplicateCounts.get(email) || 0) + 1);

      const lawyer =
        profiles.lawyersById.get(referral.indicado_advogado_id) ||
        profiles.lawyersByEmail.get(email) ||
        null;

      if (lawyer) referredLawyerMap.set(lawyer.id, lawyer);
    }

    const transactionMap = await loadQualifyingTransactions(
      access.db,
      [...referredLawyerMap.keys()],
    );

    const items = referrals.map((referral) => {
      const email = normalizeEmail(referral.email_indicado);
      const referrer = profiles.referrers.get(referral.indicador_id) || null;
      const referredLawyer =
        profiles.lawyersById.get(referral.indicado_advogado_id) ||
        profiles.lawyersByEmail.get(email) ||
        null;
      const referredClient = profiles.clientsByEmail.get(email) || null;
      const qualifyingTransaction = referredLawyer
        ? transactionMap.get(referredLawyer.id) || null
        : null;
      const eligibility = classifyReferral({
        referral,
        referrer,
        referredLawyer,
        referredClient,
        qualifyingTransaction,
        duplicateCount: duplicateCounts.get(email) || 0,
      });

      return {
        id: referral.id,
        createdAt: referral.created_at,
        updatedAt: referral.updated_at || referral.created_at,
        referrer: {
          id: referral.indicador_id,
          name: referrer?.name || "Indicador não localizado",
          maskedEmail: maskEmail(referrer?.email),
          currentBalance: Number(referrer?.balance || 0),
          planType: referrer?.plan_type || "FREE",
        },
        referred: {
          id: referredLawyer?.id || referredClient?.id || null,
          name:
            referredLawyer?.name ||
            referredClient?.name ||
            referral.nome_indicado ||
            "Pessoa indicada",
          maskedEmail: maskEmail(referral.email_indicado),
          profileType: referredLawyer
            ? "LAWYER"
            : referredClient
              ? "CLIENT"
              : "UNREGISTERED",
          planType: referredLawyer?.plan_type || "FREE",
          isPremium: Boolean(referredLawyer?.is_premium),
          premiumExpiresAt: referredLawyer?.premium_expires_at || null,
        },
        eligibility,
        qualifyingPayment: qualifyingTransaction
          ? {
              id: qualifyingTransaction.id,
              amount: Number(qualifyingTransaction.valor || 0),
              currency: qualifyingTransaction.moeda || "BRL",
              provider: inferPaymentProvider(
                qualifyingTransaction.stripe_session_id,
              ),
              createdAt: qualifyingTransaction.created_at,
            }
          : null,
        commission: {
          status:
            eligibility.code === "COMMISSIONED" ? "COMMISSIONED" : "PENDING",
          amount: Number(referral.valor_comissao || 0),
          commissionedAt: referral.commissioned_at || null,
          commissionedBy: referral.commissioned_by || null,
          reason: referral.commission_reason || null,
        },
        governance: {
          reviewStatus: referral.review_status || "PENDING",
          riskLevel: referral.risk_level || "STANDARD",
          duplicateCount: duplicateCounts.get(email) || 0,
        },
      };
    });

    return json({
      success: true,
      data: {
        referrals: items,
        summary: summarize(items),
        policy: {
          defaultCommissionJuris: DEFAULT_COMMISSION_JURIS,
          automaticEligibilityRequiresConfirmedPaidSubscription: true,
          manualOverrideRequiresJustification: true,
          cashWithdrawalsSupported: false,
        },
        schema: {
          governanceAvailable: referralResult.governanceAvailable,
        },
        privacy: {
          emailsMasked: true,
          paymentReferencesReturned: false,
          financialBeneficiaryDerivedOnServer: true,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Afiliados][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os afiliados." },
      500,
    );
  }
}

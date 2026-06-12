import { json } from "./affiliateAdminCore";
import { getAdminAffiliates } from "./affiliateAdminRead";

function applyGovernance(item) {
  if (item.eligibility.code === "COMMISSIONED") return item;

  const reviewStatus = item.governance.reviewStatus;
  const riskLevel = item.governance.riskLevel;
  const referralTime = new Date(item.createdAt || 0).getTime();
  const paymentTime = new Date(
    item.qualifyingPayment?.createdAt || 0,
  ).getTime();

  let nextItem = item;

  if (
    item.qualifyingPayment &&
    referralTime > 0 &&
    (!paymentTime || paymentTime < referralTime)
  ) {
    nextItem = {
      ...nextItem,
      qualifyingPayment: null,
      eligibility: {
        code: "REVIEW",
        label: "Pagamento anterior à indicação",
        canCredit: false,
        manualOverrideAllowed: true,
        alert:
          "A assinatura localizada ocorreu antes do registro da indicação e não comprova conversão pelo afiliado.",
      },
    };
  }

  if (reviewStatus === "INVALID") {
    return {
      ...nextItem,
      eligibility: {
        code: "INVALID",
        label: "Indicação inválida",
        canCredit: false,
        manualOverrideAllowed: false,
        alert: "A indicação foi invalidada pela governança administrativa.",
      },
    };
  }

  if (riskLevel === "RESTRICTED") {
    return {
      ...nextItem,
      eligibility: {
        code: "REVIEW",
        label: "Bloqueada por risco",
        canCredit: false,
        manualOverrideAllowed: false,
        alert:
          "A indicação está classificada como restrita e não pode receber comissão.",
      },
    };
  }

  if (reviewStatus === "REVIEW") {
    return {
      ...nextItem,
      eligibility: {
        code: "REVIEW",
        label: "Revisão administrativa aberta",
        canCredit: false,
        manualOverrideAllowed: false,
        alert:
          "Conclua a revisão administrativa antes de liberar a comissão.",
      },
    };
  }

  return nextItem;
}

function summarize(items) {
  const result = items.reduce(
    (current, item) => {
      current.totalReferrals += 1;
      if (item.referrer.id) current.affiliates.add(item.referrer.id);
      if (item.referred.profileType === "LAWYER") current.lawyerLeads += 1;
      if (item.eligibility.alert) current.alertCount += 1;

      current.byEligibility[item.eligibility.code] =
        (current.byEligibility[item.eligibility.code] || 0) + 1;

      if (item.eligibility.code === "ELIGIBLE") current.eligibleCount += 1;
      if (item.eligibility.code === "REVIEW") current.reviewCount += 1;
      if (item.eligibility.code === "COMMISSIONED") {
        current.commissionedCount += 1;
        current.creditedJuris += Number(item.commission.amount || 0);
      }

      return current;
    },
    {
      totalReferrals: 0,
      eligibleCount: 0,
      reviewCount: 0,
      commissionedCount: 0,
      alertCount: 0,
      creditedJuris: 0,
      lawyerLeads: 0,
      affiliates: new Set(),
      byEligibility: {},
    },
  );

  return {
    totalReferrals: result.totalReferrals,
    uniqueAffiliates: result.affiliates.size,
    commissionedCount: result.commissionedCount,
    eligibleCount: result.eligibleCount,
    reviewCount: result.reviewCount,
    alertCount: result.alertCount,
    creditedJuris: result.creditedJuris,
    lawyerLeads: result.lawyerLeads,
    conversionRate: result.lawyerLeads
      ? Number(
          (
            ((result.commissionedCount + result.eligibleCount) /
              result.lawyerLeads) *
            100
          ).toFixed(1),
        )
      : 0,
    byEligibility: result.byEligibility,
  };
}

export async function getGuardedAdminAffiliates() {
  const response = await getAdminAffiliates();

  if (!response.ok) return response;

  const payload = await response.json();

  if (!payload?.success || !payload.data) return response;

  const referrals = (payload.data.referrals || []).map(applyGovernance);

  return json({
    ...payload,
    data: {
      ...payload.data,
      referrals,
      summary: summarize(referrals),
    },
  });
}

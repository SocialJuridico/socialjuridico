export const CONFIRMED_AFFILIATE_TRANSACTION_STATUSES = [
  "succeeded",
  "paid",
  "complete",
  "completed",
];

export function normalizeAffiliateEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

export function maskAffiliateEmail(value) {
  const email = normalizeAffiliateEmail(value);
  const [local, domain] = email.split("@");

  if (!local || !domain) return "Não informado";

  const visibleLocal = local.slice(0, Math.min(2, local.length));
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";

  return `${visibleLocal}${"*".repeat(
    Math.max(3, local.length - visibleLocal.length),
  )}@${domainName.slice(0, 1)}${"*".repeat(
    Math.max(3, domainName.length - 1),
  )}${suffix}`;
}

export function isAffiliateGovernanceMissing(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    message.includes("indicado_advogado_id") ||
    message.includes("qualifying_transaction_id") ||
    message.includes("commissioned_at") ||
    message.includes("review_status") ||
    message.includes("risk_level")
  );
}

function status(code, label, tone, description) {
  return { code, label, tone, description };
}

export function classifyReferralForLawyer({
  referral,
  referredLawyer,
  referredClient,
  qualifyingTransaction,
}) {
  const rawStatus = String(referral?.status || "").toUpperCase();
  const reviewStatus = String(referral?.review_status || "").toUpperCase();
  const riskLevel = String(referral?.risk_level || "STANDARD").toUpperCase();
  const commissioned =
    rawStatus === "COMISSIONADO" || Boolean(referral?.commissioned_at);

  if (commissioned) {
    return status(
      "COMMISSIONED",
      "Recompensa creditada",
      "success",
      "Os Juris desta indicação já foram adicionados ao seu saldo.",
    );
  }

  if (reviewStatus === "INVALID" || riskLevel === "RESTRICTED") {
    return status(
      "INVALID",
      "Não elegível",
      "danger",
      "A indicação foi bloqueada após a validação de segurança.",
    );
  }

  if (reviewStatus === "REVIEW" || riskLevel === "ELEVATED") {
    return status(
      "REVIEW",
      "Em análise",
      "warning",
      "A equipe está revisando os dados antes de liberar a recompensa.",
    );
  }

  if (qualifyingTransaction && referredLawyer) {
    return status(
      "ELIGIBLE",
      "Assinatura confirmada",
      "gold",
      "O pagamento foi localizado e a recompensa aguarda processamento.",
    );
  }

  if (referredLawyer) {
    return status(
      "WAITING_PAYMENT",
      "Aguardando assinatura",
      "info",
      "O advogado se cadastrou, mas ainda não possui uma assinatura paga qualificadora.",
    );
  }

  if (referredClient) {
    return status(
      "CLIENT_LEAD",
      "Cadastro de cliente",
      "neutral",
      "O link foi utilizado por um cliente. Somente assinaturas profissionais geram recompensa.",
    );
  }

  return status(
    "WAITING_REGISTRATION",
    "Cadastro pendente",
    "neutral",
    "O cadastro ainda não foi localizado ou concluído.",
  );
}

export function summarizeLawyerReferrals(items) {
  return (items || []).reduce(
    (summary, item) => {
      summary.total += 1;

      if (item.referred.profileType !== "UNREGISTERED") {
        summary.registered += 1;
      }

      if (item.status.code === "COMMISSIONED") {
        summary.commissioned += 1;
        summary.creditedJuris += Number(item.reward.amount || 0);
      }

      if (["ELIGIBLE", "REVIEW"].includes(item.status.code)) {
        summary.awaitingCredit += 1;
      }

      return summary;
    },
    {
      total: 0,
      registered: 0,
      awaitingCredit: 0,
      commissioned: 0,
      creditedJuris: 0,
    },
  );
}

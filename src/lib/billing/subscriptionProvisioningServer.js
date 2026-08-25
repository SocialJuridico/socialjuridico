import { decodeBillingReference } from "@/lib/billing/reference";
import { supabaseAdmin } from "@/lib/supabase";

const ROLLBACK_ELIGIBLE_STATUSES = new Set([
  "PENDING_PAYMENT",
  "ACTIVATING",
  "CANCELED",
  "CANCELLED",
  "UNPAID",
  "REJECTED",
  "FAILED",
]);

const FAILURE_STATUSES = new Set([
  "rejected",
  "failed",
  "cancelled",
  "canceled",
  "refunded",
  "charged_back",
  "chargeback",
  "unpaid",
]);

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function isSubscriptionChargeFailure(value) {
  return FAILURE_STATUSES.has(normalizeStatus(value));
}

export function subscriptionInvoicePaymentStatus(invoice) {
  return normalizeStatus(
    invoice?.payment?.status || invoice?.summarized || invoice?.status,
  );
}

async function getReferenceTransaction(reference) {
  if (!supabaseAdmin) throw new Error("Serviço financeiro indisponível.");

  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, advogado_id, status, stripe_session_id")
    .eq("stripe_session_id", reference)
    .maybeSingle();

  if (error) throw new Error("Falha ao localizar a assinatura no financeiro.");
  return data || null;
}

export async function grantProvisionalPlanAccess({
  lawyerId,
  product,
  activePlan = null,
}) {
  if (!supabaseAdmin) throw new Error("Serviço financeiro indisponível.");

  if (
    !lawyerId ||
    !product?.recurring ||
    !["START", "PRO"].includes(String(product?.planType || "").toUpperCase())
  ) {
    return { granted: false, reason: "NOT_RECURRING_PLAN" };
  }

  // Em upgrade o plano atual continua preservado até a primeira cobrança.
  // Isso evita retirar o acesso anterior ou cancelar a assinatura antiga antes
  // da confirmação do novo pagamento.
  if (activePlan) {
    return { granted: false, reason: "EXISTING_PLAN_PRESERVED" };
  }

  const { error } = await supabaseAdmin
    .from("advogados")
    .update({
      plan_type: String(product.planType).toUpperCase(),
      plan_billing_cycle: String(product.billingCycle || "MONTHLY").toUpperCase(),
      is_premium: true,
      premium_expires_at: null,
      subscription_status: "PENDING_PAYMENT",
    })
    .eq("id", lawyerId);

  if (error) {
    throw new Error("Não foi possível liberar o acesso provisório ao plano.");
  }

  return { granted: true, reason: "FIRST_SUBSCRIPTION_PROVISIONED" };
}

export async function rollbackProvisionalPlanAccess({
  reference,
  failureStatus = "UNPAID",
}) {
  if (!reference || !supabaseAdmin) {
    return { rolledBack: false, reason: "MISSING_REFERENCE" };
  }

  const { product } = decodeBillingReference(reference);
  if (!product?.recurring || !product?.planType) {
    return { rolledBack: false, reason: "NOT_RECURRING_PLAN" };
  }

  const transaction = await getReferenceTransaction(reference);
  if (!transaction) {
    return { rolledBack: false, reason: "REFERENCE_NOT_FOUND" };
  }

  // Se a primeira cobrança já foi confirmada, nunca desfaz o benefício.
  if (transaction.status === "subscription_active") {
    return { rolledBack: false, reason: "ALREADY_ACTIVE" };
  }

  const { data: lawyer, error: lawyerError } = await supabaseAdmin
    .from("advogados")
    .select("plan_type, subscription_status")
    .eq("id", transaction.advogado_id)
    .maybeSingle();

  if (lawyerError || !lawyer) {
    throw new Error("Não foi possível revisar o acesso provisório do plano.");
  }

  const profileStatus = String(lawyer.subscription_status || "").toUpperCase();
  const profilePlan = String(lawyer.plan_type || "").toUpperCase();
  const targetPlan = String(product.planType || "").toUpperCase();
  const finalStatus = String(failureStatus || "UNPAID").toUpperCase();

  // Em upgrade START -> PRO o perfil continua apontando para o plano antigo até
  // a primeira cobrança do PRO. Se a nova assinatura falhar, apenas restauramos
  // o status do plano anterior e mantemos assinatura, vencimento e benefícios.
  if (
    ["START", "PRO"].includes(profilePlan) &&
    profilePlan !== targetPlan
  ) {
    const { error: restoreError } = await supabaseAdmin
      .from("advogados")
      .update({ subscription_status: "ACTIVE" })
      .eq("id", transaction.advogado_id);

    if (restoreError) {
      throw new Error("Não foi possível restaurar o plano anterior após a falha.");
    }

    await supabaseAdmin
      .from("transacoes")
      .update({ status: `subscription_${normalizeStatus(finalStatus)}` })
      .eq("id", transaction.id);

    return {
      rolledBack: true,
      reason: "UPGRADE_FAILED_PREVIOUS_PLAN_PRESERVED",
    };
  }

  if (
    !ROLLBACK_ELIGIBLE_STATUSES.has(profileStatus) ||
    profilePlan !== targetPlan
  ) {
    return { rolledBack: false, reason: "NO_PROVISIONAL_ACCESS" };
  }

  const { error: updateError } = await supabaseAdmin
    .from("advogados")
    .update({
      plan_type: "FREE",
      plan_billing_cycle: null,
      is_premium: false,
      premium_expires_at: null,
      subscription_status: finalStatus,
      stripe_subscription_id: null,
    })
    .eq("id", transaction.advogado_id);

  if (updateError) {
    throw new Error("Não foi possível remover o acesso provisório recusado.");
  }

  await supabaseAdmin
    .from("transacoes")
    .update({ status: `subscription_${normalizeStatus(finalStatus)}` })
    .eq("id", transaction.id);

  return { rolledBack: true, reason: "FIRST_CHARGE_FAILED" };
}

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMED_STATUSES = new Set([
  "succeeded",
  "paid",
  "complete",
  "completed",
]);

const FAILED_STATUSES = new Set([
  "failed",
  "canceled",
  "cancelled",
  "refunded",
  "disputed",
  "error_updating_balance",
]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function maskEmail(value) {
  const email = String(value || "").trim();
  const [local, domain] = email.split("@");

  if (!local || !domain) return "Não informado";

  const localVisible = local.slice(0, Math.min(2, local.length));
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";

  return `${localVisible}${"*".repeat(
    Math.max(3, local.length - localVisible.length),
  )}@${domainName.slice(0, 1)}${"*".repeat(
    Math.max(3, domainName.length - 1),
  )}${suffix}`;
}

function maskProviderReference(value) {
  const reference = String(value || "").trim();
  if (!reference) return "Não informada";
  if (reference.length <= 12) return `${reference.slice(0, 4)}••••`;

  return `${reference.slice(0, 7)}••••${reference.slice(-4)}`;
}

function inferProvider(reference) {
  const value = String(reference || "").toLowerCase();

  if (value.startsWith("manual_")) return "MANUAL";
  if (value.startsWith("cs_")) return "STRIPE_CHECKOUT";
  if (value.startsWith("pi_")) return "STRIPE_PAYMENT_INTENT";
  if (value.startsWith("seti_")) return "STRIPE_SETUP_INTENT";
  return "UNKNOWN";
}

function inferProduct(transaction) {
  const type = String(transaction.tipo || "").toUpperCase();
  const jurisAmount = Number(transaction.juris_amount || 0);

  if (type === "JURIS_PURCHASE") return "JURIS";
  if (type === "ADDON_PURCHASE") return "ADDON";
  if (type === "PRO_SUBSCRIPTION") {
    return jurisAmount === 7 ? "START" : "PRO";
  }

  return "OTHER";
}

function classifyFinancialStatus(transaction, provider) {
  const rawStatus = String(transaction.status || "").toLowerCase();

  if (provider === "STRIPE_SETUP_INTENT") return "REVIEW";
  if (provider === "MANUAL" && CONFIRMED_STATUSES.has(rawStatus)) {
    return "MANUAL";
  }
  if (rawStatus.includes("review")) return "REVIEW";
  if (FAILED_STATUSES.has(rawStatus) || rawStatus.startsWith("error_")) {
    return "FAILED";
  }
  if (CONFIRMED_STATUSES.has(rawStatus)) return "CONFIRMED";
  return "PENDING";
}

function getOperationalAlert(transaction, provider, financialStatus) {
  const amount = Number(transaction.valor || 0);

  if (provider === "STRIPE_SETUP_INTENT") {
    return {
      severity: "CRITICAL",
      code: "SETUP_INTENT_AS_PAYMENT",
      label: "SetupIntent registrado como pagamento",
      recommendation:
        "Validar a cobrança no Stripe. SetupIntent não comprova pagamento.",
    };
  }

  if (financialStatus === "FAILED") {
    return {
      severity: "HIGH",
      code: "PROCESSING_FAILURE",
      label: "Falha no processamento financeiro",
      recommendation: "Revisar pagamento e entrega do produto ao usuário.",
    };
  }

  if (financialStatus === "REVIEW") {
    return {
      severity: "HIGH",
      code: "MANUAL_REVIEW_REQUIRED",
      label: "Revisão manual necessária",
      recommendation: "Conferir valor, produto e benefício aplicado.",
    };
  }

  if (financialStatus === "CONFIRMED" && amount <= 0) {
    return {
      severity: "MEDIUM",
      code: "ZERO_VALUE_PAYMENT",
      label: "Pagamento confirmado com valor zerado",
      recommendation: "Verificar desconto integral ou inconsistência de origem.",
    };
  }

  if (!transaction.advogado) {
    return {
      severity: "MEDIUM",
      code: "CUSTOMER_NOT_FOUND",
      label: "Comprador não localizado",
      recommendation: "Conciliar o identificador do pagamento com o cadastro.",
    };
  }

  return null;
}

function summarize(transactions) {
  const summary = transactions.reduce(
    (current, transaction) => {
      current.totalRecords += 1;

      if (transaction.financialStatus === "CONFIRMED") {
        current.confirmedCount += 1;
        if (transaction.amount > 0) {
          current.confirmedGross += transaction.amount;
          current.positiveConfirmedCount += 1;
        }
      }

      if (transaction.financialStatus === "REVIEW") current.reviewCount += 1;
      if (transaction.financialStatus === "FAILED") current.failedCount += 1;
      if (transaction.financialStatus === "PENDING") current.pendingCount += 1;
      if (transaction.financialStatus === "MANUAL") current.manualCount += 1;
      if (transaction.alert) current.alertCount += 1;
      if (transaction.lawyerId) current.customerIds.add(transaction.lawyerId);

      current.byProduct[transaction.product] =
        (current.byProduct[transaction.product] || 0) + 1;

      return current;
    },
    {
      totalRecords: 0,
      confirmedCount: 0,
      positiveConfirmedCount: 0,
      confirmedGross: 0,
      reviewCount: 0,
      failedCount: 0,
      pendingCount: 0,
      manualCount: 0,
      alertCount: 0,
      customerIds: new Set(),
      byProduct: {},
    },
  );

  return {
    totalRecords: summary.totalRecords,
    confirmedCount: summary.confirmedCount,
    confirmedGross: Number(summary.confirmedGross.toFixed(2)),
    reviewCount: summary.reviewCount,
    failedCount: summary.failedCount,
    pendingCount: summary.pendingCount,
    manualCount: summary.manualCount,
    alertCount: summary.alertCount,
    uniqueCustomers: summary.customerIds.size,
    averageTicket: summary.positiveConfirmedCount
      ? Number(
          (
            summary.confirmedGross / summary.positiveConfirmedCount
          ).toFixed(2),
        )
      : 0,
    byProduct: summary.byProduct,
  };
}

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin) {
      return json(
        {
          success: false,
          message: "Serviço financeiro indisponível no servidor.",
        },
        503,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("transacoes")
      .select(`
        id,
        advogado_id,
        tipo,
        valor,
        moeda,
        status,
        juris_amount,
        stripe_session_id,
        cupom_id,
        created_at,
        advogado:advogados(name, email),
        cupom:cupons(codigo)
      `)
      .order("created_at", { ascending: false })
      .limit(3000);

    if (error) {
      throw new Error(`Falha ao consultar transações: ${error.message}`);
    }

    const transactions = (data || []).map((transaction) => {
      const provider = inferProvider(transaction.stripe_session_id);
      const financialStatus = classifyFinancialStatus(transaction, provider);
      const amount = Number(transaction.valor || 0);

      return {
        id: transaction.id,
        lawyerId: transaction.advogado_id,
        customer: {
          name: transaction.advogado?.name || "Comprador não localizado",
          maskedEmail: maskEmail(transaction.advogado?.email),
        },
        type: transaction.tipo || "UNKNOWN",
        product: inferProduct(transaction),
        amount: Number.isFinite(amount) ? amount : 0,
        currency: String(transaction.moeda || "BRL").toUpperCase(),
        rawStatus: transaction.status || "unknown",
        financialStatus,
        jurisAmount: Number(transaction.juris_amount || 0),
        provider,
        providerReference: maskProviderReference(
          transaction.stripe_session_id,
        ),
        couponCode: transaction.cupom?.codigo || null,
        createdAt: transaction.created_at,
        alert: getOperationalAlert(
          transaction,
          provider,
          financialStatus,
        ),
      };
    });

    return json({
      success: true,
      data: {
        transactions,
        summary: summarize(transactions),
        privacy: {
          customerEmailMasked: true,
          providerReferenceMasked: true,
          cardDataStored: false,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Transações][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar a governança financeira.",
      },
      500,
    );
  }
}

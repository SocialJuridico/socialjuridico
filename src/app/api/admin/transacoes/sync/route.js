import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROVIDER_RECORDS = 1000;
const PAGE_SIZE = 100;
const VALID_TYPES = new Set([
  "JURIS_PURCHASE",
  "PRO_SUBSCRIPTION",
  "ADDON_PURCHASE",
]);

let syncRunning = false;

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function maskReference(value) {
  const reference = String(value || "");
  if (reference.length <= 12) return `${reference.slice(0, 4)}••••`;
  return `${reference.slice(0, 7)}••••${reference.slice(-4)}`;
}

function normalizeType(value) {
  const type = String(value || "JURIS_PURCHASE").toUpperCase();
  return VALID_TYPES.has(type) ? type : "JURIS_PURCHASE";
}

function normalizeJurisAmount(metadata, type) {
  if (type === "PRO_SUBSCRIPTION") {
    return String(metadata?.planType || "PRO").toUpperCase() === "START"
      ? 7
      : 20;
  }

  const explicit = Number(metadata?.jurisAmount || metadata?.juris_amount || 0);
  return Number.isFinite(explicit) && explicit > 0 ? Math.trunc(explicit) : 0;
}

function normalizeCurrency(value) {
  return String(value || "BRL").toUpperCase();
}

function normalizeAmount(cents) {
  const amount = Number(cents || 0) / 100;
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

async function listCheckoutSessions() {
  const records = [];
  let startingAfter;

  while (records.length < MAX_PROVIDER_RECORDS) {
    const page = await stripe.checkout.sessions.list({
      limit: PAGE_SIZE,
      status: "complete",
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    records.push(...page.data);

    if (!page.has_more || !page.data.length) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return records.slice(0, MAX_PROVIDER_RECORDS);
}

async function listPaymentIntents() {
  const records = [];
  let startingAfter;

  while (records.length < MAX_PROVIDER_RECORDS) {
    const page = await stripe.paymentIntents.list({
      limit: PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    records.push(...page.data.filter((item) => item.status === "succeeded"));

    if (!page.has_more || !page.data.length) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return records.slice(0, MAX_PROVIDER_RECORDS);
}

function sessionToCandidate(session) {
  const type = normalizeType(session.metadata?.type);
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  const paid = paymentStatus === "paid";

  return {
    reference: session.id,
    linkedPaymentIntent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null,
    userId: session.metadata?.userId || null,
    email:
      session.customer_email ||
      session.customer_details?.email ||
      null,
    type,
    amount: normalizeAmount(session.amount_total),
    currency: normalizeCurrency(session.currency),
    status: paid ? "succeeded" : "pending_manual_review",
    jurisAmount: normalizeJurisAmount(session.metadata, type),
    couponId:
      session.metadata?.cupomId && session.metadata.cupomId !== "null"
        ? session.metadata.cupomId
        : null,
    createdAt: new Date(Number(session.created || 0) * 1000).toISOString(),
    source: "STRIPE_CHECKOUT",
    reviewReason: paid ? null : "checkout_not_paid",
  };
}

function intentToCandidate(intent) {
  const type = normalizeType(intent.metadata?.type);

  return {
    reference: intent.id,
    linkedPaymentIntent: null,
    userId: intent.metadata?.userId || null,
    email: intent.receipt_email || null,
    type,
    amount: normalizeAmount(intent.amount_received || intent.amount),
    currency: normalizeCurrency(intent.currency),
    status: "succeeded",
    jurisAmount: normalizeJurisAmount(intent.metadata, type),
    couponId:
      intent.metadata?.cupomId && intent.metadata.cupomId !== "null"
        ? intent.metadata.cupomId
        : null,
    createdAt: new Date(Number(intent.created || 0) * 1000).toISOString(),
    source: "STRIPE_PAYMENT_INTENT",
    reviewReason: null,
  };
}

async function resolveUserId(candidate, emailCache) {
  if (isValidUuid(candidate.userId)) return candidate.userId;

  const email = String(candidate.email || "").trim().toLowerCase();
  if (!email) return null;

  if (emailCache.has(email)) return emailCache.get(email);

  const { data, error } = await supabaseAdmin
    .from("advogados")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao conciliar o comprador pelo e-mail.");
  }

  const userId = data?.id || null;
  emailCache.set(email, userId);
  return userId;
}

function compareExisting(existing, candidate, userId) {
  const differences = [];

  if (existing.advogado_id && existing.advogado_id !== userId) {
    differences.push("buyer_mismatch");
  }
  if (String(existing.tipo || "") !== candidate.type) {
    differences.push("product_mismatch");
  }
  if (Math.abs(Number(existing.valor || 0) - candidate.amount) > 0.01) {
    differences.push("amount_mismatch");
  }
  if (
    Number(existing.juris_amount || 0) !== candidate.jurisAmount &&
    candidate.jurisAmount > 0
  ) {
    differences.push("benefit_mismatch");
  }

  return differences;
}

async function recordSyncAudit(adminId, metadata) {
  const { error } = await supabaseAdmin
    .from("admin_transaction_audit_logs")
    .insert([
      {
        id: crypto.randomUUID(),
        admin_id: adminId,
        action: "STRIPE_RECONCILIATION_COMPLETED",
        purpose: "FINANCIAL_RECONCILIATION",
        metadata,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    const message = String(error.message || "").toLowerCase();
    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      message.includes("admin_transaction_audit_logs");

    if (!missingTable) {
      console.error("[Admin/Transações/Sync] Falha na auditoria:", error);
    }
  }
}

export async function POST(request) {
  const startedAt = Date.now();

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) {
      return json(
        {
          success: false,
          message: "A conciliação financeira não está configurada.",
        },
        503,
      );
    }

    if (syncRunning) {
      return json(
        {
          success: false,
          message: "Já existe uma conciliação em andamento neste servidor.",
        },
        409,
      );
    }

    syncRunning = true;

    const [sessions, intents, existingResult] = await Promise.all([
      listCheckoutSessions(),
      listPaymentIntents(),
      supabaseAdmin
        .from("transacoes")
        .select(
          "stripe_session_id, advogado_id, tipo, valor, status, juris_amount",
        )
        .not("stripe_session_id", "is", null)
        .limit(10000),
    ]);

    if (existingResult.error) {
      throw new Error("Falha ao consultar o razão financeiro local.");
    }

    const existingMap = new Map(
      (existingResult.data || []).map((item) => [
        item.stripe_session_id,
        item,
      ]),
    );
    const linkedIntentIds = new Set(
      sessions
        .map((session) =>
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        )
        .filter(Boolean),
    );

    const candidates = [
      ...sessions.map(sessionToCandidate),
      ...intents
        .filter((intent) => !linkedIntentIds.has(intent.id))
        .map(intentToCandidate),
    ];

    const emailCache = new Map();
    const result = {
      scanned: candidates.length,
      imported: 0,
      skipped: 0,
      review: 0,
      mismatches: 0,
      unresolvedBuyers: 0,
      warnings: [],
    };

    for (const candidate of candidates) {
      try {
        const userId = await resolveUserId(candidate, emailCache);

        if (!userId) {
          result.unresolvedBuyers += 1;
          result.review += 1;
          if (result.warnings.length < 10) {
            result.warnings.push({
              reference: maskReference(candidate.reference),
              code: "BUYER_NOT_FOUND",
            });
          }
          continue;
        }

        const existing = existingMap.get(candidate.reference);

        if (existing) {
          const differences = compareExisting(existing, candidate, userId);
          result.skipped += 1;

          if (differences.length) {
            result.mismatches += 1;
            result.review += 1;
            if (result.warnings.length < 10) {
              result.warnings.push({
                reference: maskReference(candidate.reference),
                code: "LOCAL_PROVIDER_MISMATCH",
                differences,
              });
            }
          }
          continue;
        }

        let status = candidate.status;
        let reviewReason = candidate.reviewReason;

        if (
          candidate.type === "JURIS_PURCHASE" &&
          candidate.jurisAmount <= 0
        ) {
          status = "pending_manual_review";
          reviewReason = "juris_amount_not_proven";
        }

        const { error: insertError } = await supabaseAdmin
          .from("transacoes")
          .insert([
            {
              advogado_id: userId,
              tipo: candidate.type,
              valor: candidate.amount,
              moeda: candidate.currency,
              status,
              juris_amount: candidate.jurisAmount,
              stripe_session_id: candidate.reference,
              cupom_id: candidate.couponId,
              created_at: candidate.createdAt,
            },
          ]);

        if (insertError) {
          if (insertError.code === "23505") {
            result.skipped += 1;
            continue;
          }
          throw new Error("Falha ao importar lançamento financeiro.");
        }

        existingMap.set(candidate.reference, {
          stripe_session_id: candidate.reference,
          advogado_id: userId,
          tipo: candidate.type,
          valor: candidate.amount,
          status,
          juris_amount: candidate.jurisAmount,
        });
        result.imported += 1;

        if (status !== "succeeded") {
          result.review += 1;
          if (result.warnings.length < 10) {
            result.warnings.push({
              reference: maskReference(candidate.reference),
              code: reviewReason || "MANUAL_REVIEW_REQUIRED",
            });
          }
        }
      } catch (itemError) {
        result.review += 1;
        if (result.warnings.length < 10) {
          result.warnings.push({
            reference: maskReference(candidate.reference),
            code: "RECONCILIATION_ITEM_ERROR",
          });
        }
        console.error(
          "[Admin/Transações/Sync] Falha em item conciliado:",
          itemError,
        );
      }
    }

    const durationMs = Date.now() - startedAt;

    await recordSyncAudit(auth.user.id, {
      ...result,
      warnings: result.warnings,
      durationMs,
    });

    return json({
      success: true,
      message: "Conciliação concluída sem alterar saldos ou planos.",
      data: {
        ...result,
        durationMs,
      },
    });
  } catch (error) {
    console.error("[Admin/Transações/Sync][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível concluir a conciliação com o Stripe.",
      },
      500,
    );
  } finally {
    syncRunning = false;
  }
}

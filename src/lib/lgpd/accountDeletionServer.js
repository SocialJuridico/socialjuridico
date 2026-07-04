import crypto from "node:crypto";

import { resend } from "@/lib/resend";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";
const ACTIVE_CASE_STATUSES = ["ABERTO", "EM_ANDAMENTO"];
const PENDING_TRANSACTION_STATUSES = ["PENDENTE", "PROCESSANDO"];

export const DELETION_STATUS = Object.freeze({
  PENDING: "PENDENTE",
  REVIEW: "EM_ANALISE",
  WAITING_USER: "AGUARDANDO_USUARIO",
  APPROVED: "APROVADA",
  REJECTED: "REJEITADA",
  CANCELLED: "CANCELADA",
  PROCESSING: "PROCESSANDO",
  COMPLETED: "CONCLUIDA",
  FAILED: "FALHA",
});

export const DELETION_PROFILE_TYPES = Object.freeze({
  LAWYER: "LAWYER",
  CLIENT: "CLIENT",
  UNKNOWN: "UNKNOWN",
});

export const DETAIL_PURPOSES = new Set([
  "ANALISE_LGPD",
  "VALIDACAO_IDENTIDADE",
  "CONTATO_TITULAR",
  "PROCESSAMENTO_EXCLUSAO",
]);

const OPTIONAL_DELETE_ERROR_CODES = new Set([
  "42P01",
  "42703",
  "PGRST204",
  "PGRST205",
]);

function normalizeText(value, maxLength = 1000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function normalizePersonName(value) {
  return normalizeText(value, 160);
}

export function normalizeDeletionReason(value) {
  return normalizeText(value, 1200);
}

export function normalizeDecisionReason(value) {
  return normalizeText(value, 1000);
}

export function maskEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (!local || !domain) return "E-mail indisponível";

  const localVisible = local.slice(0, Math.min(2, local.length));
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";
  const domainVisible = domainName.slice(0, 1);

  return `${localVisible}${"*".repeat(Math.max(2, local.length - localVisible.length))}@${domainVisible}${"*".repeat(Math.max(2, domainName.length - 1))}${suffix}`;
}

export function hashSensitiveValue(value, namespace = "lgpd") {
  const pepper = process.env.LGPD_HASH_PEPPER || "social-juridico-lgpd";
  return crypto
    .createHash("sha256")
    .update(`${namespace}:${pepper}:${String(value || "")}`)
    .digest("hex");
}

export function hashRequestIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return hashSensitiveValue(ip, "admin-ip");
}

function isMissingAuthUser(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const status = Number(error?.status || error?.statusCode || 0);

  return (
    status === 404 ||
    code === "user_not_found" ||
    code === "not_found" ||
    message.includes("user not found") ||
    message.includes("usuário não encontrado")
  );
}

function isMissingStripeResource(error) {
  return (
    error?.code === "resource_missing" ||
    String(error?.message || "").toLowerCase().includes("no such subscription")
  );
}

async function maybeSingleProfile(db, table, userId, select) {
  const { data, error } = await db
    .from(table)
    .select(select)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar ${table}: ${error.message}`);
  }

  return data || null;
}

export async function resolveDeletionSubject(db, userId, preferredType = null) {
  if (!isValidUuid(userId)) {
    return {
      userId,
      profileType: DELETION_PROFILE_TYPES.UNKNOWN,
      profile: null,
      authUser: null,
    };
  }

  let profile = null;
  let profileType = preferredType;

  if (
    !profileType ||
    profileType === DELETION_PROFILE_TYPES.LAWYER ||
    profileType === DELETION_PROFILE_TYPES.UNKNOWN
  ) {
    profile = await maybeSingleProfile(
      db,
      "advogados",
      userId,
      "id, name, email, stripe_customer_id, stripe_subscription_id, subscription_status, plan_type, created_at",
    );
    if (profile) profileType = DELETION_PROFILE_TYPES.LAWYER;
  }

  if (
    !profile &&
    (!profileType ||
      profileType === DELETION_PROFILE_TYPES.CLIENT ||
      profileType === DELETION_PROFILE_TYPES.UNKNOWN)
  ) {
    profile = await maybeSingleProfile(
      db,
      "clientes",
      userId,
      "id, name, email, created_at",
    );
    if (profile) profileType = DELETION_PROFILE_TYPES.CLIENT;
  }

  let authUser = null;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error && !isMissingAuthUser(error)) {
      throw error;
    }
    authUser = data?.user || null;
  } catch (error) {
    if (!isMissingAuthUser(error)) {
      throw new Error(`Falha ao consultar usuário no Auth: ${error.message}`);
    }
  }

  return {
    userId,
    profileType: profileType || DELETION_PROFILE_TYPES.UNKNOWN,
    profile,
    authUser,
  };
}

async function countRows(query, label) {
  const { count, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return Number(count || 0);
}

async function countOptionalRows(query, label) {
  const { count, error } = await query;
  if (error) {
    if (OPTIONAL_DELETE_ERROR_CODES.has(error.code)) return 0;
    throw new Error(`${label}: ${error.message}`);
  }
  return Number(count || 0);
}

export async function buildDeletionPreflight(db, requestRow) {
  const subjectId = requestRow.subject_user_ref || requestRow.user_id;
  const subject = await resolveDeletionSubject(
    db,
    subjectId,
    requestRow.profile_type,
  );

  let totalCases = 0;
  let activeCases = 0;
  let pendingTransactions = 0;
  let ownedDocuments = 0;

  if (subject.profileType === DELETION_PROFILE_TYPES.LAWYER) {
    [totalCases, activeCases, pendingTransactions, ownedDocuments] = await Promise.all([
      countRows(
        db
          .from("casos")
          .select("id", { count: "exact", head: true })
          .eq("advogado_id", subjectId),
        "Falha ao contar casos vinculados",
      ),
      countRows(
        db
          .from("casos")
          .select("id", { count: "exact", head: true })
          .eq("advogado_id", subjectId)
          .in("status", ACTIVE_CASE_STATUSES),
        "Falha ao contar casos ativos",
      ),
      countOptionalRows(
        db
          .from("transacoes")
          .select("id", { count: "exact", head: true })
          .eq("advogado_id", subjectId)
          .in("status", PENDING_TRANSACTION_STATUSES),
        "Falha ao contar transações pendentes",
      ),
      countOptionalRows(
        db
          .from("smart_docs")
          .select("id", { count: "exact", head: true })
          .eq("lawyer_id", subjectId),
        "Falha ao contar documentos",
      ),
    ]);
  } else if (subject.profileType === DELETION_PROFILE_TYPES.CLIENT) {
    [totalCases, activeCases] = await Promise.all([
      countRows(
        db
          .from("casos")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", subjectId),
        "Falha ao contar casos do cliente",
      ),
      countRows(
        db
          .from("casos")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", subjectId)
          .in("status", ACTIVE_CASE_STATUSES),
        "Falha ao contar casos ativos do cliente",
      ),
    ]);
  }

  const subscriptionStatus = String(
    subject.profile?.subscription_status || "",
  ).toLowerCase();
  const hasActiveSubscription =
    Boolean(subject.profile?.stripe_subscription_id) &&
    !["canceled", "cancelled", "inactive", "expired"].includes(subscriptionStatus);

  const blockers = [];
  const warnings = [];

  if (activeCases > 0) {
    blockers.push({
      code: "ACTIVE_CASES",
      message: `${activeCases} caso(s) ativo(s) precisam ser resolvidos antes da exclusão.`,
    });
  }

  if (pendingTransactions > 0) {
    blockers.push({
      code: "PENDING_TRANSACTIONS",
      message: `${pendingTransactions} transação(ões) pendente(s) precisam ser conciliadas.`,
    });
  }

  if (hasActiveSubscription) {
    warnings.push({
      code: "ACTIVE_SUBSCRIPTION",
      message: "A assinatura ativa será cancelada antes da remoção da conta.",
    });
  }

  if (!subject.profile && !subject.authUser) {
    warnings.push({
      code: "ACCOUNT_ALREADY_ABSENT",
      message: "Perfil e usuário Auth já não foram encontrados; o pedido pode ser concluído como limpeza residual.",
    });
  } else if (!subject.profile || !subject.authUser) {
    warnings.push({
      code: "PARTIAL_ACCOUNT",
      message: "A conta está parcialmente removida e exige processamento idempotente.",
    });
  }

  return {
    subject: {
      profileType: subject.profileType,
      profileExists: Boolean(subject.profile),
      authExists: Boolean(subject.authUser),
      name:
        subject.profile?.name ||
        subject.authUser?.user_metadata?.full_name ||
        requestRow.nome ||
        "Titular não identificado",
      email: subject.profile?.email || subject.authUser?.email || null,
      accountCreatedAt:
        subject.profile?.created_at || subject.authUser?.created_at || null,
      planType: subject.profile?.plan_type || null,
      subscriptionStatus: subject.profile?.subscription_status || null,
      hasActiveSubscription,
    },
    counts: {
      totalCases,
      activeCases,
      pendingTransactions,
      ownedDocuments,
    },
    blockers,
    warnings,
    canProcess: blockers.length === 0,
  };
}

export async function registerDeletionAudit(
  db,
  {
    requestId,
    adminId = null,
    action,
    purpose = null,
    justification = null,
    previousStatus = null,
    nextStatus = null,
    fieldsAccessed = [],
    snapshot = {},
    changes = {},
    ipHash = null,
  },
) {
  const { error } = await db.from("admin_account_deletion_audit_logs").insert([
    {
      request_id: requestId,
      admin_id: adminId,
      action,
      purpose,
      justification,
      previous_status: previousStatus,
      next_status: nextStatus,
      fields_accessed: fieldsAccessed,
      snapshot,
      changes,
      ip_hash: ipHash,
    },
  ]);

  if (error) {
    const auditError = new Error(`Falha ao registrar auditoria: ${error.message}`);
    auditError.status = ["42P01", "PGRST205"].includes(error.code) ? 503 : 500;
    throw auditError;
  }
}

async function executeDelete(db, table, configureQuery, label, { optional = false } = {}) {
  const { error } = await configureQuery(db.from(table).delete());
  if (!error) return;

  if (optional && OPTIONAL_DELETE_ERROR_CODES.has(error.code)) return;
  throw new Error(`${label}: ${error.message}`);
}

async function executeUpdate(db, table, values, configureQuery, label) {
  const { error } = await configureQuery(db.from(table).update(values));
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function cancelSubscriptionIfNeeded(subject) {
  const subscriptionId = subject.profile?.stripe_subscription_id;
  if (!subscriptionId) return { cancelled: false, alreadyMissing: false };

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return { cancelled: true, alreadyMissing: false };
  } catch (error) {
    if (isMissingStripeResource(error)) {
      return { cancelled: false, alreadyMissing: true };
    }
    throw new Error(`Falha ao cancelar assinatura: ${error.message}`);
  }
}

async function deleteLawyerData(db, userId) {
  await executeDelete(
    db,
    "mensagens",
    (query) => query.eq("sender_id", userId),
    "Falha ao excluir mensagens enviadas",
  );
  await executeDelete(
    db,
    "case_interests",
    (query) => query.eq("lawyer_id", userId),
    "Falha ao excluir interesses em casos",
  );
  await executeDelete(
    db,
    "notificacoes",
    (query) => query.eq("user_id", userId),
    "Falha ao excluir notificações",
  );

  await executeDelete(
    db,
    "agenda_items",
    (query) => query.eq("lawyer_id", userId),
    "Falha ao excluir itens da agenda",
    { optional: true },
  );
  await executeDelete(
    db,
    "saved_calculations",
    (query) => query.eq("lawyer_id", userId),
    "Falha ao excluir cálculos salvos",
    { optional: true },
  );
  await executeDelete(
    db,
    "smart_docs",
    (query) => query.eq("lawyer_id", userId),
    "Falha ao excluir documentos inteligentes",
    { optional: true },
  );
  await executeDelete(
    db,
    "tracking_search",
    (query) => query.eq("advogado_id", userId),
    "Falha ao excluir pesquisas de rastreamento",
    { optional: true },
  );

  // Tabelas que referenciam o advogado com ON DELETE RESTRICT precisam ser
  // purgadas antes de excluir o perfil, senão a FK bloqueia a exclusão.
  await executeDelete(
    db,
    "lawyer_opportunity_audit_logs",
    (query) => query.eq("lawyer_id", userId),
    "Falha ao excluir auditoria de oportunidades do advogado",
    { optional: true },
  );
  await executeDelete(
    db,
    "chat_video_sessions",
    (query) => query.eq("lawyer_id", userId),
    "Falha ao excluir sessões de vídeo do advogado",
    { optional: true },
  );

  await executeUpdate(
    db,
    "casos",
    { advogado_id: null, updated_at: new Date().toISOString() },
    (query) => query.eq("advogado_id", userId),
    "Falha ao desvincular casos históricos",
  );
}

async function deleteClientData(db, userId) {
  const { data: cases, error } = await db
    .from("casos")
    .select("id")
    .eq("cliente_id", userId);
  if (error) throw new Error(`Falha ao localizar casos do cliente: ${error.message}`);

  const caseIds = (cases || []).map((item) => item.id);
  if (caseIds.length) {
    await executeDelete(
      db,
      "mensagens",
      (query) => query.in("caso_id", caseIds),
      "Falha ao excluir mensagens dos casos",
    );
    await executeDelete(
      db,
      "case_interests",
      (query) => query.in("case_id", caseIds),
      "Falha ao excluir interesses dos casos",
    );

    // Tabelas que referenciam casos com ON DELETE RESTRICT precisam ser
    // purgadas antes de excluir os casos, senão a FK bloqueia a exclusão.
    await executeDelete(
      db,
      "lawyer_opportunity_audit_logs",
      (query) => query.in("case_id", caseIds),
      "Falha ao excluir auditoria de oportunidades dos casos",
      { optional: true },
    );
    await executeDelete(
      db,
      "chat_audit_logs",
      (query) => query.in("case_id", caseIds),
      "Falha ao excluir auditoria de chat dos casos",
      { optional: true },
    );
    await executeDelete(
      db,
      "chat_attachments",
      (query) => query.in("case_id", caseIds),
      "Falha ao excluir anexos de chat dos casos",
      { optional: true },
    );
    await executeDelete(
      db,
      "chat_video_sessions",
      (query) => query.in("case_id", caseIds),
      "Falha ao excluir sessões de vídeo dos casos",
      { optional: true },
    );

    await executeDelete(
      db,
      "casos",
      (query) => query.in("id", caseIds),
      "Falha ao excluir casos do cliente",
    );
  }

  // Sessões de vídeo referenciam o cliente (client_id RESTRICT); remove o que
  // ainda estiver vinculado ao titular antes de excluir o perfil.
  await executeDelete(
    db,
    "chat_video_sessions",
    (query) => query.eq("client_id", userId),
    "Falha ao excluir sessões de vídeo do cliente",
    { optional: true },
  );

  await executeDelete(
    db,
    "mensagens",
    (query) => query.eq("sender_id", userId),
    "Falha ao excluir mensagens enviadas",
  );
  await executeDelete(
    db,
    "notificacoes",
    (query) => query.eq("user_id", userId),
    "Falha ao excluir notificações",
  );
}

// O advogado pode ter lançamentos no ledger financeiro imutável (transacoes),
// que não podem ser apagados nem ter o advogado_id alterado (triggers legais).
// Nesses casos, o perfil é ANONIMIZADO em vez de excluído: a PII é removida e o
// vínculo fiscal é preservado, atendendo à LGPD e à retenção legal.
async function lawyerHasImmutableLedger(db, userId) {
  const { data, error } = await db
    .from("transacoes")
    .select("id")
    .eq("advogado_id", userId)
    .limit(1);

  if (error) {
    if (OPTIONAL_DELETE_ERROR_CODES.has(error.code)) return false;
    throw new Error(`Falha ao verificar o ledger financeiro: ${error.message}`);
  }
  return (data || []).length > 0;
}

async function anonymizeLawyerProfile(db, userId) {
  const token = hashSensitiveValue(userId, "anon").slice(0, 16);
  const anonymized = {
    name: "Conta removida",
    email: `anonimizado+${token}@removido.invalid`,
    avatar: null,
    phone: null,
    bio: null,
    oab: null,
    specialties: null,
    google_id: null,
    facebook_id: null,
    google_refresh_token: null,
    google_sync_enabled: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    verified: false,
    // Marca como inativo para não aparecer em listagens nem receber oportunidades.
    oab_verification_status: "ERROR",
  };

  await executeUpdate(
    db,
    "advogados",
    anonymized,
    (query) => query.eq("id", userId),
    "Falha ao anonimizar perfil do advogado",
  );
}

export async function executeAccountDeletion(db, requestRow) {
  const userId = requestRow.subject_user_ref || requestRow.user_id;
  if (!isValidUuid(userId)) {
    throw new Error("A solicitação não possui referência válida do titular.");
  }

  const subject = await resolveDeletionSubject(db, userId, requestRow.profile_type);
  const subscription = await cancelSubscriptionIfNeeded(subject);

  if (subject.profileType === DELETION_PROFILE_TYPES.LAWYER) {
    await deleteLawyerData(db, userId);
  } else if (subject.profileType === DELETION_PROFILE_TYPES.CLIENT) {
    await deleteClientData(db, userId);
  }

  let authAlreadyMissing = false;
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    if (isMissingAuthUser(authDeleteError)) {
      authAlreadyMissing = true;
    } else {
      throw new Error(`Falha ao excluir usuário do Auth: ${authDeleteError.message}`);
    }
  }

  let profileAnonymized = false;
  if (subject.profileType === DELETION_PROFILE_TYPES.LAWYER) {
    if (await lawyerHasImmutableLedger(db, userId)) {
      // Ledger financeiro imutável presente: anonimiza em vez de excluir.
      await anonymizeLawyerProfile(db, userId);
      profileAnonymized = true;
    } else {
      await executeDelete(
        db,
        "advogados",
        (query) => query.eq("id", userId),
        "Falha ao excluir perfil do advogado",
      );
    }
  } else if (subject.profileType === DELETION_PROFILE_TYPES.CLIENT) {
    await executeDelete(
      db,
      "clientes",
      (query) => query.eq("id", userId),
      "Falha ao excluir perfil do cliente",
    );
  }

  return {
    subject,
    subscription,
    authAlreadyMissing,
    profileAnonymized,
    retentionNote: profileAnonymized
      ? "Perfil anonimizado: dados pessoais removidos e registros financeiros/fiscais preservados de forma restrita pelo prazo legal aplicável, sem acesso ativo à conta."
      : "Registros financeiros, fiscais, antifraude e auditorias administrativas podem ser preservados de forma restrita pelo prazo legal aplicável, sem acesso ativo à conta.",
  };
}

export async function sendDeletionCompletionEmail({ email, name }) {
  if (!email) return { sent: false, skipped: true };

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: "Exclusão da conta concluída — Social Jurídico",
    html: `
      <!doctype html>
      <html lang="pt-BR">
        <body style="margin:0;padding:24px;background:#111;color:#fff;font-family:Arial,sans-serif;">
          <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:#0d0f12;overflow:hidden;">
            <div style="padding:34px 36px;">
              <p style="margin:0 0 10px;color:#d4af37;font-size:12px;font-weight:700;letter-spacing:.08em;text-align:center;text-transform:uppercase;">Social Jurídico</p>
              <h1 style="margin:0;color:#fff;font-size:25px;line-height:1.25;text-align:center;">Exclusão concluída</h1>
              <p style="margin:25px 0 0;color:#d7d7d7;font-size:16px;line-height:1.65;">Olá${name ? `, ${name}` : ""}. Sua conta foi removida da plataforma e o acesso foi encerrado.</p>
              <p style="margin:14px 0 0;color:#d7d7d7;font-size:16px;line-height:1.65;">Alguns registros podem ser mantidos de forma restrita quando houver obrigação legal, fiscal, antifraude ou necessidade de defesa de direitos.</p>
              <p style="margin:26px 0 0;color:#737373;font-size:12px;line-height:1.5;text-align:center;">Esta é uma comunicação de confirmação do atendimento ao seu pedido.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) throw new Error(error.message || "Falha ao enviar confirmação por e-mail.");
  return { sent: true, skipped: false };
}

import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  DELETION_STATUS,
  hashRequestIp,
  normalizeDecisionReason,
  registerDeletionAudit,
} from "@/lib/lgpd/accountDeletionServer";

export const REQUEST_SELECT =
  "id, user_id, subject_user_ref, profile_type, subject_email_masked, subject_email_hash, nome, motivo, status, created_at, due_at, updated_at, version, handled_by, handled_at, decision_reason, legal_basis, retention_note, processing_started_at, completed_at, last_error_code, metadata";

export const ALLOWED_LEGAL_BASES = new Set([
  "LGPD_ART_18",
  "VALIDACAO_IDENTIDADE",
  "OBRIGACAO_LEGAL_RETENCAO",
  "EXERCICIO_REGULAR_DIREITOS",
  "SOLICITACAO_INCOMPLETA",
]);

const TRANSITIONS = {
  START_REVIEW: {
    from: new Set([
      DELETION_STATUS.PENDING,
      DELETION_STATUS.WAITING_USER,
      DELETION_STATUS.FAILED,
    ]),
    to: DELETION_STATUS.REVIEW,
    audit: "START_REVIEW",
    requiresReason: false,
  },
  REQUEST_INFORMATION: {
    from: new Set([
      DELETION_STATUS.PENDING,
      DELETION_STATUS.REVIEW,
      DELETION_STATUS.APPROVED,
    ]),
    to: DELETION_STATUS.WAITING_USER,
    audit: "REQUEST_INFORMATION",
    requiresReason: true,
  },
  APPROVE: {
    from: new Set([
      DELETION_STATUS.PENDING,
      DELETION_STATUS.REVIEW,
      DELETION_STATUS.WAITING_USER,
      DELETION_STATUS.FAILED,
    ]),
    to: DELETION_STATUS.APPROVED,
    audit: "APPROVE",
    requiresReason: true,
  },
  REJECT: {
    from: new Set([
      DELETION_STATUS.PENDING,
      DELETION_STATUS.REVIEW,
      DELETION_STATUS.WAITING_USER,
      DELETION_STATUS.APPROVED,
    ]),
    to: DELETION_STATUS.REJECTED,
    audit: "REJECT",
    requiresReason: true,
  },
  REOPEN: {
    from: new Set([
      DELETION_STATUS.REJECTED,
      DELETION_STATUS.FAILED,
      DELETION_STATUS.WAITING_USER,
    ]),
    to: DELETION_STATUS.REVIEW,
    audit: "REOPEN",
    requiresReason: true,
  },
};

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validateMutationOrigin(request) {
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

export async function requireDeletionAdmin() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

export async function loadDeletionRequest(db, requestId) {
  const { data, error } = await db
    .from("solicitacoes_exclusao")
    .select(REQUEST_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    const migrationMissing = ["42703", "PGRST204"].includes(error.code);
    const requestError = new Error(
      migrationMissing
        ? "Execute a migração de governança das exclusões."
        : `Falha ao consultar solicitação: ${error.message}`,
    );
    requestError.status = migrationMissing ? 503 : 500;
    throw requestError;
  }

  if (!data) {
    const notFound = new Error("Solicitação não encontrada.");
    notFound.status = 404;
    throw notFound;
  }

  return data;
}

export function serializeDeletionRequest(item) {
  const now = Date.now();
  const dueAt = item.due_at ? new Date(item.due_at).getTime() : null;
  const completed = [
    DELETION_STATUS.COMPLETED,
    DELETION_STATUS.REJECTED,
    DELETION_STATUS.CANCELLED,
  ].includes(item.status);

  return {
    id: item.id,
    display_name:
      item.status === DELETION_STATUS.COMPLETED
        ? "Titular excluído"
        : item.nome || "Titular não identificado",
    email_masked: item.subject_email_masked || "E-mail não disponível",
    profile_type: item.profile_type || "UNKNOWN",
    reason_preview:
      item.status === DELETION_STATUS.COMPLETED
        ? "Conteúdo minimizado após a conclusão."
        : String(item.motivo || "").slice(0, 160),
    status: item.status,
    created_at: item.created_at,
    due_at: item.due_at,
    updated_at: item.updated_at,
    version: Number(item.version || 1),
    handled_at: item.handled_at,
    decision_reason: item.decision_reason,
    legal_basis: item.legal_basis,
    retention_note: item.retention_note,
    completed_at: item.completed_at,
    last_error_code: item.last_error_code,
    overdue: Boolean(!completed && dueAt && dueAt < now),
  };
}

export function resolveTransition(action, currentStatus) {
  const transition = TRANSITIONS[action];
  if (!transition) {
    const error = new Error("Ação administrativa inválida.");
    error.status = 400;
    throw error;
  }

  if (!transition.from.has(currentStatus)) {
    const error = new Error(
      "Esta ação não é permitida para o status atual da solicitação.",
    );
    error.status = 409;
    throw error;
  }

  return transition;
}

export async function updateRequestStatus(
  db,
  {
    request,
    admin,
    action,
    reason,
    legalBasis,
    expectedUpdatedAt,
    expectedVersion,
    httpRequest,
  },
) {
  const transition = resolveTransition(action, request.status);
  const normalizedReason = normalizeDecisionReason(reason);

  if (transition.requiresReason && normalizedReason.length < 10) {
    const error = new Error(
      "Informe uma justificativa com pelo menos 10 caracteres.",
    );
    error.status = 400;
    throw error;
  }

  if (
    ["APPROVE", "REJECT"].includes(action) &&
    !ALLOWED_LEGAL_BASES.has(legalBasis)
  ) {
    const error = new Error("Selecione o fundamento da decisão.");
    error.status = 400;
    throw error;
  }

  const updates = {
    status: transition.to,
    handled_by: admin.id,
    handled_at: new Date().toISOString(),
    decision_reason: normalizedReason || null,
    legal_basis: legalBasis || request.legal_basis || null,
    last_error_code: action === "REOPEN" ? null : request.last_error_code,
  };

  let query = db
    .from("solicitacoes_exclusao")
    .update(updates)
    .eq("id", request.id)
    .eq("status", request.status);

  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  if (expectedVersion) query = query.eq("version", expectedVersion);

  const { data, error } = await query.select(REQUEST_SELECT).maybeSingle();
  if (error) throw new Error(`Falha ao atualizar solicitação: ${error.message}`);

  if (!data) {
    const conflict = new Error(
      "A solicitação foi alterada por outro administrador. Atualize a página.",
    );
    conflict.status = 409;
    throw conflict;
  }

  try {
    await registerDeletionAudit(db, {
      requestId: request.id,
      adminId: admin.id,
      action: transition.audit,
      justification: normalizedReason || "Análise administrativa iniciada.",
      previousStatus: request.status,
      nextStatus: transition.to,
      snapshot: {
        profile_type: request.profile_type,
        email_hash: request.subject_email_hash,
      },
      changes: updates,
      ipHash: hashRequestIp(httpRequest),
    });
  } catch (auditError) {
    await db
      .from("solicitacoes_exclusao")
      .update({
        status: request.status,
        handled_by: request.handled_by,
        handled_at: request.handled_at,
        decision_reason: request.decision_reason,
        legal_basis: request.legal_basis,
        last_error_code: request.last_error_code,
        updated_at: request.updated_at,
        version: request.version,
      })
      .eq("id", request.id)
      .eq("updated_at", data.updated_at);
    throw auditError;
  }

  return data;
}

export async function loadDeletionAudit(db, { requestId = null, limit = 30 } = {}) {
  let query = db
    .from("admin_account_deletion_audit_logs")
    .select(
      "id, request_id, admin_id, action, purpose, justification, previous_status, next_status, fields_accessed, changes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (requestId) query = query.eq("request_id", requestId);

  const { data, error } = await query;
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { available: false, items: [] };
    }
    throw new Error(`Falha ao consultar auditoria: ${error.message}`);
  }

  return { available: true, items: data || [] };
}

export function safeErrorResponse(error, fallbackMessage) {
  console.error("[Admin/LGPD] Erro:", {
    code: error?.code || null,
    message: error?.message || "unknown",
  });

  const status = Number(error?.status) || 500;
  const publicMessage = [400, 401, 403, 404, 409, 422, 503].includes(status)
    ? error.message
    : fallbackMessage;

  return json({ success: false, message: publicMessage }, status);
}

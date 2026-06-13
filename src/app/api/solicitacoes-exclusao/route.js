import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import {
  DELETION_STATUS,
  hashRequestIp,
  hashSensitiveValue,
  maskEmail,
  normalizeDeletionReason,
  normalizePersonName,
  registerDeletionAudit,
  resolveDeletionSubject,
} from "@/lib/lgpd/accountDeletionServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      return json({ success: false, message: "Origem não autorizada." }, 403);
    }
  } catch {
    return json({ success: false, message: "Origem inválida." }, 403);
  }

  return null;
}

function comparableName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export async function POST(request) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço de privacidade indisponível." },
        503,
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const body = await request.json().catch(() => null);
    const confirmedName = normalizePersonName(body?.nome);
    const reason = normalizeDeletionReason(body?.motivo);

    if (confirmedName.length < 3 || reason.length < 20) {
      return json(
        {
          success: false,
          message:
            "Confirme seu nome e descreva o motivo com pelo menos 20 caracteres.",
        },
        400,
      );
    }

    const subject = await resolveDeletionSubject(supabaseAdmin, user.id);
    const registeredName =
      subject.profile?.name || user.user_metadata?.full_name || "";

    if (
      registeredName &&
      comparableName(registeredName) !== comparableName(confirmedName)
    ) {
      return json(
        {
          success: false,
          message:
            "O nome informado não corresponde ao nome cadastrado na conta.",
        },
        422,
      );
    }

    const activeStatuses = [
      DELETION_STATUS.PENDING,
      DELETION_STATUS.REVIEW,
      DELETION_STATUS.WAITING_USER,
      DELETION_STATUS.APPROVED,
      DELETION_STATUS.PROCESSING,
      DELETION_STATUS.FAILED,
    ];

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("solicitacoes_exclusao")
      .select("id, status, created_at, due_at")
      .eq("subject_user_ref", user.id)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      const migrationMissing = ["42703", "PGRST204"].includes(
        existingError.code,
      );
      return json(
        {
          success: false,
          message: migrationMissing
            ? "O fluxo de privacidade está em atualização. Tente novamente após a implantação."
            : "Não foi possível verificar solicitações existentes.",
        },
        migrationMissing ? 503 : 500,
      );
    }

    if (existing) {
      return json(
        {
          success: false,
          code: "ACTIVE_REQUEST_EXISTS",
          message:
            "Já existe uma solicitação de exclusão em andamento para esta conta.",
          data: {
            status: existing.status,
            created_at: existing.created_at,
            due_at: existing.due_at,
          },
        },
        409,
      );
    }

    const email = subject.profile?.email || user.email || null;
    const now = new Date();
    const dueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const requestId = crypto.randomUUID();

    const payload = {
      id: requestId,
      user_id: user.id,
      subject_user_ref: user.id,
      profile_type: subject.profileType,
      nome: confirmedName,
      motivo: reason,
      status: DELETION_STATUS.PENDING,
      subject_email_masked: maskEmail(email),
      subject_email_hash: hashSensitiveValue(email || user.id, "deletion-email"),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      due_at: dueAt.toISOString(),
      version: 1,
      metadata: {
        channel: "ACCOUNT_SETTINGS",
        confirmation_name_matches: Boolean(registeredName),
      },
    };

    const { data, error } = await supabaseAdmin
      .from("solicitacoes_exclusao")
      .insert([payload])
      .select("id, status, created_at, due_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(
          {
            success: false,
            code: "ACTIVE_REQUEST_EXISTS",
            message:
              "Já existe uma solicitação de exclusão em andamento para esta conta.",
          },
          409,
        );
      }
      throw error;
    }

    try {
      await registerDeletionAudit(supabaseAdmin, {
        requestId: data.id,
        action: "REQUEST_CREATED",
        previousStatus: null,
        nextStatus: DELETION_STATUS.PENDING,
        snapshot: {
          profile_type: subject.profileType,
          email_hash: payload.subject_email_hash,
          due_at: payload.due_at,
        },
        ipHash: hashRequestIp(request),
      });
    } catch (auditError) {
      await supabaseAdmin
        .from("solicitacoes_exclusao")
        .delete()
        .eq("id", data.id)
        .eq("status", DELETION_STATUS.PENDING);
      throw auditError;
    }

    return json(
      {
        success: true,
        message:
          "Solicitação recebida. A equipe analisará o pedido em até 48 horas.",
        data,
      },
      201,
    );
  } catch (error) {
    console.error("[LGPD/DeletionRequest][POST] Erro:", {
      code: error?.code || null,
      message: error?.message || "unknown",
    });

    return json(
      {
        success: false,
        message: "Não foi possível registrar a solicitação de exclusão.",
      },
      Number(error?.status) || 500,
    );
  }
}

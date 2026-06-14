import crypto from "node:crypto";

import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getVerifiedOfficeSession } from "@/lib/officeSession";
import { getUserPlanLimits } from "@/lib/planUtils";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

import {
  isAgendaUuid,
  normalizeAgendaStatus,
  normalizeAgendaType,
  normalizeAgendaUrgency,
} from "./agendaValidation";

const AUDIT_TABLE = "lawyer_agenda_audit_logs";
const MUTATION_ROLES = new Set(["admin", "gestor", "secretaria"]);

function readObject(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePlan(value, premium = false) {
  const plan = String(value || "FREE").trim().toUpperCase();
  if (premium && plan === "FREE") return "PRO";
  return plan;
}

function normalizeOfficePlan(value) {
  const plan = String(value || "").trim().toUpperCase();
  if (plan.startsWith("ENTERPRISE")) return plan;
  if (plan.startsWith("PRO_PLUS")) return "ENTERPRISE_PRO_PLUS";
  if (plan.startsWith("PRO")) return "ENTERPRISE_PRO";
  if (plan.startsWith("START")) return "ENTERPRISE_START";
  return plan || "FREE";
}

function isEligiblePlan(planType) {
  return planType === "START" || planType === "PRO" || planType.startsWith("ENTERPRISE");
}

export function agendaJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidAgendaMutationOrigin(request) {
  return hasTrustedMutationOrigin(request);
}

export async function requireLawyerAgendaAccess(request) {
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: agendaJson({ success: false, message: "Serviço indisponível." }, 503),
    };
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    const attemptedToken =
      request.headers.get("authorization") || request.headers.get("x-access-token");
    const officeSession = attemptedToken ? null : getVerifiedOfficeSession(request);
    if (!officeSession) {
      return {
        ok: false,
        response: agendaJson({ success: false, message: "Não autorizado." }, 401),
      };
    }

    const [officeResult, membersResult] = await Promise.all([
      supabaseAdmin
        .from("escritorios")
        .select("id, nome, email, plano, limites")
        .eq("id", officeSession.id)
        .maybeSingle(),
      supabaseAdmin
        .from("advogados")
        .select("id, name, cargo, oab_verification_status")
        .eq("escritorio_id", officeSession.id),
    ]);
    if (officeResult.error) throw officeResult.error;
    if (membersResult.error) throw membersResult.error;
    const office = officeResult.data;
    if (!office || String(office.email || "").toLowerCase() !== String(officeSession.email).toLowerCase()) {
      return {
        ok: false,
        response: agendaJson({ success: false, message: "Sessão do escritório inválida." }, 401),
      };
    }

    const members = (membersResult.data || []).filter(
      (member) => member.id && member.oab_verification_status !== "ERROR",
    );
    const planType = normalizeOfficePlan(office.plano);
    if (members.length === 0) {
      return {
        ok: false,
        response: agendaJson(
          { success: false, message: "O escritório não possui membros ativos para receber compromissos." },
          403,
        ),
      };
    }
    if (!isEligiblePlan(planType)) {
      return {
        ok: false,
        response: agendaJson(
          {
            success: false,
            upgradeRequired: true,
            message: "O escritório precisa de um plano Enterprise ativo para usar a agenda.",
          },
          403,
        ),
      };
    }

    return {
      ok: true,
      db: supabaseAdmin,
      user: null,
      profile: {
        id: office.id,
        name: `${office.nome} (Gestor)`,
        cargo: "admin",
        plan_type: planType,
        escritorio_id: office.id,
      },
      actorType: "OFFICE",
      actorId: null,
      actorOfficeId: office.id,
      office,
      officeId: office.id,
      members,
      lawyerIds: [...new Set(members.map((member) => member.id).filter(Boolean))],
      planType,
      planLimits: {
        planType,
        maxAgenda: Infinity,
        usedAgenda: 0,
        canUseAgenda() {
          return true;
        },
      },
      canManageOffice: true,
      googleSyncEnabled: false,
      googleSyncAvailable: Boolean(
        process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.NEXT_PUBLIC_APP_URL,
      ),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status, uso_agenda, google_sync_enabled",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: agendaJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: agendaJson(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
        },
        403,
      ),
    };
  }

  let office = null;
  let members = [{ id: profile.id, name: profile.name, cargo: profile.cargo }];
  let planType = normalizePlan(profile.plan_type, profile.is_premium === true);

  if (profile.escritorio_id) {
    const [officeResult, membersResult] = await Promise.all([
      supabaseAdmin
        .from("escritorios")
        .select("id, nome, plano, limites")
        .eq("id", profile.escritorio_id)
        .maybeSingle(),
      supabaseAdmin
        .from("advogados")
        .select("id, name, cargo, oab_verification_status")
        .eq("escritorio_id", profile.escritorio_id),
    ]);
    if (officeResult.error) throw officeResult.error;
    if (membersResult.error) throw membersResult.error;
    if (!officeResult.data) {
      return {
        ok: false,
        response: agendaJson(
          { success: false, message: "O escritório vinculado não foi encontrado." },
          403,
        ),
      };
    }
    office = officeResult.data;
    planType = normalizeOfficePlan(office.plano);
    members = (membersResult.data || []).filter(
      (member) => member.id && member.oab_verification_status !== "ERROR",
    );
    if (!members.some((member) => member.id === profile.id)) {
      members.push({ id: profile.id, name: profile.name, cargo: profile.cargo });
    }
  }

  if (!isEligiblePlan(planType)) {
    return {
      ok: false,
      response: agendaJson(
        {
          success: false,
          upgradeRequired: true,
          message: "A Agenda & Prazos está disponível nos planos START, PRO e Enterprise.",
        },
        403,
      ),
    };
  }

  const permissions = readObject(profile.permissoes);
  if (
    String(profile.cargo || "").toLowerCase() === "estagiario" &&
    permissions.ferr_agenda !== true
  ) {
    return {
      ok: false,
      response: agendaJson(
        {
          success: false,
          permissionDenied: true,
          message: "A Agenda & Prazos foi bloqueada pelo gestor do escritório.",
        },
        403,
      ),
    };
  }

  const lawyerIds = [...new Set(members.map((member) => member.id).filter(Boolean))];
  const role = String(profile.cargo || "advogado").toLowerCase();
  const planLimits = await getUserPlanLimits(supabaseAdmin, office?.id || profile.id);

  return {
    ok: true,
    db: supabaseAdmin,
    user,
    profile: { ...profile, plan_type: planType, email: user.email || "" },
    actorType: "LAWYER",
    actorId: profile.id,
    actorOfficeId: null,
    office,
    officeId: office?.id || null,
    members,
    lawyerIds,
    planType,
    planLimits,
    canManageOffice: Boolean(office && MUTATION_ROLES.has(role)),
    googleSyncEnabled: profile.google_sync_enabled === true,
    googleSyncAvailable: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.NEXT_PUBLIC_APP_URL,
    ),
  };
}

export function scopeAgendaQuery(query, lawyerIds) {
  if (lawyerIds.length === 1) return query.eq("lawyer_id", lawyerIds[0]);
  return query.in("lawyer_id", lawyerIds);
}

export async function getScopedAgendaItem(access, itemId, fields = "*") {
  if (!isAgendaUuid(itemId)) return null;
  let query = access.db
    .from("agenda_items")
    .select(fields)
    .eq("id", itemId)
    .is("deleted_at", null);
  query = scopeAgendaQuery(query, access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export function canMutateAgendaItem(access, lawyerId) {
  if (!lawyerId || !access?.lawyerIds?.includes(lawyerId)) return false;
  return (access.actorType === "LAWYER" && lawyerId === access.profile.id) || access.canManageOffice;
}

export function resolveAgendaAssignee(access, requestedLawyerId) {
  const targetId = requestedLawyerId || (access.actorType === "OFFICE" ? null : access.profile.id);
  if (!targetId) {
    const error = new Error("Selecione o responsável pelo compromisso.");
    error.status = 400;
    throw error;
  }
  if (!access.lawyerIds.includes(targetId)) {
    const error = new Error("O responsável selecionado não pertence a este escritório.");
    error.status = 403;
    throw error;
  }
  if (access.actorType !== "OFFICE" && targetId !== access.profile.id && !access.canManageOffice) {
    const error = new Error("Apenas gestor, administrador ou secretária pode atribuir compromissos a outro membro.");
    error.status = 403;
    throw error;
  }
  return targetId;
}

export async function validateAgendaClient(access, clientId) {
  if (!clientId) return null;
  if (!isAgendaUuid(clientId)) {
    const error = new Error("Cliente inválido.");
    error.status = 400;
    throw error;
  }
  let query = access.db
    .from("crm_clients")
    .select("id, name, email, lawyer_id")
    .eq("id", clientId);
  query = access.lawyerIds.length === 1
    ? query.eq("lawyer_id", access.lawyerIds[0])
    : query.in("lawyer_id", access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFound = new Error("O cliente informado não pertence à sua carteira ou escritório.");
    notFound.status = 403;
    throw notFound;
  }
  return data;
}

export function serializeAgendaItem(item, access, maps = {}) {
  const member = maps.memberMap?.get(item.lawyer_id);
  const client = maps.clientMap?.get(item.client_id);
  return {
    id: item.id,
    requestId: item.request_id || null,
    title: item.title || "Compromisso",
    description: item.description || "",
    date: item.date,
    endDate: item.end_date || null,
    type: normalizeAgendaType(item.type),
    urgency: normalizeAgendaUrgency(item.urgency),
    status: normalizeAgendaStatus(item.status),
    clientId: item.client_id || null,
    clientName: client?.name || null,
    lawyerId: item.lawyer_id,
    lawyerName: member?.name || "Responsável não identificado",
    googleSynced: Boolean(item.google_event_id),
    canEdit: canMutateAgendaItem(access, item.lawyer_id),
    canDelete: canMutateAgendaItem(access, item.lawyer_id),
    createdAt: item.created_at,
    updatedAt: item.updated_at || item.created_at,
    completedAt: item.completed_at || null,
  };
}

export async function reserveAgendaItem(access, payload) {
  const { data, error } = await access.db.rpc("reserve_lawyer_agenda_item", {
    p_actor_id: access.actorId,
    p_actor_office_id: access.actorOfficeId,
    p_lawyer_id: payload.lawyerId,
    p_office_id: access.officeId,
    p_request_id: payload.requestId,
    p_title: payload.title,
    p_description: payload.description,
    p_date: payload.date,
    p_end_date: payload.endDate,
    p_type: payload.type,
    p_urgency: payload.urgency,
    p_client_id: payload.clientId,
    p_status: payload.status,
  });
  if (error) throw error;
  const reservation = data || {};
  const statusByCode = {
    INVALID_REQUEST: 400,
    ACTOR_NOT_FOUND: 404,
    ASSIGNEE_NOT_FOUND: 404,
    OFFICE_NOT_FOUND: 404,
    ACCOUNT_BLOCKED: 403,
    ASSIGNEE_BLOCKED: 403,
    OFFICE_SCOPE_MISMATCH: 403,
    ASSIGNEE_SCOPE_MISMATCH: 403,
    ASSIGNMENT_FORBIDDEN: 403,
    UPGRADE_REQUIRED: 403,
    OFFICE_PLAN_REQUIRED: 403,
    QUOTA_EXCEEDED: 403,
  };
  return {
    ...reservation,
    httpStatus: reservation.success ? 200 : statusByCode[reservation.code] || 400,
  };
}

export async function recordAgendaAudit(
  access,
  request,
  { requestId, itemId = null, lawyerId, action, metadata = {} },
) {
  try {
    const { error } = await access.db.from(AUDIT_TABLE).insert([
      {
        request_id: isAgendaUuid(requestId) ? requestId : crypto.randomUUID(),
        agenda_item_id: itemId,
        actor_id: access.actorId,
        actor_office_id: access.actorOfficeId,
        lawyer_id: lawyerId || (access.actorType === "LAWYER" ? access.profile.id : access.lawyerIds[0]),
        office_id: access.officeId,
        action,
        metadata,
        ip_hash: getRequestIpHash(request),
        user_agent: getRequestUserAgent(request),
        created_at: new Date().toISOString(),
      },
    ]);
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    if (["42P01", "PGRST205"].includes(error?.code)) {
      console.warn("[Agenda/Auditoria] Migration ainda não aplicada.");
      return;
    }
    throw error;
  }
}

function createGoogleClient(refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

function toGoogleEvent(item) {
  const start = new Date(item.date);
  const end = item.end_date ? new Date(item.end_date) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    summary: item.title,
    description: `${item.description || ""}\n\nTipo: ${normalizeAgendaType(item.type)}\nUrgência: ${normalizeAgendaUrgency(item.urgency)}\n\nCriado via Social Jurídico`,
    start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
    colorId: normalizeAgendaUrgency(item.urgency) === "HIGH" ? "11" : normalizeAgendaUrgency(item.urgency) === "MEDIUM" ? "5" : "9",
  };
}

export async function syncAgendaItemToGoogle(access, item) {
  if (!access.googleSyncAvailable) {
    return { synced: false, reason: "CONFIG_UNAVAILABLE" };
  }
  const { data: owner, error } = await access.db
    .from("advogados")
    .select("google_refresh_token, google_sync_enabled")
    .eq("id", item.lawyer_id)
    .maybeSingle();
  if (error) throw error;
  if (!owner?.google_sync_enabled || !owner.google_refresh_token) {
    return { synced: false, reason: "NOT_CONNECTED" };
  }

  const calendar = createGoogleClient(owner.google_refresh_token);
  let googleEventId = item.google_event_id || null;
  if (googleEventId) {
    await calendar.events.update({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: toGoogleEvent(item),
    });
  } else {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: toGoogleEvent(item),
    });
    googleEventId = response.data.id || null;
    if (googleEventId) {
      const { error: updateError } = await access.db
        .from("agenda_items")
        .update({ google_event_id: googleEventId })
        .eq("id", item.id);
      if (updateError) throw updateError;
    }
  }
  return { synced: Boolean(googleEventId), googleEventId };
}

export async function deleteAgendaItemFromGoogle(access, item) {
  if (!access.googleSyncAvailable) {
    return { deleted: false, reason: "CONFIG_UNAVAILABLE" };
  }
  if (!item.google_event_id) return { deleted: false, reason: "NOT_SYNCED" };
  const { data: owner, error } = await access.db
    .from("advogados")
    .select("google_refresh_token, google_sync_enabled")
    .eq("id", item.lawyer_id)
    .maybeSingle();
  if (error) throw error;
  if (!owner?.google_sync_enabled || !owner.google_refresh_token) {
    return { deleted: false, reason: "NOT_CONNECTED" };
  }
  const calendar = createGoogleClient(owner.google_refresh_token);
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: item.google_event_id });
  } catch (error) {
    if (![404, 410].includes(Number(error?.code))) throw error;
  }
  return { deleted: true };
}

export function agendaFailure(error, fallback) {
  if (["42703", "42P01", "PGRST202", "PGRST204", "PGRST205"].includes(error?.code)) {
    return {
      status: 503,
      message: "A migration da Agenda & Prazos precisa ser aplicada antes de continuar.",
    };
  }
  if (error?.code === "23505") {
    return { status: 409, message: "Esta operação já foi processada." };
  }
  const status = Number(error?.status || 500);
  return {
    status,
    message: status >= 500 ? fallback : error?.message || fallback,
  };
}

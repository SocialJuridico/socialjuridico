import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getUserPlanLimits } from "@/lib/planUtils";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

import {
  isClientUuid,
  maskClientDocument,
  maskClientPhone,
  normalizeClientText,
} from "./clientValidation";

const AUDIT_TABLE = "lawyer_client_audit_logs";

export function clientJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidClientMutationOrigin(request) {
  return hasTrustedMutationOrigin(request);
}

function readPermissions(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export async function requireLawyerClientAccess(request, options = {}) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: clientJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status, balance, uso_triagem, uso_storage_mb, uso_crm_ia, crm_ia_periodo",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: clientJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: clientJson(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
        },
        403,
      ),
    };
  }

  const rawPlanType = String(profile.plan_type || "FREE").toUpperCase();
  const planType =
    profile.is_premium === true && rawPlanType === "FREE" ? "PRO" : rawPlanType;
  const hasPremium = planType === "START" || planType === "PRO";
  if (options.requirePremium !== false && !hasPremium) {
    return {
      ok: false,
      response: clientJson(
        {
          success: false,
          upgradeRequired: true,
          message: "O CRM jurídico está disponível nos planos START e PRO.",
        },
        403,
      ),
    };
  }

  const permissions = readPermissions(profile.permissoes);
  if (profile.cargo === "estagiario" && !Boolean(permissions.ferr_crm)) {
    return {
      ok: false,
      response: clientJson(
        {
          success: false,
          permissionDenied: true,
          message: "O CRM foi bloqueado pelo gestor do escritório.",
        },
        403,
      ),
    };
  }

  let members = [{ id: profile.id, name: profile.name, cargo: profile.cargo }];
  if (profile.escritorio_id) {
    const { data, error: membersError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, cargo, oab_verification_status")
      .eq("escritorio_id", profile.escritorio_id);
    if (membersError) throw membersError;
    members = (data || []).filter(
      (member) => member.id && member.oab_verification_status !== "ERROR",
    );
    if (!members.some((member) => member.id === profile.id)) {
      members.push({ id: profile.id, name: profile.name, cargo: profile.cargo });
    }
  }

  const planLimits = await getUserPlanLimits(supabaseAdmin, profile.id);
  return {
    ok: true,
    db: supabaseAdmin,
    user,
    profile: { ...profile, plan_type: planType, email: user.email || "" },
    planType,
    hasPremium,
    planLimits,
    members,
    lawyerIds: [...new Set(members.map((member) => member.id).filter(Boolean))],
    canDelegate: ["admin", "gestor"].includes(
      String(profile.cargo || "").toLowerCase(),
    ),
  };
}

export function scopeClientQuery(query, lawyerIds) {
  if (lawyerIds.length === 1) return query.eq("lawyer_id", lawyerIds[0]);
  return query.in("lawyer_id", lawyerIds);
}

export async function getScopedClient(access, clientId, fields = "*") {
  if (!isClientUuid(clientId)) return null;
  let query = access.db.from("crm_clients").select(fields).eq("id", clientId);
  query = scopeClientQuery(query, access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export function serializeClientListItem(client, memberMap = new Map()) {
  const owner = memberMap.get(client.lawyer_id);
  return {
    id: client.id,
    name: normalizeClientText(client.name, 160),
    type: client.type || "Pessoa Física",
    email: client.email || "",
    phoneMasked: maskClientPhone(client.phone),
    documentMasked: maskClientDocument(client.cpf_cnpj),
    profession: client.profession || "",
    status: client.status || "Ativo",
    riskScore: Number(client.risk_score || 0),
    lawyerId: client.lawyer_id,
    lawyerName: owner?.name || "Responsável não identificado",
    createdAt: client.created_at,
    updatedAt: client.updated_at || client.created_at,
  };
}

export function serializeClientDetail(client, memberMap = new Map()) {
  const owner = memberMap.get(client.lawyer_id);
  return {
    id: client.id,
    name: client.name || "",
    type: client.type || "Pessoa Física",
    cpfCnpj: client.cpf_cnpj || "",
    rg: client.rg || "",
    civilStatus: client.civil_status || "",
    profession: client.profession || "",
    phone: client.phone || "",
    address: client.address || "",
    email: client.email || "",
    notes: client.notes || "",
    status: client.status || "Ativo",
    riskScore: Number(client.risk_score || 0),
    lawyerId: client.lawyer_id,
    lawyerName: owner?.name || "Responsável não identificado",
    createdAt: client.created_at,
    updatedAt: client.updated_at || client.created_at,
  };
}

export async function recordClientAudit(
  access,
  request,
  { requestId, clientId = null, action, metadata = {} },
) {
  try {
    const { error } = await access.db.from(AUDIT_TABLE).insert([
      {
        request_id: isClientUuid(requestId) ? requestId : crypto.randomUUID(),
        client_id: clientId,
        actor_id: access.user.id,
        lawyer_id: access.profile.id,
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
      console.warn("[CRM/Auditoria] Migration ainda não aplicada.");
      return;
    }
    throw error;
  }
}

export function clientFailure(error, fallback) {
  if (["42703", "42P01", "PGRST202", "PGRST204", "PGRST205"].includes(error?.code)) {
    return {
      status: 503,
      message: "A migration do CRM precisa ser aplicada antes de continuar.",
    };
  }
  if (error?.code === "23505") {
    return { status: 409, message: "Este registro já existe." };
  }
  const status = Number(error?.status || 500);
  return {
    status,
    message: status >= 500 ? fallback : error?.message || fallback,
  };
}

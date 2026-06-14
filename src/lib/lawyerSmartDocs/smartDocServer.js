import crypto from "node:crypto";

import OpenAI from "openai";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import { getUserPlanLimits } from "@/lib/planUtils";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";

import { isClientUuid, normalizeClientText } from "@/lib/lawyerClients/clientValidation";
import { parseSmartDocLegacyStoragePath } from "./smartDocValidation";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SMARTDOC_PLANS = new Set([
  "START",
  "PRO",
  "ENTERPRISE_START",
  "ENTERPRISE_PRO",
  "ENTERPRISE_PRO_PLUS",
]);
const SMARTDOC_MANAGER_ROLES = new Set([
  "admin",
  "administrador",
  "gestor",
  "owner",
  "proprietario",
]);
const ENTERPRISE_STORAGE_DEFAULTS = Object.freeze({
  ENTERPRISE_START: 256000,
  ENTERPRISE_PRO: 512000,
  ENTERPRISE_PRO_PLUS: 1024000,
});

export function smartDocJson(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidSmartDocOrigin(request) {
  return hasTrustedMutationOrigin(request, { allowMissingOrigin: false });
}

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

function readPositiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function normalizeSmartDocRole(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function resolveEnterpriseSmartDocPlan(value) {
  const plan = String(value || "").trim().toLowerCase();
  if (plan.startsWith("pro_plus")) return "ENTERPRISE_PRO_PLUS";
  if (plan.startsWith("pro")) return "ENTERPRISE_PRO";
  return "ENTERPRISE_START";
}

export function evaluateSmartDocAccessPolicy(profile = {}) {
  const rawPlanType = String(profile.plan_type || "FREE").trim().toUpperCase();
  const planType =
    profile.is_premium === true && rawPlanType === "FREE" ? "PRO" : rawPlanType;
  const role = normalizeSmartDocRole(profile.cargo);
  const permissions = readObject(profile.permissoes);
  const isIntern = role === "estagiario";
  const hasFeaturePermission = !isIntern || permissions.ferr_smart_docs === true;

  return {
    planType,
    role,
    hasEligiblePlan: SMARTDOC_PLANS.has(planType),
    hasFeaturePermission,
    canManageOffice:
      SMARTDOC_MANAGER_ROLES.has(role) || permissions.gerir_smart_docs === true,
    isEnterprise: planType.startsWith("ENTERPRISE_"),
  };
}

async function getOfficeContext(db, profile) {
  if (!profile.escritorio_id) return null;

  const [{ data: office, error: officeError }, { data: members, error: membersError }] =
    await Promise.all([
      db
        .from("escritorios")
        .select("id, plano, limites")
        .eq("id", profile.escritorio_id)
        .maybeSingle(),
      db
        .from("advogados")
        .select("id, name, cargo, uso_storage_mb, oab_verification_status")
        .eq("escritorio_id", profile.escritorio_id),
    ]);

  if (officeError) throw officeError;
  if (membersError) throw membersError;
  if (!office) {
    const error = new Error("O escritório vinculado ao perfil não foi encontrado.");
    error.status = 403;
    throw error;
  }

  const planType = resolveEnterpriseSmartDocPlan(office.plano);
  const limits = readObject(office.limites);
  const maxStorageMb = readPositiveNumber(
    limits.storage_mb,
    ENTERPRISE_STORAGE_DEFAULTS[planType],
  );
  const allMembers = members || [];
  const usedStorageMb = allMembers.reduce(
    (total, member) => total + readPositiveNumber(member.uso_storage_mb),
    0,
  );
  const activeMembers = allMembers.filter(
    (member) => member.id && member.oab_verification_status !== "ERROR",
  );

  if (!activeMembers.some((member) => member.id === profile.id)) {
    activeMembers.push({
      id: profile.id,
      name: profile.name,
      cargo: profile.cargo,
      uso_storage_mb: profile.uso_storage_mb,
      oab_verification_status: profile.oab_verification_status,
    });
  }

  return {
    id: office.id,
    planType,
    maxStorageMb,
    usedStorageMb,
    members: activeMembers,
  };
}

export async function requireSmartDocAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: smartDocJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status, balance, uso_storage_mb, extra_storage_mb",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: smartDocJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: smartDocJson(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
        },
        403,
      ),
    };
  }

  const office = await getOfficeContext(supabaseAdmin, profile);
  const effectiveProfile = office
    ? { ...profile, plan_type: office.planType, is_premium: true }
    : profile;
  const policy = evaluateSmartDocAccessPolicy(effectiveProfile);

  if (!policy.hasEligiblePlan) {
    return {
      ok: false,
      response: smartDocJson(
        {
          success: false,
          upgradeRequired: true,
          message:
            "O IA Smart Docs está disponível nos planos START, PRO e Enterprise.",
        },
        403,
      ),
    };
  }
  if (!policy.hasFeaturePermission) {
    return {
      ok: false,
      response: smartDocJson(
        {
          success: false,
          permissionDenied: true,
          message: "O IA Smart Docs foi bloqueado pelo gestor do escritório.",
        },
        403,
      ),
    };
  }

  const members = office?.members || [
    {
      id: profile.id,
      name: profile.name,
      cargo: profile.cargo,
      uso_storage_mb: profile.uso_storage_mb,
    },
  ];
  const planLimits = office
    ? {
        planType: office.planType,
        maxStorageMb: office.maxStorageMb,
        usedStorageMb: office.usedStorageMb,
        canUploadDocs(fileSizeMb) {
          return this.usedStorageMb + fileSizeMb <= this.maxStorageMb;
        },
      }
    : await getUserPlanLimits(supabaseAdmin, profile.id);

  return {
    ok: true,
    db: supabaseAdmin,
    user,
    profile: {
      ...effectiveProfile,
      uso_storage_mb: office?.usedStorageMb ?? profile.uso_storage_mb,
      email: user.email || "",
    },
    planType: policy.planType,
    planLimits,
    officeId: office?.id || null,
    members,
    lawyerIds: [...new Set(members.map((member) => member.id).filter(Boolean))],
    canManageOffice: policy.canManageOffice,
  };
}

export function scopeSmartDocQuery(query, lawyerIds) {
  if (lawyerIds.length === 1) return query.eq("lawyer_id", lawyerIds[0]);
  return query.in("lawyer_id", lawyerIds);
}

export function canDeleteSmartDoc(access, lawyerId) {
  return Boolean(
    lawyerId &&
      (lawyerId === access?.user?.id ||
        (access?.canManageOffice && access?.lawyerIds?.includes(lawyerId))),
  );
}

export async function classifySmartDocument(fileName) {
  if (!openai) return { type: "Outros", tags: ["Documento"] };
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Classifique nomes de arquivos jurídicos brasileiros. Não invente conteúdo do documento. Responda somente JSON válido.",
        },
        {
          role: "user",
          content: `Classifique o arquivo "${normalizeClientText(fileName, 180)}" em Petição, Contrato, Sentença, Procuração ou Outros e gere até 3 tags. Formato: {"type":"Outros","tags":["Documento"]}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return {
      type: normalizeClientText(parsed.type || "Outros", 60) || "Outros",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .slice(0, 3)
            .map((tag) => normalizeClientText(tag, 40))
            .filter(Boolean)
        : ["Documento"],
    };
  } catch (error) {
    console.error("[SmartDoc] Falha na classificação:", error);
    return { type: "Outros", tags: ["Documento"] };
  }
}

export async function reserveSmartDocUpload(
  access,
  { requestId, fileSizeBytes, protect, fileName, mimeType, fileSha256 },
) {
  if (!isClientUuid(requestId)) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      message: "Identificador da solicitação inválido.",
      httpStatus: 400,
    };
  }

  const { data, error } = await access.db.rpc("reserve_smartdoc_upload", {
    p_lawyer_id: access.user.id,
    p_office_id: access.officeId,
    p_request_id: requestId,
    p_file_size_bytes: fileSizeBytes,
    p_protected: Boolean(protect),
    p_file_name: fileName,
    p_mime_type: mimeType,
    p_file_sha256: fileSha256,
  });
  if (error) throw error;

  const reservation = data || {};
  if (!reservation.success) {
    const statusByCode = {
      INVALID_REQUEST: 400,
      IDEMPOTENCY_CONFLICT: 409,
      OPERATION_IN_PROGRESS: 409,
      OPERATION_REFUNDED: 409,
      LAWYER_NOT_FOUND: 404,
      OFFICE_NOT_FOUND: 404,
      OFFICE_SCOPE_MISMATCH: 403,
      UPGRADE_REQUIRED: 403,
      STORAGE_LIMIT_REACHED: 413,
      INSUFFICIENT_JURIS: 402,
    };
    return {
      ...reservation,
      httpStatus: statusByCode[reservation.code] || 403,
    };
  }
  return { ...reservation, httpStatus: 200 };
}

export async function completeSmartDocUpload(access, operationId, documentId) {
  if (!isClientUuid(operationId) || !isClientUuid(documentId)) return null;
  const { data, error } = await access.db.rpc("complete_smartdoc_upload", {
    p_lawyer_id: access.user.id,
    p_operation_id: operationId,
    p_document_id: documentId,
  });
  if (error) throw error;
  return data || null;
}

export async function refundSmartDocUpload(access, operationId, errorCode) {
  if (!isClientUuid(operationId)) return null;
  const { data, error } = await access.db.rpc("refund_smartdoc_upload", {
    p_lawyer_id: access.user.id,
    p_operation_id: operationId,
    p_error_code: String(errorCode || "UPLOAD_FAILED").slice(0, 80),
  });
  if (error) {
    console.error("[SmartDoc] Falha ao estornar reserva:", error);
    return null;
  }
  return data || null;
}

export async function releaseSmartDocStorage(access, lawyerId, fileSizeBytes) {
  const size = Number(fileSizeBytes || 0);
  if (!isClientUuid(lawyerId) || !Number.isSafeInteger(size) || size <= 0) return null;
  const { data, error } = await access.db.rpc("release_smartdoc_storage", {
    p_lawyer_id: lawyerId,
    p_file_size_bytes: size,
  });
  if (error) throw error;
  return data || null;
}

export async function notifySmartDocBalance(access, reservation) {
  const charged = Number(reservation?.jurisCharged || 0);
  if (charged <= 0) return;
  const newBalance = Number(reservation?.balance || 0);
  await checkAndNotifyLowBalance(access.user.id, newBalance + charged, newBalance);
}

function requestIpHash(request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const salt = process.env.AUDIT_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "sj";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function recordSmartDocAudit(
  access,
  request,
  { requestId, documentId = null, lawyerId = null, action, metadata = {} },
) {
  try {
    const { error } = await access.db.from("smartdoc_audit_logs").insert([
      {
        request_id: isClientUuid(requestId) ? requestId : crypto.randomUUID(),
        document_id: documentId,
        actor_id: access.user.id,
        lawyer_id: lawyerId || access.user.id,
        action,
        metadata,
        ip_hash: requestIpHash(request),
        user_agent: request.headers.get("user-agent") || null,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    if (["42P01", "PGRST205"].includes(error?.code)) {
      console.warn("[SmartDoc/Auditoria] Migration ainda não aplicada.");
      return;
    }
    throw error;
  }
}

export function smartDocFailure(error, fallback) {
  if (
    ["42703", "42P01", "PGRST202", "PGRST204", "PGRST205"].includes(
      error?.code,
    )
  ) {
    return {
      status: 503,
      message: "A migration do IA Smart Docs precisa ser aplicada.",
    };
  }
  if (error?.code === "23505") {
    return { status: 409, message: "A solicitação já foi processada." };
  }
  const status = Number(error?.status || 500);
  return {
    status,
    message: status >= 500 ? fallback : error?.message || fallback,
  };
}

export function parseLegacyStoragePath(fileUrl) {
  return parseSmartDocLegacyStoragePath(fileUrl, "crm_documents");
}

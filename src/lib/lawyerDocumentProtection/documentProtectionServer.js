import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getUserPlanLimits } from "@/lib/planUtils";
import { supabaseAdmin } from "@/lib/supabase";

import {
  canDeleteSmartDoc,
  evaluateSmartDocAccessPolicy,
  resolveEnterpriseSmartDocPlan,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";

const ENTERPRISE_STORAGE_DEFAULTS = Object.freeze({
  ENTERPRISE_START: 256000,
  ENTERPRISE_PRO: 512000,
  ENTERPRISE_PRO_PLUS: 1024000,
});

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

export function evaluateDocumentProtectionAccessPolicy(profile = {}) {
  const permissions = readObject(profile.permissoes);
  const smartDocCompatibleProfile = {
    ...profile,
    permissoes: {
      ferr_smart_docs: permissions.ferr_blindagem === true,
    },
  };
  const policy = evaluateSmartDocAccessPolicy(smartDocCompatibleProfile);

  return {
    ...policy,
    hasFeaturePermission:
      policy.role !== "estagiario" || permissions.ferr_blindagem === true,
    canManageOffice: policy.canManageOffice,
  };
}

async function getProtectionOfficeContext(db, profile) {
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

export async function requireDocumentProtectionAccess(request) {
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

  const office = await getProtectionOfficeContext(supabaseAdmin, profile);
  const effectiveProfile = office
    ? { ...profile, plan_type: office.planType, is_premium: true }
    : profile;
  const policy = evaluateDocumentProtectionAccessPolicy(effectiveProfile);

  if (!policy.hasEligiblePlan) {
    return {
      ok: false,
      response: smartDocJson(
        {
          success: false,
          upgradeRequired: true,
          message:
            "A Blindagem de Documentos está disponível nos planos START, PRO e Enterprise.",
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
          message: "A Blindagem de Documentos foi bloqueada pelo gestor do escritório.",
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

export async function reserveDocumentProtectionUpload(
  access,
  { requestId, fileSizeBytes, fileName, mimeType, fileSha256 },
) {
  const { data, error } = await access.db.rpc("reserve_document_protection", {
    p_lawyer_id: access.user.id,
    p_office_id: access.officeId,
    p_request_id: requestId,
    p_file_size_bytes: fileSizeBytes,
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
      ALREADY_PROTECTED: 409,
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

export function canAccessProtectedDocument(access, lawyerId) {
  return Boolean(lawyerId && access?.lawyerIds?.includes(lawyerId));
}

export function canDeleteProtectedDocument(access, lawyerId) {
  return canDeleteSmartDoc(access, lawyerId);
}

export function serializeProtectedDocument(document, access, memberMap = new Map()) {
  return {
    id: document.id,
    requestId: document.request_id || null,
    fileName: document.file_name || "Documento",
    fileUrl: `/api/advogado/blindagemdedocumentos/${document.id}/arquivo`,
    documentType: document.doc_type || "Outros",
    tags: Array.isArray(document.tags) ? document.tags : [],
    protected: Boolean(document.is_blindado),
    hash: document.hash_sha512 || null,
    hashAlgorithm: document.hash_sha512 ? "SHA-512" : null,
    fileSizeBytes: Number(document.file_size_bytes || 0),
    clientId: document.client_id || null,
    clientName: document.crm_clients?.name || null,
    lawyerId: document.lawyer_id,
    lawyerName: memberMap.get(document.lawyer_id)?.name || "Advogado",
    canDelete: canDeleteProtectedDocument(access, document.lawyer_id),
    createdAt: document.created_at,
    updatedAt: document.updated_at || document.created_at,
  };
}

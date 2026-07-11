import crypto from "crypto";

import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { oraculoInstitutionInviteTemplate } from "@/lib/oraculo/oraculoEmails";

export const INSTITUTION_ROLES = [
  "ORACULO_INSTITUICAO_ADMIN",
  "ORACULO_COORDENADOR_CURSO",
  "ORACULO_COORDENADOR_NPJ",
  "ORACULO_PROFESSOR_ORIENTADOR",
  "ORACULO_SUPERVISOR_JURIDICO",
];

export const INSTITUTION_ROLE_LABELS = {
  ORACULO_INSTITUICAO_ADMIN: "Administrador institucional",
  ORACULO_COORDENADOR_CURSO: "Coordenador do curso",
  ORACULO_COORDENADOR_NPJ: "Coordenador do NPJ",
  ORACULO_PROFESSOR_ORIENTADOR: "Professor orientador",
  ORACULO_SUPERVISOR_JURIDICO: "Supervisor juridico",
};

export const INSTITUTION_PERMISSIONS = {
  INSTITUTION_VIEW_DASHBOARD: "INSTITUTION_VIEW_DASHBOARD",
  INSTITUTION_MANAGE_USERS: "INSTITUTION_MANAGE_USERS",
  INSTITUTION_INVITE_USERS: "INSTITUTION_INVITE_USERS",
  INSTITUTION_MANAGE_ROLES: "INSTITUTION_MANAGE_ROLES",
  INSTITUTION_VIEW_PROGRAMS: "INSTITUTION_VIEW_PROGRAMS",
  INSTITUTION_MANAGE_PROGRAMS: "INSTITUTION_MANAGE_PROGRAMS",
  INSTITUTION_VIEW_STUDENTS: "INSTITUTION_VIEW_STUDENTS",
  INSTITUTION_VIEW_REPORTS: "INSTITUTION_VIEW_REPORTS",
  INSTITUTION_VIEW_METRICS: "INSTITUTION_VIEW_METRICS",
  INSTITUTION_VIEW_AUDIT: "INSTITUTION_VIEW_AUDIT",
  INSTITUTION_VIEW_FULL_CASE_CONTENT: "INSTITUTION_VIEW_FULL_CASE_CONTENT",
  PROGRAM_MANAGE_ORIENTATORS: "PROGRAM_MANAGE_ORIENTATORS",
  PROGRAM_MANAGE_SUPERVISORS: "PROGRAM_MANAGE_SUPERVISORS",
  STUDENT_EVALUATE: "STUDENT_EVALUATE",
  STUDENT_REVIEW_ACTIVITY: "STUDENT_REVIEW_ACTIVITY",
  STUDENT_APPROVE_ACTIVITY: "STUDENT_APPROVE_ACTIVITY",
};

export const ROLE_PERMISSIONS = {
  ORACULO_INSTITUICAO_ADMIN: [
    "INSTITUTION_VIEW_DASHBOARD",
    "INSTITUTION_MANAGE_USERS",
    "INSTITUTION_INVITE_USERS",
    "INSTITUTION_MANAGE_ROLES",
    "INSTITUTION_VIEW_PROGRAMS",
    "INSTITUTION_MANAGE_PROGRAMS",
    "INSTITUTION_VIEW_STUDENTS",
    "INSTITUTION_VIEW_REPORTS",
    "INSTITUTION_VIEW_METRICS",
    "INSTITUTION_VIEW_AUDIT",
    "PROGRAM_MANAGE_ORIENTATORS",
    "PROGRAM_MANAGE_SUPERVISORS",
  ],
  ORACULO_COORDENADOR_CURSO: [
    "INSTITUTION_VIEW_DASHBOARD",
    "INSTITUTION_VIEW_PROGRAMS",
    "INSTITUTION_VIEW_STUDENTS",
    "INSTITUTION_VIEW_REPORTS",
    "INSTITUTION_VIEW_METRICS",
  ],
  ORACULO_COORDENADOR_NPJ: [
    "INSTITUTION_VIEW_DASHBOARD",
    "INSTITUTION_VIEW_PROGRAMS",
    "INSTITUTION_VIEW_STUDENTS",
    "INSTITUTION_VIEW_REPORTS",
    "INSTITUTION_VIEW_AUDIT",
  ],
  ORACULO_PROFESSOR_ORIENTADOR: [
    "INSTITUTION_VIEW_DASHBOARD",
    "INSTITUTION_VIEW_STUDENTS",
    "STUDENT_EVALUATE",
    "STUDENT_REVIEW_ACTIVITY",
    "STUDENT_APPROVE_ACTIVITY",
  ],
  ORACULO_SUPERVISOR_JURIDICO: [
    "INSTITUTION_VIEW_DASHBOARD",
    "INSTITUTION_VIEW_STUDENTS",
    "STUDENT_REVIEW_ACTIVITY",
    "STUDENT_APPROVE_ACTIVITY",
    "INSTITUTION_VIEW_AUDIT",
  ],
};

const RESEND_FROM = "Social Juridico <contato@socialjuridico.com.br>";
const INVITE_TTL_DAYS = 7;

export function hashInstitutionInviteToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function createInstitutionInviteToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInstitutionInviteToken(token) };
}

export function normalizeInstitutionEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isEmailOutsideInstitutionDomain(email, domain) {
  const normalizedEmail = normalizeInstitutionEmail(email);
  const normalizedDomain = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!normalizedEmail || !normalizedDomain) return false;
  return !normalizedEmail.endsWith(`@${normalizedDomain}`);
}

export function getPermissionsForRoles(roles = [], lgpd = {}) {
  const permissions = new Set();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] || []) {
      permissions.add(permission);
    }
  }
  if (
    (lgpd.professor_pode_acessar_conteudo_integral ||
      lgpd.orientador_acesso_integral ||
      lgpd.supervisor_pode_acessar_conteudo_integral ||
      lgpd.supervisor_acesso_integral) &&
    roles.some((role) =>
      ["ORACULO_PROFESSOR_ORIENTADOR", "ORACULO_SUPERVISOR_JURIDICO"].includes(
        role,
      ),
    )
  ) {
    permissions.add("INSTITUTION_VIEW_FULL_CASE_CONTENT");
  }
  return [...permissions];
}

export async function getInstitutionAccessContext({
  db = supabaseAdmin,
  authUserId,
  instituicaoId,
}) {
  if (!db || !authUserId || !instituicaoId) return null;

  const { data: user, error } = await db
    .from("oraculo_instituicao_usuarios")
    .select(
      "id, instituicao_id, auth_user_id, status, mfa_required, oraculo_instituicoes(id, nome, lgpd), oraculo_instituicao_user_roles(role, programa_academico_id, revoked_at)",
    )
    .eq("auth_user_id", authUserId)
    .eq("instituicao_id", instituicaoId)
    .neq("status", "REVOGADO")
    .maybeSingle();

  if (error || !user || user.status !== "ATIVO") return null;

  const activeRoles = (user.oraculo_instituicao_user_roles || []).filter(
    (role) => !role.revoked_at,
  );
  const roles = activeRoles.map((role) => role.role);

  return {
    institutionUserId: user.id,
    instituicaoId: user.instituicao_id,
    status: user.status,
    roles,
    permissions: getPermissionsForRoles(
      roles,
      user.oraculo_instituicoes?.lgpd || {},
    ),
    programScopes: activeRoles
      .filter((role) => role.programa_academico_id)
      .map((role) => ({
        role: role.role,
        programaAcademicoId: role.programa_academico_id,
      })),
    mfaRequired: Boolean(user.mfa_required),
  };
}

export async function hasInstitutionPermission({
  db = supabaseAdmin,
  authUserId,
  instituicaoId,
  permission,
}) {
  const context = await getInstitutionAccessContext({
    db,
    authUserId,
    instituicaoId,
  });
  return Boolean(context?.permissions?.includes(permission));
}

export async function recordInstitutionAudit({
  db = supabaseAdmin,
  instituicaoId,
  instituicaoUsuarioId = null,
  authUserId = null,
  eventType,
  action,
  result = "SUCCESS",
  metadata = {},
  request = null,
}) {
  if (!db || !instituicaoId || !eventType) return;
  await db.from("oraculo_instituicao_user_audit_logs").insert([
    {
      instituicao_id: instituicaoId,
      instituicao_usuario_id: instituicaoUsuarioId,
      auth_user_id: authUserId,
      event_type: eventType,
      action: action || eventType,
      result,
      ip_address:
        request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: request?.headers?.get("user-agent") || null,
      metadata,
    },
  ]);
}

export async function createInitialInstitutionAdminInvite({
  db = supabaseAdmin,
  instituicao,
  invitedByAuthUserId,
  request = null,
}) {
  const admin = instituicao?.acesso_institucional?.primeiro_admin || {};
  const email = normalizeInstitutionEmail(admin.email || admin.email_institucional);
  if (!db || !instituicao?.id || instituicao.status !== "ATIVA" || !email) {
    return { created: false, reason: "INSTITUTION_NOT_ACTIVE_OR_ADMIN_MISSING" };
  }

  const role = "ORACULO_INSTITUICAO_ADMIN";
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: existing, error: existingError } = await db
    .from("oraculo_instituicao_convites")
    .select("id, status")
    .eq("instituicao_id", instituicao.id)
    .eq("email", email)
    .eq("role", role)
    .in("status", ["PENDENTE"])
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return { created: false, inviteId: existing.id };

  const { token, tokenHash } = createInstitutionInviteToken();
  const { data: invite, error } = await db
    .from("oraculo_instituicao_convites")
    .insert([
      {
        instituicao_id: instituicao.id,
        email,
        nome_convidado: admin.nome || admin.nome_completo || email,
        role,
        token_hash: tokenHash,
        status: "PENDENTE",
        invited_by_auth_user_id: invitedByAuthUserId,
        invited_by_role: "ADMIN",
        expires_at: expiresAt,
      },
    ])
    .select("id")
    .single();

  if (error) throw error;

  await recordInstitutionAudit({
    db,
    instituicaoId: instituicao.id,
    authUserId: invitedByAuthUserId,
    eventType: "INSTITUTION_USER_INVITED",
    action: "create_initial_admin_invite",
    request,
    metadata: { email, role },
  });

  const inviteUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.socialjuridico.com.br"
  }/oraculoacademico/convite-institucional/${token}`;

  await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: "Voce foi convidado para o Oraculo Academico",
    html: oraculoInstitutionInviteTemplate({
      invitedName: admin.nome || admin.nome_completo || email,
      institutionName: instituicao.nome,
      roleLabel: INSTITUTION_ROLE_LABELS[role],
      inviteUrl,
      expiresAt,
    }),
  });

  await db
    .from("oraculo_instituicoes")
    .update({
      acesso_institucional: {
        ...(instituicao.acesso_institucional || {}),
        convite_inicial_gerado: true,
        convite_inicial_enviado: true,
      },
      checklist_ativacao: {
        ...(instituicao.checklist_ativacao || {}),
        convite_institucional_gerado: true,
        convite_institucional_enviado: true,
      },
    })
    .eq("id", instituicao.id);

  await recordInstitutionAudit({
    db,
    instituicaoId: instituicao.id,
    authUserId: invitedByAuthUserId,
    eventType: "INSTITUTION_INVITE_SENT",
    action: "send_initial_admin_invite",
    request,
    metadata: { email, role, inviteId: invite.id },
  });

  return { created: true, inviteId: invite.id };
}

/**
 * Convite de auto-atendimento: o próprio admin da instituição convida um
 * Professor Orientador (diferente de createInitialInstitutionAdminInvite,
 * que é só para o primeiro admin, e da rota interna
 * /api/admin/oraculoacademico, que exige admin da plataforma). Mesmo
 * mecanismo (oraculo_instituicao_convites + e-mail com token) — sem isso, o
 * usuário criado nunca ganha auth_user_id e nunca consegue logar.
 *
 * Não usar para Supervisor Jurídico: ele não tem vínculo institucional (é
 * indicado pelo aluno — ver oraculo_supervisores / supervisorContext.js).
 */
export async function sendInstitutionRoleInvite({
  db = supabaseAdmin,
  instituicaoId,
  invitedByAuthUserId,
  email,
  nome,
  role,
  request = null,
}) {
  const normalizedEmail = normalizeInstitutionEmail(email);
  if (!db || !instituicaoId || !normalizedEmail || !nome || !INSTITUTION_ROLES.includes(role)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const { data: instituicao, error: institutionError } = await db
    .from("oraculo_instituicoes")
    .select("id, nome, status")
    .eq("id", instituicaoId)
    .maybeSingle();
  if (institutionError) throw institutionError;
  if (!instituicao || instituicao.status !== "ATIVA") {
    return { ok: false, code: "INSTITUTION_NOT_ACTIVE" };
  }

  const { data: existing, error: existingError } = await db
    .from("oraculo_instituicao_convites")
    .select("id")
    .eq("instituicao_id", instituicaoId)
    .eq("email", normalizedEmail)
    .eq("role", role)
    .eq("status", "PENDENTE")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { ok: false, code: "INVITE_ALREADY_PENDING" };

  const { token, tokenHash } = createInstitutionInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await db
    .from("oraculo_instituicao_convites")
    .insert([
      {
        instituicao_id: instituicaoId,
        email: normalizedEmail,
        nome_convidado: nome,
        role,
        supervisor_formal_id: supervisorFormalId,
        token_hash: tokenHash,
        status: "PENDENTE",
        invited_by_auth_user_id: invitedByAuthUserId,
        invited_by_role: "INSTITUTION_ADMIN",
        expires_at: expiresAt,
      },
    ])
    .select("id")
    .single();
  if (error) throw error;

  const inviteUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.socialjuridico.com.br"
  }/oraculoacademico/convite-institucional/${token}`;

  await resend.emails.send({
    from: RESEND_FROM,
    to: normalizedEmail,
    subject: "Você foi convidado para o Oráculo Acadêmico",
    html: oraculoInstitutionInviteTemplate({
      invitedName: nome,
      institutionName: instituicao.nome,
      roleLabel: INSTITUTION_ROLE_LABELS[role] || role,
      inviteUrl,
      expiresAt,
    }),
  });

  await recordInstitutionAudit({
    db,
    instituicaoId,
    authUserId: invitedByAuthUserId,
    eventType: "INSTITUTION_INVITE_SENT",
    action: "send_institution_role_invite",
    request,
    metadata: { email: normalizedEmail, role, inviteId: invite.id },
  });

  return { ok: true, inviteId: invite.id };
}

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { generateSignatureVerificationCode } from "@/lib/digitalSignatures/signatureServer";

export const ADMIN_SIGNATURE_CONFIRMATION = "ASSINAR DOCUMENTO";

export const ADMIN_SIGNABLE_DOCUMENTS = [
  {
    id: "iso27001-management-review-q2",
    title: "Ata de analise critica da direcao - ISO 27001 Q2",
    category: "ISO/IEC 27001",
    path: "docs/compliance/iso27001/MANAGEMENT_REVIEW_MINUTES_2026_Q2.md",
  },
  {
    id: "iso27001-internal-audit-q2",
    title: "Relatorio de auditoria interna - ISO 27001 Q2",
    category: "ISO/IEC 27001",
    path: "docs/compliance/iso27001/INTERNAL_AUDIT_REPORT_2026_Q2.md",
  },
  {
    id: "iso27001-document-approval",
    title: "Registro de aprovacao documental - SGSI",
    category: "ISO/IEC 27001",
    path: "docs/compliance/iso27001/DOCUMENT_APPROVAL_REGISTER.md",
  },
  {
    id: "soc2-security-package-q2",
    title: "Pacote de evidencias SOC 2 Security Q2",
    category: "SOC 2",
    path: "docs/compliance/soc2/SOC2_SECURITY_EVIDENCE_PACKAGE_2026_Q2.md",
  },
  {
    id: "soc2-change-approval-q2",
    title: "Registro de mudancas aprovadas SOC 2 Q2",
    category: "SOC 2",
    path: "docs/compliance/soc2/CHANGE_APPROVAL_REGISTER_2026_Q2.md",
  },
  {
    id: "soc2-incident-simulation-q2",
    title: "Incidente simulado SOC 2 Q2",
    category: "SOC 2",
    path: "docs/compliance/soc2/INCIDENT_SIMULATION_2026_Q2.md",
  },
  {
    id: "soc2-admin-access-review-q2",
    title: "Revisao trimestral de administradores SOC 2 Q2",
    category: "SOC 2",
    path: "docs/compliance/soc2/ADMIN_ACCESS_REVIEW_2026_Q2.md",
  },
  {
    id: "soc2-backup-restore-q2",
    title: "Evidencia de backup e restauracao SOC 2 Q2",
    category: "SOC 2",
    path: "docs/compliance/soc2/BACKUP_RESTORE_EVIDENCE_2026_Q2.md",
  },
  {
    id: "iso27701-pims-readiness",
    title: "Kit de prontidao ISO 27701 PIMS",
    category: "ISO/IEC 27701",
    path: "docs/compliance/iso27701/README.md",
  },
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getAdminSignableDocument(documentId) {
  return ADMIN_SIGNABLE_DOCUMENTS.find((item) => item.id === documentId) || null;
}

export function getAdminSignatureStatement(document) {
  return [
    "Declaro que li, aprovei e assino eletronicamente este documento no ambiente seguro da plataforma Social Juridico.",
    "Reconheco que esta assinatura eletronica registra minha manifestacao de vontade, autoria, integridade do documento, data, hora, hash criptografico e trilha de auditoria.",
    `Documento: ${document.title}.`,
  ].join(" ");
}

export async function readAdminSignableDocument(document) {
  const absolutePath = path.join(process.cwd(), document.path);
  const content = await fs.readFile(absolutePath);
  const stat = await fs.stat(absolutePath);
  return {
    content,
    text: content.toString("utf8"),
    size: content.length,
    modifiedAt: stat.mtime.toISOString(),
    hash: sha256(content),
  };
}

export function buildAdminSignaturePayload({
  document,
  documentHash,
  documentModifiedAt,
  admin,
  requestContext,
  verificationCode,
  signedAt,
}) {
  const statement = getAdminSignatureStatement(document);
  const payload = {
    type: "SOCIAL_JURIDICO_ADMIN_ELECTRONIC_SIGNATURE",
    legal_basis: [
      "MP 2.200-2/2001, art. 10, paragrafo 2",
      "Lei 14.063/2020, assinatura eletronica em interacoes aplicaveis",
    ],
    document: {
      id: document.id,
      title: document.title,
      category: document.category,
      path: document.path,
      hash_algorithm: "SHA-256",
      hash: documentHash,
      modified_at: documentModifiedAt,
    },
    signer: {
      admin_id: admin.id,
      name: admin.name || "Administrador",
      email: admin.email || null,
      role: admin.role || "ADMIN",
    },
    evidence: {
      signed_at: signedAt,
      verification_code: verificationCode,
      request_ip_hash: requestContext.requestIpHash,
      user_agent_hash: requestContext.userAgentHash,
    },
    statement,
  };

  return {
    payload,
    statement,
    signatureHash: sha256(JSON.stringify(payload)),
  };
}

export async function generateUniqueAdminSignatureCode(db) {
  for (let index = 0; index < 8; index += 1) {
    const code = generateSignatureVerificationCode();
    const { count, error } = await db
      .from("admin_document_signatures")
      .select("id", { count: "exact", head: true })
      .eq("verification_code", code);
    if (error) throw error;
    if (!count) return code;
  }
  throw new Error("Nao foi possivel gerar um codigo de verificacao.");
}

export function serializeAdminSignature(row) {
  if (!row) return null;
  return {
    id: row.id,
    document_id: row.document_id,
    document_title: row.document_title,
    document_category: row.document_category,
    document_path: row.document_path,
    document_hash: row.document_hash,
    signature_hash: row.signature_hash,
    verification_code: row.verification_code,
    signer_name: row.signer_name,
    signer_role: row.signer_role,
    signature_statement: row.signature_statement,
    status: row.status,
    signed_at: row.signed_at,
    created_at: row.created_at,
  };
}

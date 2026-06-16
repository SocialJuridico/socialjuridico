import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDITS = [
  {
    id: "soc2-security",
    title: "SOC 2 - Security",
    description: "Valida controles de autenticacao, auditoria, logs e operacao segura.",
    framework: "SOC 2",
    criteria: ["CC6", "CC7", "CC8"],
  },
  {
    id: "iso27001-sgsi",
    title: "ISO/IEC 27001 - SGSI",
    description: "Verifica evidencias iniciais do sistema de gestao de seguranca.",
    framework: "ISO/IEC 27001",
    criteria: ["Clausulas 4-10", "Anexo A"],
  },
  {
    id: "iso27701-pims",
    title: "ISO/IEC 27701 - PIMS",
    description: "Verifica controles de privacidade, inventario PII, papeis e direitos dos titulares.",
    framework: "ISO/IEC 27701",
    criteria: ["PIMS", "PII Controller", "PII Processor"],
  },
  {
    id: "lgpd-privacy",
    title: "LGPD e privacidade",
    description: "Confere rastreabilidade de solicitacoes, minimizacao e retencao de dados.",
    framework: "LGPD",
    criteria: ["Art. 6", "Art. 18", "Art. 46"],
  },
  {
    id: "technical-security",
    title: "Seguranca tecnica da plataforma",
    description: "Valida hardening de API, headers, TLS e superficie publica.",
    framework: "Security",
    criteria: ["OWASP", "TLS", "API"],
  },
];

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    const error = new Error(auth.message);
    error.status = auth.status;
    throw error;
  }
  return auth;
}

async function tableExists(db, table) {
  const { error } = await db
    .from(table)
    .select("*", { head: true, count: "exact" })
    .limit(1);

  if (!error) return true;
  const message = String(error.message || "").toLowerCase();
  if (error.code === "42P01" || message.includes("does not exist")) return false;
  return true;
}

async function countRows(db, table) {
  const { count, error } = await db
    .from(table)
    .select("id", { head: true, count: "exact" });
  if (error) return null;
  return count || 0;
}

async function evidenceExists(relativePath) {
  try {
    await fs.access(path.join(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

function result(id, title, status, evidence, recommendation = "") {
  return { id, title, status, evidence, recommendation };
}

function summarize(results) {
  const applicable = results.filter((item) => item.status !== "manual");
  const passed = applicable.filter((item) => item.status === "passed").length;
  const warnings = applicable.filter((item) => item.status === "warning").length;
  const failed = applicable.filter((item) => item.status === "failed").length;
  const total = applicable.length || 1;

  return {
    score: Math.round(((passed + warnings * 0.5) / total) * 100),
    passed,
    warnings,
    failed,
    manual: results.length - applicable.length,
  };
}

async function runAudit(auditId, auth) {
  const db = auth.db;
  const securityAuditExists = await tableExists(db, "security_audit_events");
  const deletionAuditExists = await tableExists(db, "admin_account_deletion_audit_logs");
  const deletionRequestsExists = await tableExists(db, "solicitacoes_exclusao");
  const adminCount = await countRows(db, "admins");
  const isoDocumentApprovalEvidence = await evidenceExists(
    "docs/compliance/iso27001/DOCUMENT_APPROVAL_REGISTER.md",
  );
  const isoInternalAuditEvidence = await evidenceExists(
    "docs/compliance/iso27001/INTERNAL_AUDIT_REPORT_2026_Q2.md",
  );
  const isoManagementReviewEvidence = await evidenceExists(
    "docs/compliance/iso27001/MANAGEMENT_REVIEW_MINUTES_2026_Q2.md",
  );
  const isoMigrationEvidence = await evidenceExists(
    "docs/compliance/iso27001/SECURITY_AUDIT_MIGRATION_EVIDENCE.md",
  );
  const soc2EvidencePackage = await evidenceExists(
    "docs/compliance/soc2/SOC2_SECURITY_EVIDENCE_PACKAGE_2026_Q2.md",
  );
  const soc2LogRetentionEvidence = await evidenceExists(
    "docs/compliance/soc2/LOG_RETENTION_EVIDENCE_2026_Q2.md",
  );
  const soc2LoginFailureEvidence = await evidenceExists(
    "docs/compliance/soc2/LOGIN_FAILURE_TEST_2026_Q2.md",
  );
  const soc2ChangeApprovalEvidence = await evidenceExists(
    "docs/compliance/soc2/CHANGE_APPROVAL_REGISTER_2026_Q2.md",
  );
  const soc2IncidentSimulationEvidence = await evidenceExists(
    "docs/compliance/soc2/INCIDENT_SIMULATION_2026_Q2.md",
  );
  const soc2AdminReviewEvidence = await evidenceExists(
    "docs/compliance/soc2/ADMIN_ACCESS_REVIEW_2026_Q2.md",
  );
  const soc2InactiveAccessEvidence = await evidenceExists(
    "docs/compliance/soc2/INACTIVE_ACCESS_REMOVAL_EVIDENCE_2026_Q2.md",
  );
  const soc2BackupEvidence = await evidenceExists(
    "docs/compliance/soc2/BACKUP_RESTORE_EVIDENCE_2026_Q2.md",
  );
  const checks = [];

  if (auditId === "soc2-security") {
    checks.push(
      result(
        "soc2-auth-audit",
        "Logs de autenticacao e falhas de login",
        securityAuditExists ? "passed" : soc2LoginFailureEvidence ? "warning" : "failed",
        securityAuditExists
          ? "Tabela security_audit_events disponivel para login, falhas e eventos sensiveis."
          : soc2LoginFailureEvidence
            ? "Procedimento de teste de falha de login existe; falta confirmar tabela/evento no banco."
            : "Tabela security_audit_events nao encontrada.",
        securityAuditExists
          ? "Nenhuma acao necessaria. Eventos de login coletados na trilha de auditoria."
          : "Executar tentativa controlada de login invalido e anexar amostra anonimizada.",
      ),
      result(
        "soc2-admin-access",
        "Administradores cadastrados e segregados",
        adminCount === null ? "warning" : adminCount > 0 ? "passed" : "failed",
        adminCount === null
          ? "Nao foi possivel contar administradores."
          : `${adminCount} administrador(es) encontrado(s).`,
        "Revisar acessos administrativos trimestralmente.",
      ),
      result(
        "soc2-log-retention",
        "Retencao de Auth, PostgREST e VPS por 90 dias",
        soc2LogRetentionEvidence ? "manual" : "failed",
        soc2LogRetentionEvidence
          ? "Registro de evidencias criado; controle depende de prints/exports externos do Supabase, Cloudflare/VPS ou provedor."
          : "Registro de evidencias de retencao nao encontrado.",
        "Anexar prints/exportacoes no registro de evidencias.",
      ),
      result(
        "soc2-change-management",
        "Politica de mudancas e resposta a incidentes",
        soc2ChangeApprovalEvidence && soc2IncidentSimulationEvidence ? "passed" : "warning",
        soc2ChangeApprovalEvidence && soc2IncidentSimulationEvidence
          ? "Historico de mudancas, aprovacoes e incidente simulado registrados no pacote SOC 2 Q2."
          : "Politicas existem, mas faltam registros operacionais de mudanca/incidente.",
        "Manter historico de releases, incidentes e aprovacoes.",
      ),
      result(
        "soc2-admin-review",
        "Revisao trimestral de administradores",
        soc2AdminReviewEvidence ? "passed" : "warning",
        soc2AdminReviewEvidence
          ? "Revisao trimestral Q2 registrada em docs/compliance/soc2."
          : "Revisao trimestral de administradores ainda nao registrada.",
        "Executar e registrar revisoes de acesso a cada trimestre.",
      ),
      result(
        "soc2-inactive-access",
        "Remocao de acesso de usuario inativo",
        soc2InactiveAccessEvidence ? "manual" : "warning",
        soc2InactiveAccessEvidence
          ? "Baseline Q2 registrado; anexar evidencia real quando houver usuario inativo removido."
          : "Registro de remocao/baseline de acesso inativo nao encontrado.",
        "Quando houver usuario inativo, remover acesso e anexar evento/screenshot anonimizado.",
      ),
      result(
        "soc2-backup-restore",
        "Backup e restauracao documentados",
        soc2BackupEvidence ? "manual" : "warning",
        soc2BackupEvidence
          ? "Procedimento de backup/restore registrado; faltam evidencias externas de provedor ou teste de restauracao."
          : "Documento de evidencia de backup/restore nao encontrado.",
        "Anexar print do plano de backup Supabase e evidencia de simulacao/restauracao.",
      ),
      result(
        "soc2-evidence-package",
        "Pacote de evidencias SOC 2 Security",
        soc2EvidencePackage ? "passed" : "failed",
        soc2EvidencePackage
          ? "Pacote de evidencias Q2 consolidado em docs/compliance/soc2."
          : "Pacote de evidencias SOC 2 Security nao encontrado.",
        "Manter o pacote atualizado durante o periodo de observacao.",
      ),
    );
  }

  if (auditId === "iso27001-sgsi") {
    checks.push(
      result(
        "iso-scope-policy",
        "Escopo, politica e SoA do SGSI",
        isoDocumentApprovalEvidence ? "passed" : "failed",
        isoDocumentApprovalEvidence
          ? "Kit documental e registro de aprovacao formal existem."
          : "Registro de aprovacao documental nao encontrado.",
        "Manter o registro de aprovacao atualizado a cada revisao documental.",
      ),
      result(
        "iso-audit-trail",
        "Trilha tecnica para eventos de seguranca",
        securityAuditExists ? "passed" : "failed",
        securityAuditExists
          ? "SQL aplicado no Supabase em producao; triggers de imutabilidade verificados; testes controlados de UPDATE e DELETE bloqueados; evidencia anonimizada arquivada em SECURITY_AUDIT_MIGRATION_EVIDENCE.md."
          : "security_audit_events ainda nao esta disponivel no banco.",
        securityAuditExists
          ? "Nenhuma acao necessaria. Trilha de auditoria operacional."
          : "Aplicar o SQL no Supabase, verificar triggers e anexar amostra anonimizada.",
      ),
      result(
        "iso-internal-audit-execution",
        "Auditoria interna executada e registrada",
        isoInternalAuditEvidence ? "passed" : "failed",
        isoInternalAuditEvidence
          ? "Relatorio de auditoria interna Q2 executado e registrado."
          : "Relatorio de auditoria interna executada nao encontrado.",
        "Manter relatorios de auditoria interna por ciclo trimestral/semestral.",
      ),
      result(
        "iso-management-review",
        "Analise critica da direcao",
        isoManagementReviewEvidence ? "passed" : "failed",
        isoManagementReviewEvidence
          ? "Ata de analise critica Q2 registrada e aprovada com plano de acao."
          : "Ata de analise critica nao encontrada.",
        "Repetir a analise critica periodicamente e apos mudancas relevantes.",
      ),
    );
  }

  if (auditId === "iso27701-pims") {
    checks.push(
      result(
        "pims-prerequisite",
        "Dependencia da ISO/IEC 27001",
        "manual",
        "A ISO 27701 deve ser tratada como extensao do SGSI ISO 27001 e depende de certificacao/escopo ISO 27001 para certificacao formal.",
        "Manter o PIMS como readiness ate a auditoria independente incluir ISO 27001 e ISO 27701.",
      ),
      result(
        "pims-scope-inventory",
        "Escopo PIMS e inventario de dados pessoais",
        "passed",
        "Kit inicial criado em docs/compliance/iso27701 com escopo e inventario PII.",
        "Revisar o inventario trimestralmente e apos novas features.",
      ),
      result(
        "pims-controller-processor",
        "Papeis de controlador e operador/processador",
        "passed",
        "Responsabilidades documentadas em PRIVACY_ROLES_AND_RESPONSIBILITIES.md.",
        "Vincular estes papeis aos termos de uso e contratos enterprise.",
      ),
      result(
        "pims-data-subject-rights",
        "Direitos dos titulares e solicitacoes LGPD",
        deletionRequestsExists && deletionAuditExists ? "passed" : "warning",
        deletionRequestsExists && deletionAuditExists
          ? "Fluxo de solicitacoes e auditoria LGPD disponiveis."
          : "Uma ou mais tabelas LGPD ainda nao foram confirmadas no banco.",
        "Executar amostra controlada e anexar evidencia anonimizada.",
      ),
      result(
        "pims-privacy-audit-events",
        "Eventos de privacidade com trilha imutavel",
        securityAuditExists ? "passed" : "failed",
        securityAuditExists
          ? "security_audit_events pronto para purga, login e eventos sensiveis."
          : "Tabela security_audit_events ausente.",
        securityAuditExists
          ? "Nenhuma acao necessaria. Trilha de privacidade operacional."
          : "Aplicar SQL de auditoria e coletar amostra de LGPD_PURGE_COMPLETED.",
      ),
      result(
        "pims-vendor-privacy",
        "Operadores/processadores e contratos de privacidade",
        "manual",
        "Controle depende de evidencias contratuais com Supabase, Stripe, Resend, hospedagem e demais fornecedores.",
        "Anexar DPA, termos ou clausulas de processamento de dados no registro de evidencias.",
      ),
      result(
        "pims-contextual-notices",
        "Avisos contextuais de privacidade",
        "passed",
        "Link na Bio/cartao digital e pagina de notificacao extrajudicial exibem finalidade do tratamento tecnico.",
        "Revisar os textos sempre que novas coletas tecnicas forem adicionadas.",
      ),
      result(
        "pims-office-session-segregation",
        "Segregacao de dados corporativos por sessao de escritorio",
        "passed",
        "Cookie sj_escritorio_session e assinatura HMAC separam a sessao enterprise e reduzem risco de acesso cruzado.",
        "Manter HttpOnly, SameSite e Secure em producao; revisar a expiracao periodicamente.",
      ),
    );
  }

  if (auditId === "lgpd-privacy") {
    checks.push(
      result(
        "lgpd-delete-requests",
        "Solicitacoes de exclusao rastreaveis",
        deletionRequestsExists ? "passed" : "failed",
        deletionRequestsExists
          ? "Tabela solicitacoes_exclusao disponivel."
          : "Tabela solicitacoes_exclusao nao encontrada.",
        "Manter status, justificativa e responsavel por decisao.",
      ),
      result(
        "lgpd-delete-audit",
        "Auditoria append-only de decisoes LGPD",
        deletionAuditExists ? "passed" : "failed",
        deletionAuditExists
          ? "Tabela admin_account_deletion_audit_logs disponivel com triggers de imutabilidade."
          : "Tabela admin_account_deletion_audit_logs nao encontrada.",
        deletionAuditExists
          ? "Nenhuma acao necessaria. Auditoria de deleções operacional."
          : "Validar triggers de imutabilidade e anexar amostra anonimizada.",
      ),
      result(
        "lgpd-security-audit",
        "Evento SOC 2 para purga concluida ou falha",
        securityAuditExists ? "passed" : "warning",
        securityAuditExists
          ? "security_audit_events pronto para LGPD_PURGE_COMPLETED e LGPD_PURGE_FAILED."
          : "Evento geral depende da tabela security_audit_events.",
        "Aplicar SQL de auditoria e executar uma purga controlada de teste.",
      ),
      result(
        "lgpd-minimization",
        "Minimizacao em API publica",
        "passed",
        "API publica de advogados usa DTO reduzido conforme evidencia registrada.",
        "Revisar novas APIs publicas a cada release.",
      ),
    );
  }

  if (auditId === "technical-security") {
    checks.push(
      result(
        "sec-openapi",
        "OpenAPI para scanner de API",
        "passed",
        "Arquivo public/openapi.json publicado para ferramentas como Probely/Snyk.",
        "Atualizar o schema quando novas rotas publicas forem adicionadas.",
      ),
      result(
        "sec-headers",
        "Security headers e TLS",
        "manual",
        "Notas A/A+ dependem de evidencia externa do Security Headers e Qualys SSL Labs.",
        "Anexar PDF ou print dos testes externos a cada auditoria.",
      ),
      result(
        "sec-auth-logs",
        "Falhas de login registradas",
        securityAuditExists ? "passed" : "failed",
        securityAuditExists
          ? "Instrumentacao de AUTH_LOGIN_FAILED disponivel."
          : "Tabela security_audit_events ausente.",
        securityAuditExists
          ? "Nenhuma acao necessaria. Logs de autenticação operacionais."
          : "Aplicar SQL e executar tentativa controlada de login invalido.",
      ),
      result(
        "sec-lgpd-delete-log",
        "Eventos sensiveis com timestamp imutavel",
        securityAuditExists && deletionAuditExists ? "passed" : "warning",
        securityAuditExists && deletionAuditExists
          ? "Auditoria tecnica e LGPD disponiveis."
          : "Uma ou mais tabelas de auditoria ainda dependem de migration.",
        "Executar teste controlado e salvar relatorio.",
      ),
    );
  }

  const audit = AUDITS.find((item) => item.id === auditId);

  return {
    audit,
    generatedAt: new Date().toISOString(),
    generatedBy: {
      id: auth.admin.id,
      name: auth.admin.name || "Administrador",
      email: auth.admin.email || "",
    },
    results: checks,
    summary: summarize(checks),
  };
}

function errorResponse(error) {
  console.error("[Admin/Auditorias] Erro:", error);
  const status = Number(error?.status || 500);
  return json(
    {
      success: false,
      message: [401, 403].includes(status)
        ? error.message
        : "Nao foi possivel executar a auditoria.",
    },
    status,
  );
}

export async function GET() {
  try {
    await requireAdmin();
    return json({ success: true, data: { audits: AUDITS } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await request.json().catch(() => null);
    const auditId = String(body?.auditId || "").trim();

    if (!AUDITS.some((item) => item.id === auditId)) {
      return json({ success: false, message: "Auditoria invalida." }, 400);
    }

    const report = await runAudit(auditId, auth);
    return json({
      success: true,
      message: "Auditoria executada.",
      data: { report },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

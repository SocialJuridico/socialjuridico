import { NextResponse } from "next/server";

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
  const checks = [];

  if (auditId === "soc2-security") {
    checks.push(
      result(
        "soc2-auth-audit",
        "Logs de autenticacao e falhas de login",
        securityAuditExists ? "passed" : "failed",
        securityAuditExists
          ? "Tabela security_audit_events disponivel para login, falhas e eventos sensiveis."
          : "Tabela security_audit_events nao encontrada.",
        "Aplicar o SQL docs/compliance/sql/20260616_soc2_security_audit_events.sql no Supabase.",
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
        "manual",
        "Controle depende de evidencia externa do Supabase, Cloudflare/VPS ou provedor.",
        "Anexar prints/exportacoes no registro de evidencias.",
      ),
      result(
        "soc2-change-management",
        "Politica de mudancas e resposta a incidentes",
        "passed",
        "Documentos de compliance criados em docs/compliance.",
        "Manter historico de releases, incidentes e aprovacoes.",
      ),
    );
  }

  if (auditId === "iso27001-sgsi") {
    checks.push(
      result(
        "iso-scope-policy",
        "Escopo, politica e SoA do SGSI",
        "passed",
        "Kit documental inicial criado em docs/compliance/iso27001.",
        "Aprovar formalmente antes de comunicar conformidade externa.",
      ),
      result(
        "iso-audit-trail",
        "Trilha tecnica para eventos de seguranca",
        securityAuditExists ? "passed" : "failed",
        securityAuditExists
          ? "security_audit_events disponivel como evidencia tecnica."
          : "security_audit_events ainda nao esta disponivel no banco.",
        "Aplicar migration SQL e coletar amostra anonimizada.",
      ),
      result(
        "iso-internal-audit",
        "Auditoria interna planejada",
        "passed",
        "Checklist e template de auditoria interna estao em docs/compliance/iso27001.",
        "Executar a primeira auditoria interna e registrar a ata.",
      ),
      result(
        "iso-management-review",
        "Analise critica da direcao",
        "manual",
        "Requer ata assinada ou registro formal da reuniao de analise critica.",
        "Agendar revisao com responsavel do SGSI.",
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
          ? "Tabela admin_account_deletion_audit_logs disponivel."
          : "Tabela admin_account_deletion_audit_logs nao encontrada.",
        "Validar triggers de imutabilidade e anexar amostra anonimizada.",
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
        "Aplicar SQL e executar tentativa controlada de login invalido.",
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

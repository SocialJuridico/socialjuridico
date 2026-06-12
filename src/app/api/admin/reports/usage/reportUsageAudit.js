import { createHmac, randomUUID } from "node:crypto";

function isAuditMigrationMissing(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    message.includes("admin_report_audit_logs")
  );
}

export async function loadReportHistory(db) {
  const { data, error } = await db
    .from("admin_report_audit_logs")
    .select(
      "id, admin_id, report_type, period_days, audiences, options, summary, file_name, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    if (isAuditMigrationMissing(error)) {
      return { available: false, items: [] };
    }
    throw new Error(`Histórico de relatórios: ${error.message}`);
  }

  const adminIds = [...new Set((data || []).map((item) => item.admin_id))];
  let adminsById = new Map();

  if (adminIds.length) {
    const { data: admins, error: adminError } = await db
      .from("admins")
      .select("id, name")
      .in("id", adminIds);

    if (adminError) {
      throw new Error(`Administradores do histórico: ${adminError.message}`);
    }

    adminsById = new Map((admins || []).map((admin) => [admin.id, admin.name]));
  }

  return {
    available: true,
    items: (data || []).map((item) => ({
      id: item.id,
      reportType: item.report_type,
      periodDays: item.period_days,
      audiences: item.audiences || [],
      options: item.options || {},
      summary: item.summary || {},
      fileName: item.file_name,
      status: item.status,
      createdAt: item.created_at,
      adminName: adminsById.get(item.admin_id) || "Administrador",
    })),
  };
}

function hashRequestIp(request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const secret =
    process.env.ADMIN_AUDIT_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-report-audit-secret";

  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function registerReportExport(auth, request, options, reportData) {
  const id = randomUUID();
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `relatorio_uso_socialjuridico_${date}_${id.slice(0, 8)}.pdf`;
  const audiences = [
    options.includeLawyers ? "LAWYERS" : null,
    options.includeClients ? "CLIENTS" : null,
  ].filter(Boolean);
  const summary = {
    ...reportData.summary,
    homeConversion: reportData.homeConversion?.summary || null,
  };

  const { error } = await auth.db.from("admin_report_audit_logs").insert([
    {
      id,
      admin_id: auth.admin.id,
      report_type: "USAGE_TELEMETRY",
      period_days: options.period,
      audiences,
      options,
      summary,
      file_name: fileName,
      status: "GENERATED",
      ip_hash: hashRequestIp(request),
      user_agent: String(request.headers.get("user-agent") || "").slice(0, 500),
      created_at: reportData.generatedAt,
    },
  ]);

  if (error) {
    if (isAuditMigrationMissing(error)) {
      return {
        available: false,
        id: null,
        fileName: `relatorio_uso_socialjuridico_${date}.pdf`,
      };
    }
    throw new Error(`Auditoria da emissão: ${error.message}`);
  }

  return { available: true, id, fileName };
}

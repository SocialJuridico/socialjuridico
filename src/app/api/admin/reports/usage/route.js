import { NextResponse } from "next/server";

import { loadReportHistory, registerReportExport } from "./reportUsageAudit";
import { normalizeReportOptions } from "./reportUsageConfig";
import { buildUsageReportData, requireReportAdmin } from "./reportUsageData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

function errorResponse(error) {
  console.error("[Admin/Reports/Usage] Erro:", error);

  const status = Number(error?.status) || 500;
  const safeMessage = [400, 401, 403, 503].includes(status)
    ? error?.message
    : "Não foi possível processar o relatório.";

  return json(
    {
      success: false,
      message: safeMessage || "Não foi possível processar o relatório.",
    },
    status,
  );
}

export async function GET(request) {
  try {
    const auth = await requireReportAdmin();
    const url = new URL(request.url);
    const options = normalizeReportOptions(
      Object.fromEntries(url.searchParams.entries()),
    );
    const report = await buildUsageReportData(auth, options);

    let history = { available: false, items: [] };

    try {
      history = await loadReportHistory(auth.db);
    } catch (historyError) {
      console.error(
        "[Admin/Reports/Usage] Histórico indisponível:",
        historyError,
      );
    }

    return json({
      success: true,
      data: {
        report,
        history: history.items,
        auditAvailable: history.available,
        privacy: {
          aggregatedMetricsOnly: true,
          rawAccessLogsReturned: false,
          ipAddressesReturned: false,
          publicEventsContainPersonalData: false,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const auth = await requireReportAdmin();
    const body = await request.json().catch(() => null);
    const options = normalizeReportOptions(body?.options || body || {});
    const report = await buildUsageReportData(auth, options);
    const audit = await registerReportExport(auth, request, options, report);

    return json({
      success: true,
      message: audit.available
        ? "Relatório preparado e emissão registrada."
        : "Relatório preparado sem registro de auditoria.",
      data: {
        report: {
          ...report,
          export: audit,
        },
        auditAvailable: audit.available,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

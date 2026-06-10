import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { postgresPool } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADVOCATE_SURVEY_COLUMNS = [
  "q1_velocidade",
  "q2_marketplace",
  "q3_ia_redator",
  "q4_ia_personalidade",
  "q5_seguranca",
  "q6_prazos",
  "q7_crm",
  "q8_smartdocs",
  "q9_suporte",
  "q10_roi",
];

const CLIENT_SURVEY_COLUMNS = [
  "q1_cadastro",
  "q2_clareza",
  "q3_velocidade",
  "q4_confianca",
  "q5_qualidade",
  "q6_chat",
  "q7_transparencia",
  "q8_seguranca",
  "q9_pwa",
  "q10_recomendacao",
];

function normalizeMetricRows(rows, period) {
  return rows
    .filter((row) => row.period === period)
    .map((row) => ({
      date: row.date,
      count: Number(row.count) || 0,
    }));
}

function calculateSurveyAverage(rows, columns) {
  if (!rows.length) {
    return { sum: 0, average: 0 };
  }

  const sum = rows.reduce((total, row) => {
    const responseTotal = columns.reduce(
      (questionTotal, column) =>
        questionTotal + (Number(row[column]) || 0),
      0,
    );

    return total + responseTotal / columns.length;
  }, 0);

  return {
    sum,
    average: sum / rows.length,
  };
}

function ensureQuerySuccess(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result;
}

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        {
          status: auth.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (!postgresPool) {
      return NextResponse.json(
        {
          success: false,
          message: "Conexão de relatórios não configurada no servidor.",
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const { db } = auth;

    const metricsQuery = postgresPool.query(`
      WITH metrics AS (
        SELECT
          'daily'::text AS period,
          to_char(
            date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'),
            'YYYY-MM-DD'
          ) AS date,
          count(*) FILTER (WHERE action = 'page_view')::int AS accesses,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND user_role = 'LAWYER'
          )::int AS lawyers,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND user_role = 'CLIENT'
          )::int AS clients
        FROM public.access_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')

        UNION ALL

        SELECT
          'weekly'::text AS period,
          to_char(
            date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo'),
            'YYYY-"W"IW'
          ) AS date,
          count(*) FILTER (WHERE action = 'page_view')::int AS accesses,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND user_role = 'LAWYER'
          )::int AS lawyers,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND user_role = 'CLIENT'
          )::int AS clients
        FROM public.access_logs
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo')

        UNION ALL

        SELECT
          'monthly'::text AS period,
          to_char(
            date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo'),
            'YYYY-MM'
          ) AS date,
          count(*) FILTER (WHERE action = 'page_view')::int AS accesses,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND user_role = 'LAWYER'
          )::int AS lawyers,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND user_role = 'CLIENT'
          )::int AS clients
        FROM public.access_logs
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')
      )
      SELECT period, date, accesses, lawyers, clients
      FROM metrics
      ORDER BY period, date ASC;
    `);

    const [
      metricsResult,
      totalLawyersResult,
      totalClientsResult,
      usageStatsResult,
      advocateSurveysResult,
      clientSurveysResult,
    ] = await Promise.all([
      metricsQuery,
      db.from("advogados").select("id", { count: "exact", head: true }),
      db.from("clientes").select("id", { count: "exact", head: true }),
      db
        .from("advogados")
        .select("uso_redator_ia, uso_triagem, uso_agenda, uso_storage_mb"),
      db
        .from("pesquisas_satisfacao_advogados")
        .select(ADVOCATE_SURVEY_COLUMNS.join(",")),
      db
        .from("pesquisas_satisfacao_clientes")
        .select(CLIENT_SURVEY_COLUMNS.join(",")),
    ]);

    ensureQuerySuccess(totalLawyersResult, "Total de advogados");
    ensureQuerySuccess(totalClientsResult, "Total de clientes");
    ensureQuerySuccess(usageStatsResult, "Uso de ferramentas premium");
    ensureQuerySuccess(advocateSurveysResult, "Pesquisas de advogados");
    ensureQuerySuccess(clientSurveysResult, "Pesquisas de clientes");

    const metricRows = metricsResult.rows || [];
    const periods = ["daily", "weekly", "monthly"];

    const accesses = {};
    const lawyers = {};
    const clients = {};

    periods.forEach((period) => {
      accesses[period] = normalizeMetricRows(
        metricRows.map((row) => ({
          period: row.period,
          date: row.date,
          count: row.accesses,
        })),
        period,
      );

      lawyers[period] = normalizeMetricRows(
        metricRows.map((row) => ({
          period: row.period,
          date: row.date,
          count: row.lawyers,
        })),
        period,
      );

      clients[period] = normalizeMetricRows(
        metricRows.map((row) => ({
          period: row.period,
          date: row.date,
          count: row.clients,
        })),
        period,
      );
    });

    const usageData = usageStatsResult.data || [];
    const lawyerDivisor = Math.max(usageData.length, 1);

    function summarizeUsage(column) {
      const total = usageData.reduce(
        (sum, row) => sum + (Number(row[column]) || 0),
        0,
      );

      return {
        total: Number(total.toFixed(2)),
        avg: Number((total / lawyerDivisor).toFixed(2)),
      };
    }

    const advocateSurvey = calculateSurveyAverage(
      advocateSurveysResult.data || [],
      ADVOCATE_SURVEY_COLUMNS,
    );
    const clientSurvey = calculateSurveyAverage(
      clientSurveysResult.data || [],
      CLIENT_SURVEY_COLUMNS,
    );

    const totalSurveys =
      (advocateSurveysResult.data || []).length +
      (clientSurveysResult.data || []).length;

    const overallAverage = totalSurveys
      ? (advocateSurvey.sum + clientSurvey.sum) / totalSurveys
      : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          accesses,
          lawyers,
          clients,
          totals: {
            lawyers: totalLawyersResult.count || 0,
            clients: totalClientsResult.count || 0,
          },
          satisfaction: {
            overallAvg: Number(overallAverage.toFixed(1)),
            advAvg: Number(advocateSurvey.average.toFixed(1)),
            cliAvg: Number(clientSurvey.average.toFixed(1)),
            totalSurveys,
          },
          premiumUsageSummary: {
            redator: summarizeUsage("uso_redator_ia"),
            triagem: summarizeUsage("uso_triagem"),
            agenda: summarizeUsage("uso_agenda"),
            storage: summarizeUsage("uso_storage_mb"),
          },
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[Admin/Reports/Usage] Erro:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível gerar os dados do relatório.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { postgresPool } from "@/lib/postgres";

import {
  ADVOCATE_SURVEY_COLUMNS,
  CLIENT_SURVEY_COLUMNS,
} from "./reportUsageConfig";

export async function requireReportAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    const error = new Error(auth.message);
    error.status = auth.status;
    throw error;
  }

  if (!postgresPool) {
    const error = new Error("Conexão de relatórios não configurada no servidor.");
    error.status = 503;
    throw error;
  }

  return auth;
}

function normalizeMetricRows(rows, period, key) {
  return rows
    .filter((row) => row.period === period)
    .map((row) => ({
      date: row.date,
      count: Number(row[key]) || 0,
    }));
}

function calculateSurveyAverage(rows, columns) {
  if (!rows.length) return { sum: 0, average: 0 };

  const sum = rows.reduce((total, row) => {
    const responseTotal = columns.reduce(
      (questionTotal, column) =>
        questionTotal + (Number(row[column]) || 0),
      0,
    );

    return total + responseTotal / columns.length;
  }, 0);

  return { sum, average: sum / rows.length };
}

function summarizeUsage(rows, column) {
  const divisor = Math.max(rows.length, 1);
  const total = rows.reduce(
    (sum, row) => sum + (Number(row[column]) || 0),
    0,
  );

  return {
    total: Number(total.toFixed(2)),
    avg: Number((total / divisor).toFixed(2)),
  };
}

function ensureQuerySuccess(result, label) {
  if (result?.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
}

async function loadTelemetry(period) {
  const metricsPromise = postgresPool.query(
    `
      WITH metrics AS (
        SELECT
          'daily'::text AS period,
          to_char(
            date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'),
            'YYYY-MM-DD'
          ) AS date,
          count(*) FILTER (WHERE action = 'page_view')::int AS accesses,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND upper(user_role) = 'LAWYER'
          )::int AS lawyers,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND upper(user_role) = 'CLIENT'
          )::int AS clients
        FROM public.access_logs
        WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
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
            WHERE action = 'login' AND upper(user_role) = 'LAWYER'
          )::int AS lawyers,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND upper(user_role) = 'CLIENT'
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
            WHERE action = 'login' AND upper(user_role) = 'LAWYER'
          )::int AS lawyers,
          count(DISTINCT user_id) FILTER (
            WHERE action = 'login' AND upper(user_role) = 'CLIENT'
          )::int AS clients
        FROM public.access_logs
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')
      )
      SELECT period, date, accesses, lawyers, clients
      FROM metrics
      ORDER BY period, date ASC;
    `,
    [period],
  );

  const summaryPromise = postgresPool.query(
    `
      SELECT
        count(*) FILTER (WHERE action = 'page_view')::int AS page_views,
        count(DISTINCT user_id) FILTER (
          WHERE action = 'login' AND upper(user_role) = 'LAWYER'
        )::int AS unique_lawyers,
        count(DISTINCT user_id) FILTER (
          WHERE action = 'login' AND upper(user_role) = 'CLIENT'
        )::int AS unique_clients
      FROM public.access_logs
      WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day');
    `,
    [period],
  );

  const [metricsResult, summaryResult] = await Promise.all([
    metricsPromise,
    summaryPromise,
  ]);

  return {
    metricRows: metricsResult.rows || [],
    summaryRow: summaryResult.rows?.[0] || {},
  };
}

function isMissingConversionTable(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    message.includes("public_conversion_events")
  );
}

async function loadHomeConversionAnalytics(period) {
  const homeViewsResult = await postgresPool.query(
    `
      SELECT
        to_char(
          date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'),
          'YYYY-MM-DD'
        ) AS date,
        count(*)::int AS home_views
      FROM public.access_logs
      WHERE action = 'page_view'
        AND path = '/'
        AND created_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date ASC;
    `,
    [period],
  );

  let eventRows = [];
  let available = true;

  try {
    const eventResult = await postgresPool.query(
      `
        SELECT
          to_char(
            date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'),
            'YYYY-MM-DD'
          ) AS date,
          count(*) FILTER (
            WHERE event_name = 'hero_client_cta_click'
          )::int AS client_clicks,
          count(*) FILTER (
            WHERE event_name = 'hero_lawyer_cta_click'
          )::int AS lawyer_clicks
        FROM public.public_conversion_events
        WHERE path = '/'
          AND created_at >= NOW() - ($1::int * INTERVAL '1 day')
        GROUP BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')
        ORDER BY date ASC;
      `,
      [period],
    );

    eventRows = eventResult.rows || [];
  } catch (error) {
    if (!isMissingConversionTable(error)) throw error;
    available = false;
  }

  const valuesByDate = new Map();

  function ensureDate(date) {
    if (!valuesByDate.has(date)) {
      valuesByDate.set(date, {
        date,
        homeViews: 0,
        clientClicks: 0,
        lawyerClicks: 0,
        totalClicks: 0,
      });
    }

    return valuesByDate.get(date);
  }

  (homeViewsResult.rows || []).forEach((row) => {
    ensureDate(row.date).homeViews = Number(row.home_views) || 0;
  });

  eventRows.forEach((row) => {
    const item = ensureDate(row.date);
    item.clientClicks = Number(row.client_clicks) || 0;
    item.lawyerClicks = Number(row.lawyer_clicks) || 0;
    item.totalClicks = item.clientClicks + item.lawyerClicks;
  });

  const daily = Array.from(valuesByDate.values()).sort((first, second) =>
    first.date.localeCompare(second.date),
  );

  const summary = daily.reduce(
    (current, item) => {
      current.homeViews += item.homeViews;
      current.clientClicks += item.clientClicks;
      current.lawyerClicks += item.lawyerClicks;
      current.totalClicks += item.totalClicks;
      return current;
    },
    {
      homeViews: 0,
      clientClicks: 0,
      lawyerClicks: 0,
      totalClicks: 0,
      interactionRate: 0,
    },
  );

  summary.interactionRate = summary.homeViews
    ? Number(((summary.totalClicks / summary.homeViews) * 100).toFixed(1))
    : 0;

  return { available, summary, daily };
}

export async function buildUsageReportData(auth, options) {
  const { db } = auth;

  const totalLawyersPromise =
    options.includeDbTotals && options.includeLawyers
      ? db.from("advogados").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0, error: null });

  const totalClientsPromise =
    options.includeDbTotals && options.includeClients
      ? db.from("clientes").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0, error: null });

  const usagePromise = options.includePremiumUsage
    ? db
        .from("advogados")
        .select("uso_redator_ia, uso_triagem, uso_agenda, uso_storage_mb")
    : Promise.resolve({ data: [], error: null });

  const advocateSurveyPromise =
    options.includeSatisfaction && options.includeLawyers
      ? db
          .from("pesquisas_satisfacao_advogados")
          .select(ADVOCATE_SURVEY_COLUMNS.join(","))
      : Promise.resolve({ data: [], error: null });

  const clientSurveyPromise =
    options.includeSatisfaction && options.includeClients
      ? db
          .from("pesquisas_satisfacao_clientes")
          .select(CLIENT_SURVEY_COLUMNS.join(","))
      : Promise.resolve({ data: [], error: null });

  const [
    telemetry,
    homeConversion,
    totalLawyersResult,
    totalClientsResult,
    usageResult,
    advocateSurveysResult,
    clientSurveysResult,
  ] = await Promise.all([
    loadTelemetry(options.period),
    loadHomeConversionAnalytics(options.period),
    totalLawyersPromise,
    totalClientsPromise,
    usagePromise,
    advocateSurveyPromise,
    clientSurveyPromise,
  ]);

  ensureQuerySuccess(totalLawyersResult, "Total de advogados");
  ensureQuerySuccess(totalClientsResult, "Total de clientes");
  ensureQuerySuccess(usageResult, "Uso de ferramentas premium");
  ensureQuerySuccess(advocateSurveysResult, "Pesquisas de advogados");
  ensureQuerySuccess(clientSurveysResult, "Pesquisas de clientes");

  const periods = ["daily", "weekly", "monthly"];
  const accesses = {};
  const lawyers = {};
  const clients = {};

  for (const metricPeriod of periods) {
    accesses[metricPeriod] = normalizeMetricRows(
      telemetry.metricRows,
      metricPeriod,
      "accesses",
    );
    lawyers[metricPeriod] = options.includeLawyers
      ? normalizeMetricRows(telemetry.metricRows, metricPeriod, "lawyers")
      : [];
    clients[metricPeriod] = options.includeClients
      ? normalizeMetricRows(telemetry.metricRows, metricPeriod, "clients")
      : [];
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
  const usageRows = usageResult.data || [];

  return {
    generatedAt: new Date().toISOString(),
    timezone: "America/Sao_Paulo",
    options,
    generatedBy: {
      id: auth.admin.id,
      name: auth.admin.name || "Administrador",
      email: auth.admin.email || "",
    },
    summary: {
      accesses: Number(telemetry.summaryRow.page_views) || 0,
      lawyers: options.includeLawyers
        ? Number(telemetry.summaryRow.unique_lawyers) || 0
        : 0,
      clients: options.includeClients
        ? Number(telemetry.summaryRow.unique_clients) || 0
        : 0,
    },
    accesses,
    lawyers,
    clients,
    homeConversion,
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
      redator: summarizeUsage(usageRows, "uso_redator_ia"),
      triagem: summarizeUsage(usageRows, "uso_triagem"),
      agenda: summarizeUsage(usageRows, "uso_agenda"),
      storage: summarizeUsage(usageRows, "uso_storage_mb"),
    },
  };
}

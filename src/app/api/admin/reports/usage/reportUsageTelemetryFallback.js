// Telemetria calculada via Supabase (PostgREST) quando a conexão Postgres
// direta (DATABASE_URL) não está disponível. Reproduz as agregações SQL de
// reportUsageData.js usando contagens `head` e leitura paginada dos logins.

const DAY_MS = 24 * 60 * 60 * 1000;
// America/Sao_Paulo não tem horário de verão desde 2019 (UTC-03:00 fixo).
const SAO_PAULO_OFFSET_MS = -3 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const MAX_PARALLEL_QUERIES = 8;

function toLocal(date) {
  return new Date(date.getTime() + SAO_PAULO_OFFSET_MS);
}

function fromLocal(localDate) {
  return new Date(localDate.getTime() - SAO_PAULO_OFFSET_MS);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function startOfLocalDay(date) {
  const local = toLocal(date);
  return fromLocal(
    new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
    ),
  );
}

function startOfLocalWeek(date) {
  const dayStart = startOfLocalDay(date);
  const weekday = (toLocal(dayStart).getUTCDay() + 6) % 7; // segunda = 0
  return new Date(dayStart.getTime() - weekday * DAY_MS);
}

function startOfLocalMonth(date) {
  const local = toLocal(date);
  return fromLocal(
    new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1)),
  );
}

function addLocalMonths(monthStart, amount) {
  const local = toLocal(monthStart);
  return fromLocal(
    new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + amount, 1)),
  );
}

function isoWeekNumber(localDate) {
  const target = new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
    ),
  );
  const weekday = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);
  return 1 + Math.round((target - firstThursday) / (7 * DAY_MS));
}

function formatDay(start) {
  const local = toLocal(start);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(
    local.getUTCDate(),
  )}`;
}

// Mesmo formato do to_char(..., 'YYYY-"W"IW') usado na consulta SQL.
function formatWeek(start) {
  const local = toLocal(start);
  return `${local.getUTCFullYear()}-W${pad(isoWeekNumber(local))}`;
}

function formatMonth(start) {
  const local = toLocal(start);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}`;
}

function buildBuckets(since, now, startOf, next, format) {
  const buckets = [];
  let cursor = startOf(since);

  while (cursor < now) {
    const end = next(cursor);
    buckets.push({
      date: format(cursor),
      from: cursor < since ? since : cursor,
      to: end > now ? now : end,
    });
    cursor = end;
  }

  return buckets;
}

function dailyBuckets(since, now) {
  return buildBuckets(
    since,
    now,
    startOfLocalDay,
    (start) => new Date(start.getTime() + DAY_MS),
    formatDay,
  );
}

function weeklyBuckets(since, now) {
  return buildBuckets(
    since,
    now,
    startOfLocalWeek,
    (start) => new Date(start.getTime() + 7 * DAY_MS),
    formatWeek,
  );
}

function monthlyBuckets(since, now) {
  return buildBuckets(
    since,
    now,
    startOfLocalMonth,
    (start) => addLocalMonths(start, 1),
    formatMonth,
  );
}

function bucketKeyFor(createdAt, startOf, format) {
  return format(startOf(new Date(createdAt)));
}

async function runLimited(tasks) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_QUERIES, tasks.length) }, worker),
  );

  return results;
}

async function countRows(db, table, label, applyFilters) {
  const query = applyFilters(
    db.from(table).select("id", { count: "exact", head: true }),
  );
  const { count, error } = await query;

  if (error) throw new Error(`${label}: ${error.message}`);
  return count || 0;
}

async function fetchAllRows(db, table, columns, applyFilters) {
  const rows = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = applyFilters(db.from(table).select(columns))
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const { data, error } = await query;

    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}

function countPageViews(db, from, to, path) {
  return countRows(db, "access_logs", "Acessos", (query) => {
    let filtered = query
      .eq("action", "page_view")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString());
    if (path) filtered = filtered.eq("path", path);
    return filtered;
  });
}

function uniqueLoginsByBucket(logins, startOf, format) {
  const buckets = new Map();

  logins.forEach((login) => {
    if (!login.user_id) return;

    const role = String(login.user_role || "").toUpperCase();
    if (role !== "LAWYER" && role !== "CLIENT") return;

    const key = bucketKeyFor(login.created_at, startOf, format);
    if (!buckets.has(key)) {
      buckets.set(key, { LAWYER: new Set(), CLIENT: new Set() });
    }
    buckets.get(key)[role].add(login.user_id);
  });

  return buckets;
}

function uniqueLogins(logins, since, role) {
  const users = new Set();

  logins.forEach((login) => {
    if (
      login.user_id &&
      new Date(login.created_at) >= since &&
      String(login.user_role || "").toUpperCase() === role
    ) {
      users.add(login.user_id);
    }
  });

  return users.size;
}

export async function loadTelemetryViaSupabase(db, period) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - period * DAY_MS);
  const weeklyStart = new Date(now.getTime() - 12 * 7 * DAY_MS);
  const monthlyStart = new Date(now);
  monthlyStart.setUTCMonth(monthlyStart.getUTCMonth() - 6);

  const groups = [
    {
      period: "daily",
      buckets: dailyBuckets(periodStart, now),
      startOf: startOfLocalDay,
      format: formatDay,
    },
    {
      period: "weekly",
      buckets: weeklyBuckets(weeklyStart, now),
      startOf: startOfLocalWeek,
      format: formatWeek,
    },
    {
      period: "monthly",
      buckets: monthlyBuckets(monthlyStart, now),
      startOf: startOfLocalMonth,
      format: formatMonth,
    },
  ];

  const countTasks = groups.flatMap((group) =>
    group.buckets.map(
      (bucket) => () => countPageViews(db, bucket.from, bucket.to),
    ),
  );
  countTasks.push(() => countPageViews(db, periodStart, now));

  const [counts, logins] = await Promise.all([
    runLimited(countTasks),
    fetchAllRows(
      db,
      "access_logs",
      "user_id, user_role, created_at",
      (query) =>
        query
          .eq("action", "login")
          .gte(
            "created_at",
            new Date(
              Math.min(weeklyStart.getTime(), monthlyStart.getTime()),
            ).toISOString(),
          ),
    ).catch((error) => {
      throw new Error(`Logins: ${error.message}`);
    }),
  ]);

  const metricRows = [];
  let countIndex = 0;

  groups.forEach((group) => {
    const groupLogins = logins.filter((login) => {
      const createdAt = new Date(login.created_at);
      return createdAt >= group.buckets[0]?.from && createdAt < now;
    });
    const loginsByBucket = uniqueLoginsByBucket(
      groupLogins,
      group.startOf,
      group.format,
    );

    group.buckets.forEach((bucket) => {
      const accesses = counts[countIndex++];
      const bucketLogins = loginsByBucket.get(bucket.date);
      const lawyers = bucketLogins?.LAWYER.size || 0;
      const clients = bucketLogins?.CLIENT.size || 0;

      // A consulta SQL agrupa apenas dias/semanas/meses com registros.
      if (!accesses && !bucketLogins) return;

      metricRows.push({
        period: group.period,
        date: bucket.date,
        accesses,
        lawyers,
        clients,
      });
    });
  });

  return {
    metricRows,
    summaryRow: {
      page_views: counts[countIndex],
      unique_lawyers: uniqueLogins(logins, periodStart, "LAWYER"),
      unique_clients: uniqueLogins(logins, periodStart, "CLIENT"),
    },
  };
}

export async function loadHomeEventsViaSupabase(db, period, options = {}) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - period * DAY_MS);
  const buckets = dailyBuckets(periodStart, now);

  const homeViewCounts = await runLimited(
    buckets.map((bucket) => () =>
      countPageViews(db, bucket.from, bucket.to, "/"),
    ),
  );

  const homeViewRows = buckets
    .map((bucket, index) => ({
      date: bucket.date,
      home_views: homeViewCounts[index],
    }))
    .filter((row) => row.home_views > 0);

  if (options.skipEvents) return { homeViewRows, eventRows: null };

  const events = await fetchAllRows(
    db,
    "public_conversion_events",
    "event_name, created_at",
    (query) =>
      query
        .eq("path", "/")
        .in("event_name", ["hero_client_cta_click", "hero_lawyer_cta_click"])
        .gte("created_at", periodStart.toISOString()),
  );

  const eventsByDate = new Map();
  events.forEach((event) => {
    const date = bucketKeyFor(event.created_at, startOfLocalDay, formatDay);
    if (!eventsByDate.has(date)) {
      eventsByDate.set(date, { date, client_clicks: 0, lawyer_clicks: 0 });
    }
    const row = eventsByDate.get(date);
    if (event.event_name === "hero_client_cta_click") row.client_clicks += 1;
    if (event.event_name === "hero_lawyer_cta_click") row.lawyer_clicks += 1;
  });

  return {
    homeViewRows,
    eventRows: Array.from(eventsByDate.values()),
  };
}

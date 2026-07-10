import { supabaseAdmin } from "@/lib/supabase";

// Telemetria da atividade do aluno. IDs (instituição/programa/vínculo) vêm do
// CONTEXT resolvido no servidor — nunca do frontend. Nunca lança.

export const ORACULO_EVENTS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  HEARTBEAT: "HEARTBEAT",
  PAGE_VIEW: "PAGE_VIEW",
  CASE_OPEN: "CASE_OPEN",
  INTERVIEW_START: "INTERVIEW_START",
  INTERVIEW_MESSAGE: "INTERVIEW_MESSAGE",
  INTERVIEW_END: "INTERVIEW_END",
  ANALYSIS_OPEN: "ANALYSIS_OPEN",
  ANALYSIS_EDIT: "ANALYSIS_EDIT",
  ANALYSIS_SUBMIT: "ANALYSIS_SUBMIT",
  ENCAMINHAMENTO: "ENCAMINHAMENTO",
  ACTION: "ACTION",
};

const MAX_EVENTS_PER_REQUEST = 60;
const STR = (v, max) => (typeof v === "string" ? v.slice(0, max) : null);

function baseIds(context) {
  return {
    oraculo_id: context.oraculoId,
    estudante_vinculo_id: context.studentProgramLinkId || null,
    instituicao_id: context.institutionId || null,
    programa_id: context.programId || null,
  };
}

function mergeSurfaces(current, events, activeMsDelta) {
  const out = { ...(current && typeof current === "object" ? current : {}) };
  // Distribui o tempo ativo do heartbeat na tela informada em cada evento.
  for (const ev of events) {
    const key = STR(ev.surface, 160) || "desconhecido";
    const entry = out[key] || { ms: 0, count: 0 };
    entry.count += 1;
    entry.ms += Number(ev.activeMs) || 0;
    out[key] = entry;
  }
  // Se sobrou tempo ativo não atribuído a evento, joga no surface mais recente.
  const leftover =
    (Number(activeMsDelta) || 0) -
    events.reduce((s, e) => s + (Number(e.activeMs) || 0), 0);
  if (leftover > 0 && events.length) {
    const key = STR(events[events.length - 1].surface, 160) || "desconhecido";
    const entry = out[key] || { ms: 0, count: 0 };
    entry.ms += leftover;
    out[key] = entry;
  }
  return out;
}

/**
 * Ingesta um lote de eventos + atualiza a sessão. context é do servidor.
 * payload: { sessionKey, userAgent, activeMsDelta, ended, events[] }.
 */
export async function ingestTelemetry({ context, payload }) {
  if (!supabaseAdmin || !context?.oraculoId || !payload?.sessionKey) return { ok: false };

  const sessionKey = STR(payload.sessionKey, 120);
  const events = Array.isArray(payload.events)
    ? payload.events.slice(0, MAX_EVENTS_PER_REQUEST)
    : [];
  const activeMsDelta = Math.max(0, Math.min(Number(payload.activeMsDelta) || 0, 3600000));
  const nowIso = new Date().toISOString();
  const ids = baseIds(context);

  try {
    // 1. Sessão (upsert manual para acumular contadores).
    const { data: existing } = await supabaseAdmin
      .from("oraculo_sessoes")
      .select("id, active_ms, event_count, surfaces")
      .eq("oraculo_id", ids.oraculo_id)
      .eq("session_key", sessionKey)
      .maybeSingle();

    const surfaces = mergeSurfaces(existing?.surfaces, events, activeMsDelta);

    if (existing) {
      await supabaseAdmin
        .from("oraculo_sessoes")
        .update({
          last_seen_at: nowIso,
          active_ms: (Number(existing.active_ms) || 0) + activeMsDelta,
          event_count: (existing.event_count || 0) + events.length,
          surfaces,
          ended_at: payload.ended ? nowIso : null,
          updated_at: nowIso,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("oraculo_sessoes").insert([
        {
          session_key: sessionKey,
          ...ids,
          started_at: nowIso,
          last_seen_at: nowIso,
          active_ms: activeMsDelta,
          event_count: events.length,
          surfaces,
          ended_at: payload.ended ? nowIso : null,
          user_agent: STR(payload.userAgent, 400),
        },
      ]);
    }

    // 2. Eventos.
    if (events.length) {
      const rows = events.map((ev) => ({
        session_key: sessionKey,
        ...ids,
        event_type: STR(ev.type, 60) || ORACULO_EVENTS.ACTION,
        surface: STR(ev.surface, 200),
        ref_type: STR(ev.refType, 60),
        ref_id: STR(ev.refId, 120),
        metadata: ev.metadata && typeof ev.metadata === "object" ? ev.metadata : {},
        active_ms: Math.max(0, Math.min(Number(ev.activeMs) || 0, 3600000)),
        client_ts: ev.clientTs || null,
      }));
      await supabaseAdmin.from("oraculo_atividade_eventos").insert(rows);
    }

    return { ok: true };
  } catch (error) {
    console.error("[OraculoTelemetry] Falha ao ingerir:", error?.message);
    return { ok: false };
  }
}

/**
 * Registra um único evento no servidor (fluxos server-side: entrevista, mesa…).
 * Não contabiliza sessão. Nunca lança.
 */
export async function logOraculoEvent({
  context,
  type,
  surface = null,
  refType = null,
  refId = null,
  metadata = {},
  sessionKey = null,
}) {
  if (!supabaseAdmin || !context?.oraculoId || !type) return;
  try {
    await supabaseAdmin.from("oraculo_atividade_eventos").insert([
      {
        session_key: sessionKey,
        ...baseIds(context),
        event_type: STR(type, 60),
        surface: STR(surface, 200),
        ref_type: STR(refType, 60),
        ref_id: STR(refId, 120),
        metadata: metadata && typeof metadata === "object" ? metadata : {},
        active_ms: 0,
        client_ts: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error("[OraculoTelemetry] Falha ao logar evento:", error?.message);
  }
}

function msToHuman(ms) {
  const totalMin = Math.round((Number(ms) || 0) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/**
 * Resumo de atividade de um aluno para o painel da instituição.
 * Recebe estudanteVinculoId (linha da lista) OU oraculoId.
 */
export async function getStudentTelemetrySummary({ oraculoId, estudanteVinculoId, days = 30 } = {}) {
  if (!supabaseAdmin || (!oraculoId && !estudanteVinculoId)) return null;

  // Resolve oraculoId a partir do vínculo, se necessário.
  let resolvedOraculoId = oraculoId;
  if (!resolvedOraculoId && estudanteVinculoId) {
    const { data: link } = await supabaseAdmin
      .from("oraculo_estudante_vinculos_academicos")
      .select("oraculo_profissional_id")
      .eq("id", estudanteVinculoId)
      .maybeSingle();
    resolvedOraculoId = link?.oraculo_profissional_id || null;
  }
  if (!resolvedOraculoId) return null;

  const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [sessionsRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("oraculo_sessoes")
      .select("active_ms, started_at, last_seen_at, ended_at, event_count, surfaces")
      .eq("oraculo_id", resolvedOraculoId)
      .gte("last_seen_at", sinceIso)
      .order("last_seen_at", { ascending: false }),
    supabaseAdmin
      .from("oraculo_atividade_eventos")
      .select("event_type, surface, ref_type, ref_id, metadata, created_at")
      .eq("oraculo_id", resolvedOraculoId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const sessions = sessionsRes.data || [];
  const events = eventsRes.data || [];

  const totalActiveMs = sessions.reduce((s, x) => s + (Number(x.active_ms) || 0), 0);
  const todayActiveMs = sessions
    .filter((x) => x.last_seen_at && new Date(x.last_seen_at) >= startOfToday)
    .reduce((s, x) => s + (Number(x.active_ms) || 0), 0);

  const byType = {};
  for (const ev of events) byType[ev.event_type] = (byType[ev.event_type] || 0) + 1;

  const bySurface = {};
  for (const sess of sessions) {
    const sf = sess.surfaces && typeof sess.surfaces === "object" ? sess.surfaces : {};
    for (const [key, val] of Object.entries(sf)) {
      const entry = bySurface[key] || { ms: 0, count: 0 };
      entry.ms += Number(val?.ms) || 0;
      entry.count += Number(val?.count) || 0;
      bySurface[key] = entry;
    }
  }

  return {
    oraculoId: resolvedOraculoId,
    sessionsCount: sessions.length,
    lastSeenAt: sessions[0]?.last_seen_at || null,
    totalOnline: msToHuman(totalActiveMs),
    todayOnline: msToHuman(todayActiveMs),
    totalActiveMs,
    todayActiveMs,
    eventsByType: byType,
    surfaces: Object.entries(bySurface)
      .map(([surface, v]) => ({ surface, online: msToHuman(v.ms), ms: v.ms, count: v.count }))
      .sort((a, b) => b.ms - a.ms),
    recentEvents: events.slice(0, 30).map((ev) => ({
      type: ev.event_type,
      surface: ev.surface,
      refType: ev.ref_type,
      refId: ev.ref_id,
      metadata: ev.metadata || {},
      at: ev.created_at,
    })),
  };
}

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getVerifiedOfficeSession } from "@/lib/officeSession";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { sanitizeString } from "@/lib/securityUtils";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store",
};
const CHANNEL_TYPES = new Set(["texto", "voz", "video"]);
const ACTIONS = new Set([
  "CREATE_CHANNEL",
  "DELETE_CHANNEL",
  "SEND_MESSAGE",
  "JOIN_VOICE",
  "LEAVE_VOICE",
  "TOGGLE_MUTE",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function limitText(value, maxLength) {
  return sanitizeString(value || "").slice(0, maxLength);
}

function isUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

function canUseCommunication(user) {
  if (!user) return false;
  if (user.cargo === "admin" || user.cargo === "advogado") return true;
  return Boolean(user.permissoes?.ver_comunicacao);
}

function canManageChannels(user) {
  return user?.cargo === "admin";
}

async function getOfficeSessionAccess(request, db) {
  const session = getVerifiedOfficeSession(request);
  if (!session?.id || !isUuid(session.id)) return null;

  const { data: office, error } = await db
    .from("escritorios")
    .select("id, nome, email")
    .eq("id", session.id)
    .maybeSingle();

  if (error || !office) return null;

  return {
    officeId: office.id,
    user: {
      id: office.id,
      name: `${office.nome || session.nome || "Escritorio"} (Gestor)`,
      cargo: "admin",
      permissoes: { ver_comunicacao: true },
    },
  };
}

async function getLawyerAccess(request, db) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser?.id) return null;

  const { data: profile, error } = await db
    .from("advogados")
    .select("id, name, cargo, escritorio_id, permissoes")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error || !profile?.escritorio_id) return null;

  const access = {
    officeId: profile.escritorio_id,
    user: {
      id: profile.id,
      name: profile.name || "Membro",
      cargo: profile.cargo || "advogado",
      permissoes: profile.permissoes || {},
    },
  };

  return canUseCommunication(access.user) ? access : null;
}

async function getSessionInfo(request) {
  const supabase = createClient();
  const db = supabaseAdmin || supabase;

  const officeAccess = await getOfficeSessionAccess(request, db);
  if (officeAccess) return { ...officeAccess, db };

  const lawyerAccess = await getLawyerAccess(request, db);
  if (lawyerAccess) return { ...lawyerAccess, db };

  return { officeId: null, user: null, db };
}

async function assertChannel(db, officeId, channelId, expectedTypes = null) {
  if (!channelId || !isUuid(channelId)) {
    return { ok: false, message: "Canal invalido." };
  }

  const { data, error } = await db
    .from("escritorio_canais")
    .select("id, tipo, limite_pessoas")
    .eq("id", channelId)
    .eq("escritorio_id", officeId)
    .maybeSingle();

  if (error || !data) return { ok: false, message: "Canal nao encontrado." };
  if (expectedTypes && !expectedTypes.includes(data.tipo)) {
    return { ok: false, message: "Tipo de canal invalido para esta acao." };
  }
  return { ok: true, channel: data };
}

async function listCommunication(db, officeId, user) {
  const [
    { data: canais, error: canaisError },
    { data: mensagens, error: mensagensError },
    { data: participantesVoz, error: vozError },
  ] = await Promise.all([
    db
      .from("escritorio_canais")
      .select("id, escritorio_id, tipo, nome, limite_pessoas, created_at")
      .eq("escritorio_id", officeId)
      .order("created_at", { ascending: true }),
    db
      .from("escritorio_mensagens")
      .select("id, escritorio_id, canal_id, sender_name, sender_cargo, mensagem, created_at")
      .eq("escritorio_id", officeId)
      .order("created_at", { ascending: true })
      .limit(150),
    db
      .from("escritorio_voz_participantes")
      .select("id, escritorio_id, canal_id, member_id, member_name, member_cargo, mutado, joined_at")
      .eq("escritorio_id", officeId)
      .order("joined_at", { ascending: true }),
  ]);

  if (canaisError) throw canaisError;
  if (mensagensError) throw mensagensError;
  if (vozError) throw vozError;

  return json({
    success: true,
    user,
    canais: canais || [],
    mensagens: mensagens || [],
    participantesVoz: participantesVoz || [],
  });
}

export async function GET(request) {
  try {
    const { officeId, user, db } = await getSessionInfo(request);
    if (!officeId) {
      return json({ success: false, message: "Nao autorizado." }, { status: 401 });
    }

    return await listCommunication(db, officeId, user);
  } catch (error) {
    console.error("Erro no GET /api/escritorio/comunicacao:", error);
    return json(
      { success: false, message: "Erro interno ao carregar comunicacao." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { officeId, user, db } = await getSessionInfo(request);
    if (!officeId) {
      return json({ success: false, message: "Nao autorizado." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const action = String(body?.action || "").trim().toUpperCase();
    if (!ACTIONS.has(action)) {
      return json({ success: false, message: "Acao invalida." }, { status: 400 });
    }

    if (action === "CREATE_CHANNEL") {
      if (!canManageChannels(user)) {
        return json(
          { success: false, message: "Apenas gestores podem criar canais." },
          { status: 403 },
        );
      }

      const tipo = String(body?.tipo || "").trim();
      const nome = limitText(body?.nome, 60);
      const limite = Math.max(0, Math.min(100, Number(body?.limite || 0) || 0));

      if (!CHANNEL_TYPES.has(tipo) || !nome) {
        return json(
          { success: false, message: "Revise o tipo e o nome do canal." },
          { status: 400 },
        );
      }

      const { data, error } = await db
        .from("escritorio_canais")
        .insert([
          {
            escritorio_id: officeId,
            tipo,
            nome,
            limite_pessoas: tipo === "voz" ? limite : 0,
          },
        ])
        .select("id, escritorio_id, tipo, nome, limite_pessoas, created_at")
        .single();

      if (error) throw error;
      return json({ success: true, data, message: "Canal criado com sucesso." });
    }

    if (action === "DELETE_CHANNEL") {
      if (!canManageChannels(user)) {
        return json(
          { success: false, message: "Apenas gestores podem excluir canais." },
          { status: 403 },
        );
      }

      const channelCheck = await assertChannel(db, officeId, body?.channelId);
      if (!channelCheck.ok) {
        return json({ success: false, message: channelCheck.message }, { status: 400 });
      }

      const { error } = await db
        .from("escritorio_canais")
        .delete()
        .eq("id", channelCheck.channel.id)
        .eq("escritorio_id", officeId);

      if (error) throw error;
      return json({ success: true, message: "Canal excluido com sucesso." });
    }

    if (action === "SEND_MESSAGE") {
      const mensagem = limitText(body?.mensagem, 2000);
      const channelId = body?.channelId || null;

      if (!mensagem) {
        return json(
          { success: false, message: "A mensagem nao pode ser vazia." },
          { status: 400 },
        );
      }

      if (channelId) {
        const channelCheck = await assertChannel(db, officeId, channelId, ["texto"]);
        if (!channelCheck.ok) {
          return json({ success: false, message: channelCheck.message }, { status: 400 });
        }
      }

      const { data, error } = await db
        .from("escritorio_mensagens")
        .insert([
          {
            escritorio_id: officeId,
            canal_id: channelId || null,
            sender_name: limitText(user.name, 120),
            sender_cargo: limitText(user.cargo, 30),
            mensagem,
          },
        ])
        .select("id, escritorio_id, canal_id, sender_name, sender_cargo, mensagem, created_at")
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "JOIN_VOICE") {
      const channelCheck = await assertChannel(db, officeId, body?.channelId, ["voz"]);
      if (!channelCheck.ok) {
        return json({ success: false, message: channelCheck.message }, { status: 400 });
      }

      const limit = Number(channelCheck.channel.limite_pessoas || 0);
      if (limit > 0) {
        const { count, error: countError } = await db
          .from("escritorio_voz_participantes")
          .select("id", { count: "exact", head: true })
          .eq("escritorio_id", officeId)
          .eq("canal_id", channelCheck.channel.id);
        if (countError) throw countError;
        if (Number(count || 0) >= limit) {
          return json(
            { success: false, message: "A sala de voz atingiu o limite de pessoas." },
            { status: 409 },
          );
        }
      }

      await db
        .from("escritorio_voz_participantes")
        .delete()
        .eq("escritorio_id", officeId)
        .eq("member_id", user.id);

      const { data, error } = await db
        .from("escritorio_voz_participantes")
        .insert([
          {
            escritorio_id: officeId,
            canal_id: channelCheck.channel.id,
            member_id: user.id,
            member_name: limitText(user.name, 120),
            member_cargo: limitText(user.cargo, 30),
            mutado: false,
          },
        ])
        .select("id, escritorio_id, canal_id, member_id, member_name, member_cargo, mutado, joined_at")
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "LEAVE_VOICE") {
      const { error } = await db
        .from("escritorio_voz_participantes")
        .delete()
        .eq("escritorio_id", officeId)
        .eq("member_id", user.id);

      if (error) throw error;
      return json({ success: true, message: "Saiu do canal de voz." });
    }

    if (action === "TOGGLE_MUTE") {
      const { data, error } = await db
        .from("escritorio_voz_participantes")
        .update({ mutado: Boolean(body?.mutado) })
        .eq("escritorio_id", officeId)
        .eq("member_id", user.id)
        .select("id, escritorio_id, canal_id, member_id, member_name, member_cargo, mutado, joined_at")
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    return json({ success: false, message: "Acao invalida." }, { status: 400 });
  } catch (error) {
    console.error("Erro no POST /api/escritorio/comunicacao:", error);
    return json(
      { success: false, message: "Erro interno ao processar comunicacao." },
      { status: 500 },
    );
  }
}

import { supabaseAdmin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const db = supabaseAdmin || supabase;

// Helper to authenticate the requester and return officeId + user profile
async function getSessionInfo() {
  const cookieStore = await cookies();
  
  // 1. Check if logged in as the Office Administrator
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return {
        officeId: decoded.id,
        user: {
          id: decoded.id,
          name: `${decoded.nome} (Gestor)`,
          cargo: "admin"
        }
      };
    } catch (e) {
      console.error("Erro ao decodificar cookie de escritorio:", e);
    }
  }

  // 2. Check if logged in as a normal lawyer/staff member under an office
  // We use the regular Supabase Auth user session
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      // Find lawyer info and their associated office
      const { data: adv, error: advError } = await db
        .from("advogados")
        .select("id, name, cargo, escritorio_id")
        .eq("id", user.id)
        .single();
      
      if (adv && adv.escritorio_id && !advError) {
        return {
          officeId: adv.escritorio_id,
          user: {
            id: adv.id,
            name: adv.name,
            cargo: adv.cargo || "advogado"
          }
        };
      }
    }
  } catch (e) {
    console.error("Erro ao obter usuario autenticado:", e);
  }

  return { officeId: null, user: null };
}

// GET /api/escritorio/comunicacao -> Obter canais, mensagens e participantes de voz
export async function GET(request) {
  try {
    const { officeId, user } = await getSessionInfo();
    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    // 1. Obter canais do escritório
    const { data: canais, error: canaisError } = await db
      .from("escritorio_canais")
      .select("*")
      .eq("escritorio_id", officeId)
      .order("created_at", { ascending: true });

    if (canaisError) throw canaisError;

    // 2. Obter mensagens (últimas 100 mensagens)
    const { data: mensagens, error: msgError } = await db
      .from("escritorio_mensagens")
      .select("*")
      .eq("escritorio_id", officeId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgError) throw msgError;

    // 3. Obter participantes de voz ativos
    const { data: participantesVoz, error: vozError } = await db
      .from("escritorio_voz_participantes")
      .select("*")
      .eq("escritorio_id", officeId)
      .order("joined_at", { ascending: true });

    if (vozError) throw vozError;

    return NextResponse.json({
      success: true,
      user,
      canais: canais || [],
      mensagens: mensagens || [],
      participantesVoz: participantesVoz || []
    });
  } catch (error) {
    console.error("Erro no GET /api/escritorio/comunicacao:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno" }, { status: 500 });
  }
}

// POST /api/escritorio/comunicacao -> Processar ações (criar canal, enviar msg, voz, etc)
export async function POST(request) {
  try {
    const { officeId, user } = await getSessionInfo();
    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: "Ação não informada" }, { status: 400 });
    }

    // Ação: CRIAR CANAL
    if (action === "CREATE_CHANNEL") {
      const { tipo, nome, limite } = body;
      if (!tipo || !nome) {
        return NextResponse.json({ success: false, message: "Tipo e nome do canal são obrigatórios" }, { status: 400 });
      }

      const { data, error } = await db
        .from("escritorio_canais")
        .insert([{
          escritorio_id: officeId,
          tipo, // 'texto', 'voz', 'video'
          nome: nome.trim(),
          limite_pessoas: Number(limite) || 0
        }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data, message: "Canal criado com sucesso!" });
    }

    // Ação: DELETAR CANAL
    if (action === "DELETE_CHANNEL") {
      const { channelId } = body;
      if (!channelId) {
        return NextResponse.json({ success: false, message: "ID do canal obrigatório" }, { status: 400 });
      }

      // Certificar que pertence ao escritório
      const { error } = await db
        .from("escritorio_canais")
        .delete()
        .eq("id", channelId)
        .eq("escritorio_id", officeId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Canal excluído com sucesso!" });
    }

    // Ação: ENVIAR MENSAGEM
    if (action === "SEND_MESSAGE") {
      const { channelId, mensagem } = body; // channelId pode ser null para chat geral
      if (!mensagem || mensagem.trim() === "") {
        return NextResponse.json({ success: false, message: "A mensagem não pode ser vazia" }, { status: 400 });
      }

      const { data, error } = await db
        .from("escritorio_mensagens")
        .insert([{
          escritorio_id: officeId,
          canal_id: channelId || null,
          sender_name: user.name,
          sender_cargo: user.cargo,
          mensagem: mensagem.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    }

    // Ação: ENTRAR EM SALA DE VOZ (Discord style)
    if (action === "JOIN_VOICE") {
      const { channelId } = body;
      if (!channelId) {
        return NextResponse.json({ success: false, message: "ID do canal de voz é obrigatório" }, { status: 400 });
      }

      // 1. Remover o participante de qualquer outro canal de voz do mesmo escritório
      await db
        .from("escritorio_voz_participantes")
        .delete()
        .eq("escritorio_id", officeId)
        .eq("member_id", user.id);

      // 2. Inserir no novo canal de voz
      const { data, error } = await db
        .from("escritorio_voz_participantes")
        .insert([{
          escritorio_id: officeId,
          canal_id: channelId,
          member_id: user.id,
          member_name: user.name,
          member_cargo: user.cargo,
          mutado: false
        }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    }

    // Ação: SAIR DE SALAS DE VOZ
    if (action === "LEAVE_VOICE") {
      const { error } = await db
        .from("escritorio_voz_participantes")
        .delete()
        .eq("escritorio_id", officeId)
        .eq("member_id", user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Saiu do canal de voz!" });
    }

    // Ação: ALTERAR MUTE
    if (action === "TOGGLE_MUTE") {
      const { mutado } = body;
      const { data, error } = await db
        .from("escritorio_voz_participantes")
        .update({ mutado: !!mutado })
        .eq("escritorio_id", officeId)
        .eq("member_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, message: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro no POST /api/escritorio/comunicacao:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno" }, { status: 500 });
  }
}

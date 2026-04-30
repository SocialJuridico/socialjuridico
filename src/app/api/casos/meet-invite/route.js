import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isLawyer } from "@/lib/securityUtils";
import { NextResponse } from "next/server";

function normalizeMeetLink(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || "").trim());
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== "meet.google.com" && parsed.hostname !== "meet.jit.si") return null;
    if (
      !parsed.pathname ||
      parsed.pathname === "/" ||
      parsed.pathname === "/new"
    )
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// POST /api/casos/meet-invite
// Body: { casoId, meetLink }
// Somente o advogado vinculado ao caso pode enviar convite de Meet para o cliente.
export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    if (!(await isLawyer(db, user.id))) {
      return NextResponse.json(
        {
          success: false,
          message: "Apenas advogados podem enviar convite Meet",
        },
        { status: 403 },
      );
    }

    const { casoId, meetLink } = await request.json();

    if (!casoId || !meetLink) {
      return NextResponse.json(
        { success: false, message: "casoId e meetLink são obrigatórios" },
        { status: 400 },
      );
    }

    const safeMeetLink = normalizeMeetLink(meetLink);
    if (!safeMeetLink) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Link inválido. Cole um link válido de videochamada (ex: Google Meet ou Jitsi).",
        },
        { status: 400 },
      );
    }

    const { data: caso, error: casoError } = await db
      .from("casos")
      .select("id, titulo, cliente_id, advogado_id")
      .eq("id", casoId)
      .single();

    if (casoError || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    if (caso.advogado_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Você não é o advogado vinculado a este caso",
        },
        { status: 403 },
      );
    }

    const isJitsi = safeMeetLink.includes('meet.jit.si');
    const provider = isJitsi ? 'Nativa' : 'Google Meet';
    const meetMessage = `📹 Convite de videochamada (${provider}): ${safeMeetLink}`;

    const now = new Date().toISOString();
    const [{ error: msgError }, { error: notifError }] = await Promise.all([
      db.from("mensagens").insert([
        {
          caso_id: casoId,
          sender_id: user.id,
          content: meetMessage,
          is_read: false,
          created_at: now,
        },
      ]),
      db.from("notificacoes").insert([
        {
          user_id: caso.cliente_id,
          titulo: "Convite para videochamada",
          mensagem: `O advogado enviou um link de Google Meet para o caso \"${caso.titulo}\".`,
          lida: false,
          tipo: "MEET_INVITE",
          meta: JSON.stringify({ case_id: casoId, meet_link: safeMeetLink }),
          created_at: now,
        },
      ]),
    ]);

    if (msgError) {
      throw msgError;
    }
    if (notifError) {
      console.error("Aviso: falha ao criar notificação de Meet:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "Convite de Meet enviado com sucesso.",
      meetLink: safeMeetLink,
    });
  } catch (error) {
    console.error("Erro ao enviar convite Meet:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

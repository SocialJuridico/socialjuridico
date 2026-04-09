import { createClient } from "@/lib/supabaseServer";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const role = await getRoleFromDatabase(supabase, user.id);
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Apenas administradores podem enviar Push Notifications gerais." }, { status: 403 });
    }

    const { targetMode, targetId, title, message } = await request.json();

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ success: false, message: "Título e mensagem são obrigatórios." }, { status: 400 });
    }

    let userIds = [];
    let roles = [];

    switch(targetMode) {
      case "TODOS_ADVOGADOS":
        roles = ["LAWYER"];
        break;
      case "TODOS_CLIENTES":
        roles = ["CLIENT"];
        break;
      case "ADVOGADO_ESPECIFICO":
      case "CLIENTE_ESPECIFICO":
        if (!targetId) {
           return NextResponse.json({ success: false, message: "ID do usuário alvo não foi informado." }, { status: 400 });
        }
        userIds = [targetId];
        break;
      case "TODOS":
        roles = ["LAWYER", "CLIENT", "ADMIN"];
        break;
      default:
        return NextResponse.json({ success: false, message: "Modo de alvo inválido." }, { status: 400 });
    }

    const result = await sendPushNotification({
      userIds,
      roles,
      title: title.trim(),
      message: message.trim(),
      url: "/dashboard" // Padrão
    });

    return NextResponse.json({ 
      success: true, 
      message: "Push Notification enviada com sucesso!", 
      data: result 
    });

  } catch (error) {
    console.error("Erro na API POST /api/admin/push:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor ao tentar enviar Push Notification." },
      { status: 500 }
    );
  }
}

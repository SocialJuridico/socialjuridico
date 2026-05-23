import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/notificacoes -> lista notificacoes do usuario autenticado
export async function GET(req) {
  try {
    let finalUser = null;

    // 1. Tentar Bearer Token (para mobile)
    if (req) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (user && !error) {
          finalUser = user;
        }
      }
    }

    // 2. Fallback para Cookies (web)
    if (!finalUser) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      finalUser = user;

      if (!finalUser) {
        const { data: { session } } = await supabase.auth.getSession();
        finalUser = session?.user;
      }
    }

    if (!finalUser) {
      console.error("[notificacoes] Auth error: No user or session found");
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }
    
    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    const { data, error } = await db
      .from("notificacoes")
      .select("*")
      .eq("user_id", finalUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const filtered = (data || []).filter(n => {
       const meta = typeof n.meta === 'string' ? JSON.parse(n.meta || '{}') : (n.meta || {});
       return !meta.deleted_by_user;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Erro na API GET /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/notificacoes?id=...
export async function DELETE(req) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("id");

    let user = null;

    // 1. Tentar Bearer Token (para mobile)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user: u }, error } = await supabaseAdmin.auth.getUser(token);
      if (u && !error) {
        user = u;
      }
    }

    // 2. Fallback para Cookies (web)
    if (!user) {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    }

    if (!user) {
      console.error("[DELETE Notif] No user session");
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;

    // Caso seja solicitado limpar todas as notificações (limpar tudo)
    if (notificationId === "all" || !notificationId) {
      console.log(`[DELETE Notif] Clearing all notifications for user: ${user.email}`);
      const { error } = await db
        .from("notificacoes")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        message: "Todas as notificações foram excluídas com sucesso" 
      });
    }

    // 2. Verifica se o usuário é ADMIN (Checa perfil e tb tabela admins)
    const [profileRes, adminRes] = await Promise.all([
      db.from("perfil").select("role").eq("id", user.id).maybeSingle(),
      db.from("admins").select("id").eq("id", user.id).maybeSingle()
    ]);

    const isAdmin = profileRes.data?.role === "ADMIN" || !!adminRes.data;
    
    console.log(`[DELETE Notif] User: ${user.email}, isAdmin: ${isAdmin}, ID: ${notificationId}`);

    // 3. Executa o soft-delete ou delete definitivo
    const { data: targetNotif, error: fetchError } = await db
      .from("notificacoes")
      .select("*")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!targetNotif) return NextResponse.json({ success: true, message: "Já removida" });

    // Permissão: se não for admin, só pode mexer se for dono
    if (!isAdmin && targetNotif.user_id !== user.id) {
       return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 403 });
    }

    const currentMeta = typeof targetNotif.meta === 'string' ? JSON.parse(targetNotif.meta || '{}') : (targetNotif.meta || {});
    const isLawyerAction = targetNotif.user_id === user.id;
    
    // Se for o advogado apagando a dele
    if (isLawyerAction) {
       currentMeta.deleted_by_user = true;
       // Se o admin já tinha "apagado" (pelo lado dele no papo), ou se não é uma msg de papo, apaga de vez
       const isShared = targetNotif.tipo === 'ADMIN_CHAT' || targetNotif.tipo === 'ADMIN_BROADCAST';
       if (!isShared || currentMeta.deleted_by_admin) {
          await db.from("notificacoes").delete().eq("id", notificationId);
       } else {
          await db.from("notificacoes").update({ meta: JSON.stringify(currentMeta) }).eq("id", notificationId);
       }
    } else if (isAdmin) {
       // Se for o admin apagando uma do advogado (comunicado enviado por exemplo)
       currentMeta.deleted_by_admin = true;
       if (currentMeta.deleted_by_user) {
          await db.from("notificacoes").delete().eq("id", notificationId);
       } else {
          await db.from("notificacoes").update({ meta: JSON.stringify(currentMeta) }).eq("id", notificationId);
       }
    }

    console.log(`[DELETE Notif] Success. ID: ${notificationId}`);

    return NextResponse.json({ 
      success: true, 
      message: "Mensagem excluída com sucesso"
    });

  } catch (error) {
    console.error("Erro na API DELETE /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao excluir mensagem" },
      { status: 500 },
    );
  }
}

// PATCH /api/notificacoes -> marca todas as notificações do usuário como lidas
export async function PATCH(req) {
  try {
    const supabase = createClient();
    
    let user = null;

    // 1. Tentar Bearer Token (para mobile)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user: u }, error } = await supabaseAdmin.auth.getUser(token);
      if (u && !error) {
        user = u;
      }
    }

    // 2. Fallback para Cookies (web)
    if (!user) {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { id } = await req.json().catch(() => ({}));
    const db = supabaseAdmin || supabase;

    // 2. Executa o update
    let query = db.from("notificacoes").update({ lida: true }).eq("user_id", user.id);
    
    // Se passou um ID específico, marca só ela
    if (id) {
      query = query.eq("id", id);
    } else {
      // Caso contrário, marca todas as não lidas do usuário
      query = query.eq("lida", false);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Notificações marcadas como lidas" });

  } catch (error) {
    console.error("Erro na API PATCH /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao atualizar notificações" },
      { status: 500 },
    );
  }
}

// POST /api/notificacoes -> registra token de push notification do usuário autenticado
export async function POST(req) {
  try {
    let finalUser = null;

    // 1. Tentar Bearer Token (para mobile)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (user && !error) {
        finalUser = user;
      }
    }

    // 2. Fallback para Cookies (web)
    if (!finalUser) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      finalUser = user;
    }

    if (!finalUser) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { token } = await req.json().catch(() => ({}));

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    // Upsert token in user_push_tokens table
    const { error } = await db
      .from("user_push_tokens")
      .upsert(
        { user_id: finalUser.id, token: token },
        { onConflict: "token" }
      );

    if (error) {
      console.error("[notificacoes] Error registering push token:", error);
      throw error;
    }

    return NextResponse.json({ success: true, message: "Token registrado com sucesso" });
  } catch (error) {
    console.error("Erro na API POST /api/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao registrar token" },
      { status: 500 },
    );
  }
}


import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, message: "Acesso restrito" }, { status: 403 });

    const { data, error } = await db
      .from("avisos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, message: "Acesso restrito" }, { status: 403 });

    const body = await request.json();
    const { texto, dias } = body;

    if (!texto || !dias) {
      return NextResponse.json({ success: false, message: "Texto e prazo são obrigatórios" }, { status: 400 });
    }

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + parseInt(dias));

    const { data, error } = await db
      .from("avisos")
      .insert([{ 
        texto, 
        expira_em: expiraEm.toISOString(),
        ativo: true 
      }])
      .select()
      .single();

    if (error) throw error;

    // 📣 ENVIAR PUSH NOTIFICATION PARA TODOS OS ADVOGADOS (OU TODOS OS USUÁRIOS)
    await sendPushNotification({
      roles: ["LAWYER"], // Você pode adicionar "CLIENT" aqui se quiser que todos recebam
      title: "SocialJurídico 📢",
      message: texto.substring(0, 100),
      url: "/dashboard"
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, message: "Acesso restrito" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, message: "ID é obrigatório" }, { status: 400 });

    const { error } = await db.from("avisos").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, message: "Acesso restrito" }, { status: 403 });

    const body = await request.json();
    const { id, ativo } = body;

    const { error } = await db.from("avisos").update({ ativo }).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabaseServer"; // for auth check
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function GET(request, { params }) {
  const { anuncianteId } = await params;
  try {
    const supabaseClient = createServerClient();
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const isAdmin = await ensureAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, message: "Acesso restrito" }, { status: 403 });

    const { data, error } = await supabase
      .from("mensagens_suporte_anunciante")
      .select("*")
      .eq("anunciante_id", anuncianteId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { anuncianteId } = await params;
  try {
    const supabaseClient = createServerClient();
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const isAdmin = await ensureAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, message: "Acesso restrito" }, { status: 403 });

    const { content } = await request.json();

    const { data, error } = await supabase
      .from("mensagens_suporte_anunciante")
      .insert([{
        anunciante_id: anuncianteId,
        sender_type: "ADMIN",
        content: content
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

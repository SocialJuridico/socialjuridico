import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const destaque = searchParams.get("destaque");
    const categoria = searchParams.get("categoria");

    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    let query = db.from("anuncios").select(`
       *,
       anunciante:anunciante_id(nome_empresa, whatsapp)
    `);

    if (destaque === "true") {
      query = query.eq("em_destaque", true).limit(1);
    }

    if (categoria) {
      query = query.eq("categoria", categoria);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

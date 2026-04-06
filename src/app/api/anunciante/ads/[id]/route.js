import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAnuncianteSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sj_anunciante_session");
  if (!session) return null;
  try {
    return JSON.parse(Buffer.from(session.value, "base64").toString("utf8"));
  } catch (e) {
    return null;
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await getAnuncianteSession();
  if (!session) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

  // Delete only if it belongs to the advertiser
  const { error } = await supabase
    .from("anuncios")
    .delete()
    .eq("id", id)
    .eq("anunciante_id", session.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "Anúncio excluído!" });
}

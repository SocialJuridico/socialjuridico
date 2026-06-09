import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { parseAdvertiserSessionToken } from "@/lib/anuncianteAuth";

async function getAnuncianteSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sj_anunciante_session");

  if (!session?.value) return null;

  return parseAdvertiserSessionToken(session.value);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await getAnuncianteSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Não autorizado" },
      { status: 401 },
    );
  }

  const { error } = await supabaseAdmin
    .from("anuncios")
    .delete()
    .eq("id", id)
    .eq("anunciante_id", session.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Anúncio excluído!",
  });
}

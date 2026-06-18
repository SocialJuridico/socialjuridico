import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));
    const geo = body?.geo;

    if (!token || !geo) {
      return NextResponse.json({ success: false, message: "Dados incompletos." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("signature_extrajudicial_notifications")
      .update({ read_geo: String(geo).trim() })
      .eq("access_token", token);

    if (error) {
      console.error("Erro ao atualizar geo:", error);
      return NextResponse.json({ success: false, message: "Erro ao salvar localização." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Localização salva com sucesso." });
  } catch (error) {
    console.error("Erro API Geo:", error);
    return NextResponse.json({ success: false, message: "Erro interno." }, { status: 500 });
  }
}

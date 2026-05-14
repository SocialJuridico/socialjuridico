import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { tokenId, geo } = await request.json();

    if (!tokenId || !geo) {
      return NextResponse.json({ success: false, message: "Dados incompletos" }, { status: 400 });
    }

    // Atualizar a geolocalização na tabela
    const { error } = await supabaseAdmin
      .from('blindagem_notificacoes')
      .update({ read_geo: geo })
      .eq('id', tokenId);

    if (error) {
      console.error("Erro ao atualizar geo:", error);
      return NextResponse.json({ success: false, message: "Erro ao salvar localização" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Localização salva" });
  } catch (error) {
    console.error("Erro API Geo:", error);
    return NextResponse.json({ success: false, message: "Erro interno" }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("indicacoes")
    .select("*")
    .eq("indicador_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar indicações:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
